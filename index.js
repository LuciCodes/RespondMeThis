
const express = require('express');

const app = express();

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const port = 3000;

const mc = require('./mainController.js');

mc.init();

mc.configure(app);

app.listen(port, () => {

  console.log(`ReaspondMeThis listening at http://localhost:${port}`)
})

