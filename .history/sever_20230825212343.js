const express = require('express');
const oracledb = require('oracledb')
const crypto = require('crypto');
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

function decrypt(encryptedText) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    const decrypted = decipher.update(encryptedText, 'hex', 'utf-8') + decipher.final('utf-8');
    return decrypted;
}

app.use(express.json()); // Middleware để phân tích dữ liệu JSON từ request body

// Sử dụng body-parser để đọc dữ liệu từ request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/login', (req, res) => {
    const { username, password } = req.body; // Lấy dữ liệu từ request body
    async function authenticateUser() {
        try {
            const connection = await oracledb.getConnection({
                user: 'hr',
                password: '123',
                connectString: 'localhost/orcl21'
            });
            const result = await connection.execute(
                'SELECT * FROM hr.Login WHERE TenDangNhap = :username AND MatKhau = :password',
                [username, password]
            );
            if (result.rows.length > 0) {
                const authenticatedUser = result.rows[0];
                return { success: true, message: 'Đăng nhập thành công', tendangnhap: authenticatedUser.TenDangNhap };
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