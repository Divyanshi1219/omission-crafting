const mongoose = require("mongoose");

const fabricSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      default: "CEO",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Fabric", fabricSchema);

