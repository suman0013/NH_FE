import { pgTable, text, integer, serial, timestamp, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Devotees table
export const devotees = pgTable("devotees", {
  id: serial("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  name: text("name"), // Initiated/spiritual name
  dob: text("dob"), // Store as text to match OpenAPI format
  email: text("email"),
  phone: text("phone"),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  husbandName: text("husband_name"),
  gender: text("gender"), // MALE, FEMALE, OTHER
  bloodGroup: text("blood_group"),
  maritalStatus: text("marital_status"), // MARRIED, UNMARRIED, WIDOWED
  // Remove inline address JSON fields - use normalized address tables instead
  devotionalStatusId: integer("devotional_status_id"),
  namahattaId: integer("namahatta_id"),
  harinamInitiationGurudevId: integer("harinam_initiation_gurudev_id"), // Reference to gurudevs table
  pancharatrikInitiationGurudevId: integer("pancharatrik_initiation_gurudev_id"), // Reference to gurudevs table
  initiatedName: text("initiated_name"),
  harinamDate: text("harinam_date"), // Store as text to match OpenAPI format
  pancharatrikDate: text("pancharatrik_date"), // Store as text to match OpenAPI format
  education: text("education"),
  occupation: text("occupation"),
  devotionalCourses: jsonb("devotional_courses").$type<Array<{
    name: string;
    date: string;
    institute: string;
  }>>(),
  additionalComments: text("additional_comments"),
  shraddhakutirId: integer("shraddhakutir_id"),
  // Leadership role fields
  leadershipRole: text("leadership_role"), // MALA_SENAPOTI, MAHA_CHAKRA_SENAPOTI, CHAKRA_SENAPOTI, UPA_CHAKRA_SENAPOTI, NULL
  reportingToDevoteeId: integer("reporting_to_devotee_id"), // References devotees.id for hierarchy
  hasSystemAccess: boolean("has_system_access").default(false), // Determines if devotee gets login
  appointedDate: text("appointed_date"), // When appointed to leadership role
  appointedBy: integer("appointed_by"), // References users.id - who appointed them
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Namahattas table
export const namahattas = pgTable("namahattas", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  meetingDay: text("meeting_day"),
  meetingTime: text("meeting_time"),
  // Remove inline address JSON field - use normalized address tables instead
  // Leadership positions as foreign keys to devotees table
  malaSenapotiId: integer("mala_senapoti_id").references(() => devotees.id),
  mahaChakraSenapotiId: integer("maha_chakra_senapoti_id").references(() => devotees.id),
  chakraSenapotiId: integer("chakra_senapoti_id").references(() => devotees.id),
  upaChakraSenapotiId: integer("upa_chakra_senapoti_id").references(() => devotees.id),
  secretaryId: integer("secretary_id").references(() => devotees.id),
  presidentId: integer("president_id").references(() => devotees.id),
  accountantId: integer("accountant_id").references(() => devotees.id),
  districtSupervisorId: integer("district_supervisor_id").notNull(),
  status: text("status").notNull().default("PENDING_APPROVAL"), // PENDING_APPROVAL, APPROVED, REJECTED
  registrationNo: text("registration_no").unique(),
  registrationDate: text("registration_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Devotional Statuses table
export const devotionalStatuses = pgTable("devotional_statuses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shraddhakutirs table
export const shraddhakutirs = pgTable("shraddhakutirs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  districtCode: text("district_code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Status History table
export const statusHistory = pgTable("status_history", {
  id: serial("id").primaryKey(),
  devoteeId: integer("devotee_id").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  comment: text("comment"),
});

// Namahatta Updates table
export const namahattaUpdates = pgTable("namahatta_updates", {
  id: serial("id").primaryKey(),
  namahattaId: integer("namahatta_id").notNull(),
  programType: text("program_type").notNull(),
  date: text("date").notNull(),
  attendance: integer("attendance").notNull(),
  prasadDistribution: integer("prasad_distribution"),
  nagarKirtan: integer("nagar_kirtan").default(0),
  bookDistribution: integer("book_distribution").default(0),
  chanting: integer("chanting").default(0),
  arati: integer("arati").default(0),
  bhagwatPath: integer("bhagwat_path").default(0),
  imageUrls: jsonb("image_urls").$type<string[]>(),
  facebookLink: text("facebook_link"),
  youtubeLink: text("youtube_link"),
  specialAttraction: text("special_attraction"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gurudevs table
export const gurudevs = pgTable("gurudevs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  title: text("title"), // HH, HG, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Leaders/Hierarchy table
export const leaders = pgTable("leaders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // GBC, REGIONAL_DIRECTOR, CO_REGIONAL_DIRECTOR, DISTRICT_SUPERVISOR, etc.
  reportingTo: integer("reporting_to"),
  location: jsonb("location").$type<{
    country?: string;
    state?: string;
    district?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Main Address table - matches CSV structure with all columns
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  country: text("country").notNull().default("India"), // Added country column with India default
  stateCode: text("state_code"),
  stateNameEnglish: text("state_name_english"),
  districtCode: text("district_code"),
  districtNameEnglish: text("district_name_english"),
  subdistrictCode: text("subdistrict_code"),
  subdistrictNameEnglish: text("subdistrict_name_english"),
  villageCode: text("village_code"),
  villageNameEnglish: text("village_name_english"),
  pincode: text("pincode"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for devotee addresses with landmark
export const devoteeAddresses = pgTable("devotee_addresses", {
  id: serial("id").primaryKey(),
  devoteeId: integer("devotee_id").notNull(),
  addressId: integer("address_id").notNull(),
  addressType: text("address_type").notNull(), // 'present' or 'permanent'
  landmark: text("landmark"), // Specific landmark for this devotee at this address
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for namahatta addresses with landmark
export const namahattaAddresses = pgTable("namahatta_addresses", {
  id: serial("id").primaryKey(),
  namahattaId: integer("namahatta_id").notNull(),
  addressId: integer("address_id").notNull(),
  landmark: text("landmark"), // Specific landmark for this namahatta at this address
  createdAt: timestamp("created_at").defaultNow(),
});

// Authentication Tables

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull(), // 'ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR'
  devoteeId: integer("devotee_id"), // References devotees.id - links user account to devotee
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").default(true),
});

// User-District mapping (many-to-many)
export const userDistricts = pgTable("user_districts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  districtCode: text("district_code").notNull(), // References district from addresses table
  districtNameEnglish: text("district_name_english").notNull(), // Store district name for easy display
  isDefaultDistrictSupervisor: boolean("is_default_district_supervisor").default(false), // One default DS per district
  comments: text("comments"), // Optional comments for the district supervisor assignment
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserDistrict: unique().on(table.userId, table.districtCode),
}));

// Active sessions (single login enforcement)
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(), // Only one active session per user
  sessionToken: text("session_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// JWT blacklist (for logout)
export const jwtBlacklist = pgTable("jwt_blacklist", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  expiredAt: timestamp("expired_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role Change History table for Senapoti Role Management
export const roleChangeHistory = pgTable("role_change_history", {
  id: serial("id").primaryKey(),
  devoteeId: integer("devotee_id").notNull(),
  previousRole: text("previous_role"), // Previous leadership role or null for no role
  newRole: text("new_role"), // New leadership role or null for role removal
  previousReportingTo: integer("previous_reporting_to"), // Previous supervisor ID
  newReportingTo: integer("new_reporting_to"), // New supervisor ID
  changedBy: integer("changed_by").notNull(), // User ID who made the change
  reason: text("reason").notNull(), // Reason for the role change
  districtCode: text("district_code"), // District where change occurred (for audit)
  subordinatesTransferred: integer("subordinates_transferred").default(0), // Number of subordinates transferred
  createdAt: timestamp("created_at").defaultNow(),
});

// Role Assignments table - Replacement Model (Phase 1.1)
export const roleAssignments = pgTable("role_assignments", {
  id: serial("id").primaryKey(),
  devoteeId: integer("devotee_id").notNull().references(() => devotees.id),
  role: text("role").notNull(), // MALA_SENAPOTI, MAHA_CHAKRA_SENAPOTI, CHAKRA_SENAPOTI, UPA_CHAKRA_SENAPOTI
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, REPLACED, REMOVED
  districtCode: text("district_code").notNull(), // District where role is assigned
  assignedDate: timestamp("assigned_date").defaultNow(),
  assignedBy: integer("assigned_by").notNull(), // User ID who assigned
  replacedById: integer("replaced_by_id"), // References roleAssignments.id for the replacement
  replacementReason: text("replacement_reason"), // Reason for replacement
  replacementDate: timestamp("replacement_date"), // When the replacement occurred
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertDevoteeSchema = createInsertSchema(devotees).omit({
  id: true,
  createdAt: true,
}).extend({
  // Add proper type coercion for numeric fields that might come as strings from forms
  reportingToDevoteeId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? undefined : num;
  }),
  devotionalStatusId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? undefined : num;
  }),
  harinamInitiationGurudevId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? undefined : num;
  }),
  pancharatrikInitiationGurudevId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? undefined : num;
  }),
  shraddhakutirId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? undefined : num;
  }),
  namahattaId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? undefined : num;
  }),
  // Handle empty strings for optional text fields
  leadershipRole: z.string().nullable().optional().transform((val) => {
    if (val === '' || val === null) return undefined;
    return val;
  }),
  initiatedName: z.string().nullable().optional().transform((val) => {
    if (val === '' || val === null) return undefined;
    return val;
  }),
  harinamDate: z.string().nullable().optional().transform((val) => {
    if (val === '' || val === null) return undefined;
    return val;
  }),
  pancharatrikDate: z.string().nullable().optional().transform((val) => {
    if (val === '' || val === null) return undefined;
    return val;
  })
});

export const insertNamahattaSchema = createInsertSchema(namahattas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Explicit validation for senapoti ID fields with proper type coercion
  malaSenapotiId: z.union([z.string(), z.number()]).nullable().optional().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? null : num;
  }),
  mahaChakraSenapotiId: z.union([z.string(), z.number()]).nullable().optional().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? null : num;
  }),
  chakraSenapotiId: z.union([z.string(), z.number()]).nullable().optional().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? null : num;
  }),
  upaChakraSenapotiId: z.union([z.string(), z.number()]).nullable().optional().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? null : num;
  }),
  // Explicit validation for officer ID fields with proper type coercion
  secretaryId: z.union([z.string(), z.number()]).nullable().optional().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? null : num;
  }),
  presidentId: z.union([z.string(), z.number()]).nullable().optional().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? null : num;
  }),
  accountantId: z.union([z.string(), z.number()]).nullable().optional().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? null : num;
  }),
  // District supervisor ID is required
  districtSupervisorId: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num)) throw new Error('districtSupervisorId must be a valid number');
    return num;
  })
});

