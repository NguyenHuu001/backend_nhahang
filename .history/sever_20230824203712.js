const express = require('express');
const oracledb = require('oracledb')
const app = express();
const PORT = 5000;
app.get('/',(req, res) => {
    res.send('Heloo word')
})
app.get('/customers',(req, res) => {
    async function fetchDataCustomers(){
        try {
            const connection = await oracledb.getConnection({
                user: 'admin',
                password: '123',
                connectString: 'localhost'
            })
        } catch (error) {
            
        }
    }
} )
app.listen(5000,() => {
    console.log(`Listen to port ${PORT}`);
})