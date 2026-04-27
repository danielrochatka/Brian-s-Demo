# In-Memory Checkbook Custom Sheet Demo

## What this app does
This is a **presentation-focused MVP demo** built with Next.js.

It lets a user:
- Register/login with demo auth.
- Create custom data-entry sheets.
- Define sheet fields (text, number, currency, date, checkbox, dropdown).
- Add, edit, and delete structured records.
- Instantly create a **Sample Checkbook** sheet for a quick walkthrough.

## How to run
```bash
npm install
npm run dev
```
Then open `http://localhost:3000`.

For production build testing:
```bash
npm run build
npm start
```

## Main demo features
- Clean dashboard and guided fast path for live demos.
- One-click sample checkbook creation with fake records.
- Inline record editing/deleting.
- Currency formatting and checkbox display improvements in table cells.
- Lightweight “Demo Total” for the Amount column when present.
- Visible in-app “Demo Notes” explaining limitations.

## Demo limitations (intentional)
- **In-memory database only**: all data resets when the server restarts.
- **Demo auth only**: not secure for production use.
- No external services.
- Not real banking software (no ACH/routing/MICR/integrations/check printing).
- Do not enter real financial or sensitive data.

## In-memory architecture explanation
- Server state is kept in process memory (`lib/memoryDb.ts`).
- Users, sheets, records, and sessions are all stored in simple in-memory collections.
- API routes call this in-memory layer directly.
- This keeps the app easy to understand and ideal for AI app-generation demos.

## Suggested production upgrades (not implemented)
A real version should add:
- Persistent database (e.g., PostgreSQL/MySQL with migrations).
- Password hashing (e.g., Argon2/bcrypt) and stronger auth flows.
- Secure sessions/cookies with expiration, rotation, CSRF protections.
- Role and permission hardening.
- Audit logs for record changes.
- Export/import workflows.
- Deployment hardening (env management, observability, backups, CI/CD).
