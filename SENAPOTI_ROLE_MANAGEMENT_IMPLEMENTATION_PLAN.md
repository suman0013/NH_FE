# Senapoti Role Management System - Implementation Plan

## Overview
Implementation plan for the Senapoti Role Management System with hierarchical role changes, subordinate transfers, and district-based filtering.

## Key Requirements
- **Transfer Subordinates**: Must be done for ALL changes (upgrade, downgrade, or strip)
- **District Scope**: All changes must respect district boundaries
- **Hierarchy Integrity**: Maintain proper reporting chain at all times
- **Audit Trail**: Track all role changes with full history

## Hierarchy Structure
```
District Supervisor (Top Level)
    ↓
Mala Senapoti (reports to District Supervisor)
    ↓
Maha Chakra Senapoti (reports to Mala Senapoti)
    ↓
Chakra Senapoti (reports to Maha Chakra Senapoti)
    ↓
Upa Chakra Senapoti (reports to Chakra Senapoti)
```

---

## IMPLEMENTATION TASKS

**Instructions for Replit Agent:**
- Run the SQL queries provided separately to create the role history table
- Pick tasks in the exact order listed below
- Complete all subtasks within a task before moving to the next task
- Update status as you progress: NOT_STARTED → IN_PROGRESS → COMPLETED
- Do not skip dependencies - each task builds on the previous ones

---

### **TASK 1: Core Utility Functions** - Status: COMPLETED

#### Subtask 1.1: Hierarchy Validation Functions - Status: COMPLETED
- Create `validateHierarchyChange()` function
- Create `checkCircularReference()` function
- Create `getValidTargetRoles()` function
- Add role progression rules validation

#### Subtask 1.2: District Filtering Functions - Status: COMPLETED
- Create `getDevoteesByDistrictAndRole()` function
- Create `getDistrictHierarchy()` function
- Create `findAvailableSupervisors()` function

#### Subtask 1.3: Subordinate Management Functions - Status: COMPLETED
- Create `getDirectSubordinates()` function
- Create `getAllSubordinatesInChain()` function
- Create `validateSubordinateTransfer()` function

---

### **TASK 2: Backend Storage Layer** - Status: COMPLETED

#### Subtask 2.1: Role Management Storage Methods - Status: COMPLETED
- Add `changeDevoteeRole()` method to storage interface
- Add `transferSubordinates()` method
- Add `getRoleChangeHistory()` method
- Add `getAvailableSupervisors()` method

#### Subtask 2.2: Implement Storage Methods in DB Storage - Status: COMPLETED
- Implement all role management methods in storage-db.ts
- Add proper transaction handling for complex operations
- Add error handling and rollback mechanisms

#### Subtask 2.3: Add Audit Trail Storage - Status: COMPLETED
- Implement `recordRoleChange()` method
- Add bulk subordinate transfer tracking
- Ensure all changes are logged with timestamps and reasons

---

### **TASK 3: API Endpoints** - Status: COMPLETED

#### Subtask 3.1: Subordinate Transfer API - Status: COMPLETED
- Create `POST /api/senapoti/transfer-subordinates` endpoint
- Handle bulk subordinate reassignment
- Validate district boundaries and hierarchy rules
- Add request/response validation with Zod schemas

#### Subtask 3.2: Role Change APIs - Status: COMPLETED
- Create `POST /api/senapoti/promote` endpoint
- Create `POST /api/senapoti/demote` endpoint  
- Create `POST /api/senapoti/remove-role` endpoint
- All endpoints must handle subordinate transfer automatically

#### Subtask 3.3: Supporting APIs - Status: COMPLETED
- Create `GET /api/senapoti/available-supervisors/{districtId}/{targetRole}` endpoint
- Create `GET /api/senapoti/subordinates/{devoteeId}` endpoint
- Create `GET /api/senapoti/role-history/{devoteeId}` endpoint
- Add role validation API for frontend

---

### **TASK 4: Core Business Logic** - Status: COMPLETED

#### Subtask 4.1: Promotion Logic - Status: COMPLETED
- Implement complete promotion workflow
- Handle subordinate transfer before role change
- Update reporting chains and Namahatta assignments
- Validate hierarchy progression rules

#### Subtask 4.2: Demotion Logic - Status: COMPLETED
- Implement complete demotion workflow
- Transfer all subordinates to appropriate supervisors
- Find and assign new supervisor within district hierarchy
- Update all affected Namahatta records

#### Subtask 4.3: Role Removal Logic - Status: COMPLETED
- Implement complete role stripping workflow
- Transfer all subordinates to appropriate alternatives
- Clear all Namahatta leadership assignments
- Set devotee role and reporting fields to null

---

### **TASK 5: Frontend Components** - Status: COMPLETED

