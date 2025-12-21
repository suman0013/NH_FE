/**
 * Phase 3: Role Management Validation Rules
 * Implements comprehensive validation for the replacement-based role system
 */

import { db } from "./db";
import { devotees, namahattas } from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface RoleReplacementValidation {
  isValid: boolean;
  errors: ValidationError[];
  canProceed: boolean;
}

/**
 * Task 3.1: Validate replacement request according to business rules
 */
export async function validateRoleReplacement(
  senapotiBeingReplacedId: number,
  replacementDevoteeId: number
): Promise<RoleReplacementValidation> {
  const errors: ValidationError[] = [];

  // Fetch both devotees
  const senapotiResult = await db
    .select()
    .from(devotees)
    .where(eq(devotees.id, senapotiBeingReplacedId))
    .limit(1);

  const replacementResult = await db
    .select()
    .from(devotees)
    .where(eq(devotees.id, replacementDevoteeId))
    .limit(1);

  const senapoti = senapotiResult[0];
  const replacementDevotee = replacementResult[0];

  // Validation Rule 1: Ensure both devotees exist
  if (!senapoti) {
    errors.push({
      field: "senapotiBeingReplacedId",
      message: "Senapoti to be replaced not found",
      severity: "error",
    });
  }

  if (!replacementDevotee) {
    errors.push({
      field: "replacementDevoteeId",
      message: "Replacement devotee not found",
      severity: "error",
    });
  }

  if (!senapoti || !replacementDevotee) {
    return { isValid: false, errors, canProceed: false };
  }

  // Validation Rule 2: Ensure senapoti being replaced has an active role
  if (!senapoti.leadershipRole) {
    errors.push({
      field: "senapotiBeingReplacedId",
      message: "Devotee being replaced does not have an active leadership role",
      severity: "error",
    });
  }

  // Validation Rule 3: Ensure replacement devotee has NO active role
  if (replacementDevotee.leadershipRole) {
    errors.push({
      field: "replacementDevoteeId",
      message: `Replacement devotee already has an active role: ${replacementDevotee.leadershipRole}. Remove role before replacement.`,
      severity: "error",
    });
  }

  // Validation Rule 4: Ensure both devotees are in same district
  const senapotiNamahatta = await db
    .select()
    .from(namahattas)
    .where(eq(namahattas.id, senapoti.namahattaId || 0))
    .limit(1);

  const replacementNamahatta = await db
    .select()
    .from(namahattas)
    .where(eq(namahattas.id, replacementDevotee.namahattaId || 0))
    .limit(1);

  if (senapotiNamahatta.length === 0) {
    errors.push({
      field: "senapotiBeingReplacedId",
      message: "Senapoti not assigned to any namahatta",
      severity: "error",
    });
  }

  if (replacementNamahatta.length === 0) {
    errors.push({
      field: "replacementDevoteeId",
      message: "Replacement devotee not assigned to any namahatta",
      severity: "error",
    });
  }

  // Check district codes match
  if (senapotiNamahatta.length > 0 && replacementNamahatta.length > 0) {
    const senapotiDistrictCode = senapotiNamahatta[0].districtSupervisorId;
    const replacementDistrictCode = replacementNamahatta[0].districtSupervisorId;

    if (senapotiDistrictCode !== replacementDistrictCode) {
      errors.push({
        field: "replacementDevoteeId",
        message: "Replacement devotee must be from the same district as the senapoti being replaced",
        severity: "error",
      });
    }
  }

  // Validation Rule 5: Prevent circular reporting
  const circularCheckResult = await checkCircularReporting(
    replacementDevoteeId,
    senapotiBeingReplacedId
  );

  if (!circularCheckResult.isValid) {
    errors.push({
      field: "replacementDevoteeId",
      message: circularCheckResult.message,
      severity: "error",
    });
  }

  return {
    isValid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    canProceed: errors.filter((e) => e.severity === "error").length === 0,
  };
}

