const express = require('express');
const oracledb = require('oracledb')
const crypto = require('crypto');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;



app.use(cors({
    origin: 'http://localhost:3001', // Hoặc địa chỉ của ứng dụng frontend của bạn
    credentials: true
}));

app.get('/',(req, res) => {
    res.send('Heloo word')
})
app.get('/Login',(req, res) => {
    async function fetchDataCustomers(){
        try {
            const connection = await oracledb.getConnection({
                user: 'hr',
                password: '123',
                connectString: 'localhost/orcl21'
            })
            const result = await connection.execute('SELECT * FROM hr.Login')
            console.log(result.re);
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