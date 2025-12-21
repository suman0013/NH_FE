# Leadership Role Management Enhancement

## Overview
Revamp the role management flow to use a replacement-based system instead of downgrading. All role transitions (promotion, replacement, demotion) happen through replacement logic where a new person takes the role and the previous role holder either gets promoted or becomes ordinary devotee.

---

## Key Concepts

### Replacement Model
- **Senapoti Replacement**: A new devotee takes the senapoti role. The previous senapoti can then be promoted to a higher level or become ordinary devotee.
- **No Direct Downgrading**: There's no "downgrade" action. Role changes always happen via replacement.
- **Reporting Structure Updates**: When a senapoti is replaced, all subordinates who reported to them now report to the new senapoti.

### Scenarios

#### Scenario 1: Senapoti Replacement with Promotion
```
Before:
  D1 (Chakra Senapoti)
    ├── D3 (Upa Chakra Senapoti)
    └── D4 (Upa Chakra Senapoti)

Step 1: Assign D2 as new Chakra Senapoti
  D2 (Chakra Senapoti) ← NEW
  D1 (no role yet)
    ├── D3 (Upa Chakra Senapoti)
    └── D4 (Upa Chakra Senapoti)

Step 2: Promote D1 by replacing someone at Maha Chakra level
  D2 (Chakra Senapoti)
    ├── D3 (Upa Chakra Senapoti)
    └── D4 (Upa Chakra Senapoti)
  D1 (Maha Chakra Senapoti) ← PROMOTED

After:
  D1 (Maha Chakra Senapoti)
    └── D2 (Chakra Senapoti)
        ├── D3 (Upa Chakra Senapoti)
        └── D4 (Upa Chakra Senapoti)
```

#### Scenario 2: Senapoti Replacement with Demotion
```
Before:
  D1 (Chakra Senapoti)
    └── D3 (Upa Chakra Senapoti)

Step 1: Replace D1 with D2 as Chakra Senapoti
  D2 (Chakra Senapoti) ← NEW
    └── D3 (Upa Chakra Senapoti)

Step 2: D1 becomes ordinary devotee (or stays unassigned)
  Result: D1 is Ordinary Devotee
```

---

## UI/UX Requirements

### Senapoti Replacement Popup
When replacing an existing senapoti:
- **Title**: "Assign Replacement for [Current Senapoti Name] - [Role Level]"
- **Available Devotees**: 
  - Must NOT have any leadership role (not senapoti, secretary, president, accountant)
  - Must be assigned to a namhatta in the SAME DISTRICT as the senapoti being replaced
  - Show devotee name, namhatta, and current status
- **Action**: "Assign as [Role Level]"

### Non-Leadership Devotee Promotion Popup
When promoting a non-leadership devotee:
- **Step 1: Select Role Level**
  - Dropdown/Radio showing available senapoti levels (Chakra, Maha Chakra, Upa Chakra, etc.)
  - Only show levels that have senapoti in the same district
- **Step 2: Select Senapoti to Replace**
  - List all senapoti of the selected level in the same district
  - Show senapoti name, current namhatta/level, and subordinate count
  - Confirm replacing with "Promote to [Level] by replacing [Senapoti Name]"

---

## Database Schema Changes

### New Fields Needed
- [ ] `role_assignment_history` table or similar to track role transitions
- [ ] Soft delete or status field to mark old assignments as replaced
- [ ] Fields to track replacement reason (promotion, lateral move, etc.)

### Affected Tables
- `role_assignments` - Update to support replacement tracking
- `devotees` - No changes needed if role is tracked via role_assignments

---

## Implementation Tasks

### Phase 1: Database & Backend Logic
- [x] **Task 1.1**: Create/Update role assignment schema to support replacement model
  - [x] Add status field (active/replaced) to track role history
  - [x] Add replaced_by field to link to replacement assignment
  - [x] Add replacement_reason field for audit trail
  - Status: `COMPLETED`

- [x] **Task 1.2**: Create helper functions in backend
  - [x] Function to find eligible replacement devotees (same district, no role)
  - [x] Function to get senapoti at specific level in district
  - [x] Function to execute replacement (deactivate old, activate new, update reporting)
  - Status: `COMPLETED`

- [x] **Task 1.3**: Create/Update API endpoints
  - [x] `POST /api/roles/replace` - Replace a senapoti
  - [x] `GET /api/roles/eligible-replacements/:roleAssignmentId` - Get eligible replacements for a senapoti
  - [x] `GET /api/roles/senapotis-by-level/:district/:level` - Get senapoti at specific level
  - [x] Update existing endpoints to handle replacement logic
  - Status: `COMPLETED`

