const express = require('express');
const 
const app = express();
const PORT = 5000;
app.get('/',(req, res) => {
    res.send('Heloo word')
})
app.listen(5000,() => {
    console.log(`Listen to port ${PORT}`);
})