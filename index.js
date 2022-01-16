//MASTER WALLET NODE -------------------------------------------
//Master Node that manages addresses and requests---------------
//Version: 1.0.0------------------------------------------------
//Author: Reza Meshkat -----------------------------------------
//Date: 2021-07-06

const express = require('express');
const db = require('./app/Models/db.js');
var errorHandler = require('errorhandler')
const cors = require('cors');
const http = require("http");
const ApiRouter = require('./app/router/web');
const { Servers } = require('./app/Controller/Servers')

const app = express();

const server = http.createServer(app);


app.use(express.urlencoded({ extended: true }));
app.use(errorHandler({ dumpExceptions: true, showStack: true }));
app.use(cors({ origin: '*' }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', ApiRouter);

process.on('uncaughtException', (reason, p) => {
  console.error(reason, 'uncaught Exception at Promise', p);
})
process.on('unhandledRejection', (reason, p) => {
  console.error(reason, 'Unhandled Rejection at Promise', p);
});

process.on('SIGTERM', signal => {
  console.log(`Process ${process.pid} received a SIGTERM signal`)
  process.exit(0)
})

process.on('SIGINT', signal => {
  console.log(`Process ${process.pid} has been interrupted`)
  process.exit(0)
})

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.log('error XX: ' + err.message);
  res.status(statusCode).json({
    type: 'error', message: err.message
  });
});



const port = process.env.PORT || 51332;
server.listen(port, () => console.log(`Listening on port ${port}`));


Servers.start();

module.exports = app;
