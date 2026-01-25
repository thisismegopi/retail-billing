# Technical Architecture Document

**Project:** Retail Billing Software
**Version:** 1.0
**Date:** 2026-01-22

## 1. High-Level Overview

This application is a **Single Page Application (SPA)** built with **React** and **TypeScript**, hosted on **GitHub Pages**. It utilizes **Firebase (Spark Plan)** services directly from the client side for Authentication, Database, and Storage, ensuring a strictly zero-cost infrastructure for the initial scale.

Due to the "Free Tier" constraint, **No Cloud Functions** will be used. All business logic, including complex stock updates and inventory management, will be handled via **Client-Side Transactions** directly against Firestore, safeguarded by strict **Firestore Security Rules**.

## 2. Technology Stack

### Frontend Core

- **Framework**: React 18+
- **Language**: TypeScript (Strict Mode)
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context + Hooks (Global Auth/Theme/Toast), Local state for forms.

### UI/UX

- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Components**: shadcn/ui (built on Radix UI).
- **Responsiveness**: Mobile-First design pattern.

### Backend (BaaS) - free tier

- **Platform**: Firebase (Spark Plan)
- **Auth**: Firebase Authentication (Email/Password, Google).
- **Database**: Cloud Firestore (NoSQL).
- **Storage**: Firebase Cloud Storage (Product images, Shop logos).

### Hosting & CI/CD

- **Hosting**: GitHub Pages.
- **Deployment**: GitHub Actions (Build & Deploy workflow).

## 3. Project Structure (Feature-First)

We will follow a feature-based folder structure to ensure maintainability and scalability.

```text
src/
├── assets/             # Static assets (images, fonts)
├── components/         # Shared UI components (Button, Input, Modal)
│   ├── ui/             # Generic design system components
│   └── layout/         # AppLayout, Sidebar, Header
├── features/           # Feature-specific modules
│   ├── auth/           # Login, Register, ProtectedRoute
│   ├── dashboard/      # Dashboard widgets and framing
│   ├── products/       # Product list, add/edit forms
│   ├── billing/        # POS interface, Cart logic
│   ├── customers/      # Customer management
│   └── reports/        # Reporting views
├── hooks/              # Shared custom hooks (useDebounce, useFirestore)
├── lib/                # Library configurations (firebase.ts, utils.ts)
├── contexts/           # Global Contexts (AuthContext, ToastContext)
├── types/              # Global TypeScript interfaces
└── App.tsx             # Main Application entry
```

## 4. Key Architectural Decisions

### 4.1 No-Cost Backend Logic (Client-Side Transactions)

Since we cannot use Cloud Functions (which require the Blaze plan for Node.js environments), we must handle atomicity on the client.

**Example: Deducting Stock on Sale**
Instead of calling an API endpoint, the client performs a Firestore Transaction:

1.  Read current Product document.
2.  Check if `currentStock >= requestedQty`.
3.  Write new `currentStock` and create `Sale` record atomically.
4.  If stock changed during read, the transaction retries automatically.

### 4.2 Security Rules

Security is paramount since logic is client-side.

- **Validation**: Rules will validate data types and constraints (e.g., `request.resource.data.price >= 0`).
- **Authorization**: Rules will ensure users can only modify their own Shop's data (`resource.data.shopId == request.auth.uid`).

### 4.3 Offline Support

- **Firestore Offline Persistence**: Enabled by default in the SDK. app will work for basic reads/writes offline and sync when online.

## 5. Deployment Strategy (GitHub Pages)

### Workflow

1.  **Code**: Push to `main` branch.
2.  **Action**: GitHub Action triggers.
    - Installs dependencies (`npm ci`).
    - Builds project (`npm run build`).
    - Uploads `dist` folder to `gh-pages` branch.
3.  **Serve**: GitHub Pages serves content from `gh-pages`.

### Routing configuration

Because GitHub Pages is a static host, we must handle client-side routing.

- Use `HashRouter` OR
- Use `BrowserRouter` with a `404.html` hack that redirects to `index.html` to support deep linking. (We will proceed with `HashRouter` for simplicity initially, or configure the 404 trick if clean URLs are strict requirement).

## 6. Development Guidelines

- **Strict Typing**: No `any`. Define interfaces for all Firestore documents.
- **Component Purity**: Logic should be extracted to hooks; components should focus on rendering.
- **Git Flow**: Feature branches -> Pull Request -> Main.
