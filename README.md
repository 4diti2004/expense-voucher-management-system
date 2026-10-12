# Vouchery — Expense Voucher Management System

A full-stack expense voucher application built with React, Vite, Node.js, and Express. Employees can submit claims, while Managers and Admins can review, approve, or reject them.

## Technology stack

- React 18 and Vite
- Node.js and Express
- JWT authentication
- bcryptjs password hashing
- JSON file persistence for this lightweight submission
- Responsive CSS and Lucide icons

## Project structure

```text
backend/
  data/users.json       Demo users and password hashes
  data/vouchers.json   Local voucher records
  server.js            Express API and authentication
database/
  schema.sql           Relational schema reference/migration artifact
src-react/
  main.jsx             React application
  styles.css           Responsive UI styles
.env.example           Environment variable template
index.html              Vite entry point
package.json            Scripts and dependencies
vite.config.js          Vite configuration
```

## Setup and run

Requirements: Node.js 18 or newer.

```powershell
npm install
Copy-Item .env.example .env
npm run dev:full
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

For separate terminals:

```powershell
npm run server
npm run dev
```

Create a production frontend build:

```powershell
npm run build
```

## Demo accounts

All demo accounts use `password123`:

| Role | Email |
|---|---|
| Employee | employee@vouchery.local |
| Manager | manager@vouchery.local |
| Admin | admin@vouchery.local |

Employees can view and manage their own vouchers. Managers and Admins can review all vouchers and change their status.

## Database schema explanation

The submitted runtime uses JSON files so it can be run without installing a database:

- `backend/data/users.json` stores users, hashed passwords, roles, and departments.
- `backend/data/vouchers.json` stores voucher details, status, creator, reviewer, timestamps, and optional receipt data.

The normalized relational design is provided in [`database/schema.sql`](./database/schema.sql). It contains:

- `users`: account and role information
- `vouchers`: expense claims and workflow information
- Foreign keys from voucher creators/reviewers to users
- Indexes for status, creator, and expense date

Receipt data is currently stored as a small base64 string inside the JSON record. A production deployment should store files in object storage and keep only a URL in the database.

## API documentation

All protected endpoints require:

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Health check

```http
GET /api/health
```

Returns `{ "ok": true }`.

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "manager@vouchery.local",
  "password": "password123"
}
```

Returns a JWT token and user profile.

```http
GET /api/auth/me
Authorization: Bearer <token>
```

Returns the currently authenticated user.

### Vouchers

```http
GET /api/vouchers
Authorization: Bearer <token>
```

Employees receive their own vouchers. Managers and Admins receive all vouchers.

```http
POST /api/vouchers
Authorization: Bearer <token>
Content-Type: application/json

{
  "employee": "Priya Sharma",
  "department": "Marketing",
  "expenseDate": "2026-10-12",
  "category": "Travel",
  "description": "Client meeting travel",
  "amount": 125.50,
  "receipt": null
}
```

```http
PUT /api/vouchers/:id
Authorization: Bearer <token>
```

Updates a voucher. Employees may update only their own vouchers.

```http
DELETE /api/vouchers/:id
Authorization: Bearer <token>
```

Deletes a voucher. Employees may delete only their own vouchers.

```http
PATCH /api/vouchers/:id/status
Authorization: Bearer <manager-or-admin-token>
Content-Type: application/json

{
  "status": "Approved"
}
```

Allowed statuses are `Pending`, `Approved`, and `Rejected`. Only Managers and Admins can use this endpoint.

### Common response codes

- `200`: Request completed
- `201`: Record created
- `204`: Record deleted
- `400`: Invalid input
- `401`: Missing or invalid login token
- `403`: Authenticated user lacks permission
- `404`: Record not found

## Assumptions

- This is a placement demonstration project, so JSON persistence is used instead of requiring a database server.
- The API and frontend run locally on ports 4000 and 5173.
- Demo users are included for evaluation; production credentials must be replaced.
- The JWT secret must be changed through `.env` before deployment.
- Receipts are limited to 650 KB and accept images or PDFs.
- Amounts are represented in USD.
- Managers and Admins are trusted reviewers.
- The reference SQL schema documents the intended relational migration path.

## Security notes

Do not commit `.env` or real credentials. Use a long random `JWT_SECRET` in deployment. Use HTTPS and external file storage for a production release.
