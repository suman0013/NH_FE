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
- **Status:** ✅ Completed
- **File:** `shared/schema.ts`
- **Task:** Reviewed devotee_roles table structure and role hierarchy definitions
- **Findings:** Schema is well-designed with `reportingToDevoteeId` and `roleChangeHistory` table

### 1.2 Database Schema Updates
- **Status:** ✅ Completed
- **Files:** `shared/schema.ts`
- **Notes:** No schema changes needed - existing structure supports replacement-based system

---

## Phase 2: Backend Logic Implementation

### 2.1 Update Role Management Utils
- **Status:** ✅ Completed
- **File:** `server/role-management-utils.ts`
- **Changes Made:**
  - ✅ Updated `ROLE_HIERARCHY` to use `canReplaceTo` instead of `canPromoteTo` and `canDemoteTo`
  - ✅ Changed `ChangeType` from 'PROMOTE' | 'DEMOTE' | 'REMOVE' to 'REPLACE' | 'REMOVE'
  - ✅ Updated `validateHierarchyChange()` to validate replacement workflow
  - ✅ Updated `getValidTargetRoles()` to support replacement targets
  - ✅ Updated `requiresSubordinateTransfer()` to check for REPLACE and REMOVE only
  - ✅ Refactored `validateSubordinateTransfer()` for new scenarios:
    - REMOVE: Only allowed if no subordinates
    - REPLACE: Requires subordinates transfer to replacement person

### 2.2 API Routes Update
- **Status:** ✅ Completed
- **File:** `server/routes.ts`
- **Changes Made:**
  - ✅ Removed `promoteDevoteeSchema` and `demoteDevoteeSchema`
  - ✅ Added `replaceRoleSchema` with fields:
    - devoteeId (person being replaced)
    - replacementDevoteeId (person taking the role)
    - newRoleForReplacement (the role they're assuming)
    - reason
  - ✅ Removed `/api/senapoti/promote` endpoint
  - ✅ Removed `/api/senapoti/demote` endpoint
  - ✅ Added `/api/senapoti/replace-role` endpoint that:
    - Assigns replacement to the current person's role
    - Transfers all subordinates to replacement
    - Removes role from replaced person
  - ✅ Updated `/api/senapoti/remove-role` endpoint to:
    - Check for subordinates before removal
    - Return error if any subordinates exist
    - Only allow removal if no subordinates

### 2.3 Storage Layer Updates
- **Status:** ⏳ Pending (uses existing changeDevoteeRole method)
- **Files:** `server/storage.ts`, `server/storage-db.ts`
- **Notes:** Current storage layer supports the new workflow via existing `changeDevoteeRole` method

---

## Phase 3: Frontend UI Changes

### 3.1 Role Management Modal Component
- **Status:** ⏳ Pending
- **Task:** Update modal to show Replace and Remove actions only

### 3.2 Replace Role Workflow
- **Status:** ⏳ Pending
- **Task:** Create new replacement workflow UI

### 3.3 Remove Role Workflow
- **Status:** ⏳ Pending
- **Task:** Update removal to show subordinate check

### 3.4 Promotion Flow Changes
- **Status:** ⏳ Pending
- **Task:** Update UI to guide users through replacement flow for promotions

---

## Phase 4: Validation & Business Logic

### 4.1 Scenario 1: Chakra Replacement
- **Status:** ✅ Implemented (Backend)
- **Scenario:** D1 is Chakra Senapoti → Replace with D2 → D1 becomes ordinary Devotee
- **Implementation:** 
  - D2 gets Chakra role via replaceRole endpoint
  - All Upa Chakra Senapotis reporting to D1 now report to D2
  - D1's role is removed
  - ✅ Validation: Prevents circular references

### 4.2 Scenario 2: Conditional Removal
- **Status:** ✅ Implemented (Backend)
- **Scenario:** D1 is Upa Chakra Senapoti → Can only be removed if no subordinates
- **Implementation:**
  - ✅ Check subordinate count in remove endpoint
  - ✅ Return error if subordinates exist
  - ✅ Allow removal only if count = 0
  - ✅ Error message includes subordinate count

### 4.3 Scenario 3: Promotion via Replacement
- **Status:** ✅ Implemented (Backend)
- **Scenario:** D1 Chakra → Replace to get promoted → Takes over higher role
- **Implementation:**
  - ✅ First: Someone replaces D1 as Chakra (via /replace-role endpoint)
  - ✅ Then: D1 can be assigned to higher role (via another /replace-role call)
  - ✅ Role hierarchy validation included

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

### 5.3 End-to-End Scenario Testing
- **Status:** ⏳ Pending
- **Scenarios:**
  - [ ] Scenario 1: Chakra replacement (D1→D2, subordinates transfer)
  - [ ] Scenario 2: Conditional removal (error if subordinates, success if none)
  - [ ] Scenario 3: Promotion via replacement workflow

---

## Phase 6: Database Migration (if needed)

### 6.1 Schema Sync
- **Status:** ⏳ Not needed
- **Notes:** No database migrations needed - schema already supports new workflow

---

## Implementation Checklist

- **Phase 1 - Schema:** ✅ 2/2 Complete
- **Phase 2 - Backend:** ✅ 2/3 Complete (storage already supports changes)
- **Phase 3 - Frontend:** ⏳ 0/4 Complete
- **Phase 4 - Validation:** ✅ 3/3 Complete (Backend)
- **Phase 5 - Testing:** ⏳ 0/3 Complete
- **Phase 6 - Migration:** ✅ Not needed

**Overall Progress:** 8/16 Complete (50%)

---

## Key Endpoints

### New Endpoint: Replace Role
```
POST /api/senapoti/replace-role
Body: {
  devoteeId: number,              // Person being replaced
  replacementDevoteeId: number,   // Person taking the role
  newRoleForReplacement: string,  // Role they're assuming
  reason: string
}
```

### Updated Endpoint: Remove Role
```
POST /api/senapoti/remove-role
Body: {
  devoteeId: number,
  reason: string
}
Response: 
- Success (200): Role removed
- Error (400): If subordinates exist, includes subordinate count
```

---

## Removed Endpoints

- ❌ `POST /api/senapoti/promote` (replaced with role replacement)
- ❌ `POST /api/senapoti/demote` (replaced with role replacement)

---

## Notes
- All changes maintain referential integrity
- Role hierarchy validation enforced at every step
- Subordinate transfers are atomic within each role change
- Error messages are user-friendly and actionable
- Backend implementation complete and ready for frontend integration
