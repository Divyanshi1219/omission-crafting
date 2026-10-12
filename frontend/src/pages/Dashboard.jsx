import { useState, useEffect } from "react";
import api from "../api";
import { LayoutGrid, FileText, Users, Calendar, UserCheck, Clock, Calendar as CalendarIcon, ChevronDown, MoreHorizontal, ArrowRight, UserPlus, UserMinus, Filter, X, MapPin, Search, Plus } from "lucide-react";
import "./EmployeeCards.css";

const employees = [
  { id: 1, name: "Noah Castell", initials: "NC", role: "Project Lead", department: "Management", openTasks: 0, completedTasks: 48, workload: 64, avatarBg: "#ffedd5", status: "online" },
  { id: 2, name: "Priya Raman", initials: "PR", role: "Product Designer", department: "Design", openTasks: 1, completedTasks: 35, workload: 72, avatarBg: "#e2e8f0", status: "online" },
  { id: 3, name: "Mateo Silva", initials: "MS", role: "Backend Engineer", department: "Engineering", openTasks: 2, completedTasks: 51, workload: 88, avatarBg: "#d1fae5", status: "online" },
  { id: 4, name: "Hana Kobayashi", initials: "HK", role: "Frontend Engineer", department: "Engineering", openTasks: 1, completedTasks: 33, workload: 56, avatarBg: "#e0e7ff", status: "away" },
  { id: 5, name: "Owen Mercer", initials: "OM", role: "Frontend Engineer", department: "Engineering", openTasks: 2, completedTasks: 42, workload: 79, avatarBg: "#fef08a", status: "online" },
  { id: 6, name: "Sofia Sato", initials: "SS", role: "QA Engineer", department: "Engineering", openTasks: 1, completedTasks: 27, workload: 41, avatarBg: "#f3e8ff", status: "away" },
  { id: 7, name: "Maya Kovac", initials: "MK", role: "Brand Designer", department: "Design", openTasks: 2, completedTasks: 24, workload: 50, avatarBg: "#dbeafe", status: "away" },
  { id: 8, name: "Liam Reyes", initials: "LR", role: "Marketing Lead", department: "Marketing", openTasks: 1, completedTasks: 30, workload: 67, avatarBg: "#ffedd5", status: "away" }
];

const getWorkloadColor = (workload) => {
  if (workload > 80) return "#d97706"; // orange
  return "#059669"; // green
};

