export type User = {
  id: string;
  email: string;
  password: string; // Demo-only: plaintext password storage is not production-safe.
};

export type FieldType = "text" | "number" | "currency" | "date" | "checkbox" | "dropdown";

export type SheetField = {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};

export type SheetRecord = {
  id: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Sheet = {
  id: string;
  userId: string;
  title: string;
  fields: SheetField[];
  records: SheetRecord[];
  createdAt: string;
  updatedAt: string;
};

type DemoDb = {
  users: User[];
  sheets: Sheet[];
  sessions: Map<string, string>;
};

declare global {
  // eslint-disable-next-line no-var
  var __checkbookDemoDb: DemoDb | undefined;
}

// Demo-only in-memory database. Data resets whenever the server restarts.
// Not suitable for real financial/checking account data.
const db: DemoDb =
  globalThis.__checkbookDemoDb ??
  (globalThis.__checkbookDemoDb = {
    users: [],
    sheets: [],
    sessions: new Map<string, string>() // Demo-only: bearer sessions are in-memory and reset on restart.
  });

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

export function registerUser(email: string, password: string) {
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error("Email already exists");
  }
  const user: User = { id: id("usr"), email, password };
  db.users.push(user);
  return user;
}

export const supportedFieldTypes: FieldType[] = ["text", "number", "currency", "date", "checkbox", "dropdown"];

function getOwnedSheetOrThrow(userId: string, sheetId: string) {
  const sheet = db.sheets.find((s) => s.id === sheetId);
  if (!sheet) throw new Error("Sheet not found");
  if (sheet.userId !== userId) throw new Error("Forbidden");
  return sheet;
}

function getOwnedRecordOrThrow(sheet: Sheet, recordId: string) {
  const record = sheet.records.find((r) => r.id === recordId);
  if (!record) throw new Error("Record not found");
  return record;
}

export function loginUser(email: string, password: string) {
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    throw new Error("Invalid email/password");
  }
  const token = id("sess");
  db.sessions.set(token, user.id);
  return { token, user };
}

export function getUserByToken(token: string | null) {
  if (!token) return null;
  const userId = db.sessions.get(token);
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) ?? null;
}

export function listSheetsForUser(userId: string) {
  return db.sheets.filter((s) => s.userId === userId);
}

export function createSheet(userId: string, title: string) {
  const now = new Date().toISOString();
  const sheet: Sheet = {
    id: id("sht"),
    userId,
    title,
    fields: [],
    records: [],
    createdAt: now,
    updatedAt: now
  };
  db.sheets.push(sheet);
  return sheet;
}

export function createSampleCheckbook(userId: string) {
  const existing = db.sheets.find((sheet) => sheet.userId === userId && sheet.title === "Sample Checkbook");
  if (existing) {
    return existing;
  }

  const sheet = createSheet(userId, "Sample Checkbook");
  const fields: Omit<SheetField, "id">[] = [
    { name: "Date", type: "date", required: true },
    { name: "Check Number", type: "text" },
    { name: "Payee", type: "text", required: true },
    { name: "Amount", type: "currency", required: true },
    { name: "Memo", type: "text" },
    { name: "Cleared", type: "checkbox" }
  ];

  sheet.fields = fields.map((f) => ({ ...f, id: id("fld") }));

  const fieldIdByName = Object.fromEntries(sheet.fields.map((field) => [field.name, field.id]));

  const sampleValues: Record<string, unknown>[] = [
    {
      [fieldIdByName.Date]: "2026-01-05",
      [fieldIdByName["Check Number"]]: "1001",
      [fieldIdByName.Payee]: "Electric Company",
      [fieldIdByName.Amount]: "86.75",
      [fieldIdByName.Memo]: "Demo utility bill",
      [fieldIdByName.Cleared]: true
    },
    {
      [fieldIdByName.Date]: "2026-01-08",
      [fieldIdByName["Check Number"]]: "1002",
      [fieldIdByName.Payee]: "Landlord",
      [fieldIdByName.Amount]: "1500.00",
      [fieldIdByName.Memo]: "Demo rent payment",
      [fieldIdByName.Cleared]: false
    },
    {
      [fieldIdByName.Date]: "2026-01-10",
      [fieldIdByName["Check Number"]]: "DEBIT",
      [fieldIdByName.Payee]: "Grocery Store",
      [fieldIdByName.Amount]: "124.32",
      [fieldIdByName.Memo]: "Demo groceries",
      [fieldIdByName.Cleared]: true
    }
  ];

  const now = new Date().toISOString();
  sheet.records = sampleValues.map((values) => ({
    id: id("rec"),
    values,
    createdAt: now,
    updatedAt: now
  }));

  sheet.updatedAt = now;
  return sheet;
}

export function addField(userId: string, sheetId: string, field: Omit<SheetField, "id">) {
  const sheet = getOwnedSheetOrThrow(userId, sheetId);
  const newField: SheetField = { ...field, id: id("fld") };
  sheet.fields.push(newField);
  sheet.updatedAt = new Date().toISOString();
  return newField;
}

export function deleteField(userId: string, sheetId: string, fieldId: string) {
  const sheet = getOwnedSheetOrThrow(userId, sheetId);
  const exists = sheet.fields.some((f) => f.id === fieldId);
  if (!exists) throw new Error("Field not found");
  sheet.fields = sheet.fields.filter((f) => f.id !== fieldId);
  sheet.records = sheet.records.map((r) => {
    const { [fieldId]: _removed, ...rest } = r.values;
    return { ...r, values: rest };
  });
  sheet.updatedAt = new Date().toISOString();
}

export function addRecord(userId: string, sheetId: string, values: Record<string, unknown>) {
  const sheet = getOwnedSheetOrThrow(userId, sheetId);
  const now = new Date().toISOString();
  const record: SheetRecord = { id: id("rec"), values, createdAt: now, updatedAt: now };
  sheet.records.push(record);
  sheet.updatedAt = now;
  return record;
}

export function updateRecord(userId: string, sheetId: string, recordId: string, values: Record<string, unknown>) {
  const sheet = getOwnedSheetOrThrow(userId, sheetId);
  const record = getOwnedRecordOrThrow(sheet, recordId);
  record.values = values;
  record.updatedAt = new Date().toISOString();
  sheet.updatedAt = record.updatedAt;
  return record;
}

export function deleteRecord(userId: string, sheetId: string, recordId: string) {
  const sheet = getOwnedSheetOrThrow(userId, sheetId);
  getOwnedRecordOrThrow(sheet, recordId);
  sheet.records = sheet.records.filter((r) => r.id !== recordId);
  sheet.updatedAt = new Date().toISOString();
}
