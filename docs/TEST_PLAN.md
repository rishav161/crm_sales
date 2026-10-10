# Comprehensive API Test Plan - CRM Sales Management System

This document outlines the end-to-end API Test Plan for verifying all functional requirements, role-based access control (RBAC), business rules, validations, and error handling of the CRM Sales Management System.

---

## 🔑 1. Authentication & Authorization Suite

| Test Case ID | Feature / Endpoint | Description | Prerequisites / Request Data | Expected Status | Expected Result |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-AUTH-01** | `POST /api/v1/auth/register` | Register a new Sales Executive | Body: `name`, `email`, `password`, `phone` | `201 Created` | Returns created user object (password omitted), JWT `token`, and `refreshToken`. |
| **TC-AUTH-02** | `POST /api/v1/auth/login` | Login with valid credentials | Body: `email` & `password` | `200 OK` | Returns `success: true`, JWT `token`, and user details with role. |
| **TC-AUTH-03** | `POST /api/v1/auth/login` | Login with invalid password | Body: `email` & incorrect `password` | `401 Unauthorized` | Returns `success: false` and message `"Invalid email or password"`. |
| **TC-AUTH-04** | `GET /api/v1/auth/me` | Fetch authenticated user profile | Header: `Authorization: Bearer <token>` | `200 OK` | Returns currently logged-in user profile details. |
| **TC-AUTH-05** | `GET /api/v1/auth/me` | Access protected route without token | Header: No `Authorization` header | `401 Unauthorized` | Returns message `"You are not logged in. Please log in to get access."` |
| **TC-AUTH-06** | `POST /api/v1/auth/login` | Login attempt for deactivated account | Body: Email of user with `isActive: false` | `403 Forbidden` | Returns message `"Your account has been deactivated."` |

---

## 👤 2. User Management Suite (Admin / Manager)

| Test Case ID | Feature / Endpoint | Description | Prerequisites / Request Data | Expected Status | Expected Result |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-USER-01** | `POST /api/v1/users` | Admin creates a new user | Admin token, Body: `name`, `email`, `password`, `role` (`Sales Manager` or `Sales Executive`) | `201 Created` | New user created in database with assigned role. |
| **TC-USER-02** | `GET /api/v1/users` | List users with search & filter | Query: `?search=alex&role=Sales Executive&page=1&limit=10` | `200 OK` | Returns paginated list of matching users with pagination metadata. |
| **TC-USER-03** | `PATCH /api/v1/users/:id/status` | Deactivate user account | Admin token, Body: `{ "isActive": false }` | `200 OK` | Target user status set to `false`. Subsequent login attempts by user are blocked. |
| **TC-USER-04** | `POST /api/v1/users` | Sales Executive attempts to create user | Sales Executive token | `403 Forbidden` | Blocked by RBAC with message `"User role 'Sales Executive' is not authorized..."` |

---

## 🎯 3. Lead Management & Conversion Suite

| Test Case ID | Feature / Endpoint | Description | Prerequisites / Request Data | Expected Status | Expected Result |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-LEAD-01** | `POST /api/v1/leads` | Create a new lead | Token, Body: `name`, `email`, `company`, `source`, `priority`, `assignedTo` | `201 Created` | Lead created. `Lead Created` and `Lead Assigned` logged to Timeline. |
| **TC-LEAD-02** | `GET /api/v1/leads` | Multi-filter lead search | Query: `?status=Qualified&priority=High&source=Website` | `200 OK` | Returns matching leads filtered simultaneously by multi-criteria. |
| **TC-LEAD-03** | `GET /api/v1/leads` | Sales Executive RBAC scoping | Sales Executive token | `200 OK` | Returns ONLY leads assigned to the logged-in Sales Executive. |
| **TC-LEAD-04** | `PATCH /api/v1/leads/:id/status` | Update lead status to Qualified | Token, Body: `{ "status": "Qualified" }` | `200 OK` | Status updated to `Qualified`. `Lead Status Changed` logged in Timeline. |
| **TC-LEAD-05** | `PATCH /api/v1/leads/:id/assign` | Reassign lead to another executive | Manager/Admin token, Body: `{ "assignedTo": "<newUserId>" }` | `200 OK` | Lead `assignedTo` updated. `Lead Reassigned` event logged in Timeline. |
| **TC-LEAD-06** | `POST /api/v1/leads/:id/convert` | Atomic lead conversion | Token, Body: `dealTitle`, `dealValue`, `expectedClosingDate` | `200 OK` | **Atomic Transaction**: Lead status becomes `Converted`; new `Customer` and `Deal` documents created referencing `leadId`. |
| **TC-LEAD-07** | `POST /api/v1/leads/:id/convert` | Attempt conversion on already converted lead | Token | `400 Bad Request` | Returns message `"Lead has already been converted"`. |

---

## 🤝 4. Deal Management & Business Rules Suite

