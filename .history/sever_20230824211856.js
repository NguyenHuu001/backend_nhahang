const express = require('express');
const oracledb = require('oracledb')
const app = express();
const PORT = 5000;
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
        console.log(dbRes);
        res.send(dbRes);
    })
    .catch(error => {
        res.send(err)
    })
} )
app.listen(5000,() => {
    console.log(`Listen to port ${PORT}`);
})