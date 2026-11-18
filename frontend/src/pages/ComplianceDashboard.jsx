import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  FileCheck,
  Clock,
  Search,
  ChevronRight,
  BadgeCheck,
  Sparkles,
  Building2
} from "lucide-react";
import "./ComplianceDashboard.css";

const auditsData = [
  {
    id: "AUD-2026-01",
    standard: "OEKO-TEX® Standard 100",
    category: "Fabric Quality & Safety",
    description: "Certification for harmful substances in textiles and raw materials",
    agency: "Hohenstein Textile Testing",
    validTill: "31 Dec 2027",
    status: "verified",
    statusLabel: "Certified Valid",
    score: "100%"
  },
  {
    id: "AUD-2026-02",
    standard: "GOTS (Global Organic Textile)",
    category: "Sustainability & Environment",
    description: "Processing standard for organic fibres throughout the supply chain",
    agency: "Control Union Certifications",
    validTill: "15 Oct 2027",
    status: "verified",
    statusLabel: "Certified Valid",
    score: "98.5%"
  },
  {
    id: "AUD-2026-03",
    standard: "ISO 9001:2015 Quality Management",
    category: "Quality Management",
    description: "Quality management systems for garment manufacturing & printing",
    agency: "Bureau Veritas",
    validTill: "24 Jun 2027",
    status: "verified",
    statusLabel: "Certified Valid",
    score: "99.0%"
  },
  {
    id: "AUD-2026-04",
    standard: "Factory License & Fire Safety NOC",
    category: "Workplace Safety & Labor",
    description: "Industrial safety, fire evacuation drills, and building structural clearance",
    agency: "Directorate of Industrial Safety",
    validTill: "28 Feb 2027",
    status: "verified",
    statusLabel: "Compliant",
    score: "100%"
  },
  {
    id: "AUD-2026-05",
    standard: "Pollution Control Board (PCB) Consent",
    category: "Environmental & Effluents",
    description: "Air and zero liquid discharge water treatment adherence",
    agency: "State Pollution Control Board",
    validTill: "18 Dec 2026",
    status: "due-soon",
    statusLabel: "Renewal In Progress",
    score: "95.0%"
  },
  {
    id: "AUD-2026-06",
    standard: "Statutory Labor & ESI/PF Register",
    category: "Workplace Safety & Labor",
    description: "Fair wages, provident fund deposits, and working hour limits",
    agency: "Ministry of Labour & Employment",
    validTill: "Continuous (Monthly)",
    status: "verified",
    statusLabel: "100% Filed",
    score: "100%"
  }
];