function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  useEffect(() => {
    api.get("/api/health")
      .then((response) => {
        console.log("Backend connected:", response.data);
      })
      .catch((error) => {
        console.error("Backend connection failed:", error);
      });
  }, []);

  return (
    <div className="dashboard-page">

      <div className="dashboard-tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <LayoutGrid size={18} /> Overview
        </button>
        <button className={`tab ${activeTab === 'case' ? 'active' : ''}`} onClick={() => setActiveTab('case')}>
          <FileText size={18} /> Order Management
        </button>
        <button className={`tab ${activeTab === 'employee' ? 'active' : ''}`} onClick={() => setActiveTab('employee')}>
          <Users size={18} /> Employee Management
        </button>
        <button className={`tab ${activeTab === 'leave' ? 'active' : ''}`} onClick={() => setActiveTab('leave')}>
          <Calendar size={18} /> Leave Management
        </button>
      </div>

      <div className="page-header dashboard-header">
        <div>
          <h1>
            {activeTab === 'overview' && 'Overview'}
            {activeTab === 'case' && 'Order Management'}
            {activeTab === 'employee' && 'Employee Management'}
            {activeTab === 'leave' && 'Leave Management'}
          </h1>
          {activeTab === 'employee' && <p style={{ color: '#64748b', marginTop: '4px' }}>Manage and view all employees.</p>}
        </div>

        <div className="date-picker">
          <CalendarIcon size={16} />
          <span>Monday, October 5, 2026</span>
          <ChevronDown size={16} />
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="dashboard-content">

          <div className="tiles-grid">
            {/* Tile 1 */}
            <div className="tile tile-blue">
              <div className="tile-header">
                <div className="icon-wrapper blue"><Users size={20} /></div>
              </div>
              <div className="tile-title">TOTAL EMPLOYEES</div>
              <div className="tile-value">0</div>
              <div className="tile-footer">
                <span className="link-text">View all employees <ArrowRight size={14} /></span>
              </div>
            </div>

            {/* Tile 2 */}
            <div className="tile tile-green">
              <div className="tile-header">
                <div className="icon-wrapper green"><UserCheck size={20} /></div>
              </div>
              <div className="tile-title">ACTIVE EMPLOYEES</div>
              <div className="tile-value">0</div>
              <div className="tile-footer">
                <span className="badge green">0% of total</span>
              </div>
            </div>

            {/* Tile 3 */}
            <div className="tile tile-orange">
              <div className="tile-header">
                <div className="icon-wrapper orange"><Clock size={20} /></div>
              </div>
              <div className="tile-title">ON LEAVE TODAY</div>
              <div className="tile-value">0</div>
              <div className="tile-footer">
                <span className="badge orange">0% of total</span>
              </div>
            </div>
          </div>

          <div className="charts-row top-row">
            {/* Sales Overview */}
            <div className="chart-card sales-overview-card hover-scale" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="sales-header">
                <div className="sales-header-left">
                  <h3><LayoutGrid size={16} color="#64748b" /> Sales Overview</h3>
                  <h1>$ 9,257.51</h1>
                  <div className="sales-stats">
                    <span className="sales-badge">15.8% <ArrowRight size={14} style={{ transform: 'rotate(-45deg)' }} /></span>
                    <span>+ $143.50 increased</span>
                  </div>
                </div>
              </div>

              <div className="sales-chart-container reveal-animation" style={{ position: 'relative', width: '100%', marginTop: '20px' }}>
                <svg viewBox="0 0 600 250" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                  {(() => {
                    const data = [
                      { month: 'Oct', total: '$2,988,20', stacks: [35, 40, 40, 10, 5] },
                      { month: 'Nov', total: '$1,765,09', stacks: [18, 22, 18, 26, 12] },
                      { month: 'Dec', total: '$4,005,65', stacks: [55, 45, 40, 22, 12] }
                    ];
                    const colors = ['#5b52d6', '#8b78f6', '#4da1ff', '#1cd4c8', '#7df3e1'];
                    const colWidth = 80;
                    const gap = 4;
                    const xCenters = [100, 300, 500];
                    const elements = [];

                    // Calculate rects
                    const rectData = data.map((d, i) => {
                      let currentY = 220;
                      const xLeft = xCenters[i] - colWidth / 2;
                      return d.stacks.map((h, j) => {
                        const yTop = currentY - h;
                        currentY = yTop - gap;
                        return { xLeft, yTop, h, color: colors[j], stackIdx: j, monthIdx: i };
                      });
                    });

                    // Draw flows
                    for (let i = 0; i < rectData.length - 1; i++) {
                      rectData[i].forEach((rect1, j) => {
                        const rect2 = rectData[i + 1][j];
                        const path = `M ${rect1.xLeft + colWidth} ${rect1.yTop} L ${rect2.xLeft} ${rect2.yTop} L ${rect2.xLeft} ${rect2.yTop + rect2.h} L ${rect1.xLeft + colWidth} ${rect1.yTop + rect1.h} Z`;
                        elements.push(<path key={`flow-${i}-${j}`} d={path} fill={rect1.color} opacity="0.12" />);
                      });
                    }

                    // Draw rects
                    rectData.forEach((monthStacks, i) => {
                      monthStacks.forEach((rect, j) => {
                        elements.push(
                          <rect key={`rect-${i}-${j}`} x={rect.xLeft} y={rect.yTop} width={colWidth} height={rect.h} fill={rect.color} rx="6" />
                        );
                      });

                      // Month labels and Totals
                      const topRect = monthStacks[monthStacks.length - 1];
                      elements.push(
                        <text key={`total-${i}`} x={xCenters[i]} y={topRect.yTop - 15} textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">{data[i].total}</text>
                      );
                      elements.push(
                        <text key={`label-${i}`} x={xCenters[i]} y="245" textAnchor="middle" fontSize="14" fill="#64748b">{data[i].month}</text>
                      );
                    });

                    return elements;
                  })()}
                </svg>
              </div>

              <div className="sales-legend">
                {['China', 'UE', 'USA', 'Canada', 'Other'].map((label, i) => (
                  <div key={label} className="legend-item" style={{ fontSize: '13px' }}>
                    <span className="dot" style={{ background: ['#5b52d6', '#8b78f6', '#4da1ff', '#1cd4c8', '#7df3e1'][i] }}></span> {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="right-column-charts">
              {/* Gauge Chart */}
              <div className="chart-card hover-scale" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="chart-header" style={{ marginBottom: '16px' }}>
                  <div className="chart-title-sec">
                    <div>
                      <h3>Repeat Customer Rate</h3>
                    </div>
                  </div>
                  <div className="chart-actions">
                    <MoreHorizontal size={20} className="more-icon" />
                  </div>
                </div>
                
                <div className="gauge-body reveal-animation" style={{ flex: 1 }}>
                  <div className="gauge-container">
                    <svg viewBox="0 0 200 120" className="gauge-svg">
                      {Array.from({ length: 40 }).map((_, i) => {
                        const totalTicks = 40;
                        const activeTicks = Math.round(totalTicks * 0.68);
                        const angle = Math.PI - (i / (totalTicks - 1)) * Math.PI;
                        const radius = 80;
                        const cx = 100;
                        const cy = 100;
                        const x1 = cx + (radius - 12) * Math.cos(angle);
                        const y1 = cy - (radius - 12) * Math.sin(angle);
                        const x2 = cx + (radius + 12) * Math.cos(angle);
                        const y2 = cy - (radius + 12) * Math.sin(angle);
                        
                        return (
                          <line 
                            key={i}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="#e2e8f0"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className={i < activeTicks ? "gauge-tick gauge-tick-active" : "gauge-tick"}
                            style={i < activeTicks ? { animationDelay: `${i * 0.04}s` } : {}}
                          />
                        );
                      })}
                    </svg>
                    <div className="gauge-content">
                      <div className="gauge-value">68%</div>
                      <div className="gauge-subtext">On track for 80% target</div>
                      <button className="gauge-btn">Show details</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Most Day Active Chart */}
              <div className="chart-card hover-scale" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="chart-header" style={{ marginBottom: '8px' }}>
                  <div className="chart-title-sec">
                    <div>
                      <h3>Most Day Active</h3>
                    </div>
                  </div>
                  <div className="chart-actions">
                    <MoreHorizontal size={20} className="more-icon" />
                  </div>
                </div>
                <div className="chart-body reveal-animation" style={{ flex: 1, padding: 0, display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 300 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {(() => {
                      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fr', 'Sat'];
                      const values = [60, 45, 95, 50, 35, 65, 75];
                      const maxVal = 100;
                      const colW = 20;
                      const spacing = (300 - (7 * colW)) / 8;
                      
                      return days.map((day, i) => {
                        const h = (values[i] / maxVal) * 100;
                        const x = spacing + i * (colW + spacing);
                        const y = 120 - h;
                        const isTue = day === 'Tue';
                        
                        return (
                          <g key={day} className="chart-bar-group">
                            <rect x={x} y={y} width={colW} height={h} rx="10" fill={isTue ? "#4da1ff" : "#f1f5f9"} className="active-day-bar" style={{ transition: 'all 0.3s' }} />
                            <text x={x + colW/2} y="140" textAnchor="middle" fontSize="12" fill={isTue ? "#4da1ff" : "#94a3b8"} fontWeight={isTue ? "600" : "400"}>{day}</text>
                            {isTue && <text x={x + colW/2} y={y - 8} textAnchor="middle" fontSize="12" fill="#0f172a" fontWeight="600">8.162</text>}
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="charts-row bottom-row">
            <div className="chart-card hover-scale">
              <div className="chart-header">
                <div className="chart-title-sec">
                  <div>
                    <h3>Onboarding</h3>
                    <p>Employee onboarding status overview</p>
                  </div>
                </div>
              </div>
              <div className="chart-body centered reveal-animation" style={{ padding: '20px 0' }}>
                <div className="pie-container" style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                    <circle className="pie-slice" cx="50" cy="50" r="40" fill="transparent" stroke="#4da1ff" strokeWidth="16" strokeDashoffset="0" style={{ '--target-dash': 150, animation: 'drawPieSlice 1.2s ease-out forwards' }} />
                    <circle className="pie-slice" cx="50" cy="50" r="40" fill="transparent" stroke="#34d399" strokeWidth="16" strokeDashoffset="-150" style={{ '--target-dash': 60, animation: 'drawPieSlice 1.2s ease-out forwards', animationDelay: '0.2s' }} />
                    <circle className="pie-slice" cx="50" cy="50" r="40" fill="transparent" stroke="#fbbf24" strokeWidth="16" strokeDashoffset="-210" style={{ '--target-dash': 41.3, animation: 'drawPieSlice 1.2s ease-out forwards', animationDelay: '0.4s' }} />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>Total</span>
                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>124</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-card hover-scale">
              <div className="chart-header">
                <div className="chart-title-sec">
                  <div>
                    <h3>Offboarding</h3>
                    <p>Employee offboarding status overview</p>
                  </div>
                </div>
              </div>
              <div className="chart-body centered reveal-animation" style={{ padding: '20px 0' }}>
                <div className="pie-container" style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                    <circle className="pie-slice" cx="50" cy="50" r="40" fill="transparent" stroke="#f87171" strokeWidth="16" strokeDashoffset="0" style={{ '--target-dash': 180, animation: 'drawPieSlice 1.2s ease-out forwards' }} />
                    <circle className="pie-slice" cx="50" cy="50" r="40" fill="transparent" stroke="#8b78f6" strokeWidth="16" strokeDashoffset="-180" style={{ '--target-dash': 71.3, animation: 'drawPieSlice 1.2s ease-out forwards', animationDelay: '0.3s' }} />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>Total</span>
                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>45</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'employee' && (
        <div className="dashboard-content">
          <div className="employee-cards-grid">
            {employees.map(emp => (
              <div key={emp.id} className="employee-card">
                <div className="emp-card-header">
                  <div className="emp-avatar" style={{ backgroundColor: emp.avatarBg }}>
                     {emp.initials}
                     <span className={`emp-status ${emp.status}`}></span>
                  </div>
                  <h3 className="emp-name">{emp.name}</h3>
                  <p className="emp-role">{emp.role}</p>
                  <span className="emp-badge">{emp.department}</span>
                </div>
                <div className="emp-stats">
                  <div className="emp-stat">
                    <h4>{emp.openTasks}</h4>
                    <p>Open leads</p>
                  </div>
                  <div className="emp-stat">
                    <h4>{emp.completedTasks}</h4>
                    <p>Completed</p>
                  </div>
                </div>
                <div className="emp-workload">
                  <div className="workload-header">
                    <span>Workload</span>
                    <span>{emp.workload}%</span>
                  </div>
                  <div className="workload-bar-bg">
                    <div className="workload-bar-fill" style={{ width: `${emp.workload}%`, backgroundColor: getWorkloadColor(emp.workload) }}></div>
                  </div>
                </div>
                <div className="emp-actions">
                  <button className="btn-msg">Message</button>
                  <button className="btn-profile" onClick={() => setSelectedEmployee(emp)}>Profile</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side Panel Overlay */}
      {activeTab === 'employee' && (
        <div className={`side-panel-overlay ${selectedEmployee ? 'open' : ''}`} onClick={() => setSelectedEmployee(null)}></div>
      )}
      
      {/* Side Panel */}
      {activeTab === 'employee' && (
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
      )}

    </div>
  );
}

export default Dashboard;