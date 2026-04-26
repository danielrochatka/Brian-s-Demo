export type User = {
  id: string;
  email: string;
  password: string; // demo-only, not production-safe
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

const db = {
  users: [] as User[],
  sheets: [] as Sheet[],
  sessions: new Map<string, string>()
};

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
  const sheet = createSheet(userId, "My Checkbook");
  const fields: Omit<SheetField, "id">[] = [
    { name: "Date", type: "date", required: true },
    { name: "Check Number", type: "text" },
    { name: "Payee", type: "text", required: true },
    { name: "Amount", type: "currency", required: true },
    { name: "Memo", type: "text" },
    { name: "Cleared", type: "checkbox" }
  ];
  sheet.fields = fields.map((f) => ({ ...f, id: id("fld") }));
  sheet.updatedAt = new Date().toISOString();
  return sheet;
}

export function addField(userId: string, sheetId: string, field: Omit<SheetField, "id">) {
  const sheet = db.sheets.find((s) => s.id === sheetId && s.userId === userId);
  if (!sheet) throw new Error("Sheet not found");
  const newField: SheetField = { ...field, id: id("fld") };
  sheet.fields.push(newField);
  sheet.updatedAt = new Date().toISOString();
  return newField;
}

export function deleteField(userId: string, sheetId: string, fieldId: string) {
  const sheet = db.sheets.find((s) => s.id === sheetId && s.userId === userId);
  if (!sheet) throw new Error("Sheet not found");
  sheet.fields = sheet.fields.filter((f) => f.id !== fieldId);
  sheet.records = sheet.records.map((r) => {
    const { [fieldId]: _removed, ...rest } = r.values;
    return { ...r, values: rest };
  });
  sheet.updatedAt = new Date().toISOString();
}

export function addRecord(userId: string, sheetId: string, values: Record<string, unknown>) {
  const sheet = db.sheets.find((s) => s.id === sheetId && s.userId === userId);
  if (!sheet) throw new Error("Sheet not found");
  const now = new Date().toISOString();
  const record: SheetRecord = { id: id("rec"), values, createdAt: now, updatedAt: now };
  sheet.records.push(record);
  sheet.updatedAt = now;
  return record;
}

export function updateRecord(userId: string, sheetId: string, recordId: string, values: Record<string, unknown>) {
  const sheet = db.sheets.find((s) => s.id === sheetId && s.userId === userId);
  if (!sheet) throw new Error("Sheet not found");
  const record = sheet.records.find((r) => r.id === recordId);
  if (!record) throw new Error("Record not found");
  record.values = values;
  record.updatedAt = new Date().toISOString();
  sheet.updatedAt = record.updatedAt;
  return record;
}

export function deleteRecord(userId: string, sheetId: string, recordId: string) {
  const sheet = db.sheets.find((s) => s.id === sheetId && s.userId === userId);
  if (!sheet) throw new Error("Sheet not found");
  sheet.records = sheet.records.filter((r) => r.id !== recordId);
  sheet.updatedAt = new Date().toISOString();
}
