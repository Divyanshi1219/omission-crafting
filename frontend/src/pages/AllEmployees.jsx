import { useState, useEffect } from "react";
import { Search, Plus, ArrowLeft, Users, Filter, ArrowUpDown, Calendar as CalendarIcon, Trash2, RefreshCw } from "lucide-react";
import api from "../api";
import "./EmployeeCards.css";

const initialForm = {
  // Identity
  displayName: "",
  firstName: "",
  lastName: "",
  userPrincipalName: "",
  userType: "Member",
  authorizationInfo: "",
  accountStatus: "Active",
  usageLocation: "",
  // Job Information
  jobTitle: "",
  companyName: "",
  department: "IT",
  employeeId: "",
  employeeType: "Full-Time",
  hireDate: "",
  officeLocation: "",
  manager: "",
  sponsors: "",
  shiftStartTime: "08:00",
  shiftEndTime: "20:00",
  // Personal Information
  streetAddress: "",
  city: "",
  state: "Victoria",
  postalCode: "",
  country: "",
  businessPhone: "",
  mobilePhone: "",
  email: "",
  otherEmails: "",
  faxNumber: "",
  mailNickname: "",
  // Parental Controls
  ageGroup: "Adult",
  consentForMinor: "No",
};

const avatarColors = ["0f172a", "1e293b", "334155", "eab308", "64748b", "f43f5e", "059669", "2563eb"];
const getAvatarBg = (name = "") => avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d) ? value : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function AllEmployees() {
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [formError, setFormError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchEmployees = () => {
    setIsLoading(true);
    setFetchError("");
    api
      .get("/api/employees")
      .then((res) => setEmployees(res.data?.data || []))
      .catch((err) =>
        setFetchError(
          err.response?.data?.message ||
          "Unable to load employees from server. Check backend connection and MongoDB Atlas access."
        )
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isAdding) fetchEmployees();
  }, [isAdding]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openNewForm = () => {
    setEditId(null);
    setForm(initialForm);
    setFormError("");
    setIsAdding(true);
  };

  const openEditForm = (emp) => {
    const prefilled = { ...initialForm };
    Object.keys(initialForm).forEach((key) => {
      if (emp[key] !== undefined && emp[key] !== null) prefilled[key] = emp[key];
    });
    setEditId(emp._id);
    setForm(prefilled);
    setFormError("");
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      setFormError("Display Name is required.");
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      const payload = editId ? { ...form, _id: editId } : form;
      await api.post("/api/employees", payload);
      setIsAdding(false);
      setEditId(null);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save employee. Check the backend connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    try {
      await api.delete(`/api/employees/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp._id !== id));
    } catch {
      alert("Failed to delete employee.");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    return (
      (emp.displayName || "").toLowerCase().includes(term) ||
      (emp.employeeId || "").toLowerCase().includes(term) ||
      (emp.email || "").toLowerCase().includes(term)
    );
  });

  if (isAdding) {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>{editId ? "Edit Employee" : "Add New Employee"}</h1>
            <p>{editId ? "Update the employee details below." : "Fill in the details to add a new employee to the organization."}</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setIsAdding(false)}>
              <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }}/>
              Back to List
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editId ? "Update Employee" : "Save Employee"}
            </button>
          </div>
        </div>

        {formError && (
          <div style={{ padding: '12px 18px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', marginBottom: '20px', fontSize: '14px' }}>
            {formError}
          </div>
        )}

        <div className="dashboard-content">
          <div className="form-container">
            {/* Identity Section */}
            <div className="form-section">
              <div className="form-section-title">Identity</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Display Name *</label>
                  <input type="text" name="displayName" value={form.displayName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" name="firstName" value={form.firstName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" name="lastName" value={form.lastName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>User Principal Name</label>
                  <input type="text" name="userPrincipalName" value={form.userPrincipalName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>User Type</label>
                  <select name="userType" value={form.userType} onChange={handleChange}>
                    <option>Member</option>
                    <option>Guest</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Authorization Info</label>
                  <input type="text" name="authorizationInfo" value={form.authorizationInfo} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Account Status *</label>
                  <select name="accountStatus" value={form.accountStatus} onChange={handleChange}>
                    <option>Active</option>
                    <option>Inactive (Disabled)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>User Location (Usage Location)</label>
                  <input type="text" name="usageLocation" value={form.usageLocation} onChange={handleChange} placeholder="e.g. AU" />
                </div>
              </div>
            </div>

            {/* Job Information Section */}
            <div className="form-section">
              <div className="form-section-title">Job Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Job Title</label>
                  <input type="text" name="jobTitle" value={form.jobTitle} onChange={handleChange} placeholder="e.g. Security Officer" />
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input type="text" name="companyName" value={form.companyName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <select name="department" value={form.department} onChange={handleChange}>
                    <option>CEO</option>
                    <option>Production Lead</option>
                    <option>Stock Room</option>
                    <option>Production Room</option>
                    <option>Lead Manager</option>
                    <option>Sales</option>
                    <option>IT</option>
                    <option>HR</option>
                    <option>Finance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Employee ID</label>
                  <input type="text" name="employeeId" value={form.employeeId} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Employee Type</label>
                  <select name="employeeType" value={form.employeeType} onChange={handleChange}>
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Contract</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Employee Hire Date</label>
                  <input type="date" name="hireDate" value={form.hireDate} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Office Location</label>
                  <input type="text" name="officeLocation" value={form.officeLocation} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Manager</label>
                  <select name="manager" value={form.manager} onChange={handleChange}>
                    <option value="">Search and select manager...</option>
                    {employees
                      .filter((emp) => emp._id !== editId)
                      .map((emp) => (
                        <option key={emp._id} value={emp.displayName}>{emp.displayName}</option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Sponsors</label>
                  <input type="text" name="sponsors" value={form.sponsors} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Shift Start Time</label>
                  <input type="time" name="shiftStartTime" value={form.shiftStartTime} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Shift End Time</label>
                  <input type="time" name="shiftEndTime" value={form.shiftEndTime} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="form-section">
              <div className="form-section-title">Personal Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Street Address</label>
                  <input type="text" name="streetAddress" value={form.streetAddress} onChange={handleChange} placeholder="Sydney" />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="e.g. Melbourne" />
                </div>
                <div className="form-group">
                  <label>State or Province</label>
                  <select name="state" value={form.state} onChange={handleChange}>
                    <option>Victoria</option>
                    <option>NSW</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>ZIP or Postal Code</label>
                  <input type="text" name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="e.g. 3000" />
                </div>
                <div className="form-group">
                  <label>Country or Region</label>
                  <input type="text" name="country" value={form.country} onChange={handleChange} placeholder="e.g. Australia" />
                </div>
                <div className="form-group">
                  <label>Business Phone</label>
                  <input type="text" name="businessPhone" value={form.businessPhone} onChange={handleChange} placeholder="e.g. +61 3 9000 0000" />
                </div>
                <div className="form-group">
                  <label>Mobile Phone</label>
                  <input type="text" name="mobilePhone" value={form.mobilePhone} onChange={handleChange} placeholder="e.g. +61 400 000 000" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="e.g. employee@company.com" />
                </div>
                <div className="form-group">
                  <label>Other Emails</label>
                  <input type="email" name="otherEmails" value={form.otherEmails} onChange={handleChange} placeholder="e.g. personal@email.com" />
                </div>
                <div className="form-group">
                  <label>Fax Number</label>
                  <input type="text" name="faxNumber" value={form.faxNumber} onChange={handleChange} placeholder="e.g. +61 3 9000 0001" />
                </div>
                <div className="form-group">
                  <label>Mail Nickname</label>
                  <input type="text" name="mailNickname" value={form.mailNickname} onChange={handleChange} placeholder="e.g. sumitk" />
                </div>
              </div>
            </div>

            {/* Parental Controls Section */}
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title">Parental Controls</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Age Group</label>
                  <select name="ageGroup" value={form.ageGroup} onChange={handleChange}>
                    <option>Adult</option>
                    <option>Minor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Consent Provided for Minor</label>
                  <select name="consentForMinor" value={form.consentForMinor} onChange={handleChange}>
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Employee</h1>
          <p>View and manage employee</p>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-primary" onClick={openNewForm}>
            <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Add Employee
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="employee-content-container" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div className="employee-table-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
            <div className="eth-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="eth-icon" style={{ backgroundColor: '#fff0ec', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <Users size={20} color="#ff6b4a" />
              </div>
              <h2 style={{ fontSize: '18px', margin: 0, color: '#475569' }}>Total Employee : <strong style={{ color: '#0f172a' }}>{employees.length} persons</strong></h2>
            </div>
            <div className="eth-right" style={{ display: 'flex', gap: '12px' }}>
              <div className="search-box" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '250px' }}>
                <Search size={16} color="#94a3b8" />
                <input type="text" placeholder="Search payroll or name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%' }} />
              </div>
              <button className="btn-filter" onClick={fetchEmployees} title="Refresh" style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#0f172a' }}>
                <RefreshCw size={16} />
              </button>
              <button className="btn-filter" style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#0f172a' }}>
                <Filter size={16} /> Filter
              </button>
              <button className="btn-sort" style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#0f172a' }}>
                <ArrowUpDown size={16} /> Sort
              </button>
            </div>
          </div>

            <div className="employee-list-view">
              <table className="employee-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '16px 8px', color: '#64748b', fontWeight: '500', fontSize: '14px' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '16px 8px', color: '#64748b', fontWeight: '500', fontSize: '14px' }}>Payroll</th>
                    <th style={{ textAlign: 'left', padding: '16px 8px', color: '#64748b', fontWeight: '500', fontSize: '14px' }}>Department</th>
                    <th style={{ textAlign: 'left', padding: '16px 8px', color: '#64748b', fontWeight: '500', fontSize: '14px' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '16px 8px', color: '#64748b', fontWeight: '500', fontSize: '14px' }}>Joining Date</th>
                    <th style={{ textAlign: 'left', padding: '16px 8px', color: '#64748b', fontWeight: '500', fontSize: '14px' }}>Contract Type</th>
                    <th style={{ textAlign: 'center', padding: '16px 8px', color: '#64748b', fontWeight: '500', fontSize: '14px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading employees...</td></tr>
                  ) : fetchError ? (
                    <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>{fetchError}</td></tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No employees found. Click "Add Employee" to create one.</td></tr>
                  ) : (
                    filteredEmployees.map(emp => (
                      <tr key={emp._id} onClick={() => openEditForm(emp)} title="Click to view & edit" style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <td style={{ padding: '16px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.displayName || '?')}&background=${getAvatarBg(emp.displayName)}&color=fff`} alt={emp.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                            <div>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>{emp.displayName}</div>
                              <div style={{ color: '#64748b', fontSize: '13px' }}>{emp.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 8px', color: '#0f172a' }}>{emp.employeeId || '-'}</td>
                        <td style={{ padding: '16px 8px' }}>
                          <span className={`dept-badge ${(emp.department || '').toLowerCase()}`}>
                            <span className="dept-dot"></span> {emp.department || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', color: '#0f172a' }}>{emp.jobTitle || '-'}</td>
                        <td style={{ padding: '16px 8px', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CalendarIcon size={14} /> {formatDate(emp.hireDate)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 8px' }}>
                          <span className={`contract-badge ${(emp.employeeType || '').toLowerCase().replace(' ', '-')}`}>
                            {emp.employeeType || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                          <button onClick={(e) => handleDelete(e, emp._id)} title="Delete" style={{ background: 'transparent', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          <div className="table-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
            <div style={{ color: '#64748b', fontSize: '14px' }}>Showing {filteredEmployees.length} of {employees.length} entries</div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default AllEmployees;