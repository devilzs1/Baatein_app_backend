const app = require("./app");
const http = require("http");
const server = http.createServer(app);
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down ...");
  process.exit(1); 
});

const DB = process.env.DBURI.replace(
  "<PASSWORD>",
  process.env.DBPASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log("DB Connection successful");
  })
  .catch((err) => {
    console.log(err);
  });

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`App running on port ${port} ...`);
});
