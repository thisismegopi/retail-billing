# Sprint 1: Foundation & Setup

**Phase:** 1
**Estimated Duration:** Weeks 1-2
**Status:** Planned

## Objectives

Establish the technical foundation of the Billing Software, set up the development environment, implement authentication, and create the core application shell.

## 1. Project Initialization

- [ ] **Repository Setup**: Initialize Git repository and structure.
- [ ] **React Setup**: Create project using Vite (React 18+).
    - **Language**: TypeScript (Required).
    - Dependencies: `react-router-dom`, `firebase`, `date-fns`, `react-hook-form`, `zod`, `lucide-react`.
    - **UI Library**: shadcn/ui.
        - Initialize: `npx shadcn-ui@latest init`.
        - Add core components: `button`, `input`, `card`, `dialog`, `dropdown-menu`, `table`, `form`.
- [ ] **Firebase Project**:
    - Create new project in Firebase Console.
    - Enable Authentication, Firestore, and Storage.
    - **Plan**: Spark (Free).
    - Register web app and get config keys.
- [ ] **Hosting Setup**: Initialize GitHub Pages logic.
    - Install `gh-pages` package (`npm install gh-pages --save-dev`).
    - Configure `package.json` with homepage and deploy scripts.

## 2. Authentication Module

### Features

- User Login (Email/Password).
- Password Reset flow.
- Protected Routes (Redirect to login if not authenticated).
- User Role Management (Admin, Manager, Cashier).

### Database Schema Requirements

**Collection: `users`**

```javascript
users/{userId}
{
  email: string,
  displayName: string,
  role: "admin" | "manager" | "cashier",
  shopId: string,
  createdAt: timestamp,
  isActive: boolean
}
```

### Tasks

- [ ] Implement Firebase Auth Context provider.
- [ ] Build Login Screen.
- [ ] Build Password Reset Screen.
- [ ] Create `useAuth` hook.
- [ ] Implement Route Guards (`<PrivateRoute />`).

## 3. Core UI & Navigation

### Features

- Responsive Application Shell (Sidebar/Navigation Drawer).
- Top Bar with User Profile and Logout.
- Dashboard Layout.

### Tasks

- [ ] Design Main Layout component.
- [ ] Implement Navigation Menu (links to Billing, Inventory, Reports, etc.).
- [ ] Ensure Mobile Responsiveness (Hamburgler menu on small screens).

## 4. Master Data Modules (Basic Setup)

### Shop Profile

- [ ] Create `shops` collection.
- [ ] Build Settings page to manage Shop details (Name, Address, Logo, GST).

### Database Schema

**Collection: `shops`**

```javascript
shops/{shopId}
{
  name: string,
  address: object,
  phone: string,
  email: string,
  gstNumber: string,
  logo: string,
  currency: string,
  taxRate: number,
  createdAt: timestamp
}
```

## Definition of Done

- Project runs locally without errors.
- Users can log in and log out.
- Navigation works and is responsive.
- Shop details can be saved to Firestore.
