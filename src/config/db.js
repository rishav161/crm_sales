const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true,
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.error(`👉 Please ensure your IP is whitelisted in MongoDB Atlas (Network Access -> Add IP Address -> Allow Access from Anywhere: 0.0.0.0/0).`);
  }
};

module.exports = connectDB;
