const express = require("express");
const oracledb = require("oracledb");
const cryptojs = require("crypto-js");
const crypto = require("crypto");
const NodeRSA = require("node-rsa");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
//Key AES
const key = process.env.AESKEY;
//////
// const iv = '1234567890123456';
const PORT = process.env.PORT || 6000;

app.use(express.json()); // Middleware để phân tích dữ liệu JSON từ request body
app.use(cookieParser());
// Sử dụng body-parser để đọc dữ liệu từ request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:3001",
    credentials: true,
  })
);
////////////////////////////////////////////////////////////////////
const GeneratePair = () => {
  const key = new NodeRSA().generateKeyPair();

  const publicKey = key.exportKey("public");
  const privateKey = key.exportKey("private");

  fs.openSync("./Keys/public.pem", "w");
  fs.writeFileSync("./Keys/public.pem", publicKey, "utf-8");

  fs.openSync("./Keys/private.pem", "w");
  fs.writeFileSync("./Keys/private.pem", privateKey, "utf-8");
};
const publicKey = new NodeRSA();
const privateKey = new NodeRSA();
const public = fs.readFileSync("./Keys/public.pem", "utf8");
const private = fs.readFileSync("./Keys/private.pem", "utf8");
publicKey.importKey(public);
privateKey.importKey(private);
const CreateLicense = (data) => {
  const encrypted = privateKey.encryptPrivate(data, "base64");
  return encrypted;
};
const CheckValidity = (license) => {
  const decrypted = publicKey.decryptPublic(license, "utf8");
  console.log(decrypted);
};
///////////////////////////////////////////////////////////////////////

app.get("/generate-key", (req, res) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "der",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "der",
    },
  });

  res.send({
    publicKey: publicKey.toString("base64"),
    privateKey: privateKey.toString("base64"),
  });
});

app.post("/sign", (req, res) => {
  const data = req.body.data;
  let privateKey = req.body.privateKey;

  privateKey = crypto.createPrivateKey({
    key: Buffer.from(privateKey, "base64"),
    type: "pkcs8",
    format: "der",
  });

  const sign = crypto.createSign("sha256");
  sign.update(data);
  sign.end();
  const signature = sign.sign(privateKey).toString("base64");

  res.send({ data, signature });
});

app.post("/verify", (req, res) => {
  let { data, publicKey, signature } = req.body;

  publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKey, "base64"),
    type: "spki",
    format: "der",
  });

  const verify = crypto.createVerify("SHA256");
  verify.update(data);
  verify.end();
  let result = verify.verify(publicKey, Buffer.from(signature, "base64"));
  res.send({ verify: result });
});
///////////////////////////////////////////////////////////////////////

const checkLogin = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.send("Không tìm thấy token trong cookie");
    }
    const idUser = jwt.verify(token, "mk");
    const id = idUser._id;
    // Kết nối đến cơ sở dữ liệu
    let connection;
    try {
      connection = await oracledb.getConnection({
        user: "hr",
        password: "123",
        connectString: "localhost/orcl21",
      });

      if (!connection) {
        res.send("Không thể kết nối đến cơ sở dữ liệu");
        return;
      }

      const result = await connection
        .execute("SELECT * FROM hr.Login WHERE MaNguoiDung = :id", { id })
        .then((data) => {
          req.data = data;
          if (data) {
            next();
          } else {
            res.json("Không tìm thấy data");
          }
        });
    } catch (error) {
      res.send("Lỗi1: " + error.message);
    } finally {
      if (connection) {
        try {
          // Đóng kết nối cơ sở dữ liệu sau khi sử dụng
          await connection.close();
        } catch (error) {
          console.error("Lỗi khi đóng kết nối: ", error);
        }
      }
    }
  } catch (error) {
    res.send("Lỗi: " + error.message);
  }
};
const checkAdmin = (req, res, next) => {
  const role = req.data.rows[0];
  if (role[3] === "Admin") {
    next();
  } else {
    res.json("bạn không có quyền truy cập");
  }
};

