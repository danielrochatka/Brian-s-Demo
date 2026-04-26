"use client";

import { useEffect, useMemo, useState } from "react";

type FieldType = "text" | "number" | "currency" | "date" | "checkbox" | "dropdown";

type SheetField = {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};

type SheetRecord = {
  id: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type Sheet = {
  id: string;
  title: string;
  fields: SheetField[];
  records: SheetRecord[];
};

const fieldTypes: FieldType[] = ["text", "number", "currency", "date", "checkbox", "dropdown"];

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState<string | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [sheetTitle, setSheetTitle] = useState("");
  const [message, setMessage] = useState("Demo only: passwords are in plain text in server memory.");

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const [recordDraft, setRecordDraft] = useState<Record<string, unknown>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem("demo_token");
    if (existing) {
      setToken(existing);
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("demo_token", token);
      void refreshSheets(token);
    } else {
      localStorage.removeItem("demo_token");
      setSheets([]);
      setSelectedSheetId(null);
    }
  }, [token]);

  const selectedSheet = useMemo(
    () => sheets.find((s) => s.id === selectedSheetId) ?? null,
    [sheets, selectedSheetId]
  );

  async function api(path: string, options: RequestInit = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Request failed");
    }
    return data;
  }

  async function refreshSheets(authToken = token) {
    if (!authToken) return;
    const res = await fetch("/api/sheets", { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.status === 401) {
      setToken(null);
      return;
    }
    const data = await res.json();
    const loadedSheets = (data.sheets ?? []) as Sheet[];
    setSheets(loadedSheets);
    if (loadedSheets.length && !selectedSheetId) {
      setSelectedSheetId(loadedSheets[0].id);
    }
    if (selectedSheetId && !loadedSheets.some((s) => s.id === selectedSheetId)) {
      setSelectedSheetId(loadedSheets[0]?.id ?? null);
    }
  }

  async function handleAuth() {
    try {
      const path = mode === "login" ? "/api/login" : "/api/register";
      const data = await api(path, { method: "POST", body: JSON.stringify({ email, password }) });
      if (mode === "register") {
        setMessage("Account created. Now login.");
        setMode("login");
      } else {
        setToken(data.token);
        setMessage("Logged in.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed");
    }
  }

  async function createSheet() {
    if (!sheetTitle.trim()) return;
    try {
      await api("/api/sheets", { method: "POST", body: JSON.stringify({ title: sheetTitle }) });
      setSheetTitle("");
      await refreshSheets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create sheet");
    }
  }

  async function createSample() {
    try {
      await api("/api/sheets/sample", { method: "POST" });
      await refreshSheets();
      setMessage("Sample Checkbook sheet created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create sample");
    }
  }

  async function addField() {
    if (!selectedSheet || !newFieldName.trim()) return;
    try {
      await api(`/api/sheets/${selectedSheet.id}/fields`, {
        method: "POST",
        body: JSON.stringify({
          name: newFieldName,
          type: newFieldType,
          required: newFieldRequired,
          options: newFieldType === "dropdown" ? newFieldOptions.split(",").map((s) => s.trim()).filter(Boolean) : undefined
        })
      });
      setNewFieldName("");
      setNewFieldOptions("");
      setNewFieldRequired(false);
      await refreshSheets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add field");
    }
  }

  async function removeField(fieldId: string) {
    if (!selectedSheet) return;
    await api(`/api/sheets/${selectedSheet.id}/fields`, {
      method: "DELETE",
      body: JSON.stringify({ fieldId })
    });
    await refreshSheets();
  }

  function onValueChange(field: SheetField, value: string | boolean) {
    setRecordDraft((prev) => ({ ...prev, [field.id]: value }));
  }

  async function saveRecord() {
    if (!selectedSheet) return;
    const payload = { values: recordDraft };
    if (editingRecordId) {
      await api(`/api/sheets/${selectedSheet.id}/records/${editingRecordId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setEditingRecordId(null);
    } else {
      await api(`/api/sheets/${selectedSheet.id}/records`, { method: "POST", body: JSON.stringify(payload) });
    }
    setRecordDraft({});
    await refreshSheets();
  }

  async function deleteRow(recordId: string) {
    if (!selectedSheet) return;
    await api(`/api/sheets/${selectedSheet.id}/records/${recordId}`, { method: "DELETE" });
    await refreshSheets();
  }

  function startEdit(record: SheetRecord) {
    setEditingRecordId(record.id);
    setRecordDraft(record.values);
  }

  if (!token) {
    return (
      <main style={styles.centerWrap}>
        <section style={styles.card}>
          <h1>Check Writer / Data Entry Demo</h1>
          <p style={styles.muted}>Create an account and log in. Demo-only authentication.</p>
          <div style={styles.authTabs}>
            <button onClick={() => setMode("login")} style={mode === "login" ? styles.activeTab : styles.tab}>Login</button>
            <button onClick={() => setMode("register")} style={mode === "register" ? styles.activeTab : styles.tab}>Register</button>
          </div>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
          <button onClick={handleAuth} style={styles.primaryBtn}>{mode === "login" ? "Login" : "Create Account"}</button>
          <p style={styles.message}>{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.app}>
      <aside style={styles.sidebar}>
        <h2>Your Sheets</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={styles.input} value={sheetTitle} onChange={(e) => setSheetTitle(e.target.value)} placeholder="New sheet title" />
          <button style={styles.primaryBtn} onClick={createSheet}>Create</button>
        </div>
        <button style={styles.secondaryBtn} onClick={createSample}>Create Sample Checkbook Sheet</button>
        <div style={styles.sheetList}>
          {sheets.map((sheet) => (
            <button key={sheet.id} style={sheet.id === selectedSheetId ? styles.activeSheet : styles.sheetItem} onClick={() => setSelectedSheetId(sheet.id)}>
              {sheet.title}
            </button>
          ))}
        </div>
        <button style={styles.linkBtn} onClick={() => setToken(null)}>Logout</button>
      </aside>

      <section style={styles.mainPanel}>
        {selectedSheet ? (
          <>
            <h1>{selectedSheet.title}</h1>
            <div style={styles.grid2}>
              <section style={styles.block}>
                <h3>Field Builder</h3>
                <div style={styles.rowWrap}>
                  <input style={styles.input} placeholder="Field name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} />
                  <select style={styles.input} value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as FieldType)}>
                    {fieldTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                  <label style={styles.checkboxLabel}><input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} /> Required</label>
                  {newFieldType === "dropdown" && (
                    <input style={styles.input} placeholder="Option A, Option B" value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} />
                  )}
                  <button style={styles.primaryBtn} onClick={addField}>Add Field</button>
                </div>
                <ul style={styles.list}>
                  {selectedSheet.fields.map((field) => (
                    <li key={field.id} style={styles.listItem}>
                      <span>{field.name} ({field.type}) {field.required ? "*" : ""}</span>
                      <button style={styles.dangerBtn} onClick={() => removeField(field.id)}>Delete</button>
                    </li>
                  ))}
                </ul>
              </section>

              <section style={styles.block}>
                <h3>{editingRecordId ? "Edit Record" : "Add Record"}</h3>
                <div style={styles.rowWrap}>
                  {selectedSheet.fields.map((field) => (
                    <FieldInput key={field.id} field={field} value={recordDraft[field.id]} onChange={(v) => onValueChange(field, v)} />
                  ))}
                  <button style={styles.primaryBtn} onClick={saveRecord}>{editingRecordId ? "Update" : "Add"} Record</button>
                </div>
              </section>
            </div>

            <section style={styles.block}>
              <h3>Records</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {selectedSheet.fields.map((field) => <th key={field.id}>{field.name}</th>)}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSheet.records.map((record) => (
                      <tr key={record.id}>
                        {selectedSheet.fields.map((field) => <td key={field.id}>{formatCell(record.values[field.id], field.type)}</td>)}
                        <td style={{ display: "flex", gap: 8 }}>
                          <button style={styles.secondaryBtn} onClick={() => startEdit(record)}>Edit</button>
                          <button style={styles.dangerBtn} onClick={() => deleteRow(record.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <p>Select or create a sheet.</p>
        )}
      </section>
    </main>
  );
}

function formatCell(value: unknown, type: FieldType) {
  if (value === undefined || value === null || value === "") return "—";
  if (type === "checkbox") return value ? "Yes" : "No";
  if (type === "currency") return `$${Number(value).toFixed(2)}`;
  return String(value);
}

function FieldInput({ field, value, onChange }: { field: SheetField; value: unknown; onChange: (v: string | boolean) => void }) {
  if (field.type === "checkbox") {
    return <label style={styles.checkboxLabel}><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> {field.name}</label>;
  }

  if (field.type === "dropdown") {
    return (
      <select style={styles.input} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select {field.name}</option>
        {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  return (
    <input
      style={styles.input}
      type={field.type === "number" || field.type === "currency" ? "number" : field.type === "date" ? "date" : "text"}
      step={field.type === "currency" ? "0.01" : undefined}
      placeholder={field.name}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  centerWrap: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 },
  card: { width: 420, background: "white", borderRadius: 16, padding: 24, boxShadow: "0 6px 30px rgba(0,0,0,0.08)", display: "grid", gap: 12 },
  app: { minHeight: "100vh", display: "grid", gridTemplateColumns: "320px 1fr" },
  sidebar: { background: "#fff", borderRight: "1px solid #e5e7eb", padding: 18, display: "grid", gap: 12, alignContent: "start" },
  mainPanel: { padding: 24, display: "grid", gap: 16 },
  authTabs: { display: "flex", gap: 8 },
  tab: { padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff" },
  activeTab: { padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#eff6ff" },
  input: { border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", width: "100%" },
  primaryBtn: { border: "none", background: "#2563eb", color: "white", borderRadius: 8, padding: "8px 12px" },
  secondaryBtn: { border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: 8, padding: "8px 12px" },
  dangerBtn: { border: "1px solid #ef4444", background: "white", color: "#ef4444", borderRadius: 8, padding: "6px 8px" },
  linkBtn: { border: "none", background: "transparent", color: "#2563eb", textAlign: "left", padding: 0 },
  muted: { color: "#6b7280", marginTop: -8 },
  message: { color: "#1f2937", fontSize: 14 },
  sheetList: { display: "grid", gap: 8 },
  sheetItem: { textAlign: "left", border: "1px solid #d1d5db", borderRadius: 8, background: "white", padding: 10 },
  activeSheet: { textAlign: "left", border: "1px solid #2563eb", borderRadius: 8, background: "#eff6ff", padding: 10 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  block: { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 },
  rowWrap: { display: "grid", gap: 8 },
  list: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 },
  table: { width: "100%", borderCollapse: "collapse" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 8 }
};
