import { useState } from "react";
import { Search, Plus, ArrowLeft, X, MapPin, Users, List, Grid, Filter, ArrowUpDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import "./EmployeeCards.css";

const employees = [
  { id: 1, name: "Jane Cooper", email: "janecoop@gmail.com", payroll: "121948ASH3", department: "Finance", role: "Sr. Accountant", joiningDate: "Feb 23, 2025", contractType: "Full-time", avatarBg: "#0f172a" },
  { id: 2, name: "Brooklyn Simmons", email: "brooklynsmms@gmail.com", payroll: "BHABHD127", department: "Engineer", role: "Lead. Back End Dev", joiningDate: "Feb 18, 2025", contractType: "Freelance", avatarBg: "#1e293b" },
  { id: 3, name: "Leslie Alexander", email: "alexanderls@gmail.com", payroll: "18219ADANJ", department: "Product", role: "Jr. Technical Product", joiningDate: "Dec 25, 2024", contractType: "Internship", avatarBg: "#334155" },
  { id: 4, name: "Esther Howard", email: "esthrhoward@gmail.com", payroll: "MMZKAO811", department: "Finance", role: "Lead. Accountant", joiningDate: "Jan 10, 2025", contractType: "Part-time", avatarBg: "#eab308" },
  { id: 5, name: "Cameron Williamson", email: "williamcn@gmail.com", payroll: "HSASH8188", department: "Engineer", role: "Sr. DevOps", joiningDate: "Mar 30, 2025", contractType: "Freelance", avatarBg: "#64748b" },
  { id: 6, name: "Albert Flores", email: "albertflrs@gmail.com", payroll: "NXAHCH100", department: "Marketing", role: "Jr. Digital Marketing", joiningDate: "Oct 4, 2024", contractType: "Part-time", avatarBg: "#94a3b8" },
  { id: 7, name: "Annette Black", email: "annetblack@gmail.com", payroll: "SJABV81742", department: "Engineer", role: "Jr. Front End Dev", joiningDate: "Dec 19, 2024", contractType: "Internship", avatarBg: "#cbd5e1" },
  { id: 8, name: "Darlene Robertson", email: "darlenerobert@gmail.com", payroll: "71738KAON", department: "Marketing", role: "Sr. Content Writer", joiningDate: "Jan 28, 2025", contractType: "Full-time", avatarBg: "#0f172a" },
  { id: 9, name: "Grande Ariana", email: "grandeari@gmail.com", payroll: "JAHDG6661", department: "Product", role: "Lead. Product Manager", joiningDate: "Feb 12, 2025", contractType: "Full-time", avatarBg: "#f43f5e" }
];

const getWorkloadColor = (workload) => {
  if (workload > 80) return "#d97706"; // orange
  return "#059669"; // green
};

function AllEmployees() {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  if (isAdding) {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>Add New Employee</h1>
            <p>Fill in the details to add a new employee to the organization.</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setIsAdding(false)}>
              <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }}/>
              Back to List
            </button>
            <button className="btn-primary">
              Save Employee
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="form-container">
            {/* Identity Section */}
            <div className="form-section">
              <div className="form-section-title">Identity</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Display Name *</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>User Principal Name</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>User Type</label>
                  <select>
                    <option>Member</option>
                    <option>Guest</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Authorization Info</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>Account Status *</label>
                  <select>
                    <option>Active</option>
                    <option>Inactive (Disabled)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>User Location (Usage Location)</label>
                  <input type="text" placeholder="e.g. AU" />
                </div>
              </div>
            </div>

            {/* Job Information Section */}
            <div className="form-section">
              <div className="form-section-title">Job Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Job Title</label>
                  <input type="text" placeholder="e.g. Security Officer" />
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <select>
                    <option>IT</option>
                    <option>HR</option>
                    <option>Finance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Employee ID</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>Employee Type</label>
                  <select>
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Contract</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Employee Hire Date</label>
                  <input type="date" />
                </div>
                <div className="form-group">
                  <label>Office Location</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>Manager</label>
                  <select>
                    <option>Search and select manager...</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sponsors</label>
                  <input type="text" />
                </div>
                <div className="form-group">
                  <label>Shift Start Time</label>
                  <input type="time" defaultValue="08:00" />
                </div>
                <div className="form-group">
                  <label>Shift End Time</label>
                  <input type="time" defaultValue="20:00" />
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="form-section">
              <div className="form-section-title">Personal Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Street Address</label>
                  <input type="text" placeholder="Sydney" />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" placeholder="e.g. Melbourne" />
                </div>
                <div className="form-group">
                  <label>State or Province</label>
                  <select>
                    <option>Victoria</option>
                    <option>NSW</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>ZIP or Postal Code</label>
                  <input type="text" placeholder="e.g. 3000" />
                </div>
                <div className="form-group">
                  <label>Country or Region</label>
                  <input type="text" placeholder="e.g. Australia" />
                </div>
                <div className="form-group">
                  <label>Business Phone</label>
                  <input type="text" placeholder="e.g. +61 3 9000 0000" />
                </div>
                <div className="form-group">
                  <label>Mobile Phone</label>
                  <input type="text" placeholder="e.g. +61 400 000 000" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="e.g. employee@company.com" />
                </div>
                <div className="form-group">
                  <label>Other Emails</label>
                  <input type="email" placeholder="e.g. personal@email.com" />
                </div>
                <div className="form-group">
                  <label>Fax Number</label>
                  <input type="text" placeholder="e.g. +61 3 9000 0001" />
                </div>
                <div className="form-group">
                  <label>Mail Nickname</label>
                  <input type="text" placeholder="e.g. sumitk" />
                </div>
              </div>
            </div>

            {/* Parental Controls Section */}
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title">Parental Controls</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Age Group</label>
                  <select>
                    <option>Adult</option>
                    <option>Minor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Consent Provided for Minor</label>
                  <select>
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
          <button className="btn-primary" onClick={() => setIsAdding(true)}>
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
              <h2 style={{ fontSize: '18px', margin: 0, color: '#475569' }}>Total Employee : <strong style={{ color: '#0f172a' }}>1285 persons</strong></h2>
            </div>
            <div className="eth-right" style={{ display: 'flex', gap: '12px' }}>
              <div className="search-box" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '250px' }}>
                <Search size={16} color="#94a3b8" />
                <input type="text" placeholder="Search payroll or name" style={{ border: 'none', outline: 'none', width: '100%' }} />
              </div>
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
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={`https://ui-avatars.com/api/?name=${emp.name.replace(' ', '+')}&background=${emp.avatarBg.replace('#', '')}&color=fff`} alt={emp.name} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                          <div>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{emp.name}</div>
                            <div style={{ color: '#64748b', fontSize: '13px' }}>{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', color: '#0f172a' }}>{emp.payroll}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <span className={`dept-badge ${emp.department.toLowerCase()}`}>
                          <span className="dept-dot"></span> {emp.department}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', color: '#0f172a' }}>{emp.role}</td>
                      <td style={{ padding: '16px 8px', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarIcon size={14} /> {emp.joiningDate}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <span className={`contract-badge ${emp.contractType.toLowerCase().replace(' ', '-')}`}>
                          {emp.contractType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          <div className="table-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
            <div style={{ color: '#64748b', fontSize: '14px' }}>Showing 1 to 10 of 100 entries</div>
            <div className="pagination-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn-page active">1</button>
              <button className="btn-page">2</button>
              <button className="btn-page">3</button>
              <button className="btn-page">4</button>
              <button className="btn-page">5</button>
              <span style={{ color: '#94a3b8' }}>...</span>
              <button className="btn-page">10</button>
            </div>
            <div className="pagination-nav" style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-nav"><ChevronLeft size={16} /> Back</button>
              <button className="btn-nav">Next <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel Overlay */}
      <div className={`side-panel-overlay ${selectedEmployee ? 'open' : ''}`} onClick={() => setSelectedEmployee(null)}></div>
      
      {/* Side Panel */}
      <div className={`side-panel ${selectedEmployee ? 'open' : ''}`}>
        {selectedEmployee && (
          <div className="side-panel-content">
            <button className="close-panel-btn" onClick={() => setSelectedEmployee(null)}>
              <X size={20} />
            </button>

            <div className="sp-header">
              <div className="sp-avatar" style={{ backgroundColor: selectedEmployee.avatarBg }}>
                {selectedEmployee.initials}
              </div>
              <h2>{selectedEmployee.name}</h2>
              <p>{selectedEmployee.role}</p>
              
              <div className="sp-meta">
                <span><MapPin size={14} /> Lisbon</span>
                <span><Users size={14} /> {selectedEmployee.department}</span>
                <span className="sp-online-status">
                  <span className={`sp-dot ${selectedEmployee.status}`}></span>
                  {selectedEmployee.status === 'online' ? 'Online' : 'Away'}
                </span>
              </div>
            </div>

            <div className="sp-stats-row">
              <div className="sp-stat-box">
                <h3>{selectedEmployee.openTasks}</h3>
                <p>Open</p>
              </div>
              <div className="sp-stat-box">
                <h3>{selectedEmployee.completedTasks}</h3>
                <p>Done</p>
              </div>
              <div className="sp-stat-box">
                <h3>{selectedEmployee.workload}%</h3>
                <p>Load</p>
              </div>
            </div>

            <div className="sp-tasks-section">
              <h4>Assigned tasks</h4>
              <div className="sp-task-list">
                <div className="sp-task-item">
                  <span className="task-dot in-progress"></span>
                  <span className="task-name">Design login & sign-up screens</span>
                  <span className="task-status">In progress</span>
                </div>
                <div className="sp-task-item">
                  <span className="task-dot done"></span>
                  <span className="task-name">Monorepo cleanup</span>
                  <span className="task-status">Done</span>
                </div>
                <div className="sp-task-item">
                  <span className="task-dot done"></span>
                  <span className="task-name">Dashboard analytics widgets</span>
                  <span className="task-status">Done</span>
                </div>
              </div>
            </div>

            <div className="sp-actions">
              <button className="btn-msg">Message</button>
              <button className="btn-assign">+ Assign task</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default AllEmployees;