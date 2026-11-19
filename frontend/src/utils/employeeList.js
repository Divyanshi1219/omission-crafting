import api from "../api";
import { PROFILES, SALES_EMPLOYEE_NAMES } from "../context/AuthContext";

/**
 * Returns a sorted, deduplicated list of all employee names in the system:
 * - Core leadership & profile presets (Adam, Marcus Vance, Elena Rostova, Sarah Jenkins, Alex Rivera, Divyanshi, Karan)
 * - All sales team roster employees
 * - Dynamic employees created in Employee Management (/api/employees)
 */
export const getAllEmployeeNames = async (contextProfiles = null) => {
  const nameSet = new Set();

  // 1. Add core profile names from context or fallback PROFILES
  const sourceProfiles = contextProfiles || PROFILES;
  Object.values(sourceProfiles || {}).forEach((p) => {
    if (p?.name && typeof p.name === "string" && p.name.trim()) {
      nameSet.add(p.name.trim());
    }
  });

  // 2. Add all predefined sales team members
  if (Array.isArray(SALES_EMPLOYEE_NAMES)) {
    SALES_EMPLOYEE_NAMES.forEach((name) => {
      if (name && typeof name === "string" && name.trim()) {
        nameSet.add(name.trim());
      }
    });
  }

  // 3. Fetch any dynamic employees from the database
  try {
    const res = await api.get("/api/employees");
    if (res.data?.success && Array.isArray(res.data.data)) {
      res.data.data.forEach((emp) => {
        const dName = emp.displayName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
        if (dName) {
          nameSet.add(dName.trim());
        }
      });
    }
  } catch (err) {
    // If API is temporarily offline, static profiles and sales roster remain available
    console.warn("Could not fetch /api/employees in getAllEmployeeNames:", err.message);
  }

  // 4. Return sorted alphabetically
  return Array.from(nameSet).sort((a, b) => a.localeCompare(b));
};

/**
 * Synchronous fallback that extracts names immediately from context profiles & SALES_EMPLOYEE_NAMES
 */
export const getStaticEmployeeNames = (contextProfiles = null) => {
  const nameSet = new Set();
  const sourceProfiles = contextProfiles || PROFILES;
  Object.values(sourceProfiles || {}).forEach((p) => {
    if (p?.name && typeof p.name === "string" && p.name.trim()) {
      nameSet.add(p.name.trim());
    }
  });
  if (Array.isArray(SALES_EMPLOYEE_NAMES)) {
    SALES_EMPLOYEE_NAMES.forEach((name) => {
      if (name && typeof name === "string" && name.trim()) {
        nameSet.add(name.trim());
      }
    });
  }
  return Array.from(nameSet).sort((a, b) => a.localeCompare(b));
};
