import { useState } from "react";
import {
  Lightbulb,
  Mail,
  Building2,
  User,
  Boxes,
  Scissors,
  ClipboardList,
  CheckCircle2,
  Clock,
  RotateCcw,
  Package,
  Printer,
  LayoutTemplate,
  ArrowRight,
} from "lucide-react";
import "./DemoIdeasPage.css";

/**
 * ============================================================
 *  DEMO PAGE IDEAS  (STANDALONE MOCK — NOT CONNECTED TO APP)
 * ============================================================
 *  Purpose: client-facing UI proposals for a future "Order
 *  Progress" visibility feature. A dropdown lets you switch
 *  between Idea 1 / Idea 2 / Idea 3.
 *
 *  - Idea 1: Lead form replica + two tabs ABOVE the form
 *            ("Status of Stock Room Manager" / "Status of
 *            Production Lead Manager"). Click a tab and that
 *            task's status shows immediately.
 *  - Idea 2: Status chips row on top of the lead form.
 *  - Idea 3: Thin forward-moving progress strip on top of
 *            the lead form (breadcrumb-like line).
 *
 *  All data below is MOCK. Nothing here touches the API,
 *  the database, or any flow of the real app.
 * ============================================================
 */

const MOCK_ORDER = {
  employeeName: "Divyanshi",
  query: "Order",
  orderId: "ORD00016",
  taskId: "TSK00016",
  companyName: "ABC Corporate Gifts",
  contactPerson: "Mr. Rahul Mehta",
  contactNo: "+91 98765 43210",
  email: "rahul@abccorporate.in",
  stage: "Sample",
  subStage: "Order",
  productCategory: "Customised (Product)",
  itemName: "Engraved wooden plaques with company logo",
  totalQuantity: 250,
  totalPrice: "₹ 45,000",
  orderDetails:
    "Sample order: 250 pcs laser-engraved plaques. Logo artwork attached in lead form.",
  address: "Plot 14, MIDC Industrial Area, Pune — 411019",
  placedOn: "Mon, 27 Oct — 10:24 AM",
};

const MOCK_STOCK_TASK = {
  id: "TSK00016-S",
  assignee: "Elena Rostova",
  role: "Stock Room Manager",
  status: "Completed",
  steps: [
    { label: "Ready to Pick", done: true, time: "Today — 8:40 AM" },
    { label: "Staging Room", done: true, time: "Today — 9:00 AM" },
    { label: "Completed", done: true, time: "Today — 9:15 AM" },
  ],
  note: "250 pcs picked from Central Warehouse and staged for production.",
};

const MOCK_PRODUCTION_TASK = {
  id: "TSK00016-P",
  assignee: "Marcus Vance",
  role: "Production Lead Manager",
  status: "In Progress",
  steps: [
    { label: "Order", done: true, time: "Today — 9:30 AM" },
    { label: "Logo Cutting", done: true, time: "Today — 11:02 AM" },
    { label: "Printing", done: false, time: "Started Today — 11:20 AM" },
    { label: "Ready to Pick Up", done: false, time: "" },
  ],
  note: "Logos cut and prepared. Printing is running right now — approx. completion by tomorrow morning.",
  referredExample:
    "Logo mismatch on 40 pcs — corrected file requested from Sales (Divyanshi).",
};

function readOnlyField(label, value, { wide = false } = {}) {
  return (
    <div className={`dip-field ${wide ? "dip-field-wide" : ""}`} key={label}>
      <label>{label}</label>
      <div className="dip-field-box">{value}</div>
    </div>
  );
}

/* ---------- Shared: read-only lead form replica ---------- */
function LeadFormReplica() {
  const o = MOCK_ORDER;
  return (
    <div className="dip-form-card">
      <div className="dip-form-head">
        <LayoutTemplate size={16} />
        <span>Lead Form — {o.orderId} (read-only preview)</span>
      </div>
      <div className="dip-form-grid">
        {readOnlyField("Employee Name", o.employeeName, { wide: true })}
        {readOnlyField("Query", o.query, { wide: true })}
        {readOnlyField("Company Name", o.companyName, { wide: true })}
        {readOnlyField("Contact Person", o.contactPerson)}
        {readOnlyField("Contact No.", o.contactNo)}
        {readOnlyField("Email", o.email)}
        {readOnlyField("Address", o.address)}
        {readOnlyField("Product Category", o.productCategory)}
        {readOnlyField("Item Name", o.itemName)}
        {readOnlyField("Total Quantity", `${o.totalQuantity} pcs`)}
        {readOnlyField("Total Price", o.totalPrice)}
        {readOnlyField("Order Details", o.orderDetails, { wide: true })}
        {readOnlyField("Stage / Sub-stage", `${o.stage} → ${o.subStage}`, {
          wide: true,
        })}
      </div>
    </div>
  );
}

