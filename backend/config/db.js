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

    // Auto-apply database indexes & background cleanup of heavy base64 strings
    try {
      const db = mongoose.connection.db;
      const leadsColl = db.collection("leads");

      leadsColl.createIndex({ orderId: 1 }).catch(() => {});
      leadsColl.createIndex({ updatedAt: -1, createdAt: -1 }).catch(() => {});
      leadsColl.createIndex({ query: 1, updatedAt: -1 }).catch(() => {});
      leadsColl.createIndex({ orderStage: 1, subStage: 1, updatedAt: -1 }).catch(() => {});

      // Sanitize oversized base64 strings from printingStageData attachments
      leadsColl.updateMany(
        { "printingStageData.attachments.url": { $exists: true } },
        [
          {
            $set: {
              "printingStageData.attachments": {
                $map: {
                  input: { $ifNull: ["$printingStageData.attachments", []] },
                  as: "a",
                  in: {
                    name: { $ifNull: ["$$a.name", ""] },
                    size: { $ifNull: ["$$a.size", ""] },
                    type: { $ifNull: ["$$a.type", ""] },
                    stage: "printing",
                  },
                },
              },
            },
          },
        ]
      ).catch((e) => console.warn("Background printingStageData cleanup warning:", e.message));

      console.log("⚡ Database indexes and storage optimizations active.");
    } catch (optErr) {
      console.warn("⚠️ Optimization setup warning:", optErr.message);
    }
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
};

module.exports = connectDB;