export default function ComplianceDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAudit, setSelectedAudit] = useState(null);

  const filteredAudits = useMemo(() => {
    return auditsData.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        a.standard.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.agency.toLowerCase().includes(q) ||
        a.statusLabel.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  return (
    <div className="compliance-container">
      {/* 4 Summary KPI Cards */}
      <div className="compliance-kpi-grid">
        <div className="compliance-kpi-card">
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Compliance Score</span>
            <div className="compliance-kpi-icon-wrap compliance-kpi-icon-green">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="compliance-kpi-body">
            <span className="compliance-kpi-value">98.6%</span>
            <span className="compliance-kpi-subtext">Grade A+ (Exemplary)</span>
          </div>
        </div>

        <div className="compliance-kpi-card">
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Active Certifications</span>
            <div className="compliance-kpi-icon-wrap compliance-kpi-icon-blue">
              <Award size={20} />
            </div>
          </div>
          <div className="compliance-kpi-body">
            <span className="compliance-kpi-value">6 / 6</span>
            <span className="compliance-kpi-subtext">All verified valid</span>
          </div>
        </div>

        <div className="compliance-kpi-card">
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Material Lab Pass</span>
            <div className="compliance-kpi-icon-wrap compliance-kpi-icon-purple">
              <FileCheck size={20} />
            </div>
          </div>
          <div className="compliance-kpi-body">
            <span className="compliance-kpi-value">99.4%</span>
            <span className="compliance-kpi-subtext">GSM & Color bleed test</span>
          </div>
        </div>

        <div className="compliance-kpi-card">
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Audit Health</span>
            <div className="compliance-kpi-icon-wrap compliance-kpi-icon-amber">
              <Clock size={20} />
            </div>
          </div>
          <div className="compliance-kpi-body">
            <span className="compliance-kpi-value">1 Due</span>
            <span className="compliance-kpi-subtext neutral">PCB renewal ongoing</span>
          </div>
        </div>
      </div>

      {/* 4 Core Pillars Grid */}
      <div className="compliance-pillars-grid">
        {/* Pillar 1 */}
        <div className="compliance-pillar-card">
          <div className="compliance-pillar-header">
            <div className="compliance-pillar-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="compliance-pillar-title">Fabric & Material Quality</h3>
              <p className="compliance-pillar-desc">Chemical testing, GSM tolerances, and weave standards</p>
            </div>
          </div>
          <div className="compliance-pillar-items">
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>OEKO-TEX® Non-Toxic Raw Materials</span>
              </div>
              <span className="compliance-check-badge">Pass</span>
            </div>
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>GSM Tolerance Verification (±3% range)</span>
              </div>
              <span className="compliance-check-badge">99.2%</span>
            </div>
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>AATCC Color Fastness & Wash Test</span>
              </div>
              <span className="compliance-check-badge">Grade 4.5/5</span>
            </div>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="compliance-pillar-card">
          <div className="compliance-pillar-header">
            <div className="compliance-pillar-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="compliance-pillar-title">Factory & Workplace Safety</h3>
              <p className="compliance-pillar-desc">Fire protection, occupational safety, and ergonomics</p>
            </div>
          </div>
          <div className="compliance-pillar-items">
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>Factory Inspector Clearance NOC</span>
              </div>
              <span className="compliance-check-badge">Valid</span>
            </div>
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>PPE & Floor Safety Equipment</span>
              </div>
              <span className="compliance-check-badge">100% Active</span>
            </div>
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>Automated Fire Extinguishers & Drills</span>
              </div>
              <span className="compliance-check-badge">Drill Passed</span>
            </div>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="compliance-pillar-card">
          <div className="compliance-pillar-header">
            <div className="compliance-pillar-icon" style={{ background: "#faf5ff", color: "#9333ea" }}>
              <BadgeCheck size={20} />
            </div>
            <div>
              <h3 className="compliance-pillar-title">Labor Standards & Statutory</h3>
              <p className="compliance-pillar-desc">Fair wages, social security, and non-discrimination</p>
            </div>
          </div>
          <div className="compliance-pillar-items">
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>Zero Tolerance Child / Forced Labor</span>
              </div>
              <span className="compliance-check-badge">100% Verified</span>
            </div>
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>ESI & EPF Statutory Dues</span>
              </div>
              <span className="compliance-check-badge">Up to Date</span>
            </div>
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>Working Hour & Overtime Adherence</span>
              </div>
              <span className="compliance-check-badge">Biometric Monitored</span>
            </div>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="compliance-pillar-card">
          <div className="compliance-pillar-header">
            <div className="compliance-pillar-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="compliance-pillar-title">Environment & Sustainability</h3>
              <p className="compliance-pillar-desc">Eco-friendly inks, water treatment, and zero hazardous waste</p>
            </div>
          </div>
          <div className="compliance-pillar-items">
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>AZO-Free & REACH Compliant Inks</span>
              </div>
              <span className="compliance-check-badge">Certified</span>
            </div>
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>Recyclable & Biodegradable Packaging</span>
              </div>
              <span className="compliance-check-badge">Active</span>
            </div>
            <div className="compliance-check-item">
              <div className="compliance-check-left">
                <CheckCircle2 size={16} color="#059669" />
                <span>Effluent Treatment Plant (ETP) pH 7.2</span>
              </div>
              <span className="compliance-check-badge">Normal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audits & Certifications Table */}
      <div className="compliance-main-card">
        <div className="compliance-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Award size={18} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Certifications & Regulatory Register</h3>
          </div>

          <div style={{ position: "relative", width: 320 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search standards, agency, category..."
              className="delivery-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="compliance-table-wrap">
          <table className="compliance-table">
            <thead>
              <tr>
                <th>Standard / License</th>
                <th>Category</th>
                <th>Certifying Agency</th>
                <th>Validity</th>
                <th>Compliance Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudits.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{a.standard}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{a.description}</div>
                  </td>
                  <td>
                    <span className="compliance-category-tag">{a.category}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.agency}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Score: {a.score}</div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Clock size={13} color="#64748b" />
                      <span>{a.validTill}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`compliance-status-badge ${a.status}`}>
                      <CheckCircle2 size={13} />
                      {a.statusLabel}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="delivery-action-btn"
                      onClick={() => setSelectedAudit(a)}
                    >
                      Certificate <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {selectedAudit && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setSelectedAudit(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 18,
              maxWidth: 540,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 18
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="compliance-kpi-icon-wrap compliance-kpi-icon-green">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedAudit.standard}</h3>
                  <span style={{ fontSize: 12, color: "#64748b" }}>ID: {selectedAudit.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ border: "2px dashed #cbd5e1", borderRadius: 12, padding: 20, textAlign: "center", background: "#f8fafc" }}>
              <Award size={48} color="#059669" style={{ margin: "0 auto 10px" }} />
              <h4 style={{ margin: "0 0 6px", fontSize: 16 }}>Official Certificate of Compliance</h4>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                Audited & verified by <strong>{selectedAudit.agency}</strong>
              </p>
              <div style={{ marginTop: 12, display: "inline-block", padding: "4px 14px", background: "#ecfdf5", color: "#059669", borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                Status: {selectedAudit.statusLabel} ({selectedAudit.score})
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Category:</span>
                <strong>{selectedAudit.category}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Validity:</span>
                <strong>{selectedAudit.validTill}</strong>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <span style={{ color: "#64748b", display: "block" }}>Scope & Description:</span>
                <span>{selectedAudit.description}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="delivery-action-btn"
                style={{ padding: "8px 16px" }}
                onClick={() => setSelectedAudit(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