#### Subtask 5.1: Role Management Modal - Status: COMPLETED
- Create unified modal for all role changes (promote/demote/remove) ✓
- Include role selection dropdown with validation ✓
- Add reason input field for audit trail ✓
- Show preview of changes before confirmation ✓

#### Subtask 5.2: Supervisor Selection Component - Status: COMPLETED
- Create district-filtered supervisor selection ✓
- Show hierarchy context for better decision making ✓
- Include subordinate count and workload information ✓
- Add search and filter capabilities ✓

#### Subtask 5.3: Subordinate Transfer Interface - Status: COMPLETED
- Create bulk subordinate transfer component ✓
- Show all affected subordinates before transfer ✓
- Allow individual or bulk supervisor assignment ✓
- Display transfer confirmation with hierarchy preview ✓

---

### **TASK 6: Frontend Integration** - Status: IN_PROGRESS

#### Subtask 6.1: Devotee Detail Integration - Status: COMPLETED
- Add role management buttons to devotee detail page ✓
- Integrate role change modal ✓
- Show role change history section ✓
- Display current subordinates if applicable ✓

#### Subtask 6.2: Hierarchy Page Integration - Status: COMPLETED
- Add role management actions to hierarchy visualization ✓
- Show transfer impact on hierarchy tree ✓
- Add bulk operations for multiple role changes ✓
- Include district filtering controls ✓

#### Subtask 6.3: Dashboard Integration - Status: IN_PROGRESS
- Add role change statistics to dashboard
- Show pending subordinate transfers
- Display recent role changes activity
- Add role management quick actions

---

### **TASK 7: Validation and Error Handling** - Status: NOT_STARTED

#### Subtask 7.1: Frontend Validation - Status: NOT_STARTED
- Add real-time role change validation
- Show hierarchy impact preview
- Validate district boundaries in UI
- Add subordinate transfer validation

#### Subtask 7.2: Backend Validation - Status: NOT_STARTED
- Implement comprehensive business rule validation
- Add circular reference prevention
- Validate all hierarchy changes before execution
- Add proper error messages for all failure cases

#### Subtask 7.3: Transaction Safety - Status: NOT_STARTED
- Ensure all role changes are atomic operations
- Implement proper rollback on failure
- Add conflict resolution for concurrent changes
- Test edge cases and error scenarios

---

### **TASK 8: Testing and Quality Assurance** - Status: NOT_STARTED

#### Subtask 8.1: Backend API Testing - Status: NOT_STARTED
- Test all role change scenarios (promote/demote/remove)
- Test subordinate transfer operations
- Test district boundary enforcement
- Test error handling and edge cases

#### Subtask 8.2: Frontend Component Testing - Status: NOT_STARTED
- Test role management modal workflows
- Test supervisor selection and subordinate transfer
- Test validation and error display
- Test integration with existing pages

#### Subtask 8.3: End-to-End Testing - Status: NOT_STARTED
- Test complete role change workflows
- Test hierarchy integrity maintenance
- Test audit trail accuracy
- Test performance with large datasets

---

### **TASK 9: Documentation and Deployment** - Status: NOT_STARTED

#### Subtask 9.1: Update System Documentation - Status: NOT_STARTED
- Update replit.md with new features
- Document role management workflows
- Add hierarchy change procedures
- Update API documentation

#### Subtask 9.2: User Interface Polish - Status: NOT_STARTED
- Ensure consistent styling with existing design
- Add proper loading states and feedback
- Optimize mobile responsiveness
- Add keyboard navigation support

#### Subtask 9.3: Final Testing and Deployment - Status: NOT_STARTED
- Perform comprehensive system testing
- Test with realistic data volumes
- Verify all features work in production environment
- Monitor for any issues after deployment

---

## Key Implementation Notes

### **Critical Requirements:**
1. **Subordinate Transfer First**: Always transfer subordinates before any role change
2. **District Boundary**: Never allow cross-district reporting relationships
3. **Atomic Operations**: All changes must be transactional and reversible
4. **Audit Trail**: Every change must be logged with reason and timestamp

### **Technical Considerations:**
- Use database transactions for all multi-step operations
- Implement proper error handling and rollback mechanisms
- Validate hierarchy integrity at every step
- Ensure UI provides clear feedback for all operations

### **Testing Priority:**
- Focus on edge cases and error scenarios
- Test with realistic data volumes
- Verify hierarchy integrity after all operations
- Test concurrent user scenarios

---

**Status Legend:**
- NOT_STARTED: Task not yet begun
- IN_PROGRESS: Task currently being worked on
- COMPLETED: Task finished and tested

**Agent Instructions:**
Pick Task 1 and work through all its subtasks before moving to Task 2. Update status as you progress. Each task builds on the previous ones, so maintain the order strictly. The plan contains 9 tasks total (Task 1 through Task 9).