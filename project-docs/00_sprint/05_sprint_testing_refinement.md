# Sprint 5: Testing & Refinement

**Phase:** 5
**Estimated Duration:** Week 7
**Status:** Planned
**Prerequisites:** Sprint 4

## Objectives

Ensure the system is robust, secure, and performs well under load. Focus on bug fixing and security rule enforcement.

## 1. Security Rules Implementation

- [ ] **Firestore Rules**:
    - Restrict `users` write access to Admins.
    - Users can only read/write data for their assigned `shopId`.
    - Validate data types (e.g., price must be number > 0).
- [ ] **Auth Rules**: Ensure disabled users cannot login.

## 2. Testing

- [ ] **Unit Tests**: Test complex logic (Tax calculation, Stock deduction).
- [ ] **Integration Tests**: Test full Billing flow from Cart to Firestore.
- [ ] **User Acceptance Testing (UAT)**: Walk through all workflows as a specific user role.

## 3. Performance Optimization

- [ ] **Indexes**: Create necessary composite indexes in Firestore for complex queries (e.g., search bills by date range AND customer).
- [ ] **Code Splitting**: Ensure Report/Admin modules are lazy-loaded.
- [ ] **Caching**: Implement `react-query` or similar for caching master data.

## 4. UI/UX Polish

- [ ] Improve error messages and loading states.
- [ ] Verify tab navigation support for fast billing.
- [ ] Check color contrast and accessibility.

## Definition of Done

- All Firestore security rules are active and tested.
- Critical paths are bug-free.
- Lighthouse performance score > 90.
- Application handles network disconnects gracefully (offline support check).
