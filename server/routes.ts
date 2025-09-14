import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { storage } from "./storage-fresh";
import { insertDevoteeSchema, insertNamhattaSchema, insertDevotionalStatusSchema, insertShraddhakutirSchema, insertNamhattaUpdateSchema, insertGurudevSchema } from "@shared/schema";
import { authRoutes } from "./auth/routes";
import { authenticateJWT, authorize, validateDistrictAccess, loginRateLimit, sanitizeInput } from "./auth/middleware";
import rateLimit from 'express-rate-limit';

// Input validation schemas
// Leadership role validation schema
const leadershipRoleSchema = z.object({
  leadershipRole: z.enum(['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'], {
    errorMap: () => ({ message: 'Invalid leadership role. Must be one of: MALA_SENAPOTI, MAHA_CHAKRA_SENAPOTI, CHAKRA_SENAPOTI, UPA_CHAKRA_SENAPOTI' })
  }),
  reportingToDevoteeId: z.number().int().positive().optional(),
  hasSystemAccess: z.boolean().default(false)
});

// User creation validation schema for devotees
const createUserForDevoteeSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  email: z.string()
    .email('Please provide a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  role: z.enum(['DISTRICT_SUPERVISOR', 'OFFICE'], {
    errorMap: () => ({ message: 'Invalid role. Must be DISTRICT_SUPERVISOR or OFFICE' })
  }),
  force: z.boolean().optional().default(false) // For overriding existing links if needed
});

// Role parameter validation schema
const validLeadershipRoles = ['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'] as const;
const roleParamSchema = z.enum(validLeadershipRoles, {
  errorMap: () => ({ message: 'Invalid role parameter. Must be one of: MALA_SENAPOTI, MAHA_CHAKRA_SENAPOTI, CHAKRA_SENAPOTI, UPA_CHAKRA_SENAPOTI' })
});

