# Leadership Role Management System - Implementation Plan

## Overview
Revamp the role management flow from the current promote/demote/remove system to a replacement-based promotion workflow with conditional removal.

**Key Changes:**
- Replace "Demote" with "Replace" functionality
- Promotion only via replacement (not direct)
- Conditional removal (only if no subordinates reporting)
- Automatic subordinate transfer when roles change
- Stricter hierarchy validation

---

## Phase 1: Schema & Data Model Changes

### 1.1 Review Current Schema
- **Status:** ⏳ Pending
- **File:** `shared/schema.ts`
- **Task:** Review devotee_roles table structure and role hierarchy definitions

### 1.2 Database Schema Updates
- **Status:** ⏳ Pending
- **Files:** `shared/schema.ts`
- **Changes Needed:**
  - Verify `reporting_to` column exists in roles table
  - Ensure cascade delete is properly configured for subordinate transfers
  - Add validation constraints if needed

---

## Phase 2: Backend Logic Implementation

### 2.1 Update Role Management Utils
- **Status:** ⏳ Pending
- **File:** `server/role-management-utils.ts`
- **Tasks:**
  - [ ] Remove/refactor `promoteRole()` function
  - [ ] Remove/refactor `demoteRole()` function
  - [ ] Create `replaceRole()` function with:
    - Validation that replacement person exists
    - Transfer of all current subordinates to replacement
    - Proper role hierarchy validation
  - [ ] Update `removeRole()` function with:
    - Check if devotee has subordinates reporting
    - Only allow removal if no subordinates
    - Return error with count if cannot remove

### 2.2 API Routes Update
- **Status:** ⏳ Pending
- **File:** `server/routes.ts`
- **Tasks:**
  - [ ] Update `PUT /api/roles/:devoteeId` endpoint
  - [ ] Change request body structure to support replacement workflow
  - [ ] Add validation for replacement scenarios
  - [ ] Update response structure and error messages

### 2.3 Storage Layer Updates
- **Status:** ⏳ Pending
- **Files:** `server/storage.ts`, `server/storage-db.ts`
- **Tasks:**
  - [ ] Update role management methods in IStorage interface
  - [ ] Implement replace role logic with transaction
  - [ ] Update remove role logic with subordinate check

---

## Phase 3: Frontend UI Changes

### 3.1 Role Management Modal Component
- **Status:** ⏳ Pending
- **File:** `client/src/pages/role-management.tsx` or modal component
- **Tasks:**
  - [ ] Remove "Promote" and "Demote" action buttons
  - [ ] Add "Replace Role" action button
  - [ ] Add "Remove Role" action button (conditional)
  - [ ] Update modal description text

### 3.2 Replace Role Workflow
- **Status:** ⏳ Pending
- **Tasks:**
  - [ ] Create replacement selection form
  - [ ] Show list of eligible replacements (same or higher role level)
  - [ ] Display subordinates who will be transferred
  - [ ] Add confirmation modal
  - [ ] Handle success/error responses

### 3.3 Remove Role Workflow
- **Status:** ⏳ Pending
- **Tasks:**
  - [ ] Show error if subordinates exist
  - [ ] Display subordinate count in error
  - [ ] Allow removal only if count is 0
  - [ ] Add confirmation modal

### 3.4 Promotion Flow Changes
- **Status:** ⏳ Pending
- **Tasks:**
  - [ ] Update promotion logic to require replacement
  - [ ] Show message: "To promote, first assign replacement to current role"
  - [ ] Provide UI to initiate replacement first

---

## Phase 4: Validation & Business Logic

### 4.1 Scenario 1: Chakra Replacement
- **Status:** ⏳ Pending
- **Scenario:** D1 is Chakra Senapoti → Replace with D2 → D1 becomes ordinary Devotee
- **Implementation:**
  - [ ] D2 gets Chakra role
  - [ ] All Upa Chakra Senapotis reporting to D1 now report to D2
  - [ ] D1's role is removed

### 4.2 Scenario 2: Conditional Removal
- **Status:** ⏳ Pending
- **Scenario:** D1 is Upa Chakra Senapoti → Can only be removed if no subordinates
- **Implementation:**
  - [ ] Check subordinate count before removal
  - [ ] Return error with subordinate details if any exist
  - [ ] Allow removal only if count = 0

### 4.3 Scenario 3: Promotion via Replacement
- **Status:** ⏳ Pending
- **Scenario:** D1 Chakra → Replace to get promoted → Takes over higher role
- **Implementation:**
  - [ ] First: Someone replaces D1 as Chakra
  - [ ] Then: D1 can be assigned to higher role (replaces someone)
  - [ ] Enforce role hierarchy in validation

---

## Phase 5: Integration & Testing

### 5.1 API Testing
- **Status:** ⏳ Pending
- **Tasks:**
  - [ ] Test replace role endpoint with valid data
  - [ ] Test remove with subordinates (should fail)
  - [ ] Test remove without subordinates (should succeed)
  - [ ] Test subordinate transfer logic
  - [ ] Test role hierarchy validation

### 5.2 Frontend Testing
- **Status:** ⏳ Pending
- **Tasks:**
  - [ ] Test modal displays correct actions
  - [ ] Test replacement selection form works
  - [ ] Test subordinate display
  - [ ] Test error messages display correctly
  - [ ] Test confirmation modals

### 5.3 End-to-End Scenario Testing
- **Status:** ⏳ Pending
- **Scenarios:**
  - [ ] Scenario 1: Chakra replacement (D1→D2, subordinates transfer)
  - [ ] Scenario 2: Conditional removal (error if subordinates, success if none)
  - [ ] Scenario 3: Promotion via replacement workflow

---

## Phase 6: Database Migration (if needed)

### 6.1 Schema Sync
- **Status:** ⏳ Pending
- **Command:** `npm run db:push --force` (if needed)
- **Task:** Ensure Drizzle schema matches actual database structure

---

## Implementation Checklist

- **Phase 1 - Schema:** ⏳ 0/2 Complete
- **Phase 2 - Backend:** ⏳ 0/3 Complete
- **Phase 3 - Frontend:** ⏳ 0/4 Complete
- **Phase 4 - Validation:** ⏳ 0/3 Complete
- **Phase 5 - Testing:** ⏳ 0/3 Complete
- **Phase 6 - Migration:** ⏳ 0/1 Complete

**Overall Progress:** 0/16 Complete (0%)

---

## Key Files to Modify

1. `shared/schema.ts` - Data model
2. `server/role-management-utils.ts` - Core logic
3. `server/routes.ts` - API endpoints
4. `server/storage.ts` & `server/storage-db.ts` - Database operations
5. `client/src/pages/role-management.tsx` - UI modal
6. Role management related components in `client/src/components/`

---

## Notes
- All changes must maintain referential integrity
- Role hierarchy must be validated at every step
- Subordinate transfers must be atomic (all-or-nothing)
- Error messages should be user-friendly and actionable