const decrypted = (data) => {
  const decryptedData = cryptojs.AES.decrypt(data, key, {
    keySize: 128 / 8,
    // iv: iv,
    mode: cryptojs.mode.CBC,
    padding: cryptojs.pad.Pkcs7,
  });
  return cryptojs.enc.Utf8.stringify(decryptedData);
};
app.get("/GioHang", checkLogin, (req, res, next) => {
  const token = req.cookies.token;
  const gaimatoken = jwt.verify(token, "mk");
  const maNguoiDung = gaimatoken._id;
  async function fetchDataCustomers() {
    try {
      const connection = await oracledb.getConnection({
        user: "hr",
        password: "123",
        connectString: "localhost/orcl21",
      });
      const result = await connection.execute(
        "SELECT GH.MaGioHang, M.*, GH.SoLuong FROM MonAn M JOIN GioHang GH ON M.MaMonAn = GH.MaMonAn WHERE GH.MaNguoiDung = :maNguoiDung",
        { maNguoiDung }
      );
      connection.close();
      return result.rows;
    } catch (error) {
      return error;
    }
  }

  fetchDataCustomers()
    .then((dbRes) => {
      res.send(dbRes);
    })
    .catch((error) => {
      res.send(error);
    });
});
app.get("/MonAn", checkLogin, (req, res, next) => {
  async function fetchDataCustomers() {
    try {
      const connection = await oracledb.getConnection({
        user: "hr",
        password: "123",
        connectString: "localhost/orcl21",
      });
      const result = await connection.execute(
        "SELECT * FROM hr.MonAn ORDER BY MaMonAn DESC"
      );

      return result.rows;
    } catch (error) {
      return error;
    }
  }

  fetchDataCustomers()
    .then((dbRes) => {
      res.send(dbRes);
    })
    .catch((error) => {
      res.send(err);
    });
});
app.get("/dish/:MaMonAn", async (req, res) => {
  try {
    const { MaMonAn } = req.params;
    const connection = await oracledb.getConnection({
      user: "hr",
      password: "123",
      connectString: "localhost/orcl21",
    });

    if (!connection) {
      return res.status(500).json({
        success: false,
        message: "Không thể kết nối đến cơ sở dữ liệu",
      });
    }
    // Sử dụng MaMonAn để truy vấn cơ sở dữ liệu và lấy thông tin món ăn
    const result = await connection.execute(
      "SELECT * FROM hr.MonAn WHERE MaMonAn = :MaMonAn",
      [MaMonAn]
    );

    // Kiểm tra và trả về kết quả
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn với MaMonAn cung cấp",
      });
    } else {
      const dish = result.rows[0];
      res.json({
        success: true,
        dish,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu",
    });
  }
});
app.get("/getAllKhachHang", checkLogin, checkAdmin, async (req, res) => {
  try {
    const connection = await oracledb.getConnection({
      user: "hr",
      password: "123",
      connectString: "localhost/orcl21",
    });

    const result = await connection.execute("SELECT * FROM hr.KhachHang ");

    // You may want to release the connection when you're done with it.
    // Not releasing the connection can lead to connection leaks.
    await connection.close();

    res.send(result.rows);
  } catch (error) {
    res.status(500).send(error.message); // Handle errors and send an appropriate response
  }
});

