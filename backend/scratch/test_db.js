const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
    dbName: process.env.DB_NAME || "intelliquiz",
})
.then(() => {
    console.log("DB CONNECTION SUCCESS");
    process.exit(0);
})
.catch(err => {
    console.error("DB CONNECTION FAILED:", err.message);
    process.exit(1);
});
