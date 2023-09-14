const express = require('express');
const oracledb = require('oracledb');
const crypto = require('crypto');
const app = express();
const PORT = 5000;

const secretKey = 'my-secret-key'; // Khóa bí mật (key)
const iv = crypto.randomBytes(16); // Vector khởi tạo (iv)

function encrypt(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    const encrypted = cipher.update(text, 'utf-8', 'hex') + cipher.final('hex');
    return encrypted;
}

function decrypt(encryptedText) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    const decrypted = decipher.update(encryptedText, 'hex', 'utf-8') + decipher.final('utf-8');
    return decrypted;
}

app.use(express.json()); // Middleware để phân tích dữ liệu JSON từ request body

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Encrypt the password before querying the database
    const encryptedPassword = encrypt(password);

    async function authenticateUser() {
        try {
            const connection = await oracledb.getConnection({
                user: 'hr',
                password: '123',
                connectString: 'localhost/orcl21'
            });
            const result = await connection.execute(
                'SELECT * FROM hr.Login WHERE TenDangNhap = :username AND MatKhau = :password',
                [username, encryptedPassword]
            );
            if (result.rows.length > 0) {
                return { success: true, message: 'Đăng nhập thành công', username };
            } else {
                return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
            }
        } catch (error) {
            return { success: false, message: 'Đã xảy ra lỗi' };
        }
    }

    authenticateUser()
        .then(authResult => {
            res.send(authResult);
        })
        .catch(error => {
            res.send({ success: false, message: 'Đã xảy ra lỗi' });
        });
});

app.listen(PORT, () => {
    console.log(`Listen to port ${PORT}`);
});
