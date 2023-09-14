const express = require('express');
const oracledb = require('oracledb')
const crypto = require('crypto');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;


const secretKey = 'my-secret-key'; // Khóa bí mật (key)
const iv = crypto.randomBytes(16); // Vector khởi tạo (iv)

function encrypt(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    const encrypted = cipher.update(text, 'utf-8', 'hex') + cipher.final('hex');
    return encrypted;
}


app.use(express.json()); // Middleware để phân tích dữ liệu JSON từ request body

// Sử dụng body-parser để đọc dữ liệu từ request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
    // origin: 'http://localhost:3001', // Đổi thành địa chỉ của ứng dụng frontend của bạn
    // credentials: true
}));


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const connection = await oracledb.getConnection({
            user: 'hr',
            password: '123',
            connectString: 'localhost/orcl21'
        });

        if (!connection) {
            res.status(600).json({ success: false, message: 'Không thể kết nối đến cơ sở dữ liệu' });
            return;
        }

        const encryptedPassword = encrypt(password);

        const result = await connection.po(
            'SELECT * FROM hr.Login WHERE TenDangNhap = :username AND MatKhau = :encryptedPassword',
            { username, encryptedPassword }
        );

        if (result.rows.length > 0) {
            res.status(200).json({ success: true, message: 'Đăng nhập thành công', username });
        } else {
            res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu' });
    }
});



app.get('/',(req, res) => {
    res.send('Heloo word')
})
app.get('/ChiTietHoaDon',(req, res) => {
    async function fetchDataCustomers(){
        try {
            const connection = await oracledb.getConnection({
                user: 'hr',
                password: '123',
                connectString: 'localhost/orcl21'
            })
            const result = await connection.execute('SELECT * FROM hr.ChiTietHoaDon')
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
    console.log(`Listen to port ${PORT}`);
})