export const insertDevotionalStatusSchema = createInsertSchema(devotionalStatuses).omit({
  id: true,
  createdAt: true,
});

export const insertShraddhakutirSchema = createInsertSchema(shraddhakutirs).omit({
  id: true,
  createdAt: true,
});

export const insertNamahattaUpdateSchema = createInsertSchema(namahattaUpdates).omit({
  id: true,
  createdAt: true,
});

export const insertGurudevSchema = createInsertSchema(gurudevs).omit({
  id: true,
  createdAt: true,
});

export const insertLeaderSchema = createInsertSchema(leaders).omit({
  id: true,
  createdAt: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
});

export const insertDevoteeAddressSchema = createInsertSchema(devoteeAddresses).omit({
  id: true,
  createdAt: true,
});

export const insertNamahattaAddressSchema = createInsertSchema(namahattaAddresses).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserDistrictSchema = createInsertSchema(userDistricts).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertJwtBlacklistSchema = createInsertSchema(jwtBlacklist).omit({
  id: true,
  createdAt: true,
});

export const insertRoleChangeHistorySchema = createInsertSchema(roleChangeHistory).omit({
  id: true,
  createdAt: true,
});

export const insertRoleAssignmentSchema = createInsertSchema(roleAssignments).omit({
  id: true,
  createdAt: true,
  assignedDate: true,
  replacementDate: true,
});

