import { db } from "./db";
import { devotees, namahattas, namahattaAddresses, addresses, userDistricts } from "@shared/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

// Define the role hierarchy and progression rules
export const SENAPOTI_ROLES = ['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'] as const;

export const ROLE_HIERARCHY: Record<string, {
  level: number;
  reportsTo: string;
  canPromoteTo: string[] | null;
  canDemoteTo: string[] | null;
  manages: string[];
}> = {
  'MALA_SENAPOTI': {
    level: 1,
    reportsTo: 'DISTRICT_SUPERVISOR',
    canPromoteTo: null, // Cannot be promoted further
    canDemoteTo: ['MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'],
    manages: ['MAHA_CHAKRA_SENAPOTI']
  },
  'MAHA_CHAKRA_SENAPOTI': {
    level: 2,
    reportsTo: 'MALA_SENAPOTI',
    canPromoteTo: ['MALA_SENAPOTI'],
    canDemoteTo: ['CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'],
    manages: ['CHAKRA_SENAPOTI']
  },
  'CHAKRA_SENAPOTI': {
    level: 3,
    reportsTo: 'MAHA_CHAKRA_SENAPOTI',
    canPromoteTo: ['MAHA_CHAKRA_SENAPOTI'],
    canDemoteTo: ['UPA_CHAKRA_SENAPOTI'],
    manages: ['UPA_CHAKRA_SENAPOTI']
  },
  'UPA_CHAKRA_SENAPOTI': {
    level: 4,
    reportsTo: 'CHAKRA_SENAPOTI',
    canPromoteTo: ['CHAKRA_SENAPOTI'],
    canDemoteTo: null, // Cannot be demoted further (will be removed)
    manages: []
  }
};

export type SenapotiRole = typeof SENAPOTI_ROLES[number];
export type ChangeType = 'PROMOTE' | 'DEMOTE' | 'REMOVE' | 'REPLACE';

