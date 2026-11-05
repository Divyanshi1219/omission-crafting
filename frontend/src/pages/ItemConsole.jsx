import { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Package,
  X,
  Save,
  Edit3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "../api";
import "./ItemConsole.css";

// Quick chip input component
function ChipInput({ chips = [], onChange, placeholder, chipColor = "blue", disabled = false }) {
  const [inputVal, setInputVal] = useState("");

  const addChip = () => {
    const val = inputVal.trim();
    if (!val) return;
    if (chips.some((c) => c.toLowerCase() === val.toLowerCase())) {
      setInputVal("");
      return;
    }
    onChange([...chips, val]);
    setInputVal("");
  };

  const removeChip = (idx) => {
    onChange(chips.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addChip();
    }
  };

  return (
    <div className="chip-input-wrapper">
      <div className="chip-list">
        {chips.map((chip, idx) => (
          <span key={idx} className={`chip ${chipColor}`}>
            {chip}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeChip(idx)}
                className="chip-remove"
                title="Remove"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {chips.length === 0 && <span className="chip-empty-note">None added yet</span>}
      </div>

      {!disabled && (
        <div className="chip-input-row">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          <button type="button" onClick={addChip} className="chip-add-btn" title="Add">
            <Plus size={14} /> Add
          </button>
        </div>
      )}
    </div>
  );
}

const DEFAULT_STANDARD_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];

export default function ItemConsole() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [alert, setAlert] = useState(null);

  // New item form state - default standard sizes prefilled to reduce clicks
  const [newName, setNewName] = useState("");
  const [newFabrics, setNewFabrics] = useState([]);
  const [newSizes, setNewSizes] = useState([...DEFAULT_STANDARD_SIZES]);
  const [newColors, setNewColors] = useState([]);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editFabrics, setEditFabrics] = useState([]);
  const [editSizes, setEditSizes] = useState([]);
  const [editColors, setEditColors] = useState([]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/items");
      if (res.data?.data) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching items:", err);
      showAlert("error", err.response?.data?.message || "Error loading items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      showAlert("error", "Please enter item name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/api/items", {
        name: trimmed,
        fabrics: newFabrics,
        sizes: newSizes,
        colors: newColors,
      });

      if (res.data?.success) {
        showAlert("success", `Item "${trimmed}" added.`);
        setNewName("");
        setNewFabrics([]);
        setNewSizes([...DEFAULT_STANDARD_SIZES]);
        setNewColors([]);
        fetchItems();
      }
    } catch (err) {
      console.error("Error adding item:", err);
      showAlert("error", err.response?.data?.message || "Failed to add item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete item "${record.name}"?`)) return;

    try {
      const res = await api.delete(`/api/items/${record._id}`);
      if (res.data?.success) {
        showAlert("success", `Item "${record.name}" deleted.`);
        if (editingId === record._id) setEditingId(null);
        fetchItems();
      }
    } catch (err) {
      console.error("Error deleting:", err);
      showAlert("error", err.response?.data?.message || "Failed to delete.");
    }
  };

  const startEdit = (record) => {
    setEditingId(record._id);
    setEditName(record.name || "");
    setEditFabrics([...(record.fabrics || [])]);
    setEditSizes(
      record.sizes && record.sizes.length > 0
        ? [...record.sizes]
        : [...DEFAULT_STANDARD_SIZES]
    );
    setEditColors([...(record.colors || [])]);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (record) => {
    try {
      const res = await api.put(`/api/items/${record._id}`, {
        name: editName.trim() || record.name,
        fabrics: editFabrics,
        sizes: editSizes,
        colors: editColors,
      });
      if (res.data?.success) {
        showAlert("success", `Item "${record.name}" updated.`);
        setEditingId(null);
        fetchItems();
      }
    } catch (err) {
      console.error("Error updating:", err);
      showAlert("error", err.response?.data?.message || "Failed to update.");
    }
  };

  // Helper presets for quick size filling
  const addStandardSizes = (isEdit = false) => {
    const std = ["S", "M", "L", "XL", "XXL", "XXXL"];
    if (isEdit) {
      setEditSizes(Array.from(new Set([...editSizes, ...std])));
    } else {
      setNewSizes(Array.from(new Set([...newSizes, ...std])));
    }
  };

  const filteredList = items.filter((it) =>
    (it.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="item-console-page">
      {/* Header */}
      <div className="console-header-container">
        <div className="console-title-group">
          <h1>
            <SlidersHorizontal size={24} color="#2563eb" />
            Console
          </h1>
          <p>Control items, fabrics, sizes and colors</p>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`console-alert ${alert.type}`}>
          {alert.type === "success" ? (
            <CheckCircle2 size={18} color="#059669" />
          ) : (
            <AlertCircle size={18} color="#dc2626" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Add New Item */}
      <div className="console-card">
        <div className="console-card-header">
          <h2>
            <Plus size={18} color="#2563eb" />
            Add New Item
          </h2>
        </div>

        <form onSubmit={handleAdd} className="add-item-form-unified">
          <div className="form-field-group">
            <label htmlFor="itemName">Item Name *</label>
            <input
              id="itemName"
              type="text"
              placeholder="e.g. Hoodie, T-Shirt, Cap"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div className="form-field-group">
            <label>Fabrics for this item</label>
            <ChipInput
              chips={newFabrics}
              onChange={setNewFabrics}
              placeholder="Type fabric name & press Enter (e.g. Fleece, Cotton)"
              chipColor="blue"
            />
          </div>

          <div className="form-field-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Sizes for this item</label>
              {!DEFAULT_STANDARD_SIZES.every((s) => newSizes.includes(s)) && (
                <button
                  type="button"
                  className="btn-link-preset"
                  onClick={() => addStandardSizes(false)}
                >
                  + Add S, M, L, XL, XXL, XXXL
                </button>
              )}
            </div>
            <ChipInput
              chips={newSizes}
              onChange={setNewSizes}
              placeholder="Type size & press Enter (e.g. M, L, XL)"
              chipColor="green"
            />
          </div>

          <div className="form-field-group">
            <label>Colors for this item</label>
            <ChipInput
              chips={newColors}
              onChange={setNewColors}
              placeholder="Type color & press Enter (e.g. Black, White, Navy)"
              chipColor="purple"
            />
          </div>

          <button type="submit" className="btn-add-item" disabled={isSubmitting}>
            <Plus size={16} />
            {isSubmitting ? "Saving..." : "Save Item"}
          </button>
        </form>
      </div>

      {/* Items List */}
      <div className="console-card">
        <div className="table-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>
              Items ({filteredList.length})
            </h2>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="search-box-console">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={fetchItems}
              title="Refresh"
              type="button"
              style={{
                border: "1px solid #e2e8f0",
                background: "white",
                borderRadius: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="items-list-unified">
          {isLoading && items.length === 0 ? (
            <div className="empty-state">Loading...</div>
          ) : filteredList.length === 0 ? (
            <div className="empty-state">No items found.</div>
          ) : (
            filteredList.map((record) => {
              const isEditing = editingId === record._id;

              return (
                <div key={record._id} className="item-card-unified">
                  <div className="item-card-top">
                    <div className="item-name-cell">
                      <div className="item-icon-tag">
                        <Package size={16} />
                      </div>
                      <div>
                        {isEditing ? (
                          <input
                            type="text"
                            className="edit-name-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Item name"
                          />
                        ) : (
                          <span className="item-card-name">{record.name}</span>
                        )}
                        <span className="item-card-meta">
                          {(record.fabrics || []).length} fabrics · {(record.sizes || []).length} sizes · {(record.colors || []).length} colors
                        </span>
                      </div>
                    </div>

                    <div className="item-card-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="btn-save-item"
                            onClick={() => saveEdit(record)}
                          >
                            <Save size={14} />
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn-cancel-item"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-edit-item"
                            onClick={() => startEdit(record)}
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-delete-item"
                            onClick={() => handleDelete(record)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Normal View: Chips preview */}
                  {!isEditing && (
                    <div className="item-chips-preview">
                      <div className="chip-preview-group">
                        <span className="chip-label">Fabrics:</span>
                        {(record.fabrics || []).length > 0 ? (
                          (record.fabrics || []).map((f, i) => (
                            <span key={i} className="chip blue small">{f}</span>
                          ))
                        ) : (
                          <span className="chip-none">All / None</span>
                        )}
                      </div>

                      <div className="chip-preview-group">
                        <span className="chip-label">Sizes:</span>
                        {(record.sizes || []).length > 0 ? (
                          (record.sizes || []).map((s, i) => (
                            <span key={i} className="chip green small">{s}</span>
                          ))
                        ) : (
                          <span className="chip-none">Standard S-XXXL</span>
                        )}
                      </div>

                      <div className="chip-preview-group">
                        <span className="chip-label">Colors:</span>
                        {(record.colors || []).length > 0 ? (
                          (record.colors || []).map((c, i) => (
                            <span key={i} className="chip purple small">{c}</span>
                          ))
                        ) : (
                          <span className="chip-none">Any (text input)</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edit View: Interactive ChipInputs */}
                  {isEditing && (
                    <div className="item-edit-section">
                      <div className="form-field-group">
                        <label>Fabrics</label>
                        <ChipInput
                          chips={editFabrics}
                          onChange={setEditFabrics}
                          placeholder="Type fabric & press Enter"
                          chipColor="blue"
                        />
                      </div>

                      <div className="form-field-group">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <label>Sizes</label>
                          {!DEFAULT_STANDARD_SIZES.every((s) => editSizes.includes(s)) && (
                            <button
                              type="button"
                              className="btn-link-preset"
                              onClick={() => addStandardSizes(true)}
                            >
                              + Add S, M, L, XL, XXL, XXXL
                            </button>
                          )}
                        </div>
                        <ChipInput
                          chips={editSizes}
                          onChange={setEditSizes}
                          placeholder="Type size & press Enter"
                          chipColor="green"
                        />
                      </div>

                      <div className="form-field-group">
                        <label>Colors</label>
                        <ChipInput
                          chips={editColors}
                          onChange={setEditColors}
                          placeholder="Type color & press Enter"
                          chipColor="purple"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
