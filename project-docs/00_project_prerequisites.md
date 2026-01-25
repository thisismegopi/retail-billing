# Project Prerequisites & Base Structure Setup

**Document ID:** `00_project_prerequisites`
**Version:** 1.0

This document outlines the software, tools, and initial structure required BEFORE starting the actual coding in Sprint 1.

## 1. Development Environment Checklist

Ensure the following tools are installed on your machine:

### Core Software

- [ ] **Node.js**: Version 18.x (LTS) or higher.
    - Verify: `node -v`
- [ ] **npm**: Installed with Node.js.
    - Verify: `npm -v`
- [ ] **Git**: Latest version.
    - Verify: `git --version`

### Global Tools

- [ ] **Firebase CLI**: Required for deployment and local emulation.
    - Install: `npm install -g firebase-tools`
    - Login: `firebase login`

### IDE (VS Code) Recommended Extensions

- [ ] **ESLint**: For code quality.
- [ ] **Prettier**: For code formatting.
- [ ] **Tailwind CSS IntelliSense**: For class autocompletion.
- [ ] **ES7+ React/Redux/React-Native snippets**: For rapid coding.

## 2. Initial Project Structure

After initializing the project with Vite, the directory structure should be organized as follows. This is the **Target Structure** you should aim for after the initial "clean up" of the default Vite template.

```text
retail-billing-app/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Action for creating release/deployment
├── .vscode/
│   └── settings.json           # VS Code workspace settings
├── public/                     # Static assets (favicon, manifest.json)
├── src/
│   ├── assets/                 # Images, global fonts
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (Button.tsx, Input.tsx)
│   │   └── layout/             # Layout components (Header.tsx, Sidebar.tsx)
│   ├── contexts/               # Global state contexts
│   │   └── AuthContext.tsx
│   ├── features/               # Feature-based modules
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── inventory/
│   │   └── reports/
│   ├── hooks/                  # Custom React hooks (useAuth.ts)
│   ├── lib/
│   │   ├── firebase.ts         # Firebase initialization
│   │   └── utils.ts            # Utility functions (cn class merger)
│   ├── types/                  # Global TypeScript interfaces
│   ├── App.tsx                 # Main root component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles & Tailwind directives
├── .env                        # Environment variables (API keys)
├── .env.example                # Example environment file
├── .firebaserc                 # Firebase project alias
├── firebase.json               # Firebase configuration
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── postcss.config.js           # PostCSS config for Tailwind
├── tailwind.config.js          # Tailwind CSS config
├── tsconfig.json               # TypeScript path aliases
└── vite.config.ts              # Build configuration
```

## 3. Important Configuration Files

### `tsconfig.json` (Path Aliases)

We will use path aliases to avoid `../../` imports.

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"]
        }
    }
}
```

### `.env` (Template)

Do not commit actual keys to Git.

```ini
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 4. Initialization Commands Sequence

When you differ to Sprint 1, use this sequence:

1.  `npm create vite@latest billing-app -- --template react-ts`
2.  `cd billing-app`
3.  `npm install`
4.  `npm install -D tailwindcss postcss autoprefixer`
5.  `npx tailwindcss init -p`
6.  `npx shadcn-ui@latest init` (Follow prompts)
7.  `npm install firebase react-router-dom lucide-react date-fns react-hook-form zod`

This document serves as the "Ready to Code" standard.