// Types
export type Devotee = typeof devotees.$inferSelect & {
  devotionalStatusName?: string;
  harinamInitiationGurudev?: string;
  pancharatrikInitiationGurudev?: string;
  presentAddress?: {
    country?: string;
    state?: string;
    district?: string;
    subDistrict?: string;
    village?: string;
    postalCode?: string;
    landmark?: string;
  };
  permanentAddress?: {
    country?: string;
    state?: string;
    district?: string;
    subDistrict?: string;
    village?: string;
    postalCode?: string;
    landmark?: string;
  };
};
export type InsertDevotee = z.infer<typeof insertDevoteeSchema>;

export type Namahatta = typeof namahattas.$inferSelect & {
  devoteeCount?: number;
  districtSupervisorName?: string;
  districtSupervisorId: number;
  registrationNo?: string;
  registrationDate?: string;
};
export type InsertNamahatta = z.infer<typeof insertNamahattaSchema>;

export type DevotionalStatus = typeof devotionalStatuses.$inferSelect;
export type InsertDevotionalStatus = z.infer<typeof insertDevotionalStatusSchema>;

export type Shraddhakutir = typeof shraddhakutirs.$inferSelect;
export type InsertShraddhakutir = z.infer<typeof insertShraddhakutirSchema>;

export type NamahattaUpdate = typeof namahattaUpdates.$inferSelect;
export type InsertNamahattaUpdate = z.infer<typeof insertNamahattaUpdateSchema>;

export type Gurudev = typeof gurudevs.$inferSelect;
export type InsertGurudev = z.infer<typeof insertGurudevSchema>;

export type Leader = typeof leaders.$inferSelect;
export type InsertLeader = z.infer<typeof insertLeaderSchema>;

export type StatusHistory = typeof statusHistory.$inferSelect;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

export type DevoteeAddress = typeof devoteeAddresses.$inferSelect;
export type InsertDevoteeAddress = z.infer<typeof insertDevoteeAddressSchema>;

export type NamahattaAddress = typeof namahattaAddresses.$inferSelect;
export type InsertNamahattaAddress = z.infer<typeof insertNamahattaAddressSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserDistrict = typeof userDistricts.$inferSelect;
export type InsertUserDistrict = z.infer<typeof insertUserDistrictSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type JwtBlacklist = typeof jwtBlacklist.$inferSelect;
export type InsertJwtBlacklist = z.infer<typeof insertJwtBlacklistSchema>;

export type RoleChangeHistory = typeof roleChangeHistory.$inferSelect;
export type InsertRoleChangeHistory = z.infer<typeof insertRoleChangeHistorySchema>;

export type RoleAssignment = typeof roleAssignments.$inferSelect;
export type InsertRoleAssignment = z.infer<typeof insertRoleAssignmentSchema>;
