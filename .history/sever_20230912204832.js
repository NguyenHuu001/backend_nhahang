const express = require('express');
const oracledb = require('oracledb')
const cryptojs = require('crypto-js');
const NodeRSA = require('node-rsa');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;


app.use(express.json()); // Middleware để phân tích dữ liệu JSON từ request body

// Sử dụng body-parser để đọc dữ liệu từ request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
    origin: 'http://localhost:3001', 
    credentials: true
}));
const GeneratePair = () => {
    const key = new NodeRSA().generateKeyPair();

    const publicKey = key.exportKey('public');
    const privateKey = key.exportKey('private');

    fs.openSync("./Keys/public.pem", "w");
    fs.writeFileSync("./Keys/public.pem", publicKey, "utf-8");

    fs.openSync("./Keys/private.pem", "w");
    fs.writeFileSync("./Keys/private.pem", privateKey, "utf-8");
}

const publicKey = new NodeRSA();
const privateKey = new NodeRSA();

const public = fs.readFileSync("./Keys/public.pem", "utf8");
const private = fs.readFileSync("./Keys/private.pem", "utf8");

publicKey.importKey(public);
privateKey.importKey(private);

const CreateLicense = (data) =>{
    const salt = 'Nguyễn Hữu siêu cấp vip pro';
    const slatSecond = 'Nguyễn Hưu lãi siêu cấp vip pro';

    const encrypted = privateKey.encryptPrivate(data, "base64")
    return encrypted;
}

const key = '1234567890123456';
// const iv = '1234567890123456';
const decrypted = (data) => {
    const decryptedData = cryptojs.AES.decrypt(data, key, {
        keySize: 128/8,
        // iv: iv,
        mode: cryptojs.mode.CBC,
        padding: cryptojs.pad.Pkcs7
    });
    return cryptojs.enc.Utf8.stringify(decryptedData);
}
app.get('/GioHang',(req, res) => {
    let maNguoiDung = req.query.maNguoiDung;
    async function fetchDataCustomers(){
        try {
            const connection = await oracledb.getConnection({
                user: 'hr',
                password: '123',
                connectString: 'localhost/orcl21'
            })
            const result = await connection.execute(
                "SELECT M.*, GH.SoLuong FROM MonAn M JOIN GioHang GH ON M.MaMonAn = GH.MaMonAn WHERE GH.MaNguoiDung = :maNguoiDung",
                { maNguoiDung  }
            );
            connection.close();
            return result.rows;
        } catch (error) {
            return error
        }
    }

    fetchDataCustomers()
    .then(dbRes => {
        res.send(dbRes);
    })
    .catch(error => {
        res.send(err)
    })
} )
app.post('/login',(req, res) => {
    const { username, password } = req.body;
    //AES
    const newpass = decrypted(password);
    async function fetchDataCustomers(){
    try {
        const connection = await oracledb.getConnection({
            user: 'hr',
            password: '123',
            connectString: 'localhost/orcl21'
        });

       
        if (!connection) {
            res.status(500).json({ success: false, message: 'Không thể kết nối đến cơ sở dữ liệu' });
            return;
        }
        const result = await connection.execute(
            'SELECT * FROM hr.Login WHERE TenDangNhap = :username AND MatKhau = :newpass',
            { username, newpass }
        );
        const data = result.rows;
        // console.log(data);
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, message: 'Đăng nhập thành công', data: data});
        } else {
            res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
    } catch (error) {
        console.error(error);
        res.status(501).json({ success: false, message: 'Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu' });
    }
    }

    fetchDataCustomers()
    .then(dbRes => {
        res.send(dbRes);
    })
    .catch(error => {
        res.send(err)
    })
} )

app.get('/MonAn',(req, res) => {
    async function fetchDataCustomers(){
        try {
            const connection = await oracledb.getConnection({
                user: 'hr',
                password: '123',
                connectString: 'localhost/orcl21'
            })
            const result = await connection.execute('SELECT * FROM hr.MonAn')
            return result.rows;
        } catch (error) {
            return error
        }
    }

    fetchDataCustomers()
    .then(dbRes => {
        res.send(dbRes);
    })
    .catch(error => {
        res.send(err)
    })
} )

app.listen(5000,() => {
    console.log(CreateLicense());
    console.log(`Listen to port ${PORT}`);
})