// Rate limiting for API endpoints
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for data modification endpoints
const modifyRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: { error: 'Too many modification attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const queryParamsSchema = z.object({
  page: z.string().regex(/^[0-9]+$/).optional().default("1"),
  limit: z.string().regex(/^[0-9]+$/).optional().default("25"),
  search: z.string().max(100).optional(),
  country: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  district: z.string().max(50).optional(),
  subDistrict: z.string().max(50).optional(),
  village: z.string().max(50).optional(),
  pincode: z.string().regex(/^[0-9]{6}$/).optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

  // Authentication routes (no auth required)
  app.use("/api/auth", authRoutes);

  // Health check (no auth required)
  app.get("/api/health", async (req, res) => {
    res.json({ status: "OK" });
  });

  // About
  app.get("/api/about", async (req, res) => {
    res.json({
      name: "Namhatta Management System",
      version: "1.0.0",
      description: "OpenAPI spec for Namhatta web and mobile-compatible system"
    });
  });

  // Get user districts (authenticated endpoint)
  app.get("/api/auth/user-districts", authenticateJWT, async (req, res) => {
    try {
      const { getUserDistricts } = await import('./storage-auth');
      const districts = await getUserDistricts(req.user!.id);
      res.json({ 
        districts: districts.map(d => ({
          code: d.districtCode,
          name: d.districtNameEnglish
        }))
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all district supervisors (for Leadership Hierarchy)
  app.get("/api/district-supervisors/all", authenticateJWT, async (req, res) => {
    try {
      const supervisors = await storage.getAllDistrictSupervisors();
      res.json(supervisors);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get district supervisors by district (for Namhatta form)
  app.get("/api/district-supervisors", authenticateJWT, async (req, res) => {
    try {
      const { district } = req.query;
      if (!district) {
        return res.status(400).json({ error: "District is required" });
      }
      
      const supervisors = await storage.getDistrictSupervisors(district as string);
      res.json(supervisors);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user address defaults
  app.get("/api/user/address-defaults", authenticateJWT, async (req, res) => {
    try {
      const defaults = await storage.getUserAddressDefaults(req.user!.id);
      res.json(defaults);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Dev endpoint to check users (development only)
  app.get("/api/dev/users", async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: "Not found" });
    }
    try {
      const { getUserByUsername } = await import('./storage-auth');
      const admin = await getUserByUsername('admin');
      const office1 = await getUserByUsername('office1');
      const supervisor1 = await getUserByUsername('supervisor1');
      
      res.json({
        admin: admin ? { id: admin.id, username: admin.username, role: admin.role, isActive: admin.isActive, passwordHashLength: admin.passwordHash.length } : null,
        office1: office1 ? { id: office1.id, username: office1.username, role: office1.role, isActive: office1.isActive, passwordHashLength: office1.passwordHash.length } : null,
        supervisor1: supervisor1 ? { id: supervisor1.id, username: supervisor1.username, role: supervisor1.role, isActive: supervisor1.isActive, passwordHashLength: supervisor1.passwordHash.length } : null,
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Geography endpoints
  app.get("/api/countries", async (req, res) => {
    const countries = await storage.getCountries();
    res.json(countries);
  });

  app.get("/api/states", async (req, res) => {
    const { country } = req.query;
    const states = await storage.getStates(country as string);
    res.json(states);
  });

  app.get("/api/districts", async (req, res) => {
    const { state } = req.query;
    const districts = await storage.getDistricts(state as string);
    res.json(districts);
  });

  app.get("/api/sub-districts", async (req, res) => {
    const { district, pincode } = req.query;
    const subDistricts = await storage.getSubDistricts(district as string, pincode as string);
    res.json(subDistricts);
  });

  app.get("/api/villages", async (req, res) => {
    const { subDistrict, pincode } = req.query;
    const villages = await storage.getVillages(subDistrict as string, pincode as string);
    res.json(villages);
  });

  app.get("/api/pincodes", async (req, res) => {
    const { village, district, subDistrict } = req.query;
    const pincodes = await storage.getPincodes(village as string, district as string, subDistrict as string);
    res.json(pincodes);
  });

  app.get("/api/pincodes/search", async (req, res) => {
    try {
      // Validate query parameters
      const validatedQuery = queryParamsSchema.parse(req.query);
      
      if (!validatedQuery.country) {
        return res.status(400).json({ error: "Country is required" });
      }
      
      const pageNum = parseInt(validatedQuery.page, 10);
      const limitNum = Math.min(parseInt(validatedQuery.limit, 10), 100); // Cap at 100
      
      const result = await storage.searchPincodes(
        validatedQuery.country, 
        validatedQuery.search || "", 
        pageNum, 
        limitNum
      );
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      console.error('Search pincodes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/address-by-pincode", async (req, res) => {
    const { pincode } = req.query;
    if (!pincode) {
      return res.status(400).json({ error: "Pincode is required" });
    }
    const addressInfo = await storage.getAddressByPincode(pincode as string);
    res.json(addressInfo);
  });

  // Map data endpoints
  app.get("/api/map/countries", async (req, res) => {
    const data = await storage.getNamhattaCountsByCountry();
    res.json(data);
  });

  app.get("/api/map/states", async (req, res) => {
    const data = await storage.getNamhattaCountsByState(); // Get all states
    res.json(data);
  });

  app.get("/api/map/districts", async (req, res) => {
    const data = await storage.getNamhattaCountsByDistrict(); // Get all districts
    res.json(data);
  });

  app.get("/api/map/sub-districts", async (req, res) => {
    const data = await storage.getNamhattaCountsBySubDistrict(); // Get all sub-districts
    res.json(data);
  });

  app.get("/api/map/villages", async (req, res) => {
    const data = await storage.getNamhattaCountsByVillage(); // Get all villages
    res.json(data);
  });

  // Dashboard (requires authentication)
  app.get("/api/dashboard", authenticateJWT, async (req, res) => {
    const summary = await storage.getDashboardSummary();
    res.json(summary);
  });

  app.get("/api/status-distribution", authenticateJWT, async (req, res) => {
    const distribution = await storage.getStatusDistribution();
    res.json(distribution);
  });

  // Hierarchy (requires authentication)
  app.get("/api/hierarchy", authenticateJWT, async (req, res) => {
    const hierarchy = await storage.getTopLevelHierarchy();
    res.json(hierarchy);
  });

  app.get("/api/hierarchy/:level", async (req, res) => {
    const { level } = req.params;
    const validLevels = ["DISTRICT_SUPERVISOR", "MALA_SENAPOTI", "MAHA_CHAKRA_SENAPOTI", "CHAKRA_SENAPOTI", "UPA_CHAKRA_SENAPOTI"];
    
    if (!validLevels.includes(level)) {
      return res.status(400).json({ message: "Invalid hierarchy level" });
    }
    
    const leaders = await storage.getLeadersByLevel(level);
    res.json(leaders);
  });

  // Devotees (requires authentication, district filtering for supervisors)
  app.get("/api/devotees", authenticateJWT, validateDistrictAccess, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const sortBy = (req.query.sortBy as string) || "name";
    const sortOrder = (req.query.sortOrder as string) || "asc";
    const filters = {
      search: req.query.search as string,
      country: req.query.country as string,
      state: req.query.state as string,
      district: req.query.district as string,
      statusId: req.query.statusId as string,
      sortBy,
      sortOrder,
      allowedDistricts: req.user?.role === 'DISTRICT_SUPERVISOR' ? req.user.districts : undefined,
    };
    const result = await storage.getDevotees(page, size, filters);
    res.json(result);
  });

  // Get available devotees for officer positions (Secretary, President, Accountant)
  app.get("/api/devotees/available-officers", authenticateJWT, async (req, res) => {
    try {
      const availableDevotees = await storage.getAvailableDevoteesForOfficerPositions();
      res.json(availableDevotees);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/devotees/:id", authenticateJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    const devotee = await storage.getDevotee(id);
    if (!devotee) {
      return res.status(404).json({ message: "Devotee not found" });
    }
    res.json(devotee);
  });

  app.post("/api/devotees", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      // Extract address and other fields separately (similar to namhatta creation)
      const { presentAddress, permanentAddress, ...devoteeFields } = req.body;
      
      // Validate only the devotee fields against schema
      const validatedDevoteeData = insertDevoteeSchema.parse(devoteeFields);
      
      // Add addresses back to the data
      const devoteeDataWithAddresses = {
        ...validatedDevoteeData,
        presentAddress: presentAddress,
        permanentAddress: permanentAddress
      };
      
      const devotee = await storage.createDevotee(devoteeDataWithAddresses);
      res.status(201).json(devotee);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ message: "Invalid devotee data", error: errorMessage });
    }
  });

  // Add devotee to specific Namhatta
  app.post("/api/devotees/:namhattaId", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const namhattaId = parseInt(req.params.namhattaId);
    try {
      // Extract address and other fields separately
      const { presentAddress, permanentAddress, ...devoteeFields } = req.body;
      
      // Validate only the devotee fields against schema
      const validatedDevoteeData = insertDevoteeSchema.parse(devoteeFields);
      
      // Add addresses back to the data
      const devoteeDataWithAddresses = {
        ...validatedDevoteeData,
        presentAddress: presentAddress,
        permanentAddress: permanentAddress
      };
      
      const devotee = await storage.createDevoteeForNamhatta(devoteeDataWithAddresses, namhattaId);
      res.status(201).json(devotee);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ message: "Invalid devotee data", error: errorMessage });
    }
  });

  app.put("/api/devotees/:id", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      // Extract address and other fields separately (similar to create operations)
      const { presentAddress, permanentAddress, allowedDistricts, devotionalCourses, ...devoteeFields } = req.body;
      
      // For DISTRICT_SUPERVISOR, check if they have access to this devotee
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        console.log(`District access check for user ${req.user.username} (districts: ${req.user.districts.join(', ')}) trying to update devotee ${id}`);
        const hasAccess = await storage.checkDevoteeDistrictAccess(id, allowedDistricts || []);
        console.log(`Access result: ${hasAccess}`);
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied: Devotee not in your assigned districts" });
        }
      }
      
      // Validate only the devotee fields against schema
      const validatedDevoteeData = insertDevoteeSchema.partial().parse(devoteeFields);
      
      // Add addresses and other non-schema fields back to the data
      const devoteeDataWithAddresses = {
        ...validatedDevoteeData,
        presentAddress: presentAddress,
        permanentAddress: permanentAddress,
        devotionalCourses: devotionalCourses
      };
      
      const devotee = await storage.updateDevotee(id, devoteeDataWithAddresses);
      res.json(devotee);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ message: "Invalid devotee data", error: errorMessage });
    }
  });

  app.post("/api/devotees/:id/upgrade-status", authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    const id = parseInt(req.params.id);
    const { newStatusId, notes, allowedDistricts } = req.body;
    
    // For DISTRICT_SUPERVISOR, check if they have access to this devotee
    if (req.user?.role === 'DISTRICT_SUPERVISOR') {
      const hasAccess = await storage.checkDevoteeDistrictAccess(id, allowedDistricts || []);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied: Devotee not in your assigned districts" });
      }
    }
    
    if (!newStatusId) {
      return res.status(400).json({ message: "newStatusId is required" });
    }
    
    try {
      // Check if devotee exists first
      const devotee = await storage.getDevotee(id);
      if (!devotee) {
        return res.status(404).json({ message: "Devotee not found" });
      }
      
      await storage.upgradeDevoteeStatus(id, newStatusId, notes);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error upgrading devotee status:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message: "Failed to upgrade status", error: errorMessage });
    }
  });

  app.get("/api/devotees/:id/status-history", authenticateJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    const history = await storage.getDevoteeStatusHistory(id);
    res.json(history);
  });

  // Get devotee addresses
  app.get("/api/devotees/:id/addresses", authenticateJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    const addresses = await storage.getDevoteeAddresses(id);
    res.json(addresses);
  });

  // Leadership Management Endpoints
  
  // Get all devotees with leadership roles (for hierarchy display)
  app.get("/api/devotees/leaders", authenticateJWT, async (req, res) => {
    try {
      const leaders = await storage.getDevoteeLeaders();
      res.json(leaders);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get devotees by leadership role
  app.get("/api/devotees/role/:role", authenticateJWT, async (req, res) => {
    try {
      const { role } = req.params;
      
      // Validate role parameter
      const validationResult = roleParamSchema.safeParse(role);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid role parameter', 
          details: validationResult.error.errors 
        });
      }
      
      const devotees = await storage.getDevoteesByRole(validationResult.data);
      res.json(devotees);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Get senapotis by type and reporting devotee ID (dynamic fetching for efficiency)
  app.get("/api/senapoti/:type/:reportingId", sanitizeInput, apiRateLimit, authenticateJWT, validateDistrictAccess, async (req, res) => {
    try {
      const { type, reportingId } = req.params;
      
      // Validate type parameter (senapoti roles)
      const validSenapotiTypes = ['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'];
      if (!validSenapotiTypes.includes(type)) {
        return res.status(400).json({ 
          error: 'Invalid senapoti type', 
          details: `Type must be one of: ${validSenapotiTypes.join(', ')}` 
        });
      }
      
      // Validate reportingId parameter
      const reportingDevoteeId = parseInt(reportingId);
      if (isNaN(reportingDevoteeId) || reportingDevoteeId <= 0) {
        return res.status(400).json({ error: "Invalid reporting devotee ID" });
      }
      
      const senapotis = await storage.getSenapotisByTypeAndReporting(type, reportingDevoteeId);
      res.json(senapotis);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Assign leadership role to devotee (Admin/Office only)
  app.post("/api/devotees/:id/assign-role", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const devoteeId = parseInt(req.params.id);
      if (isNaN(devoteeId) || devoteeId <= 0) {
        return res.status(400).json({ error: "Invalid devotee ID" });
      }
      
      // Validate request body using Zod schema
      const validationResult = leadershipRoleSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validationResult.error.errors 
        });
      }

      const { leadershipRole, reportingToDevoteeId, hasSystemAccess } = validationResult.data;

      // Additional validation: if reportingToDevoteeId is provided, check if devotee exists
      if (reportingToDevoteeId) {
        const reportingDevotee = await storage.getDevotee(reportingToDevoteeId);
        if (!reportingDevotee) {
          return res.status(400).json({ error: "Reporting devotee not found" });
        }
      }

      const result = await storage.assignLeadershipRole(devoteeId, {
        leadershipRole,
        reportingToDevoteeId: reportingToDevoteeId || undefined,
        hasSystemAccess,
        appointedBy: req.user!.id, // Store user ID who made the appointment
        appointedDate: new Date().toISOString()
      });

      res.json(result);
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign role';
      res.status(400).json({ error: errorMessage });
    }
  });

  // Remove leadership role from devotee (Admin/Office only)
  app.delete("/api/devotees/:id/remove-role", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const devoteeId = parseInt(req.params.id);
      if (isNaN(devoteeId) || devoteeId <= 0) {
        return res.status(400).json({ error: "Invalid devotee ID" });
      }
      
      // Check if devotee exists before attempting to remove role
      const devotee = await storage.getDevotee(devoteeId);
      if (!devotee) {
        return res.status(404).json({ error: "Devotee not found" });
      }
      
      await storage.removeLeadershipRole(devoteeId);
      res.json({ message: "Leadership role removed successfully" });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Failed to remove leadership role' });
    }
  });

  // Get leadership hierarchy tree
  app.get("/api/leadership/hierarchy", authenticateJWT, async (req, res) => {
    try {
      const hierarchy = await storage.getLeadershipHierarchy();
      res.json(hierarchy);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get devotees eligible for leadership roles (no current role)
  app.get("/api/devotees/eligible-leaders", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const devotees = await storage.getEligibleLeaders();
      res.json(devotees);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User-Devotee Links Management Endpoints

  // Get user linked to a devotee
  app.get("/api/devotees/:id/user", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const devoteeId = parseInt(req.params.id);
      if (isNaN(devoteeId)) {
        return res.status(400).json({ error: "Invalid devotee ID" });
      }

      const user = await storage.getDevoteeLinkedUser(devoteeId);
      if (!user) {
        return res.status(404).json({ error: "No user linked to this devotee" });
      }

      res.json(user);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get devotee linked to a user
  app.get("/api/users/:id/devotee", authenticateJWT, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Users can only access their own linked devotee unless they're admin/office
      if (req.user!.role !== 'ADMIN' && req.user!.role !== 'OFFICE' && req.user!.id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const devotee = await storage.getUserLinkedDevotee(userId);
      if (!devotee) {
        return res.status(404).json({ error: "No devotee linked to this user" });
      }

      res.json(devotee);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Link existing user to devotee
  app.post("/api/users/:userId/link-devotee/:devoteeId", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const devoteeId = parseInt(req.params.devoteeId);
      const { force } = req.body;
      
      if (isNaN(userId) || isNaN(devoteeId) || userId <= 0 || devoteeId <= 0) {
        return res.status(400).json({ error: "Invalid user ID or devotee ID" });
      }

      await storage.linkUserToDevotee(userId, devoteeId, force || false);
      res.json({ message: "User linked to devotee successfully" });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to link user to devotee';
      
      // Handle specific conflict scenarios with appropriate HTTP status codes
      if (errorMessage.includes('already linked') && !errorMessage.includes('force flag')) {
        return res.status(409).json({ error: errorMessage });
      }
      
      res.status(400).json({ error: errorMessage });
    }
  });

  // Unlink user from devotee
  app.delete("/api/users/:userId/unlink-devotee", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      await storage.unlinkUserFromDevotee(userId);
      res.json({ message: "User unlinked from devotee successfully" });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlink user from devotee';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Create user account for devotee with leadership access
  app.post("/api/devotees/:id/create-user", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const devoteeId = parseInt(req.params.id);
      if (isNaN(devoteeId) || devoteeId <= 0) {
        return res.status(400).json({ error: "Invalid devotee ID" });
      }

      // Validate request body using Zod schema
      const validationResult = createUserForDevoteeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validationResult.error.errors 
        });
      }

      const { username, password, email, role, force } = validationResult.data;

      const result = await storage.createUserForDevotee(devoteeId, {
        username,
        password,
        email,
        role,
        force,
        createdBy: req.user!.id
      });

      res.status(201).json({
        message: "User account created for devotee successfully",
        user: {
          id: result.user.id,
          username: result.user.username,
          fullName: result.user.fullName,
          email: result.user.email,
          role: result.user.role
        },
        devotee: result.devotee
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user for devotee';
      
      // Handle specific conflict scenarios with appropriate HTTP status codes
      if (errorMessage.includes('already linked') || errorMessage.includes('already exists')) {
        return res.status(409).json({ error: errorMessage });
      }
      
      res.status(400).json({ error: errorMessage });
    }
  });

  // Namhattas (requires authentication, district filtering for supervisors)
  app.get("/api/namhattas", authenticateJWT, validateDistrictAccess, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as string;
    
    const filters = {
      search: req.query.search as string,
      country: req.query.country as string,
      state: req.query.state as string,
      district: req.query.district as string,
      subDistrict: req.query.subDistrict as string,
      village: req.query.village as string,
      status: req.query.status as string,
      sortBy,
      sortOrder,
      allowedDistricts: req.user?.role === 'DISTRICT_SUPERVISOR' ? req.user.districts : undefined,
    };
    const result = await storage.getNamhattas(page, size, filters);
    res.json(result);
  });

  app.get("/api/namhattas/pending", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const result = await storage.getNamhattas(page, size, { status: "PENDING_APPROVAL" });
    res.json(result.data);
  });

  app.get("/api/namhattas/:id", authenticateJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    const namhatta = await storage.getNamhatta(id);
    if (!namhatta) {
      return res.status(404).json({ message: "Namhatta not found" });
    }
    res.json(namhatta);
  });

  // Check if namhatta code exists
  app.get("/api/namhattas/check-code/:code", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const code = req.params.code;
      const exists = await storage.checkNamhattaCodeExists(code);
      res.json({ exists });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message: "Error checking code uniqueness", error: errorMessage });
    }
  });

  app.post("/api/namhattas", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      // Extract address and other fields separately
      const { address, ...namhattaFields } = req.body;
      
      // Validate only the namhatta fields against schema
      const validatedNamhattaData = insertNamhattaSchema.parse(namhattaFields);
      
      // Add address back to the data
      const namhattaDataWithAddress = {
        ...validatedNamhattaData,
        address: address
      };
      
      const namhatta = await storage.createNamhatta(namhattaDataWithAddress);
      res.status(201).json(namhatta);
    } catch (error) {
      // Return appropriate error status based on error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Namhatta creation error:', error);
      console.error('❌ Error message:', errorMessage);
      
      if (errorMessage.includes('already exists')) {
        res.status(409).json({ message: errorMessage });
      } else {
        // Surface the actual error message instead of masking it
        res.status(400).json({ message: errorMessage, error: errorMessage });
      }
    }
  });

  app.put("/api/namhattas/:id", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      // Extract address and other fields separately (same as POST route)
      const { address, ...namhattaFields } = req.body;
      
      // Validate only the namhatta fields against schema
      const validatedNamhattaData = insertNamhattaSchema.partial().parse(namhattaFields);
      
      // Add address back to the data
      const namhattaDataWithAddress = {
        ...validatedNamhattaData,
        address: address
      };
      
      const namhatta = await storage.updateNamhatta(id, namhattaDataWithAddress);
      res.json(namhatta);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ message: "Invalid namhatta data", error: errorMessage });
    }
  });

  app.get("/api/namhattas/:id/devotees", async (req, res) => {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const statusId = req.query.statusId ? parseInt(req.query.statusId as string) : undefined;
    
    const result = await storage.getDevoteesByNamhatta(id, page, size, statusId);
    res.json(result);
  });

  // Check registration number availability
  app.get("/api/namhattas/check-registration/:registrationNo", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const registrationNo = req.params.registrationNo;
    try {
      const exists = await storage.checkRegistrationNoExists(registrationNo);
      res.json({ exists });
    } catch (error) {
      res.status(500).json({ message: "Error checking registration number" });
    }
  });

  // Namhatta approval endpoints - only ADMIN and OFFICE users can approve/reject
  app.post("/api/namhattas/:id/approve", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const id = parseInt(req.params.id);
    const { registrationNo, registrationDate } = req.body;
    
    if (!registrationNo || !registrationDate) {
      return res.status(400).json({ message: "Registration number and date are required" });
    }
    
    try {
      // Check if registration number already exists
      const exists = await storage.checkRegistrationNoExists(registrationNo);
      if (exists) {
        return res.status(400).json({ message: "Registration number already exists" });
      }
      
      await storage.approveNamhatta(id, registrationNo, registrationDate);
      res.json({ message: "Namhatta approved successfully" });
    } catch (error) {
      res.status(404).json({ message: "Namhatta not found" });
    }
  });

  app.post("/api/namhattas/:id/reject", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    try {
      await storage.rejectNamhatta(id, reason);
      res.json({ message: "Namhatta rejected successfully" });
    } catch (error) {
      res.status(404).json({ message: "Namhatta not found" });
    }
  });

  app.get("/api/namhattas/:id/updates", async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = await storage.getNamhattaUpdates(id);
    res.json(updates);
  });

  // Get all updates from all namhattas (optimized endpoint)
  app.get("/api/updates/all", async (req, res) => {
    const updates = await storage.getAllUpdates();
    res.json(updates);
  });

  app.get("/api/namhattas/:id/devotee-status-count", async (req, res) => {
    const id = parseInt(req.params.id);
    const counts = await storage.getNamhattaDevoteeStatusCount(id);
    res.json(counts);
  });

  app.get("/api/namhattas/:id/status-history", async (req, res) => {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const result = await storage.getNamhattaStatusHistory(id, page, size);
    res.json(result);
  });

  // Statuses
  app.get("/api/statuses", async (req, res) => {
    const statuses = await storage.getDevotionalStatuses();
    res.json(statuses);
  });

  app.post("/api/statuses", async (req, res) => {
    try {
      const statusData = insertDevotionalStatusSchema.parse(req.body);
      const status = await storage.createDevotionalStatus(statusData);
      res.status(201).json(status);
    } catch (error) {
      res.status(400).json({ message: "Invalid status data", error });
    }
  });

  app.post("/api/statuses/:id/rename", async (req, res) => {
    const id = parseInt(req.params.id);
    const { newName } = req.body;
    
    if (!newName) {
      return res.status(400).json({ message: "newName is required" });
    }
    
    try {
      await storage.renameDevotionalStatus(id, newName);
      res.json({ message: "Status renamed successfully" });
    } catch (error) {
      res.status(404).json({ message: "Status not found" });
    }
  });

  // Gurudevs
  app.get("/api/gurudevs", async (req, res) => {
    const gurudevs = await storage.getGurudevs();
    res.json(gurudevs);
  });

  app.post("/api/gurudevs", async (req, res) => {
    try {
      const gurudevData = insertGurudevSchema.parse(req.body);
      const gurudev = await storage.createGurudev(gurudevData);
      res.status(201).json(gurudev);
    } catch (error) {
      res.status(400).json({ message: "Invalid gurudev data", error });
    }
  });

  // Shraddhakutirs
  app.get("/api/shraddhakutirs", async (req, res) => {
    const { district } = req.query;
    const shraddhakutirs = await storage.getShraddhakutirs(district as string);
    res.json(shraddhakutirs);
  });

  app.post("/api/shraddhakutirs", async (req, res) => {
    try {
      const shraddhakutirData = insertShraddhakutirSchema.parse(req.body);
      const shraddhakutir = await storage.createShraddhakutir(shraddhakutirData);
      res.status(201).json(shraddhakutir);
    } catch (error) {
      res.status(400).json({ message: "Invalid shraddhakutir data", error });
    }
  });

  // Updates
  app.post("/api/updates", async (req, res) => {
    try {
      console.log("Received update data:", JSON.stringify(req.body, null, 2));
      console.log("Date field type:", typeof req.body.date, "Value:", req.body.date);
      
      // Ensure proper type conversion for numeric fields
      const processedData = {
        ...req.body,
        namhattaId: Number(req.body.namhattaId),
        attendance: Number(req.body.attendance),
        prasadDistribution: req.body.prasadDistribution ? Number(req.body.prasadDistribution) : undefined,
      };
      
      const updateData = insertNamhattaUpdateSchema.parse(processedData);
      const update = await storage.createNamhattaUpdate(updateData);
      res.status(201).json(update);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(400).json({ message: "Invalid update data", error });
    }
  });

  // District Supervisor Registration (Admin only)
  app.post("/api/admin/register-supervisor", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const { username, fullName, email, password, districts } = req.body;
      
      // Validate required fields
      if (!username || !fullName || !email || !password || !districts || !Array.isArray(districts) || districts.length === 0) {
        return res.status(400).json({ 
          error: "All fields are required: username, fullName, email, password, districts" 
        });
      }

      // Check if username or email already exists
      const { getUserByUsername, getUserByEmail } = await import('./storage-auth');
      
      const existingUser = await getUserByUsername(username).catch(() => null);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await getUserByEmail(email).catch(() => null);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Create the district supervisor
      const result = await storage.createDistrictSupervisor({
        username,
        fullName,
        email,
        password,
        districts
      });

      res.status(201).json({
        message: "District supervisor created successfully",
        supervisor: {
          id: result.user.id,
          username: result.user.username,
          fullName: result.user.fullName,
          email: result.user.email,
          districts: result.districts
        }
      });
    } catch (error) {
      console.error("Error creating district supervisor:", error);
      res.status(500).json({ error: "Failed to create district supervisor" });
    }
  });

  // Get all users (Admin only)
  app.get("/api/admin/users", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get available districts for assignment
  app.get("/api/admin/available-districts", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const districts = await storage.getAvailableDistricts();
      res.json(districts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch available districts" });
    }
  });

  // Update user (Admin only)
  app.put("/api/admin/users/:id", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const { fullName, email, password } = req.body;
      if (!fullName || !email) {
        return res.status(400).json({ error: "Full name and email are required" });
      }

      const { getUser, updateUser } = await import('./storage-auth');
      const existingUser = await getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const updateData: any = { fullName, email };
      // Only update password if provided
      if (password && password.trim()) {
        updateData.passwordHash = password; // Will be hashed in updateUser function
      }

      const updatedUser = await updateUser(userId, updateData);
      res.json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Deactivate user (Admin only)
  app.delete("/api/admin/users/:id", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const { deactivateUser } = await import('./storage-auth');
      const success = await deactivateUser(userId);
      
      if (success) {
        res.json({ message: "User deactivated successfully" });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ error: "Failed to deactivate user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