/* ---------- Shared: order identity strip ---------- */
function OrderStrip() {
  const o = MOCK_ORDER;
  return (
    <div className="dip-order-strip">
      <div className="dip-order-id">
        <strong>{o.orderId}</strong>
        <span className="dip-chip dip-chip-blue">{o.taskId}</span>
        <span className="dip-chip dip-chip-purple">{o.stage} stage</span>
      </div>
      <div className="dip-order-meta">
        <Building2 size={13} /> {o.companyName}
        <User size={13} style={{ marginLeft: 10 }} /> {o.employeeName} (Sales)
        <ClipboardList size={13} style={{ marginLeft: 10 }} /> Placed{" "}
        {o.placedOn}
      </div>
    </div>
  );
}

/* ---------- Shared: individual task status panel ---------- */
function TaskStatusPanel({ task, isProduction }) {
  const Icon = isProduction ? Scissors : Boxes;
  const doneCount = task.steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / task.steps.length) * 100);
  const allDone = task.status === "Completed";
  return (
    <div className="dip-task-panel">
      <div className="dip-task-head">
        <div className="dip-task-who">
          <Icon size={17} />
          <div>
            <strong>{task.role}</strong>
            <span>
              {task.assignee} · Task {task.id}
            </span>
          </div>
        </div>
        <span
          className={`dip-chip ${allDone ? "dip-chip-green" : "dip-chip-blue"}`}
        >
          {allDone ? <CheckCircle2 size={12} /> : <Clock size={12} />}{" "}
          {task.status}
        </span>
      </div>

      <div className="dip-mini-track">
        <div className="dip-mini-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="dip-mini-steps">
        {task.steps.map((s, i) => (
          <div
            className={`dip-mini-step ${s.done ? "done" : s.time ? "active" : ""}`}
            key={i}
          >
            <span className="dip-mini-dot">
              {s.done ? "✓" : s.time ? "●" : ""}
            </span>
            <span className="dip-mini-label">
              {s.label}
              {s.time && <em>{s.time}</em>}
            </span>
          </div>
        ))}
      </div>

      <div className="dip-task-note">
        <strong>Latest update:</strong> {task.note}
      </div>

      {isProduction && (
        <div className="dip-ref-box">
          <RotateCcw size={13} />
          <span>
            <strong>If referred vack:</strong> the line bounces to this step in
            red and Divyanshi sees "Action needed" in her form itself —{" "}
            <em>{task.referredExample}</em>
          </span>
        </div>
      )}
    </div>
  );
}

/* ================= IDEA 1 ================= */
function IdeaOne() {
  const [activeTab, setActiveTab] = useState("stock");

  return (
    <div className="dip-idea-wrap">
      {/* <div className="dip-idea-desc">
        <strong></strong> the same lead form, with two tabs placed ABOVE it —
        "Status of Stock Room Manager" and "Status of Production Lead Manager".
        Click a tab and that task's status appears immediately. No extra clicks, no new pages.
      </div> */}

      <OrderStrip />

      {/* THE TWO TABS (this is where the tab will sit above the form) */}
      <div className="dip-tabs">
        <button
          className={`dip-tab ${activeTab === "stock" ? "active" : ""}`}
          onClick={() => setActiveTab("stock")}
        >
          <Boxes size={15} />
          Status of Stock Room Manager
          <span
            className={`dip-tab-dot ${MOCK_STOCK_TASK.status === "Completed" ? "done" : ""}`}
          />
        </button>
        <button
          className={`dip-tab ${activeTab === "production" ? "active" : ""}`}
          onClick={() => setActiveTab("production")}
        >
          <Scissors size={15} />
          Status of Production Lead Manager
          <span
            className={`dip-tab-dot ${MOCK_PRODUCTION_TASK.status === "Completed" ? "done" : "live"}`}
          />
        </button>
      </div>

      {activeTab === "stock" && (
        <TaskStatusPanel task={MOCK_STOCK_TASK} isProduction={false} />
      )}
      {activeTab === "production" && (
        <TaskStatusPanel task={MOCK_PRODUCTION_TASK} isProduction={true} />
      )}

      <LeadFormReplica />
    </div>
  );
}