/**
 * Task 3.1: Check for circular reporting relationships
 * Prevent: replacement devotee reporting to current senapoti's subordinates
 */
export async function checkCircularReporting(
  devoteeId: number,
  potentialSupervisorId: number
): Promise<{ isValid: boolean; message: string }> {
  // Check if devotee is in the reporting chain of potential supervisor
  const visited = new Set<number>();
  let currentId: number | null = devoteeId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    if (currentId === potentialSupervisorId) {
      return {
        isValid: false,
        message: "Circular reporting detected: devotee is already supervising the target senapoti",
      };
    }

    // Get next reporting level
    const result = await db
      .select({ reportingToDevoteeId: devotees.reportingToDevoteeId })
      .from(devotees)
      .where(eq(devotees.id, currentId))
      .limit(1);

    currentId = result[0]?.reportingToDevoteeId || null;
  }

  return { isValid: true, message: "" };
}

/**
 * Task 3.2: Handle edge cases - senapoti with no subordinates
 */
export async function checkSubordinateTransferNeeded(
  senapotiBeingReplacedId: number
): Promise<{ needsTransfer: boolean; subordinateCount: number }> {
  const result = await db
    .select()
    .from(devotees)
    .where(eq(devotees.reportingToDevoteeId, senapotiBeingReplacedId))
    .limit(1);

  return {
    needsTransfer: result.length > 0,
    subordinateCount: result.length,
  };
}

/**
 * Task 3.2: Validate devotee doesn't already have role before promotion
 */
export async function validatePromotionPreconditions(
  devoteeToPromoteId: number,
  targetSenapotiBeingReplacedId: number
): Promise<RoleReplacementValidation> {
  const errors: ValidationError[] = [];

  // Fetch devotee
  const devoteeResult = await db
    .select()
    .from(devotees)
    .where(eq(devotees.id, devoteeToPromoteId))
    .limit(1);

  const devotee = devoteeResult[0];

  if (!devotee) {
    errors.push({
      field: "devoteeToPromoteId",
      message: "Devotee to promote not found",
      severity: "error",
    });
    return { isValid: false, errors, canProceed: false };
  }

  // Validate: Devotee must NOT have existing role
  if (devotee.leadershipRole) {
    errors.push({
      field: "devoteeToPromoteId",
      message: `Devotee already has role: ${devotee.leadershipRole}. Must remove existing role before promotion.`,
      severity: "error",
    });
  }

  // Validate: Target senapoti exists and has role
  const senapotiResult = await db
    .select()
    .from(devotees)
    .where(eq(devotees.id, targetSenapotiBeingReplacedId))
    .limit(1);

  const senapoti = senapotiResult[0];

  if (!senapoti) {
    errors.push({
      field: "targetSenapotiBeingReplacedId",
      message: "Target senapoti not found",
      severity: "error",
    });
  } else if (!senapoti.leadershipRole) {
    errors.push({
      field: "targetSenapotiBeingReplacedId",
      message: "Target devotee does not have an active role to replace",
      severity: "error",
    });
  }

  return {
    isValid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    canProceed: errors.filter((e) => e.severity === "error").length === 0,
  };
}

/**
 * Task 3.2: Support bulk operations with rollback capability
 * Validates all role changes in a batch before executing any
 */
export async function validateBulkRoleChanges(
  changes: Array<{ senapotiBeingReplacedId: number; replacementDevoteeId: number }>
): Promise<{ canProceedWithAll: boolean; validationByIndex: RoleReplacementValidation[] }> {
  const validationResults = await Promise.all(
    changes.map((change) =>
      validateRoleReplacement(change.senapotiBeingReplacedId, change.replacementDevoteeId)
    )
  );

  const canProceedWithAll = validationResults.every((result) => result.canProceed);

  return {
    canProceedWithAll,
    validationByIndex: validationResults,
  };
}
