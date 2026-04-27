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
  const [message, setMessage] = useState("Demo only: all data and sessions are stored in memory.");

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const [recordDraft, setRecordDraft] = useState<Record<string, unknown>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  function resetRecordEditor() {
    setEditingRecordId(null);
    setRecordDraft({});
  }

  useEffect(() => {
    const existing = localStorage.getItem("demo_token");
    if (existing) setToken(existing);
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("demo_token", token);
      void refreshSheets(token);
    } else {
      localStorage.removeItem("demo_token");
      setSheets([]);
      setSelectedSheetId(null);
      resetRecordEditor();
    }
  }, [token]);

  const selectedSheet = useMemo(() => sheets.find((s) => s.id === selectedSheetId) ?? null, [sheets, selectedSheetId]);
  const isEditingExistingRecord = useMemo(
    () => !!editingRecordId && !!selectedSheet?.records.some((record) => record.id === editingRecordId),
    [editingRecordId, selectedSheet]
  );

  const amountField = useMemo(
    () => selectedSheet?.fields.find((field) => field.name.toLowerCase().trim() === "amount") ?? null,
    [selectedSheet]
  );

  const demoTotal = useMemo(() => {
    if (!selectedSheet || !amountField) return null;
    return selectedSheet.records.reduce((sum, record) => {
      const raw = record.values[amountField.id];
      const numeric = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(numeric) ? sum + numeric : sum;
    }, 0);
  }, [selectedSheet, amountField]);

  useEffect(() => {
    if (editingRecordId && !isEditingExistingRecord) {
      resetRecordEditor();
    }
  }, [editingRecordId, isEditingExistingRecord]);

  async function api(path: string, options: RequestInit = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      }
    });

    const text = await res.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = {};
      }
    }

    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Request failed");
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

    const data = (await res.json()) as { sheets?: Sheet[] };
    const loadedSheets = data.sheets ?? [];
    setSheets(loadedSheets);

    if (!selectedSheetId && loadedSheets[0]) {
      setSelectedSheetId(loadedSheets[0].id);
      resetRecordEditor();
      return;
    }

    if (selectedSheetId && !loadedSheets.some((sheet) => sheet.id === selectedSheetId)) {
      setSelectedSheetId(loadedSheets[0]?.id ?? null);
      resetRecordEditor();
    }
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      setMessage("Email and password are required.");
      return;
    }

    try {
      const path = mode === "login" ? "/api/login" : "/api/register";
      const data = await api(path, { method: "POST", body: JSON.stringify({ email, password }) });

      if (mode === "register") {
        setMessage("Account created. Please log in.");
        setMode("login");
      } else {
        setToken(String(data.token ?? ""));
        setMessage("Logged in. Create or open a sheet to begin.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  async function createSheet() {
    if (!sheetTitle.trim()) {
      setMessage("Enter a title first.");
      return;
    }

    try {
      const data = await api("/api/sheets", { method: "POST", body: JSON.stringify({ title: sheetTitle }) });
      setSheetTitle("");
      await refreshSheets();
      const created = data.sheet as Sheet | undefined;
      if (created?.id) setSelectedSheetId(created.id);
      setMessage("Sheet created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create sheet");
    }
  }

  async function createSample() {
    try {
      const data = await api("/api/sheets/sample", { method: "POST" });
      await refreshSheets();
      const sample = data.sheet as Sheet | undefined;
      if (sample?.id) setSelectedSheetId(sample.id);
      setMessage("Sample Checkbook ready. Add a row or edit existing sample records.");
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
          options:
            newFieldType === "dropdown"
              ? newFieldOptions
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : undefined
        })
      });
      setNewFieldName("");
      setNewFieldOptions("");
      setNewFieldRequired(false);
      resetRecordEditor();
      await refreshSheets();
      setMessage("Field added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add field");
    }
  }

  async function removeField(fieldId: string) {
    if (!selectedSheet) return;

    try {
      await api(`/api/sheets/${selectedSheet.id}/fields`, {
        method: "DELETE",
        body: JSON.stringify({ fieldId })
      });
      resetRecordEditor();
      await refreshSheets();
      setMessage("Field deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete field");
    }
  }

  function onValueChange(field: SheetField, value: string | boolean) {
    setRecordDraft((prev) => ({ ...prev, [field.id]: value }));
  }

  async function saveRecord() {
    if (!selectedSheet) return;

    const payload = { values: recordDraft };
    const hasValidEditingRecord = !!editingRecordId && selectedSheet.records.some((record) => record.id === editingRecordId);
    const actionLabel = hasValidEditingRecord ? "update" : "create";

    try {
      if (hasValidEditingRecord && editingRecordId) {
        await api(`/api/sheets/${selectedSheet.id}/records/${editingRecordId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setMessage("Record updated.");
      } else {
        await api(`/api/sheets/${selectedSheet.id}/records`, { method: "POST", body: JSON.stringify(payload) });
        setMessage("Record added.");
      }

      resetRecordEditor();
      await refreshSheets();
    } catch (error) {
      const fallbackMessage = actionLabel === "update" ? "Unable to update record" : "Unable to create record";
      setMessage(error instanceof Error ? error.message : fallbackMessage);
    }
  }

  async function deleteRow(recordId: string) {
    if (!selectedSheet) return;

    try {
      await api(`/api/sheets/${selectedSheet.id}/records/${recordId}`, { method: "DELETE" });
      if (editingRecordId === recordId) {
        resetRecordEditor();
      }
      await refreshSheets();
      setMessage("Record deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete record");
    }
  }

  function startEdit(record: SheetRecord) {
    setEditingRecordId(record.id);
    setRecordDraft(record.values);
  }

  function selectSheet(sheetId: string) {
    if (sheetId === selectedSheetId) return;
    setSelectedSheetId(sheetId);
    resetRecordEditor();
  }

  if (!token) {
    return (
      <main style={styles.centerWrap}>
        <section style={styles.card}>
          <h1 style={styles.pageTitle}>Custom Sheet + Checkbook Demo</h1>
          <p style={styles.muted}>
            Create simple custom data-entry sheets, define your own fields, and enter structured rows.
          </p>
          <p style={styles.warningText}>Demo-only app: auth and data are in-memory, and reset on server restart.</p>
          <div style={styles.authTabs}>
            <button onClick={() => setMode("login")} style={mode === "login" ? styles.activeTab : styles.tab}>
              Log in
            </button>
            <button onClick={() => setMode("register")} style={mode === "register" ? styles.activeTab : styles.tab}>
              Register
            </button>
          </div>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <button onClick={handleAuth} style={styles.primaryBtn}>
            {mode === "login" ? "Log in" : "Create account"}
          </button>
          <p style={styles.message}>{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.app}>
      <aside style={styles.sidebar}>
        <h1 style={styles.sidebarTitle}>Demo Dashboard</h1>
        <p style={styles.muted}>Fast path: Log in → Create Sample Checkbook Sheet → Add/Edit/Delete rows.</p>
        <div style={styles.blockAccent}>
          <strong>Demo Notes</strong>
          <ul style={styles.demoNotesList}>
            <li>Data is in memory and resets when the server restarts.</li>
            <li>Auth is demo-only.</li>
            <li>Do not enter real financial data.</li>
            <li>A production build would use a real DB + secure auth.</li>
          </ul>
        </div>

        <h2 style={styles.sectionTitle}>Your Sheets</h2>
        <div style={styles.rowInline}>
          <input
            style={styles.input}
            value={sheetTitle}
            onChange={(e) => setSheetTitle(e.target.value)}
            placeholder="New sheet title"
          />
          <button style={styles.primaryBtn} onClick={createSheet}>
            Create
          </button>
        </div>

        <button style={styles.secondaryBtn} onClick={createSample}>
          Create Sample Checkbook Sheet
        </button>

        <div style={styles.sheetList}>
          {sheets.length === 0 ? (
            <p style={styles.muted}>No sheets yet. Start with the sample checkbook for the quickest demo.</p>
          ) : (
            sheets.map((sheet) => (
              <button
                key={sheet.id}
                style={sheet.id === selectedSheetId ? styles.activeSheet : styles.sheetItem}
                onClick={() => selectSheet(sheet.id)}
              >
                {sheet.title}
              </button>
            ))
          )}
        </div>

        <button style={styles.linkBtn} onClick={() => setToken(null)}>
          Logout
        </button>
      </aside>

      <section style={styles.mainPanel}>
        {selectedSheet ? (
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.pageTitle}>{selectedSheet.title}</h1>
                <p style={styles.muted}>Define fields, enter records, and manage rows inline.</p>
              </div>
              <p style={styles.message}>{message}</p>
            </div>

            <div style={styles.grid2}>
              <section style={styles.builderBlock}>
                <h3>Field Builder</h3>
                <p style={styles.muted}>Create the columns for this custom sheet.</p>
                <div style={styles.rowWrap}>
                  <input
                    style={styles.input}
                    placeholder="Field name"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                  />
                  <select style={styles.input} value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as FieldType)}>
                    {fieldTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} />
                    Required
                  </label>
                  {newFieldType === "dropdown" && (
                    <input
                      style={styles.input}
                      placeholder="Option A, Option B"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                    />
                  )}
                  <button style={styles.primaryBtn} onClick={addField}>
                    Add Field
                  </button>
                </div>

                <ul style={styles.list}>
                  {selectedSheet.fields.length === 0 ? (
                    <li style={styles.muted}>No fields yet. Add your first field to start collecting rows.</li>
                  ) : (
                    selectedSheet.fields.map((field) => (
                      <li key={field.id} style={styles.listItem}>
                        <span>
                          {field.name} ({field.type}) {field.required ? "*" : ""}
                        </span>
                        <button style={styles.dangerBtn} onClick={() => removeField(field.id)}>
                          Delete
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section style={styles.entryBlock}>
                <h3>{isEditingExistingRecord ? "Edit Record" : "Add Record"}</h3>
                <p style={styles.muted}>Enter values for each field, then save the row.</p>
                <div style={styles.rowWrap}>
                  {selectedSheet.fields.map((field) => (
                    <FieldInput
                      key={field.id}
                      field={field}
                      value={recordDraft[field.id]}
                      onChange={(value) => onValueChange(field, value)}
                    />
                  ))}
                  <button style={styles.primaryBtn} onClick={saveRecord}>
                    {isEditingExistingRecord ? "Update" : "Add"} Record
                  </button>
                </div>
              </section>
            </div>

            <section style={styles.block}>
              <div style={styles.headerRow}>
                <h3>Records</h3>
                {demoTotal !== null && (
                  <div style={styles.totalBadge}>
                    Demo Total: <strong>{formatCurrency(demoTotal)}</strong>
                  </div>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {selectedSheet.fields.map((field) => (
                        <th key={field.id} style={styles.th}>
                          {field.name}
                        </th>
                      ))}
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSheet.records.length === 0 ? (
                      <tr>
                        <td colSpan={selectedSheet.fields.length + 1} style={styles.emptyCell}>
                          No records yet. Add your first row using the form above.
                        </td>
                      </tr>
                    ) : (
                      selectedSheet.records.map((record) => (
                        <tr key={record.id}>
                          {selectedSheet.fields.map((field) => (
                            <td key={field.id} style={styles.td}>
                              {formatCell(record.values[field.id], field.type)}
                            </td>
                          ))}
                          <td style={styles.td}>
                            <div style={styles.rowInline}>
                              <button style={styles.secondaryBtn} onClick={() => startEdit(record)}>
                                Edit
                              </button>
                              <button style={styles.dangerBtn} onClick={() => deleteRow(record.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section style={styles.block}>
            <h2>Select or create a sheet</h2>
            <p style={styles.muted}>Tip: Click “Create Sample Checkbook Sheet” to demo immediately.</p>
          </section>
        )}
      </section>
    </main>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatCell(value: unknown, type: FieldType) {
  if (value === undefined || value === null || value === "") return "—";
  if (type === "checkbox") return value ? "Yes" : "No";
  if (type === "currency") {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? formatCurrency(numeric) : "—";
  }
  return String(value);
}

function FieldInput({
  field,
  value,
  onChange
}: {
  field: SheetField;
  value: unknown;
  onChange: (v: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label style={styles.checkboxLabel}>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> {field.name}
      </label>
    );
  }

  if (field.type === "dropdown") {
    return (
      <select style={styles.input} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select {field.name}</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
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
  card: {
    width: 470,
    maxWidth: "100%",
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 6px 30px rgba(0,0,0,0.08)",
    display: "grid",
    gap: 12
  },
  app: { minHeight: "100vh", display: "grid", gridTemplateColumns: "340px 1fr" },
  sidebar: { background: "#fff", borderRight: "1px solid #e5e7eb", padding: 18, display: "grid", gap: 12, alignContent: "start" },
  mainPanel: { padding: 24, display: "grid", gap: 16 },
  authTabs: { display: "flex", gap: 8 },
  tab: { padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff" },
  activeTab: { padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#eff6ff" },
  input: { border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", width: "100%", background: "#fff" },
  primaryBtn: { border: "none", background: "#2563eb", color: "white", borderRadius: 8, padding: "8px 12px", fontWeight: 600 },
  secondaryBtn: { border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: 8, padding: "8px 12px" },
  dangerBtn: { border: "1px solid #ef4444", background: "white", color: "#ef4444", borderRadius: 8, padding: "6px 8px" },
  linkBtn: { border: "none", background: "transparent", color: "#2563eb", textAlign: "left", padding: 0 },
  muted: { color: "#6b7280", margin: 0, fontSize: 14 },
  warningText: { color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: 8, fontSize: 13 },
  message: { color: "#1f2937", fontSize: 14, margin: 0 },
  pageTitle: { margin: 0 },
  sidebarTitle: { margin: 0, fontSize: 20 },
  sectionTitle: { margin: "4px 0" },
  sheetList: { display: "grid", gap: 8 },
  sheetItem: { textAlign: "left", border: "1px solid #d1d5db", borderRadius: 8, background: "white", padding: 10 },
  activeSheet: { textAlign: "left", border: "1px solid #2563eb", borderRadius: 8, background: "#eff6ff", padding: 10 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  block: { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 10 },
  builderBlock: { background: "#f8fbff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 16, display: "grid", gap: 10 },
  entryBlock: { background: "#fffdf7", border: "1px solid #fde68a", borderRadius: 12, padding: 16, display: "grid", gap: 10 },
  blockAccent: { background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: 10, fontSize: 13 },
  demoNotesList: { margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 4 },
  rowWrap: { display: "grid", gap: 8 },
  rowInline: { display: "flex", gap: 8, alignItems: "center" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#fff" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: { textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "10px 8px", background: "#f8fafc", fontSize: 13 },
  td: { borderBottom: "1px solid #f1f5f9", padding: "10px 8px", verticalAlign: "top" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 8 },
  emptyCell: { textAlign: "center", padding: 18, color: "#6b7280" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  totalBadge: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "6px 12px", fontSize: 14 }
};