/* ================= IDEA 2 ================= */
function IdeaTwo() {
  return (
    <div className="dip-idea-wrap">
      {/* <div className="dip-idea-desc">
        <strong>My idea 2 (compact chips):</strong> instead of two tabs, a
        single row of small status chips sits on top of the form. Both tasks
        visible AT THE SAME TIME — zero clicks. Each chip is clickable only if
        more detail is needed (optional).
      </div> */}

      <OrderStrip />

      <div className="dip-chip-row">
        <div className="dip-chip-card chip-done">
          <Boxes size={16} />
          <div>
            <strong>Stock Room — Completed</strong>
            <span>Elena · picked & staged 250 pcs · 9:15 AM</span>
          </div>
          <CheckCircle2 size={16} className="chip-end" />
        </div>

        <div className="dip-chip-card chip-live">
          <Scissors size={16} />
          <div>
            <strong>Production — Printing</strong>
            <span>Marcus · logos cut ✓ · printing since 11:20 AM</span>
          </div>
          <Clock size={16} className="chip-end" />
        </div>

        <div className="dip-chip-card chip-upcoming">
          <Package size={16} />
          <div>
            <strong>Ready to Pick Up</strong>
            <span>Waiting — after printing completes</span>
          </div>
          <ArrowRight size={16} className="chip-end" />
        </div>
      </div>

      <LeadFormReplica />
    </div>
  );
}

/* ================= IDEA 3 ================= */
function IdeaThree() {
  const steps = [
    { label: "Order Created", status: "done", by: "Divyanshi" },
    { label: "Approved", status: "done", by: "Sarah" },
    { label: "Stock", status: "done", by: "Elena" },
    { label: "Logo Cutting", status: "done", by: "Marcus" },
    { label: "Printing", status: "active", by: "Marcus" },
    { label: "Ready to Pick Up", status: "pending", by: "Stock Room" },
    { label: "Staging Ground", status: "pending", by: "Stock Room" },
    { label: "Client Approval", status: "pending", by: "Client" },
  ];

  return (
    <div className="dip-idea-wrap">
      {/* <div className="dip-idea-desc">
        a thin forward-moving line across the top of the form — like a
        parcel-tracking bar. Fills up automatically as Stock & Production update
        their tasks. Hovering a step shows who did it and when. Most compact
        option, always visible.
      </div> */}

      <OrderStrip />

      {/* THE THIN STRIP */}
      <div className="dip-strip-card">
        <div className="dip-strip-line">
          {steps.map((s, i) => (
            <div className={`dip-strip-step ${s.status}`} key={i}>
              <span className="dip-strip-dot">
                {s.status === "done" ? "✓" : s.status === "active" ? "●" : ""}
              </span>
              <span className="dip-strip-label">{s.label}</span>
              <span className="dip-strip-by">{s.by}</span>
              {i < steps.length - 1 && (
                <span
                  className={`dip-strip-joint ${steps[i + 1].status === "pending" ? "grey" : "filled"}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="dip-strip-note">
          🔵 <strong>Printing in progress</strong> — Marcus Vance (Production),
          started Today 11:20 AM. Next: Ready to Pick Up.
        </div>
      </div>

      <LeadFormReplica />
    </div>
  );
}

/* ================= PAGE ================= */
export default function DemoIdeasPage() {
  const [idea, setIdea] = useState("1");

  return (
    <div className="dip-page">
      {/* Demo banner — proves this page is standalone & removable */}
      {/* <div className="dip-banner">
        <Lightbulb size={15} />
        <span>
          <strong>DEMO PAGE IDEAS</strong> — pure sample data, not connected to
          orders, tasks, or the database. Temporary page for client review; will
          be removed after the idea is approved.
        </span>
      </div> */}

      {/* <div className="dip-head">
        <h2>Order Progress — UI Ideas</h2>
        <p>
          How Divyanshi (Sales) can see the live progress of her order's Stock
          Room & Production tasks — inside the order, without extra clicks.
        </p>
      </div> */}

      {/* Dropdown to choose idea */}
      <div className="dip-picker">
        <label>Show idea:</label>
        <select value={idea} onChange={(e) => setIdea(e.target.value)}>
          <option value="1">
            Idea 1 — Lead form + two status tabs (your idea)
          </option>
          <option value="2">Idea 2 — Status chips row (no clicks)</option>
          <option value="3">
            Idea 3 — Thin progress strip (parcel-tracking line)
          </option>
        </select>
      </div>

      {idea === "1" && <IdeaOne />}
      {idea === "2" && <IdeaTwo />}
      {idea === "3" && <IdeaThree />}

      <div className="dip-footer-note">
        <Mail size={13} />
        <span>
          Green = completed · Blue = happening now · Grey = upcoming · Red =
          referred back. In the real integration this comes directly from the
          tasks created for each order.
        </span>
      </div>
    </div>
  );
}
