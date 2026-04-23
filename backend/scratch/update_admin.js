const mongoose = require("mongoose");
const { User } = require("../Model/User.js");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/intelliclass");
  const result = await User.updateMany({ name: "admin" }, { $set: { role: "ADMIN" } });
  console.log("Updated admin users:", result.modifiedCount);
  process.exit(0);
}
run();
