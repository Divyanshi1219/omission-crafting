const mongoose = require("mongoose");
const dns = require("dns");

// Ensure robust DNS resolution for MongoDB Atlas SRV records on Windows/Reliance/ISPs
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (err) {
  console.warn("DNS server configuration fallback:", err.message);
}

const connectDB = async () => {
  const uri =
    process.env.MONGODB_URI ||
    "mongodb+srv://ommissionit_db_user:Omission%4012345@cluster0.xmgpr25.mongodb.net/omission?appName=Cluster0&retryWrites=true&w=majority";

  if (!uri) {
    console.warn("⚠️ MONGODB_URI is not set!");
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    console.log(`📂 Using database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
};

module.exports = connectDB;