| Test Case ID | Feature / Endpoint | Description | Prerequisites / Request Data | Expected Status | Expected Result |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-DEAL-01** | `POST /api/v1/deals` | Create deal with probability | Token, Body: `title`, `customerId`, `value: 50000`, `probability: 60` | `201 Created` | Deal created. `expectedRevenue` automatically calculated as `30000`. |
| **TC-DEAL-02** | `POST /api/v1/deals` | Validate deal value > 0 | Body: `value: -100` | `400 Bad Request` | Zod validation error: `"Deal value must be greater than 0"`. |
| **TC-DEAL-03** | `PATCH /api/v1/deals/:id/stage` | Transition deal stage to Proposal | Body: `{ "stage": "Proposal" }` | `200 OK` | Stage updated to `Proposal`. `Deal Stage Changed` logged in Timeline. |
| **TC-DEAL-04** | `PATCH /api/v1/deals/:id/stage` | Mark deal as Won | Body: `{ "stage": "Won" }` | `200 OK` | Stage updated to `Won`, `probability` set to `100%`. `Deal Won` logged in Timeline. |
| **TC-DEAL-05** | `PATCH /api/v1/deals/:id/stage` | Mark deal as Lost without reason | Body: `{ "stage": "Lost" }` | `400 Bad Request` | Returns message `"A valid lost reason is required when marking a deal as Lost"`. |
| **TC-DEAL-06** | `PATCH /api/v1/deals/:id/stage` | Mark deal as Lost with reason | Body: `{ "stage": "Lost", "lostReason": "Competitor pricing lower" }` | `200 OK` | Stage set to `Lost`, `probability: 0%`, reason stored. `Deal Lost` logged in Timeline. |
| **TC-DEAL-07** | `PATCH /api/v1/deals/:id/stage` | Non-admin attempt to reopen closed deal | Sales Executive token on Won deal | `403 Forbidden` | Blocked: `"Closed deal in stage 'Won' cannot be reopened by non-admin users"`. |

---

## 📅 5. Sales Activities & Overdue Suite

| Test Case ID | Feature / Endpoint | Description | Prerequisites / Request Data | Expected Status | Expected Result |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-ACT-01** | `POST /api/v1/activities` | Create activity linked to Lead | Body: `type: "Meeting"`, `dueDate`, `relatedEntity: { entityType: "Lead", entityId }` | `201 Created` | Activity created. `Follow-up Created` logged in Timeline for Lead. |
| **TC-ACT-02** | `GET /api/v1/activities` | Auto-detect overdue status | Past due date activity queried | `200 OK` | Activity status automatically computed and saved as `Overdue`. |
| **TC-ACT-03** | `PATCH /api/v1/activities/:id/complete` | Mark activity as completed | Token | `200 OK` | Status set to `Completed`, `completedDate` set to current timestamp. |

---

## 📜 6. Audit Timeline Suite

| Test Case ID | Feature / Endpoint | Description | Prerequisites / Request Data | Expected Status | Expected Result |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-TIME-01** | `GET /api/v1/timeline/Lead/:leadId` | Fetch lead history timeline | Valid lead ID | `200 OK` | Returns chronologically ordered audit logs (Lead Created, Assigned, Converted). |
| **TC-TIME-02** | `GET /api/v1/timeline/Deal/:dealId` | Fetch deal history timeline | Valid deal ID | `200 OK` | Returns audit events (Deal Created, Stage Changed, Won/Lost). |

---

## 📊 7. Dashboard & Analytics Suite

| Test Case ID | Feature / Endpoint | Description | Prerequisites / Request Data | Expected Status | Expected Result |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-DASH-01** | `GET /api/v1/dashboard/stats` | Fetch overall sales metrics | Protected Token | `200 OK` | Returns total/converted leads, conversion rate %, total/expected revenue, activity counts. |
| **TC-DASH-02** | `GET /api/v1/dashboard/pipeline` | Fetch sales pipeline aggregation | Protected Token | `200 OK` | Returns 6-stage deal count and total monetary value distribution array. |
| **TC-DASH-03** | `GET /api/v1/dashboard/team-performance` | Fetch team metrics | Manager/Admin Token | `200 OK` | Returns per-rep conversion rates, revenue generated, and pending/overdue activities. |

---

## 🛡️ 8. Input Validation & Error Handling Suite

| Test Case ID | Feature / Endpoint | Description | Prerequisites / Request Data | Expected Status | Expected Result |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-ERR-01** | `POST /api/v1/auth/register` | Invalid email format | Body: `email: "not-an-email"` | `400 Bad Request` | Zod validation error formatted: `[{ field: "email", message: "Invalid email address" }]`. |
| **TC-ERR-02** | `GET /api/v1/leads/invalidObjectId` | Invalid MongoDB ObjectId in parameter | Invalid ID parameter | `400 Bad Request` | Formatted error: `"Invalid _id: invalidObjectId"`. |
| **TC-ERR-03** | Any endpoint | Resource not found | Non-existent ID parameter | `404 Not Found` | Formatted error: `"Resource not found"`. |
| **TC-ERR-04** | Any non-existent route | Route does not exist | `GET /api/v1/non-existent-route` | `404 Not Found` | Formatted error: `"Cannot find route /api/v1/non-existent-route on this server"`. |
