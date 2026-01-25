# Technical Specifications - Sprint 1: Foundation & Setup

**Reference Sprint**: [01_sprint_foundation.md](../00_sprint/01_sprint_foundation.md)
**Version**: 1.0

This document details the implementation logic, data structures, and test scenarios for the Foundation phase.

## 1. Feature Specifications

### 1.1 Project Setup

**Requirement**: Initialize a React + TypeScript project with shadcn/ui and Firebase.
**Implementation Logic**:

- **Vite Config**: Ensure `@` alias is configured in `vite.config.ts` resolving to `./src`.
- **Tailwind Config**: Extend theme to include shadcn/ui custom colors (foreground, background, primary, destructive, etc.).
- **Firebase Config**: Create `src/lib/firebase.ts` exporting initialized `auth`, `db`, and `storage` instances.

### 1.2 Authentication Module

**Requirement**: secure user login/logout and role-based access.
**Components**:

- `AuthProvider`: Wraps app, subscribes to `onAuthStateChanged`. Fetches user role from `users/{uid}` logic.
- `LoginForm`: Shadcn Form (`react-hook-form` + `zod`) for email/password.
- `ProtectedRoute`: Wrapper checking `currentUser`. Redirects to `/login` if null.

**Data Flow**:

1.  User enters credentials -> `signInWithEmailAndPassword`.
2.  On success -> Firebase returns `User` object.
3.  `AuthProvider` detects change -> fetches `doc(db, 'users', user.uid)`.
4.  If user doc missing (first login?) -> optional: create default doc or error out (depending on business rule: invite only vs public signup). _Decision: Open signup for now, role='cashier' default._

### 1.3 Layout & Navigation

**Requirement**: Responsive dashboard shell.
**Components**:

- `DashboardLayout`: Contains `Sidebar` (left), `Header` (top), and `<Outlet />` (content).
- `Sidebar`: Collapsible on mobile (Sheet component from shadcn/ui). Listing nav items: Dashboard, Billing, Inventory, Reports.
- `UserNav`: Dropdown in Header showing generic avatar + Logout button.

## 2. Database & Security

### 2.1 Schema: `users`

| Field      | Type    | Description                    |
| :--------- | :------ | :----------------------------- |
| `uid`      | string  | (Document ID) Matches Auth UID |
| `email`    | string  | User email                     |
| `role`     | enum    | 'admin', 'manager', 'cashier'  |
| `shopId`   | string  | ID of the shop they belong to  |
| `isActive` | boolean | If false, deny access          |

### 2.2 Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only admin can create/update roles
      allow write: if false;
    }
    match /shops/{shopId} {
        allow read: if true;
        allow write: if request.auth != null; // Temporary for setup
    }
  }
}
```

## 3. Implementation Details (Code Level)

### 3.1 `useAuth` Hook Signature

```typescript
interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null; // Contains role, shopId
    loading: boolean;
    login: (creds: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
}
```

### 3.2 Key Dependencies to Install

`npm install firebase react-router-dom react-hook-form zod @hookform/resolvers lucide-react clsx tailwind-merge`

### 3.3 shadcn/ui Components

`npx shadcn-ui@latest add button input card label form toast dropdown-menu sheet avatar`

## 4. Test Scenarios

### 4.1 Unit Tests (Vitest/Jest)

| ID    | Scenario                   | Expected Result                           |
| :---- | :------------------------- | :---------------------------------------- |
| UT-01 | `useAuth` initial state    | `loading` is true, `user` is null.        |
| UT-02 | `login` with invalid email | Throws error, `loading` returns to false. |

### 4.2 Integration Tests

| ID    | Scenario          | Steps                                           | Expected Result                                  |
| :---- | :---------------- | :---------------------------------------------- | :----------------------------------------------- |
| IT-01 | Successful Login  | 1. Enter valid email/pass. <br> 2. Click Login. | Redirect usage to Dashboard. Auth state updates. |
| IT-02 | Protected Route   | 1. Navigate to `/dashboard` without auth.       | Auto-redirect to `/login`.                       |
| IT-03 | Local Persistence | 1. Login. <br> 2. Refresh Page.                 | User remains logged in (no redirect).            |

### 4.3 Manual Verification (UAT)

- [ ] **Responsive Sidebar**: On mobile (screen < 768px), sidebar should be hidden and toggled via hamburger menu.
- [ ] **Logout**: Clicking logout should clear state, local storage, and redirect to login immediately.
- [ ] **Theme**: Check custom color consistency (primary color on buttons).