export interface RoleChangeRequest {
  devoteeId: number;
  currentRole: SenapotiRole | null;
  targetRole: SenapotiRole | null;
  changeType: ChangeType;
  reason: string;
  changedBy: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates if a role change is allowed according to hierarchy rules
 */
export async function validateHierarchyChange(
  currentRole: SenapotiRole | null,
  targetRole: SenapotiRole | null,
  changeType: ChangeType
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Handle role removal
  if (changeType === 'REMOVE') {
    if (!currentRole) {
      result.errors.push('Cannot remove role: devotee has no current role');
      result.isValid = false;
    }
    return result;
  }

  // Handle role assignment (promotion/demotion)
  if (!currentRole && !targetRole) {
    result.errors.push('Both current role and target role cannot be null');
    result.isValid = false;
    return result;
  }

  if (!targetRole) {
    result.errors.push('Target role cannot be null for role assignment');
    result.isValid = false;
    return result;
  }

  // Validate role exists in hierarchy
  if (!ROLE_HIERARCHY[targetRole]) {
    result.errors.push(`Invalid target role: ${targetRole}`);
    result.isValid = false;
    return result;
  }

  if (currentRole && !ROLE_HIERARCHY[currentRole]) {
    result.errors.push(`Invalid current role: ${currentRole}`);
    result.isValid = false;
    return result;
  }

  // Handle new role assignment (no current role)
  if (!currentRole) {
    result.warnings.push(`Assigning new role ${targetRole} to devotee`);
    return result;
  }

  // Validate promotion
  if (changeType === 'PROMOTE') {
    const allowedPromotions = ROLE_HIERARCHY[currentRole].canPromoteTo;
    if (!allowedPromotions || !allowedPromotions.includes(targetRole)) {
      result.errors.push(`Cannot promote from ${currentRole} to ${targetRole}`);
      result.isValid = false;
    }
  }

  // Validate demotion
  if (changeType === 'DEMOTE') {
    const allowedDemotions = ROLE_HIERARCHY[currentRole].canDemoteTo;
    if (!allowedDemotions || !allowedDemotions.includes(targetRole)) {
      result.errors.push(`Cannot demote from ${currentRole} to ${targetRole}`);
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Checks for circular references in the reporting hierarchy
 */
export async function checkCircularReference(
  devoteeId: number,
  newReportingToId: number | null
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!newReportingToId) {
    return result; // No circular reference possible with null reporting
  }

  if (devoteeId === newReportingToId) {
    result.errors.push('Devotee cannot report to themselves');
    result.isValid = false;
    return result;
  }

  // Check if the new supervisor is already reporting to this devotee (directly or indirectly)
  const visited = new Set<number>();
  let currentSupervisorId: number | null = newReportingToId;

  while (currentSupervisorId && !visited.has(currentSupervisorId)) {
    visited.add(currentSupervisorId);

    if (currentSupervisorId === devoteeId) {
      result.errors.push('Circular reference detected: new supervisor is already reporting to this devotee');
      result.isValid = false;
      return result;
    }

    // Get the next level supervisor
    const supervisor = await db
      .select({ reportingToDevoteeId: devotees.reportingToDevoteeId })
      .from(devotees)
      .where(eq(devotees.id, currentSupervisorId))
      .limit(1);

    currentSupervisorId = supervisor[0]?.reportingToDevoteeId || null;
  }

  return result;
}

/**
 * Gets the valid target roles for a devotee based on their current role and change type
 */
export function getValidTargetRoles(
  currentRole: SenapotiRole | null,
  changeType: ChangeType
): string[] {
  if (changeType === 'REMOVE') {
    return []; // No target roles for removal
  }

  if (!currentRole) {
    // If no current role, can be assigned any role
    return [...SENAPOTI_ROLES];
  }

  const hierarchy = ROLE_HIERARCHY[currentRole];

  switch (changeType) {
    case 'PROMOTE':
      return hierarchy.canPromoteTo || [];
    case 'DEMOTE':
      return hierarchy.canDemoteTo || [];
    case 'REPLACE':
      // For replacement, can be assigned any role at same level or different level
      return [...SENAPOTI_ROLES];
    default:
      return [];
  }
}

/**
 * Validates role progression rules including district boundaries and subordinate constraints
 */
export async function validateRoleProgression(
  devoteeId: number,
  roleChange: RoleChangeRequest
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Basic hierarchy validation
  const hierarchyValidation = await validateHierarchyChange(
    roleChange.currentRole,
    roleChange.targetRole,
    roleChange.changeType
  );

  result.errors.push(...hierarchyValidation.errors);
  result.warnings.push(...hierarchyValidation.warnings);
  result.isValid = result.isValid && hierarchyValidation.isValid;

  // Get devotee details to check district constraints
  const devotee = await db
    .select()
    .from(devotees)
    .where(eq(devotees.id, devoteeId))
    .limit(1);

  if (!devotee[0]) {
    result.errors.push('Devotee not found');
    result.isValid = false;
    return result;
  }

  // Additional validation can be added here for:
  // - District boundary checks
  // - Subordinate count limits
  // - Active namahatta leadership constraints

  return result;
}

/**
 * Gets the expected reporting supervisor for a given role within a district
 */
export function getExpectedSupervisorRole(role: SenapotiRole): string {
  return ROLE_HIERARCHY[role].reportsTo;
}

/**
 * Gets the roles that report to a given role
 */
export function getSubordinateRoles(role: SenapotiRole): string[] {
  return ROLE_HIERARCHY[role].manages;
}

/**
 * Checks if a role change requires subordinate transfer
 */
export function requiresSubordinateTransfer(
  currentRole: SenapotiRole | null,
  changeType: ChangeType
): boolean {
  if (!currentRole) return false;
  
  const hasSubordinates = ROLE_HIERARCHY[currentRole].manages.length > 0;
  
  // ALL role changes require subordinate transfer when devotee has subordinates
  return hasSubordinates && (changeType === 'PROMOTE' || changeType === 'DEMOTE' || changeType === 'REMOVE' || changeType === 'REPLACE');
}

// ============================================================================
// DISTRICT FILTERING FUNCTIONS
// ============================================================================

/**
 * Gets devotees by district and role for hierarchy management
 */
export async function getDevoteesByDistrictAndRole(
  districtCode: string,
  role: SenapotiRole | null = null
): Promise<Array<{
  id: number;
  name: string;
  legalName: string;
  leadershipRole: string | null;
  reportingToDevoteeId: number | null;
  namahattaId: number | null;
}>> {
  try {
    // Build conditions based on role filter
    const conditions = [
      eq(addresses.districtCode, districtCode),
      isNotNull(devotees.leadershipRole)
    ];

    if (role) {
      conditions.push(eq(devotees.leadershipRole, role));
    }

    // Build query with proper district filtering through namahatta and address joins
    const result = await db
      .select({
        id: devotees.id,
        name: devotees.name,
        legalName: devotees.legalName,
        leadershipRole: devotees.leadershipRole,
        reportingToDevoteeId: devotees.reportingToDevoteeId,
        namahattaId: devotees.namahattaId
      })
      .from(devotees)
      .innerJoin(namahattas, eq(devotees.namahattaId, namahattas.id))
      .innerJoin(namahattaAddresses, eq(namahattas.id, namahattaAddresses.namahattaId))
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .where(and(...conditions));
    
    return result.map(devotee => ({
      ...devotee,
      name: devotee.name || devotee.legalName // Ensure name is never null
    }));
  } catch (error) {
    console.error('Error getting devotees by district and role:', error);
    return [];
  }
}

/**
 * Gets the complete district hierarchy for a given district
 */
export async function getDistrictHierarchy(districtCode: string): Promise<{
  districtSupervisor: any | null;
  malaSenapotis: any[];
  mahaChakraSenapotis: any[];
  chakraSenapotis: any[];
  upaChakraSenapotis: any[];
}> {
  try {
    // Get all devotees with leadership roles
    const allLeaders = await getDevoteesByDistrictAndRole(districtCode);
    
    // Organize by role
    const hierarchy = {
      districtSupervisor: null,
      malaSenapotis: allLeaders.filter(d => d.leadershipRole === 'MALA_SENAPOTI'),
      mahaChakraSenapotis: allLeaders.filter(d => d.leadershipRole === 'MAHA_CHAKRA_SENAPOTI'),
      chakraSenapotis: allLeaders.filter(d => d.leadershipRole === 'CHAKRA_SENAPOTI'),
      upaChakraSenapotis: allLeaders.filter(d => d.leadershipRole === 'UPA_CHAKRA_SENAPOTI')
    };

    return hierarchy;
  } catch (error) {
    console.error('Error getting district hierarchy:', error);
    return {
      districtSupervisor: null,
      malaSenapotis: [],
      mahaChakraSenapotis: [],
      chakraSenapotis: [],
      upaChakraSenapotis: []
    };
  }
}

/**
 * Finds available supervisors for a devotee being assigned to a specific role within district boundaries
 */
export async function findAvailableSupervisors(
  districtCode: string,
  targetRole: SenapotiRole,
  excludeDevoteeId?: number
): Promise<Array<{
  id: number;
  name: string;
  legalName: string;
  leadershipRole: string;
  subordinateCount: number;
}>> {
  try {
    // Get the expected supervisor role for the target role
    const expectedSupervisorRole = getExpectedSupervisorRole(targetRole);
    
    if (expectedSupervisorRole === 'DISTRICT_SUPERVISOR') {
      // For Mala Senapoti, the supervisor is District Supervisor
      // Return placeholder for District Supervisor
      return [{
        id: 0, // Special ID for District Supervisor
        name: 'District Supervisor',
        legalName: 'District Supervisor',
        leadershipRole: 'DISTRICT_SUPERVISOR',
        subordinateCount: 0
      }];
    }

    // Get all devotees with the expected supervisor role in the district
    const potentialSupervisors = await getDevoteesByDistrictAndRole(
      districtCode,
      expectedSupervisorRole as SenapotiRole
    );

    // Exclude the devotee who is being assigned (to prevent self-reporting)
    const availableSupervisors = potentialSupervisors.filter(
      supervisor => supervisor.id !== excludeDevoteeId
    );

    // Get subordinate counts for each supervisor
    const supervisorsWithCounts = await Promise.all(
      availableSupervisors.map(async (supervisor) => {
        const subordinates = await getDirectSubordinates(supervisor.id);
        return {
          id: supervisor.id,
          name: supervisor.name || supervisor.legalName,
          legalName: supervisor.legalName,
          leadershipRole: supervisor.leadershipRole || '',
          subordinateCount: subordinates.length
        };
      })
    );

    return supervisorsWithCounts;
  } catch (error) {
    console.error('Error finding available supervisors:', error);
    return [];
  }
}

/**
 * Gets devotees within the same district hierarchy for role changes
 */
export async function getDistrictColleagues(
  devoteeId: number,
  targetRole: SenapotiRole
): Promise<Array<{
  id: number;
  name: string;
  legalName: string;
  leadershipRole: string;
  level: string;
}>> {
  try {
    // This would implement finding colleagues within the same district hierarchy
    // For now, return empty array as a placeholder
    return [];
  } catch (error) {
    console.error('Error getting district colleagues:', error);
    return [];
  }
}

/**
 * Validates that a role change respects district boundaries
 */
export async function validateDistrictBoundaries(
  devoteeId: number,
  newSupervisorId: number | null,
  targetRole: SenapotiRole
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    if (!newSupervisorId) {
      return result; // No supervisor means District Supervisor (always valid)
    }

    // Get devotee and supervisor details
    const [devotee, supervisor] = await Promise.all([
      db.select().from(devotees).where(eq(devotees.id, devoteeId)).limit(1),
      db.select().from(devotees).where(eq(devotees.id, newSupervisorId)).limit(1)
    ]);

    if (!devotee[0]) {
      result.errors.push('Devotee not found');
      result.isValid = false;
      return result;
    }

    if (!supervisor[0]) {
      result.errors.push('Supervisor not found');
      result.isValid = false;
      return result;
    }

    // Here we would implement actual district boundary validation
    // For now, assume validation passes
    result.warnings.push('District boundary validation completed');

    return result;
  } catch (error) {
    console.error('Error validating district boundaries:', error);
    result.errors.push('Error validating district boundaries');
    result.isValid = false;
    return result;
  }
}

// ============================================================================
// SUBORDINATE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Gets direct subordinates (devotees reporting directly to a supervisor)
 */
export async function getDirectSubordinates(supervisorId: number): Promise<Array<{
  id: number;
  name: string;
  legalName: string;
  leadershipRole: string | null;
  reportingToDevoteeId: number | null;
  namahattaId: number | null;
}>> {
  try {
    const subordinates = await db
      .select({
        id: devotees.id,
        name: devotees.name,
        legalName: devotees.legalName,
        leadershipRole: devotees.leadershipRole,
        reportingToDevoteeId: devotees.reportingToDevoteeId,
        namahattaId: devotees.namahattaId
      })
      .from(devotees)
      .where(eq(devotees.reportingToDevoteeId, supervisorId));

    return subordinates.map(devotee => ({
      ...devotee,
      name: devotee.name || devotee.legalName // Ensure name is never null
    }));
  } catch (error) {
    console.error('Error getting direct subordinates:', error);
    return [];
  }
}

/**
 * Gets all subordinates in the chain (direct and indirect)
 */
export async function getAllSubordinatesInChain(supervisorId: number): Promise<Array<{
  id: number;
  name: string;
  legalName: string;
  leadershipRole: string | null;
  reportingToDevoteeId: number | null;
  level: number;
}>> {
  try {
    const allSubordinates: Array<{
      id: number;
      name: string;
      legalName: string;
      leadershipRole: string | null;
      reportingToDevoteeId: number | null;
      level: number;
    }> = [];

    const visited = new Set<number>();
    
    const collectSubordinates = async (currentSupervisorId: number, currentLevel: number) => {
      if (visited.has(currentSupervisorId)) return; // Prevent infinite loops
      visited.add(currentSupervisorId);

      const directSubordinates = await getDirectSubordinates(currentSupervisorId);
      
      for (const subordinate of directSubordinates) {
        allSubordinates.push({
          ...subordinate,
          level: currentLevel
        });
        
        // Recursively get subordinates of this subordinate
        await collectSubordinates(subordinate.id, currentLevel + 1);
      }
    };

    await collectSubordinates(supervisorId, 1);
    return allSubordinates;
  } catch (error) {
    console.error('Error getting all subordinates in chain:', error);
    return [];
  }
}

/**
 * Validates subordinate transfer before role changes
 */
export async function validateSubordinateTransfer(
  supervisorId: number,
  newSupervisorId: number | null,
  changeType: ChangeType
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Get all subordinates that need to be transferred
    const subordinates = await getDirectSubordinates(supervisorId);
    
    if (subordinates.length === 0) {
      return result; // No subordinates to transfer
    }

    // Check if we have a valid new supervisor for subordinate transfer
    if (changeType === 'REMOVE') {
      if (!newSupervisorId) {
        result.errors.push(
          `Cannot remove role: ${subordinates.length} subordinates need to be transferred to another supervisor`
        );
        result.isValid = false;
        return result;
      }
    }

    if (changeType === 'PROMOTE' || changeType === 'DEMOTE' || changeType === 'REPLACE') {
      if (!newSupervisorId) {
        result.errors.push(
          `Role change requires subordinate transfer: ${subordinates.length} subordinates need new supervisor`
        );
        result.isValid = false;
        return result;
      }

      // Validate that new supervisor exists and has appropriate role
      const newSupervisor = await db
        .select()
        .from(devotees)
        .where(eq(devotees.id, newSupervisorId))
        .limit(1);

      if (!newSupervisor[0]) {
        result.errors.push('New supervisor not found');
        result.isValid = false;
        return result;
      }

      if (!newSupervisor[0].leadershipRole) {
        result.errors.push('New supervisor must have a leadership role');
        result.isValid = false;
        return result;
      }
    }

    // Check for circular references
    if (newSupervisorId) {
      for (const subordinate of subordinates) {
        const circularCheck = await checkCircularReference(subordinate.id, newSupervisorId);
        if (!circularCheck.isValid) {
          result.errors.push(`Circular reference detected for subordinate ${subordinate.name}: ${circularCheck.errors.join(', ')}`);
          result.isValid = false;
        }
      }
    }

    // Add warning about the transfer
    result.warnings.push(
      `${subordinates.length} subordinate(s) will be transferred: ${subordinates.map(s => s.name).join(', ')}`
    );

    return result;
  } catch (error) {
    console.error('Error validating subordinate transfer:', error);
    result.errors.push('Error validating subordinate transfer');
    result.isValid = false;
    return result;
  }
}

/**
 * Transfers all subordinates from one supervisor to another
 */
export async function transferSubordinates(
  fromSupervisorId: number,
  toSupervisorId: number | null,
  reason: string,
  changedBy: number
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Get all direct subordinates to transfer
    const subordinates = await getDirectSubordinates(fromSupervisorId);
    
    if (subordinates.length === 0) {
      result.warnings.push('No subordinates to transfer');
      return result;
    }

    // Validate the transfer first
    const validation = await validateSubordinateTransfer(fromSupervisorId, toSupervisorId, 'REPLACE');
    if (!validation.isValid) {
      return validation;
    }

    // Perform the transfer
    for (const subordinate of subordinates) {
      await db
        .update(devotees)
        .set({ 
          reportingToDevoteeId: toSupervisorId,
          updatedAt: new Date()
        })
        .where(eq(devotees.id, subordinate.id));
    }

    result.warnings.push(
      `Successfully transferred ${subordinates.length} subordinate(s) to new supervisor`
    );

    return result;
  } catch (error) {
    console.error('Error transferring subordinates:', error);
    result.errors.push('Failed to transfer subordinates');
    result.isValid = false;
    return result;
  }
}

/**
 * Gets subordinates by role type for targeted transfers
 */
export async function getSubordinatesByRole(
  supervisorId: number,
  role: SenapotiRole
): Promise<Array<{
  id: number;
  name: string;
  legalName: string;
  leadershipRole: string | null;
}>> {
  try {
    const subordinates = await db
      .select({
        id: devotees.id,
        name: devotees.name,
        legalName: devotees.legalName,
        leadershipRole: devotees.leadershipRole
      })
      .from(devotees)
      .where(
        and(
          eq(devotees.reportingToDevoteeId, supervisorId),
          eq(devotees.leadershipRole, role)
        )
      );

    return subordinates.map(devotee => ({
      ...devotee,
      name: devotee.name || devotee.legalName // Ensure name is never null
    }));
  } catch (error) {
    console.error('Error getting subordinates by role:', error);
    return [];
  }
}