- [x] **Task 1.4**: Update reporting structure logic
  - [x] When senapoti is replaced, update all subordinates' reporting references
  - [x] Ensure no orphaned assignments
  - [x] Add transaction handling to prevent partial updates
  - Status: `COMPLETED`

### Phase 2: Frontend UI Components
- [x] **Task 2.1**: Create Senapoti Replacement Modal
  - [x] Modal/Dialog component for senapoti replacement
  - [x] Fetch and display eligible devotees in same district
  - [x] Handle assignment confirmation and state updates
  - Status: `IN PROGRESS - Component created at client/src/components/SenapotiReplacementModal.tsx`

- [x] **Task 2.2**: Create Non-Leadership Devotee Promotion Modal
  - [x] Step 1: Role level selection (dropdown/radio)
  - [x] Step 2: Senapoti selection (list from selected level)
  - [x] Display preview of new hierarchy
  - [x] Handle promotion confirmation
  - Status: `IN PROGRESS - Component created at client/src/components/DevoteePromotionModal.tsx`

- [ ] **Task 2.3**: Update Role Management Page
  - [ ] Integrate new modals into existing role management interface
  - [ ] Update action buttons (Replace instead of Downgrade)
  - [ ] Show replacement history in devotee detail view
  - [ ] Display active role and replacement timeline
  - Status: `IN PROGRESS - Hierarchy.tsx needs modal imports and integration`

- [x] **Task 2.4**: Create Role History/Timeline View
  - [x] Show role transitions for each devotee
  - [x] Display replacement date, previous role, new role, and reason
  - [x] Add audit trail view for administrators
  - Status: `IN PROGRESS - Component created at client/src/components/RoleHistoryTimeline.tsx`

### Phase 3: Business Logic & Validation
- [ ] **Task 3.1**: Implement validation rules
  - [ ] Ensure devotee being replaced is still active in a role
  - [ ] Ensure replacement devotee has no active role
  - [ ] Ensure both devotees are in same district
  - [ ] Prevent circular reporting (devotee reporting to subordinate)
  - Status: `NOT STARTED`

- [ ] **Task 3.2**: Handle edge cases
  - [ ] What if senapoti has no subordinates? (Simple replacement)
  - [ ] What if devotee being promoted still has role? (Must replace first)
  - [ ] Bulk operations (replace multiple roles in workflow)
  - [ ] Rollback capability
  - Status: `NOT STARTED`

### Phase 4: Testing & Deployment
- [ ] **Task 4.1**: Unit tests
  - [ ] Test replacement logic with various hierarchies
  - [ ] Test eligible devotee filtering
  - [ ] Test reporting structure updates
  - Status: `NOT STARTED`

- [ ] **Task 4.2**: Integration tests
  - [ ] Test full replacement workflow
  - [ ] Test promotion workflow
  - [ ] Test with existing data
  - Status: `NOT STARTED`

- [ ] **Task 4.3**: User acceptance testing
  - [ ] Verify UI works as expected
  - [ ] Verify reporting structure correctly updated
  - [ ] Verify role history tracked properly
  - Status: `NOT STARTED`

---

## Summary
- **Total Tasks**: 13 major tasks across 4 phases
- **Current Status**: Phase 1 COMPLETED - Database schema, backend functions, and API endpoints implemented. Phase 2 IN PROGRESS - Frontend components created
- **Next Phase**: Phase 2 (Frontend UI Components) - Complete Hierarchy.tsx integration, then Phase 3 & 4
- **Priority**: High (Core role management system revision)
- **Complexity**: Medium-High (Affects hierarchy, reporting, and audit trails)

## Phase 2 Implementation Details (IN PROGRESS)
- Created `SenapotiReplacementModal.tsx` - handles replacement of existing senapoti with eligible devotees
- Created `DevoteePromotionModal.tsx` - two-step process for promoting non-leadership devotees (select role level, then select senapoti to replace)
- Created `RoleHistoryTimeline.tsx` - displays role transition history with timeline visualization
- **Next Step**: Restore Hierarchy.tsx and integrate the new modals into the page

## Phase 1 Implementation Details
- Added `roleAssignments` table with status tracking (ACTIVE/REPLACED/REMOVED)
- Helper functions: `getEligibleReplacements`, `getSenapotiByLevelInDistrict`, `executeRoleReplacement`
- API endpoints: POST /api/roles/replace, GET /api/roles/eligible-replacements/:roleAssignmentId, GET /api/roles/senapotis-by-level/:districtCode/:level
- Subordinate transfer logic implemented and integrated with replacement execution
