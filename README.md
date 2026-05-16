# 6003CEM Smart Travel Planner

Smart Travel Planner is a MERN stack project for the 6003CEM Web API Development assignment.

The system helps users plan trips by combining:

- User-created travel records, notes, preferences, budgets, and checklists
- Third-party travel data such as weather and attractions
- User and admin dashboards
- RESTful backend APIs
- React frontend pages

This README is written for team members who are new to the project. Read it before starting your feature so you know where files should go and how the project is organized.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Folder Overview](#project-folder-overview)
3. [First-Time Setup](#first-time-setup)
4. [Running the Project](#running-the-project)
5. [Backend Folder Guide](#backend-folder-guide)
6. [Backend Request Flow](#backend-request-flow)
7. [How to Add a Backend Feature](#how-to-add-a-backend-feature)
8. [Frontend Folder Guide](#frontend-folder-guide)
9. [Frontend Page and Routing Guide](#frontend-page-and-routing-guide)
10. [How to Add a Frontend Feature](#how-to-add-a-frontend-feature)
11. [Environment Variables](#environment-variables)
12. [Testing](#testing)
13. [Git Workflow for Team Members](#git-workflow-for-team-members)
14. [What Not to Commit](#what-not-to-commit)
15. [Useful Local URLs](#useful-local-urls)
16. [Common Problems](#common-problems)

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| API Style | RESTful API with `/api/v1` versioning |
| Authentication | JWT + argon2id |
| Authorization | RBAC, meaning role-based access control |
| Security | Helmet, rate limiting, validation, CORS whitelist, dotenv |
| Third-Party API | OpenWeatherMap, with optional Places API |
| API Docs | Swagger/OpenAPI |
| Manual API Testing | Postman |
| Automated Testing | Jest + Supertest |

This is a MERN stack project:

```text
M = MongoDB
E = Express
R = React
N = Node.js
```

## Project Folder Overview

The project has two main applications:

```text
smart-travel-planner/
  backend/     Express API, database models, authentication, business logic
  frontend/    React app, pages, layouts, styling, browser interface
```

Think of it like this:

```text
frontend = what users see and click
backend  = API that receives requests, checks rules, talks to database, returns JSON
database = MongoDB Atlas, where users/trips/logs are stored
```

## First-Time Setup

Clone the repository:

```bash
git clone <repo-url>
cd "6003CEM smart travel planner"
```

Install backend dependencies:

```bash
cd backend
npm install
```

Create backend `.env` file:

```powershell
Copy-Item .env.example .env
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

Create frontend `.env` file:

```powershell
Copy-Item .env.example .env
```

## Setting up concurently:

Navigate to the root folder and create a root package.json:

```bash
cd ..
npm init -y
```

Install concurrently:

```bash
npm install -D concurrently
```

Add the following into root folder package.json scripts:

```text
"scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
    "backend": "npm run dev --prefix backend",
    "frontend": "npm run dev --prefix frontend"
  },
```

## Running the Project

Open a terminal in your root folder and run:

```bash
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
API v1:   http://localhost:5000/api/v1
Swagger:  http://localhost:5000/api-docs
Health:   http://localhost:5000/health
```

## Backend Folder Guide

Backend path:

```text
backend/
```

Important backend files:

```text
backend/
  server.js
  package.json
  .env.example

  src/
    app.js
    config/
    middleware/
    modules/
    routes/
    utils/

  tests/
  postman/
```

### `server.js`

Starts the backend server.

Main job:

```text
connect to MongoDB
start Express app on PORT
```

You normally do not need to edit this file unless changing startup behavior.

### `src/app.js`

Creates the Express app.

Main job:

```text
enable security middleware
enable CORS
enable JSON request body parsing
mount /api/v1 routes
mount Swagger docs
handle 404 and errors
```

If you create a new module route, you usually do not edit `app.js`. You register new module routes inside `src/routes/v1.routes.js`.

### `src/routes/v1.routes.js`

This file combines all version 1 API routes.

Example:

```js
router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/explore', exploreRoutes);
```

This means:

```text
authRoutes    -> /api/v1/auth
tripRoutes    -> /api/v1/trips
exploreRoutes -> /api/v1/explore
```

If you add a new backend feature such as `budgets`, you must register it here.

### `src/config/`

Configuration files live here.

```text
config/
  cors.js       CORS whitelist rules
  database.js   MongoDB connection
  env.js        environment variable loader
  swagger.js    Swagger/OpenAPI setup
```

Do not hard code secrets here. Use `.env`.

### `src/middleware/`

Middleware runs before or after controllers.

```text
middleware/
  auth.middleware.js       checks JWT token
  role.middleware.js       checks user/admin role
  validate.middleware.js   checks express-validator errors
  error.middleware.js      centralized error response
  notFound.middleware.js   handles unknown routes
  rateLimit.middleware.js  rate limiting helpers
```

Use middleware when logic is shared by many routes.

Example:

```js
router.get('/dashboard', protect, restrictTo('admin'), adminController.getDashboard);
```

This means:

```text
first check JWT
then check role is admin
then run controller
```

### `src/utils/`

Small reusable helpers live here.

```text
utils/
  AppError.js        custom error class
  catchAsync.js      wraps async controllers
  apiResponse.js     consistent success response helper
  generateTokens.js  creates JWT access/refresh tokens
  logger.js          simple logging helper
```

Use this folder for helper functions that are not specific to one feature.

### `src/modules/`

This is the most important backend folder.

Each feature gets its own module folder:

```text
modules/
  auth/
  users/
  trips/
  explore/
  admin/
  apiLogs/
```

Each module follows the same pattern:

```text
feature.model.js        database schema
feature.routes.js       API endpoints
feature.controller.js   handles req/res
feature.service.js      business logic
feature.repository.js   database queries
feature.validation.js   request validation rules
```

Not every feature needs every file.

Example: `explore` calls third-party APIs and does not store its own data yet, so it does not need a model or repository.

## Backend Request Flow

We use this backend flow:

```text
Routes -> Controllers -> Services -> Repositories -> Models
```

What each layer does:

| Layer | Purpose |
|---|---|
| Routes | Defines URL, HTTP method, and middleware |
| Controllers | Reads request and sends response |
| Services | Contains business logic |
| Repositories | Talks to MongoDB/Mongoose |
| Models | Defines database schema |

Example:

```text
GET /api/v1/trips/:id/summary
```

Flow:

```text
trip.routes.js
-> auth.middleware.js checks JWT
-> trip.controller.js receives trip id
-> trip.service.js checks ownership and combines data
-> trip.repository.js fetches trip from MongoDB
-> trip.model.js defines trip structure
-> weather.service.js gets weather data
-> controller returns JSON response
```

Why we use this structure:

```text
controllers stay simple
business logic is reusable
database queries are isolated
testing is easier
each feature is easier to maintain
```

## How to Add a Backend Feature

Use this section when you start a new backend feature.

Example feature: `budgets`

### Step 1: Create module folder

Create:

```text
backend/src/modules/budgets/
```

### Step 2: Create module files

Recommended files:

```text
budget.model.js
budget.routes.js
budget.controller.js
budget.service.js
budget.repository.js
budget.validation.js
```

### Step 3: Create model

Use model for database schema.

Example:

```js
const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    category: {
      type: String,
      enum: ['flight', 'hotel', 'food', 'transport', 'activity', 'other'],
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Budget', budgetSchema);
```

### Step 4: Create repository

Repository should contain database queries only.

Example:

```js
const Budget = require('./budget.model');

const create = (data) => Budget.create(data);
const findByTripId = (tripId) => Budget.find({ tripId }).sort({ createdAt: -1 });

module.exports = { create, findByTripId };
```

### Step 5: Create service

Service contains business logic.

Example:

```js
const budgetRepository = require('./budget.repository');

const createBudgetItem = (data) => budgetRepository.create(data);
const getTripBudget = (tripId) => budgetRepository.findByTripId(tripId);

module.exports = { createBudgetItem, getTripBudget };
```

### Step 6: Create controller

Controller handles request and response.

Example:

```js
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const budgetService = require('./budget.service');

const createBudgetItem = catchAsync(async (req, res) => {
  const item = await budgetService.createBudgetItem(req.body);
  sendSuccess(res, 201, { item }, 'Budget item created');
});

module.exports = { createBudgetItem };
```

### Step 7: Create routes

Routes define endpoint and middleware.

Example:

```js
const express = require('express');
const budgetController = require('./budget.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, budgetController.createBudgetItem);

module.exports = router;
```

### Step 8: Register route in `v1.routes.js`

Add:

```js
const budgetRoutes = require('../modules/budgets/budget.routes');

router.use('/budgets', budgetRoutes);
```

Now the endpoint starts with:

```text
/api/v1/budgets
```

### Step 9: Add validation

Use `express-validator` in `budget.validation.js`.

Do not trust frontend input.

### Step 10: Add tests

Create test file:

```text
backend/tests/budgets.test.js
```

Run:

```bash
cd backend
npm test
```

## Frontend Folder Guide

Frontend path:

```text
frontend/
```

Important frontend files:

```text
frontend/
  index.html
  package.json
  vite.config.js
  .env.example

  src/
    main.jsx
    App.jsx
    api/
    app/
    assets/
    components/
    context/
    features/
    hooks/
    layouts/
    styles/
```

### `src/main.jsx`

React entry point. It renders `<App />` into the page.

Usually you do not need to edit this.

### `src/App.jsx`

Top-level app wrapper.

Currently it sets up:

```text
BrowserRouter
AuthProvider
AppRoutes
```

Usually you do not need to edit this unless adding global providers.

### `src/app/routes.jsx`

This is where frontend routes/pages are registered.

Example:

```jsx
<Route path="/trips" element={<TripsPage />} />
```

If you create a new page, you must add it here.

### `src/api/`

This folder stores frontend API functions.

```text
api/
  axiosClient.js
  authApi.js
  tripApi.js
  exploreApi.js
```

Use these files when React needs to call backend APIs.

Example:

```js
import axiosClient from './axiosClient';

export const getTrips = () => axiosClient.get('/trips');
```

Do not write long `fetch` or `axios` calls directly inside page components if the API is reused. Put them in `src/api/`.

### `src/layouts/`

Layouts define shared page structure.

```text
layouts/
  AppLayout.jsx
  UserLayout.jsx
  AdminLayout.jsx
  AuthLayout.jsx
```

Current logged-in pages use:

```text
AppLayout.jsx
```

It contains:

```text
top header
expand/collapse sidebar
main content outlet
```

`UserLayout.jsx` passes user menu items.

`AdminLayout.jsx` passes admin menu items.

### `src/features/`

This is where page features live.

```text
features/
  landing/
  auth/
  dashboard/
  trips/
  explore/
  admin/
```

Each feature should contain its own pages and feature-specific components.

Example:

```text
features/trips/
  TripsPage.jsx
  TripDetailsPage.jsx
  TripForm.jsx
  TripSummaryCard.jsx
```

### `src/components/`

Reusable UI components live here.

Use this folder for components shared by many features.

Example:

```text
components/common/
  Button.jsx
  Input.jsx
  Modal.jsx
  Loader.jsx
  ErrorMessage.jsx
```

If a component is only used in one feature, keep it inside that feature folder.

### `src/context/`

Global React context lives here.

Current context:

```text
AuthProvider.jsx
authContext.js
```

Use context only for data needed across many pages, such as logged-in user state.

### `src/hooks/`

Reusable React hooks live here.

Example:

```text
hooks/useAuth.js
```

### `src/styles/`

Global CSS lives here.

Current file:

```text
styles/index.css
```

Try not to duplicate styles. Reuse existing class patterns where possible.

## Frontend Page and Routing Guide

Current public pages:

```text
/           Landing page
/login      Login page
/register   Signup page
```

Current user pages:

```text
/dashboard  User dashboard
/trips      User trips
/explore    Explore weather/attractions
```

Current admin pages:

```text
/admin                Admin dashboard
/admin/users          User management
/admin/api-logs       API logs
/admin/system-errors  System errors
/admin/settings       System settings
```

Mock behavior right now:

```text
Login button  -> /dashboard
Signup button -> /admin
```

This is temporary until real authentication is connected.

## How to Add a Frontend Feature

Example feature: `Budget`

### Step 1: Create feature folder

Create:

```text
frontend/src/features/budgets/
```

### Step 2: Create page file

Example:

```text
BudgetPage.jsx
```

Basic page:

```jsx
function BudgetPage() {
  return (
    <section>
      <h2>Budget</h2>
      <p>Budget feature content goes here.</p>
    </section>
  );
}

export default BudgetPage;
```

### Step 3: Add API file if needed

Create:

```text
frontend/src/api/budgetApi.js
```

Example:

```js
import axiosClient from './axiosClient';

export const getBudgetByTrip = (tripId) => axiosClient.get(`/budgets/trips/${tripId}`);
```

### Step 4: Register route

Open:

```text
frontend/src/app/routes.jsx
```

Add:

```jsx
<Route path="/budgets" element={<BudgetPage />} />
```

Also import the page at the top.

### Step 5: Add sidebar menu

Open:

```text
frontend/src/layouts/UserLayout.jsx
```

Add a menu item:

```js
{ to: '/budgets', label: 'Budget', icon: Wallet }
```

Also import the icon from `lucide-react`:

```js
import { Wallet } from 'lucide-react';
```

### Step 6: Test in browser

Run:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173/budgets
```

### Step 7: Run checks

```bash
npm run lint
npm run build
```

## Environment Variables

Backend environment file:

```text
backend/.env
```

Create it from:

```text
backend/.env.example
```

Example values:

```text
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=your-access-token-secret
JWT_EXPIRES_IN=30m
REFRESH_JWT_SECRET=your-refresh-token-secret
REFRESH_JWT_EXPIRES_IN=7d
OPENWEATHER_API_KEY=your-openweathermap-api-key
PLACES_API_KEY=optional-places-api-key
```

Frontend environment file:

```text
frontend/.env
```

Create it from:

```text
frontend/.env.example
```

Default:

```text
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Never commit real `.env` files.

## Testing

### Backend automated tests

Run:

```bash
cd backend
npm test
```

Backend tests use:

```text
Jest      test runner
Supertest fake HTTP requests to Express app
```

### Frontend checks

Run:

```bash
cd frontend
npm run lint
npm run build
```

Meaning:

```text
npm run lint   checks code style/errors
npm run build  checks production build works
```

Before pushing your work, run the relevant checks.

## Git Workflow for Team Members

Do not work directly on the main branch.

Recommended flow:

```bash
git checkout -b feature/your-feature-name
```

Examples:

```text
feature/trip-crud
feature/weather-search
feature/budget-page
feature/admin-logs
```

After editing:

```bash
git status
git add .
git commit -m "Add trip CRUD routes"
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

The assignment says branches, commits, pull requests, and merges may be checked. Make meaningful commits instead of uploading everything at once.

Good commit messages:

```text
Add trip model and repository
Create weather search service
Build login page layout
Add admin API logs page
```

Bad commit messages:

```text
update
fix
done
final
```

## What Not to Commit

Do commit:

```text
package.json
package-lock.json
.env.example
src/
tests/
README.md
postman/
```

Do not commit:

```text
node_modules/
.env
.env.local
dist/
coverage/
npm-debug.log
```

Why:

```text
node_modules/ is huge and can be recreated with npm install
.env contains secrets
dist/ is generated by npm run build
coverage/ is generated by tests
```

## Useful Local URLs

```text
Frontend landing page: http://localhost:5173/
Login page:            http://localhost:5173/login
Signup page:           http://localhost:5173/register
User dashboard:        http://localhost:5173/dashboard
Admin dashboard:       http://localhost:5173/admin

Backend health:        http://localhost:5000/health
API v1 root:           http://localhost:5000/api/v1
Swagger docs:          http://localhost:5000/api-docs
```

## Common Problems

### Problem: `npm install` not found

Install Node.js first.

Check:

```bash
node -v
npm -v
```

### Problem: frontend cannot call backend

Check backend is running:

```text
http://localhost:5000/health
```

Check frontend `.env`:

```text
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Restart frontend after changing `.env`.

### Problem: MongoDB connection fails

Check:

```text
MONGODB_URI is correct
MongoDB Atlas user/password are correct
your IP address is allowed in MongoDB Atlas
```

### Problem: `.env` is missing

Create it from `.env.example`.

Backend:

```powershell
cd backend
Copy-Item .env.example .env
```

Frontend:

```powershell
cd frontend
Copy-Item .env.example .env
```

### Problem: Vite terminal looks stuck

That is normal.

When you see:

```text
VITE ready
Local: http://localhost:5173/
```

the frontend dev server is running. Keep that terminal open and use another terminal for backend commands.

### Problem: changes do not appear

Try:

```text
refresh browser
check correct URL
restart npm run dev
check terminal errors
```

### Problem: merge conflict

Do not randomly delete other people's code.

Ask the teammate who worked on the same file, compare both changes, and keep the correct parts from both sides.
