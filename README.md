# CRM Sales Management System - Backend API

A production-ready RESTful backend system built for managing complete enterprise sales workflows from **Lead Generation** $\rightarrow$ **Lead Qualification** $\rightarrow$ **Customer Conversion** $\rightarrow$ **Deal Pipeline Management** $\rightarrow$ **Sales Activities** $\rightarrow$ **Deal Closure & Analytics**.

---

## 🌟 Key Features

- **Authentication & Authorization**: Secure JWT-based authentication (Bearer Tokens) with password hashing via `bcryptjs`.
- **Role-Based Access Control (RBAC)**:
  - 👑 **Admin**: Complete system control, user management, full visibility, lead assignment, sales reporting.
  - 👔 **Sales Manager**: Team management, lead assignment/reassignment, team performance metrics, deal oversight.
  - 💼 **Sales Executive**: Scoped access to assigned leads, customers, deals, and activities.
- **Lead Management & Assignment**: Complete CRUD, multi-criteria filtering, search keyword matching, source/status tracking, and assignment guardrails.
- **Atomic Lead Conversion Engine**: Converts qualified leads into **Customers** & **Deals** in an atomic transaction (`mongoose.startSession()`), preventing partial data corruption.
- **Deal Management & Business Rules**:
  - Stage tracking: `Qualification` $\rightarrow$ `Discovery` $\rightarrow$ `Proposal` $\rightarrow$ `Negotiation` $\rightarrow$ `Won` / `Lost`.
  - Re-opening rules: Closed deals (`Won`/`Lost`) cannot freely be edited by non-admin users.
  - mandatory `lostReason` required for Lost deals.
  - Probability-driven revenue calculation ($Expected Revenue = (Value \times Probability) / 100$).
- **Activities & Overdue Automation**: Track Calls, Emails, Meetings, Demos, Follow-ups with automated backend detection for `Overdue` activities based on due date.
- **Timeline / Audit Log**: Centralized audit history tracking changes across entities (`Lead Created`, `Lead Status Changed`, `Lead Converted`, `Deal Stage Changed`, `Deal Won`, etc.).
- **Dashboard & Sales Pipeline Analytics**: Real-time sales statistics, revenue metrics, conversion rates, and pipeline stage aggregations.
- **Enterprise Standards**:
  - Server-side pagination, multi-field sorting, and filtering.
  - Request schema validation powered by **Zod**.
  - Security headers (`helmet`), CORS, and Rate Limiting.
  - Centralized error handling with standardized JSON structures.
  - Interactive OpenAPI / Swagger Documentation at `/api-docs`.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
- **Security**: Helmet, CORS, Express-Rate-Limit
- **Documentation**: Swagger UI (`swagger-ui-express`, `swagger-jsdoc`)

---

## 📁 Project Architecture

```
assigment/
├── src/
│   ├── config/          # MongoDB connection & Swagger OpenAPI options
│   ├── controllers/     # Route business controllers (Auth, User, Lead, Customer, Deal, Activity, Dashboard, Timeline)
│   ├── middleware/      # Auth protect, RBAC restrictTo, Zod validator, Global Error Handler
│   ├── models/          # Mongoose Schemas (User, Lead, Customer, Deal, Activity, Timeline)
│   ├── routes/          # Express Routers
│   ├── services/        # Timeline audit service & transaction logic
│   ├── utils/           # AppError, catchAsync, API response builder, Pagination helpers, Database Seed script
│   ├── validators/      # Zod validation schemas
│   └── app.js           # Express app setup & route mounting
├── server.js            # Server entry point
├── package.json         # Package dependencies & scripts
├── .env.example         # Template environment variables
└── README.md            # System documentation
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- MongoDB instance (Local MongoDB server or MongoDB Atlas Cluster)

### 2. Clone & Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (or copy `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/crm_sales_db
JWT_SECRET=crm_jwt_secret_key_2026_secure_access_token
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=crm_jwt_refresh_secret_key_2026_secure_token
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=*
```

### 4. Seed Initial Sample Data (Optional)
Populate the database with pre-configured Admin, Sales Manager, and Sales Executive accounts:
```bash
npm run seed
```


### 5. Run Server

**Development Mode (with auto-reload)**:
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

The server will start at `http://localhost:5000`.

---

## 📖 API Documentation & Swagger UI

Interactive Swagger documentation is served live at:
👉 **`http://localhost:5000/api-docs`**

### Summary of API Endpoints

#### 🔑 Authentication (`/api/v1/auth`)
- `POST /register` - Register a new user account.
- `POST /login` - Login and receive JWT access & refresh tokens.
- `GET /me` - Get current authenticated user profile (`Protected`).
- `POST /logout` - Logout (`Protected`).

#### 👤 User Management (`/api/v1/users`)
- `POST /` - Create a user account (`Admin`).
- `GET /` - List users with search, role/status filter, pagination (`Admin`, `Sales Manager`).
- `GET /:id` - Get user details by ID (`Admin`, `Sales Manager`).
- `PUT /:id` - Update user details (`Admin`).
- `PATCH /:id/status` - Activate or deactivate user account (`Admin`).
- `DELETE /:id` - Delete user (`Admin`).

#### 🎯 Lead Management (`/api/v1/leads`)
- `POST /` - Create a new lead (`Protected`).
- `GET /` - List leads with multi-filter (status, priority, source, assignedTo, date range), search & pagination (`Protected`).
- `GET /:id` - Get lead details by ID (`Protected`).
- `PUT /:id` - Update lead details (`Protected`).
- `PATCH /:id/status` - Update lead status (`Protected`).
- `PATCH /:id/assign` - Assign or reassign lead (`Admin`, `Sales Manager`).
- `POST /:id/convert` - Atomic conversion of Lead $\rightarrow$ Customer + Deal (`Protected`).
- `DELETE /:id` - Delete lead (`Admin`, `Sales Manager`).

