# Sprint 6: Deployment & Handover

**Phase:** 6
**Estimated Duration:** Week 8
**Status:** Planned
**Prerequisites:** Sprint 5

## Objectives

Deploy the application to production, enable PWA capabilities for mobile checks, and prepare user documentation.

## 1. Deployment (GitHub Pages)

- [ ] **Environment Variables**: Configure production keys in `.env`.
- [ ] **Base URL**: Ensure `vite.config.ts` has correct `base` path for GitHub Repo.
- [ ] **Build**: Run optimized production build (`npm run build`).
- [ ] **Deploy**: Run deployment script (`npm run deploy` which runs `gh-pages -d dist`).
- [ ] **Automation (Optional)**: Set up GitHub Action to auto-deploy on push to main.

## 2. PWA Configuration

- [ ] Configure `manifest.json` (Icon, Name, Theme Color).
- [ ] Register Service Worker for offline caching of assets.
- [ ] Verify "Add to Home Screen" prompt works on Mobile.

## 3. Post-Deployment

- [ ] **Backup Configuration**: Set up automated backups via Google Cloud (if on Blaze plan) or documented manual export process.
- [ ] **Monitoring**: Enable Firebase Crashlytics or simple error logging.

## 4. Documentation

- [ ] Create User Guide (How to create a bill, How to add stock).
- [ ] Create Admin Guide (User management, Backup procedures).

## Definition of Done

- Application is live and accessible via URL.
- PWA installs correctly on mobile devices.
- User documentation is complete and delivered.