///Api Delete
app.delete("/DeleteCartItem/:id", async (req, res) => {
  const MGH = req.params.id;
  try {
    // Kết nối đến cơ sở dữ liệu Oracle
    const connection = await oracledb.getConnection({
      user: "hr",
      password: "123",
      connectString: "localhost/orcl21",
    });

    if (!connection) {
      return res.status(500).json({
        success: false,
        message: "Không thể kết nối đến cơ sở dữ liệu",
      });
    }

    // Sử dụng câu lệnh SQL DELETE để xóa sản phẩm từ GioHang
    const result = await connection.execute(
      "DELETE FROM GioHang WHERE MaGioHang = :MGH",
      { MGH }
    );
    await connection.commit();

    // Đóng kết nối sau khi xóa
    await connection.close();

    // Kiểm tra và trả về kết quả
    if (result.rowsAffected === 1) {
      res.json({
        success: true,
        message: "Xóa sản phẩm khỏi giỏ hàng thành công",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong giỏ hàng để xóa",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu",
    });
  }
});

app.post("/AddToCart", checkLogin, async (req, res) => {
  try {
    const token = req.cookies.token;
    const gaimatoken = jwt.verify(token, "mk");
    const MaNguoiDung = gaimatoken._id;
    // Lấy dữ liệu từ request body
    const { MaMonAn, SoLuong } = req.body;
    // Kết nối đến cơ sở dữ liệu Oracle
    const connection = await oracledb.getConnection({
      user: "hr",
      password: "123",
      connectString: "localhost/orcl21",
    });

    if (!connection) {
      return res.status(500).json({
        success: false,
        message: "Không thể kết nối đến cơ sở dữ liệu",
      });
    }

    // Sử dụng câu lệnh SQL INSERT để thêm sản phẩm vào Giỏ Hàng
    const result = await connection.execute(
      "INSERT INTO GioHang (MaNguoiDung, MaMonAn, SoLuong) VALUES (:MaNguoiDung, :MaMonAn, :SoLuong)",
      { MaNguoiDung, MaMonAn, SoLuong }
    );
    await connection.commit();

    // Đóng kết nối sau khi thêm dữ liệu
    await connection.close();
    // Kiểm tra và trả về kết quả
    if (result.rowsAffected && result.rowsAffected === 1) {
      res.json({
        success: true,
        message: "Thêm sản phẩm vào giỏ hàng thành công",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Không thể thêm sản phẩm vào giỏ hàng",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu",
    });
  }
});
app.post("/AddDish", checkLogin, checkAdmin, async (req, res) => {
  try {
    // Lấy dữ liệu từ request body
    const { TenMonAn, MoTa, Gia, AnhMonAn } = req.body;

    // Kết nối đến cơ sở dữ liệu Oracle
    const connection = await oracledb.getConnection({
      user: "hr",
      password: "123",
      connectString: "localhost/orcl21",
    });

    if (!connection) {
      return res.status(500).json({
        success: false,
        message: "Không thể kết nối đến cơ sở dữ liệu",
      });
    }

    // Sử dụng câu lệnh SQL INSERT để thêm món ăn vào bảng MonAn
    const result = await connection.execute(
      "INSERT INTO MonAn (TenMonAn, MoTa, Gia, AnhMonAn) VALUES (:TenMonAn, :MoTa, :Gia, :AnhMonAn)",
      { TenMonAn, MoTa, Gia, AnhMonAn }
    );
    await connection.commit();

    // Đóng kết nối sau khi thêm dữ liệu
    await connection.close();
    // Kiểm tra và trả về kết quả
    if (result.rowsAffected && result.rowsAffected === 1) {
      res.json({
        success: true,
        message: "Thêm món ăn thành công",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Không thể thêm món ăn",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu",
    });
  }
});
app.post("/DeleteDish", checkLogin, checkAdmin, async (req, res) => {
  try {
    // Lấy MaMonAn từ request body hoặc request parameters
    const { MaMonAn } = req.body;

    // Kết nối đến cơ sở dữ liệu Oracle
    const connection = await oracledb.getConnection({
      user: "hr",
      password: "123",
      connectString: "localhost/orcl21",
    });

    if (!connection) {
      return res.status(500).json({
        success: false,
        message: "Không thể kết nối đến cơ sở dữ liệu",
      });
    }

    // Sử dụng câu lệnh SQL DELETE để xóa món ăn dựa trên MaMonAn
    const result = await connection.execute(
      "DELETE FROM MonAn WHERE MaMonAn = :MaMonAn",
      { MaMonAn }
    );
    await connection.commit();

    // Đóng kết nối sau khi xóa dữ liệu
    await connection.close();
    // Kiểm tra và trả về kết quả
    if (result.rowsAffected && result.rowsAffected === 1) {
      res.json({
        success: true,
        message: "Xóa món ăn thành công",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Không thể xóa món ăn",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu",
    });
  }
});
app.post("/EditDish", checkLogin, checkAdmin, async (req, res) => {
  try {
    // Lấy thông tin mới của món ăn từ request body
    const { MaMonAn, TenMonAn, MoTa, Gia, AnhMonAn } = req.body;

    // Kết nối đến cơ sở dữ liệu Oracle
    const connection = await oracledb.getConnection({
      user: "hr",
      password: "123",
      connectString: "localhost/orcl21",
    });

    if (!connection) {
      return res.status(500).json({
        success: false,
        message: "Không thể kết nối đến cơ sở dữ liệu",
      });
    }

    // Sử dụng câu lệnh SQL UPDATE để sửa thông tin món ăn dựa trên MaMonAn
    const result = await connection.execute(
      "UPDATE MonAn SET TenMonAn = :TenMonAn, MoTa = :MoTa, Gia = :Gia, AnhMonAn = :AnhMonAn WHERE MaMonAn = :MaMonAn",
      { MaMonAn, TenMonAn, MoTa, Gia, AnhMonAn }
    );
    await connection.commit();

    // Đóng kết nối sau khi sửa thông tin
    await connection.close();
    // Kiểm tra và trả về kết quả
    if (result.rowsAffected && result.rowsAffected === 1) {
      res.json({
        success: true,
        message: "Sửa thông tin món ăn thành công",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Không thể sửa thông tin món ăn",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu",
    });
  }
});
app.post("/login", (req, res, next) => {
  const { username, password } = req.body;

  //AES
  const newpass = decrypted(password);
  console.log(password);
  console.log(newpass);
  async function fetchDataCustomers() {
    try {
      const connection = await oracledb.getConnection({
        user: "hr",
        password: "123",
        connectString: "localhost/orcl21",
      });

      if (!connection) {
        res.status(500).json({
          success: false,
          message: "Không thể kết nối đến cơ sở dữ liệu",
        });
        return;
      }
      const result = await connection
        .execute(
          "SELECT * FROM hr.Login WHERE TenDangNhap = :username AND MatKhau = :newpass",
          { username, newpass }
        )
        .then((data) => {
          if (data.rows.length > 0) {
            const data1 = data.rows[0];
            let token = jwt.sign({ _id: data1[0] }, "mk");
            res.status(200).json({
              success: true,
              message: "Đăng nhập thành công",
              data: data.rows,
              token: token,
            });
          } else {
            res.status(401).json({
              success: false,
              message: "Tên đăng nhập hoặc mật khẩu không đúng",
            });
          }
        });
    } catch (error) {
      console.error(error);
      res.status(501).json({
        success: false,
        message: "Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu",
      });
    }
  }

  fetchDataCustomers()
    .then((dbRes) => {
      res.send(dbRes);
    })
    .catch((error) => {
      res.send(err);
    });
});

app.listen(5000, () => {
  // const encrypt = CreateLicense('Hữu');
  // console.log(encrypt);
  // CheckValidity(encrypt );
  console.log(`Listen to port ${PORT}`);
});
