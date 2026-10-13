const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    // Identity
    displayName: { type: String, required: true, trim: true },
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    userPrincipalName: { type: String, default: "", trim: true },
    userType: { type: String, default: "Member" },
    authorizationInfo: { type: String, default: "" },
    accountStatus: { type: String, default: "Active" },
    usageLocation: { type: String, default: "" },

    // Job Information
    jobTitle: { type: String, default: "" },
    companyName: { type: String, default: "" },
    department: { type: String, default: "IT" },
    employeeId: { type: String, default: "" },
    employeeType: { type: String, default: "Full-Time" },
    hireDate: { type: String, default: "" },
    officeLocation: { type: String, default: "" },
    manager: { type: String, default: "" },
    sponsors: { type: String, default: "" },
    shiftStartTime: { type: String, default: "08:00" },
    shiftEndTime: { type: String, default: "20:00" },

    // Personal Information
    streetAddress: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "" },
    businessPhone: { type: String, default: "" },
    mobilePhone: { type: String, default: "" },
    email: { type: String, default: "", trim: true },
    otherEmails: { type: String, default: "" },
    faxNumber: { type: String, default: "" },
    mailNickname: { type: String, default: "" },

    // Parental Controls
    ageGroup: { type: String, default: "Adult" },
    consentForMinor: { type: String, default: "No" },
  },
  {
    collection: "employees",
    timestamps: true,
  }
);

module.exports = mongoose.model("Employee", employeeSchema);
