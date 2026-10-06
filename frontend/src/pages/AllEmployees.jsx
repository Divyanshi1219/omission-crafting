import { useState } from "react";
import { Search, Plus, ArrowLeft } from "lucide-react";

function AllEmployees() {
  const [isAdding, setIsAdding] = useState(false);

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

      <div className="page-header">
        <div>
          <h1>All Employees</h1>
          <p>Manage and view all employees.</p>
        </div>

        <div className="header-actions">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search employee..." />
          </div>
          <button className="btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Role Level</th>
                <th>Job Title</th>
                <th>Department</th>
                <th>Employee ID</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="6" className="empty-state">
                  No employees found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default AllEmployees;