#### 👥 Customer Management (`/api/v1/customers`)
- `POST /` - Create customer (`Protected`).
- `GET /` - List customers with search, status filter, pagination (`Protected`).
- `GET /:id` - Get customer by ID (`Protected`).
- `PUT /:id` - Update customer (`Protected`).
- `DELETE /:id` - Delete customer (`Admin`, `Sales Manager`).

#### 🤝 Deal Management (`/api/v1/deals`)
- `POST /` - Create deal (`Protected`).
- `GET /` - List deals with stage, value range, date filters & pagination (`Protected`).
- `GET /:id` - Get deal by ID (`Protected`).
- `PUT /:id` - Update deal (`Protected`).
- `PATCH /:id/stage` - Update deal stage enforcing business rules (`Protected`).
- `DELETE /:id` - Delete deal (`Admin`, `Sales Manager`).

#### 📅 Activities & Follow-ups (`/api/v1/activities`)
- `POST /` - Create sales activity/follow-up (`Protected`).
- `GET /` - List activities with auto-overdue detection (`Protected`).
- `GET /:id` - Get activity by ID (`Protected`).
- `PUT /:id` - Update activity (`Protected`).
- `PATCH /:id/complete` - Mark activity as completed (`Protected`).
- `DELETE /:id` - Delete activity (`Admin`, `Sales Manager`).

#### 📜 Timeline / Audit History (`/api/v1/timeline`)
- `GET /:entityType/:entityId` - Get audit history for Lead, Customer, or Deal (`Protected`).

#### 📊 Dashboard & Analytics (`/api/v1/dashboard`)
- `GET /stats` - Key CRM conversion statistics, revenue totals, & activity counts (`Protected`).
- `GET /pipeline` - Deal count & value breakdown across sales pipeline stages (`Protected`).
- `GET /team-performance` - Sales team conversion & revenue metrics (`Admin`, `Sales Manager`).

---

## 📋 Important Business Rules

1. **Atomic Lead Conversion**:
   - Qualified leads are converted into a **Customer** and **Deal** in an atomic transaction (`mongoose.startSession()`), ensuring that partial conversion never leaves inconsistent data.
   - Once converted, a lead cannot be converted again.

2. **Deal Stage Transition Rules**:
   - Closed deals in stage **`Won`** or **`Lost`** cannot freely be moved back to active stages by non-admin users.
   - Marking a deal as **`Lost`** strictly requires providing a valid `lostReason`.
   - Marking a deal as **`Won`** automatically updates probability to `100%`.
   - Deal monetary value must be greater than zero.
   - Probability must be between `0` and `100%`.
   - **Expected Revenue** is dynamically computed on save: $Expected Revenue = (Value \times Probability) / 100$.

3. **Activities & Overdue Automation**:
   - Activity status automatically transitions from `Pending` to `Overdue` whenever `dueDate < Date.now()`.
   - Marking an activity completed records the exact `completedDate` timestamp and logs a timeline audit event.

4. **Timeline Audit Log System**:
   - Centralized audit events are logged for key events across entity lifecycles (`Lead Created`, `Lead Assigned`, `Lead Reassigned`, `Lead Status Changed`, `Lead Converted`, `Customer Created`, `Deal Created`, `Deal Stage Changed`, `Deal Won`, `Deal Lost`, `Follow-up Created`, `Follow-up Completed`).

---

## 🔒 Security & Best Practices

1. **Password Hashing**: Direct plain passwords are never stored. `bcryptjs` with salt factor 10 is applied in pre-save hooks.
2. **Access Control (RBAC)**: Route middleware restricts actions based on roles (`Admin`, `Sales Manager`, `Sales Executive`).
3. **Data Scoping**: Sales Executives are restricted to accessing only their assigned records.
4. **Input Sanitation & Schema Validation**: `Zod` schemas strictly validate body and parameter formats before reaching controllers.
5. **Security Headers & Rate Limiting**: `helmet` shields against HTTP header vulnerabilities; `express-rate-limit` prevents brute-force attempts.

---

## 💡 Database Indexing & Performance Decisions

To optimize database query execution times on large datasets:
- **`User`**: Index on `email` (unique lookup) and compound index `{ role: 1, isActive: 1 }`.
- **`Lead`**: Indexes on `status`, `source`, `priority`, `assignedTo`, `createdAt`, and `email`.
- **`Customer`**: Indexes on `assignedTo`, `leadId`, and `email`.
- **`Deal`**: Indexes on `stage`, `assignedTo`, `customerId`, `leadId`, and `expectedClosingDate`.
- **`Activity`**: Compound index on `{'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1}` and single index on `dueDate`, `status`, `assignedTo`.
- **`Timeline`**: Compound index `{ entityType: 1, entityId: 1 }` and timestamp sorting index `{ timestamp: -1 }`.

---

## 📜 Assumptions Made

1. **Standalone vs Replica Set MongoDB**: The Lead Conversion endpoint utilizes Mongoose Session transactions (`startSession()`). A automatic fallback is provided if deployed on a single-node standalone MongoDB instance without replica set support.
2. **Overdue Status Calculation**: Activity overdue statuses are evaluated dynamically against `new Date()` whenever activities are queried or fetched.
3. **Currency**: Deal value and expected revenue values default to standard numeric units.
