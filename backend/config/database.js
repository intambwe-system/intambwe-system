// ===================================
// FILE: config/database.js
// ===================================
const { Sequelize } = require("sequelize");
const fs = require("fs");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT), // usually NOT 3306 on Aiven
    dialect: "mysql",
    logging: false,
    // dialectOptions: {
    //   ssl: {
    //     ca: fs.readFileSync(__dirname + "/ca.pem"),
    //     rejectUnauthorized: true,
    //   },
    // },
  }
);

module.exports = sequelize;

