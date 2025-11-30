import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { DatabaseStorage } from "./storage-db";

const storage = new DatabaseStorage();
import { insertDevoteeSchema, insertNamahattaSchema, insertDevotionalStatusSchema, insertShraddhakutirSchema, insertNamahattaUpdateSchema, insertGurudevSchema, insertRoleChangeHistorySchema } from "@shared/schema";
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
const validLeadershipRoles = ['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI', 'DISTRICT_SUPERVISOR'] as const;
const roleParamSchema = z.enum(validLeadershipRoles, {
  errorMap: () => ({ message: 'Invalid role parameter. Must be one of: MALA_SENAPOTI, MAHA_CHAKRA_SENAPOTI, CHAKRA_SENAPOTI, UPA_CHAKRA_SENAPOTI, DISTRICT_SUPERVISOR' })
});

// Senapoti Role Management validation schemas
const transferSubordinatesSchema = z.object({
  fromDevoteeId: z.number().int().positive(),
  toDevoteeId: z.number().int().positive().nullable(),
  subordinateIds: z.array(z.number().int().positive()).min(1, 'At least one subordinate must be selected'),
  reason: z.string().min(3, 'Reason must be at least 3 characters long').max(500, 'Reason must be less than 500 characters'),
  districtCode: z.string().optional()
});

const changeDevoteeRoleSchema = z.object({
  devoteeId: z.number().int().positive(),
  newRole: z.enum(['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI', 'DISTRICT_SUPERVISOR']).nullable(),
  newReportingTo: z.number().int().positive().nullable(),
  reason: z.string().min(3, 'Reason must be at least 3 characters long').max(500, 'Reason must be less than 500 characters'),
  districtCode: z.string().optional()
});

const promoteDevoteeSchema = z.object({
  devoteeId: z.number().int().positive(),
  targetRole: z.enum(['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI', 'DISTRICT_SUPERVISOR']),
  newReportingTo: z.number().int().positive().nullable(),
  reason: z.string().min(3, 'Reason must be at least 3 characters long').max(500, 'Reason must be less than 500 characters')
});

const demoteDevoteeSchema = z.object({
  devoteeId: z.number().int().positive(),
  targetRole: z.enum(['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI']).nullable(),
  newReportingTo: z.number().int().positive().nullable(),
  reason: z.string().min(3, 'Reason must be at least 3 characters long').max(500, 'Reason must be less than 500 characters')
});

const removeRoleSchema = z.object({
  devoteeId: z.number().int().positive(),
  reason: z.string().min(3, 'Reason must be at least 3 characters long').max(500, 'Reason must be less than 500 characters')
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
      name: "Namahatta Management System",
      version: "1.0.0",
      description: "OpenAPI spec for Namahatta web and mobile-compatible system"
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

  // Get district supervisors by district (for Namahatta form)
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
    const data = await storage.getNamahattaCountsByCountry();
    res.json(data);
  });

  app.get("/api/map/states", async (req, res) => {
    const data = await storage.getNamahattaCountsByState(); // Get all states
    res.json(data);
  });

  app.get("/api/map/districts", async (req, res) => {
    const data = await storage.getNamahattaCountsByDistrict(); // Get all districts
    res.json(data);
  });

  app.get("/api/map/sub-districts", async (req, res) => {
    const data = await storage.getNamahattaCountsBySubDistrict(); // Get all sub-districts
    res.json(data);
  });

  app.get("/api/map/villages", async (req, res) => {
    const data = await storage.getNamahattaCountsByVillage(); // Get all villages
    res.json(data);
  });

  // Hierarchical Reports (requires authentication with role-based filtering)
  app.get("/api/reports/hierarchical", authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    try {
      const filters: { allowedDistricts?: string[] } = {};
      
      // For district supervisors, apply district filtering
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        filters.allowedDistricts = req.user.districts;
      }
      
      // Disable caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // Get real data from storage
      const reports = await storage.getHierarchicalReports(filters);
      
      res.json(reports);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lazy Loading Reports API Endpoints
  app.get("/api/reports/states", authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    try {
      const filters: { allowedDistricts?: string[] } = {};
      
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        filters.allowedDistricts = req.user.districts;
      }
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const states = await storage.getAllStatesWithCounts(filters);
      res.json(states);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/reports/districts/:state", authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    try {
      const { state } = req.params;
      const filters: { allowedDistricts?: string[] } = {};
      
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        filters.allowedDistricts = req.user.districts;
      }
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const districts = await storage.getAllDistrictsWithCounts(state, filters);
      res.json(districts);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/reports/sub-districts/:state/:district", authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    try {
      const { state, district } = req.params;
      const filters: { allowedDistricts?: string[] } = {};
      
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        filters.allowedDistricts = req.user.districts;
      }
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const subDistricts = await storage.getAllSubDistrictsWithCounts(state, district, filters);
      res.json(subDistricts);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/reports/villages/:state/:district/:subdistrict", authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    try {
      const { state, district, subdistrict } = req.params;
      const filters: { allowedDistricts?: string[] } = {};
      
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        filters.allowedDistricts = req.user.districts;
      }
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const villages = await storage.getAllVillagesWithCounts(state, district, subdistrict, filters);
      res.json(villages);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Export API endpoints for reports
  app.get("/api/reports/export/districts", authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    try {
      const filters: { allowedDistricts?: string[] } = {};
      
      // Apply district filtering for supervisors
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        filters.allowedDistricts = req.user.districts;
      }

      // Get only states that the user has access to
      const states = await storage.getAllStatesWithCounts(filters);
      
      // Collect only districts the user has access to
      const allDistricts: Array<{name: string; state: string; country: string; namahattaCount: number; devoteeCount: number}> = [];
      
      for (const state of states) {
        const districts = await storage.getAllDistrictsWithCounts(state.name, filters);
        for (const district of districts) {
          // For supervisors, only include districts they have access to
          if (req.user?.role === 'DISTRICT_SUPERVISOR') {
            if (!filters.allowedDistricts?.includes(district.name)) {
              continue;
            }
          }
          allDistricts.push({
            name: district.name,
            state: state.name,
            country: state.country,
            namahattaCount: district.namahattaCount,
            devoteeCount: district.devoteeCount
          });
        }
      }
      
      res.json(allDistricts);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/reports/export/data", authenticateJWT, authorize(['ADMIN', 'OFFICE', 'DISTRICT_SUPERVISOR']), validateDistrictAccess, async (req, res) => {
    try {
      const { districts, includeNamahattas, includeDevotees } = req.body;
      
      if (!districts || !Array.isArray(districts) || districts.length === 0) {
        return res.status(400).json({ error: 'Please select at least one district' });
      }

      const filters: { allowedDistricts?: string[] } = {};
      
      // Apply district filtering for supervisors
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        filters.allowedDistricts = req.user.districts;
        
        // Validate that all requested districts are in the supervisor's allowed districts
        for (const districtInfo of districts) {
          if (!filters.allowedDistricts?.includes(districtInfo.district)) {
            return res.status(403).json({ error: `Access denied: You do not have permission to export data for district "${districtInfo.district}"` });
          }
        }
      }

      const exportData: any = {
        districts: [],
        namahattas: [],
        devotees: [],
        generatedAt: new Date().toISOString()
      };

      // Process each selected district
      for (const districtInfo of districts) {
        const { district, state } = districtInfo;
        
        // Get sub-districts for this district
        const subDistricts = await storage.getAllSubDistrictsWithCounts(state, district, filters);
        
        const districtData = {
          name: district,
          state,
          namahattaCount: subDistricts.reduce((sum: number, sd: any) => sum + sd.namahattaCount, 0),
          devoteeCount: subDistricts.reduce((sum: number, sd: any) => sum + sd.devoteeCount, 0),
          subDistricts: subDistricts.map((sd: any) => ({
            name: sd.name,
            namahattaCount: sd.namahattaCount,
            devoteeCount: sd.devoteeCount
          }))
        };
        exportData.districts.push(districtData);

        // Fetch namahattas if requested
        if (includeNamahattas) {
          const namahattaResult = await storage.getNamahattas(1, 10000, {
            district,
            state,
            allowedDistricts: filters.allowedDistricts
          });
          
          for (const n of namahattaResult.data as any[]) {
            exportData.namahattas.push({
              name: n.name,
              code: n.code || '',
              district,
              state,
              subDistrict: n.address?.subDistrict || '',
              village: n.address?.village || '',
              meetingDay: n.meetingDay || '',
              meetingTime: n.meetingTime || '',
              status: n.status || '',
              malaSenapoti: n.malaSenapoti || '',
              mahaChakraSenapoti: n.mahaChakraSenapoti || '',
              chakraSenapoti: n.chakraSenapoti || '',
              upaChakraSenapoti: n.upaChakraSenapoti || '',
              president: n.president || '',
              secretary: n.secretary || '',
              accountant: n.accountant || ''
            });
          }
        }

        // Fetch devotees if requested
        if (includeDevotees) {
          const devoteeResult = await storage.getDevotees(1, 10000, {
            district,
            state,
            allowedDistricts: filters.allowedDistricts
          });
          
          for (const d of devoteeResult.data as any[]) {
            exportData.devotees.push({
              name: d.name,
              phone: d.phone || '',
              email: d.email || '',
              district,
              state,
              subDistrict: d.address?.subDistrict || '',
              village: d.address?.village || '',
              namahatta: d.namahatta?.name || '',
              initiationName: d.initiatedName || '',
              leadershipRole: d.leadershipRole || '',
              status: d.devotionalStatus?.name || ''
            });
          }
        }
      }

      res.json(exportData);
    } catch (error) {
      console.error('Export API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
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
      // Extract address and other fields separately (similar to namahatta creation)
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

  // Add devotee to specific Namahatta
  app.post("/api/devotees/:namahattaId", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const namahattaId = parseInt(req.params.namahattaId);
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
      
      const devotee = await storage.createDevoteeForNamahatta(devoteeDataWithAddresses, namahattaId);
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

  // Namahattas (requires authentication, district filtering for supervisors)
  app.get("/api/namahattas", authenticateJWT, validateDistrictAccess, async (req, res) => {
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
    const result = await storage.getNamahattas(page, size, filters);
    res.json(result);
  });

  app.get("/api/namahattas/pending", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const result = await storage.getNamahattas(page, size, { status: "PENDING_APPROVAL" });
    res.json(result.data);
  });

  app.get("/api/namahattas/:id", authenticateJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    const namahatta = await storage.getNamahatta(id);
    if (!namahatta) {
      return res.status(404).json({ message: "Namahatta not found" });
    }
    res.json(namahatta);
  });

  // Check if namahatta code exists
  app.get("/api/namahattas/check-code/:code", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      const code = req.params.code;
      const exists = await storage.checkNamahattaCodeExists(code);
      res.json({ exists });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message: "Error checking code uniqueness", error: errorMessage });
    }
  });

  app.post("/api/namahattas", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    try {
      // Extract address and other fields separately
      const { address, ...namahattaFields } = req.body;
      
      // Validate only the namahatta fields against schema
      const validatedNamahattaData = insertNamahattaSchema.parse(namahattaFields);
      
      // Add address back to the data
      const namahattaDataWithAddress = {
        ...validatedNamahattaData,
        address: address
      };
      
      const namahatta = await storage.createNamahatta(namahattaDataWithAddress);
      res.status(201).json(namahatta);
    } catch (error) {
      // Return appropriate error status based on error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Namahatta creation error:', error);
      console.error('❌ Error message:', errorMessage);
      
      if (errorMessage.includes('already exists')) {
        res.status(409).json({ message: errorMessage });
      } else {
        // Surface the actual error message instead of masking it
        res.status(400).json({ message: errorMessage, error: errorMessage });
      }
    }
  });

  app.put("/api/namahattas/:id", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      // Extract address and other fields separately (same as POST route)
      const { address, ...namahattaFields } = req.body;
      
      // Validate only the namahatta fields against schema
      const validatedNamahattaData = insertNamahattaSchema.partial().parse(namahattaFields);
      
      // Add address back to the data
      const namahattaDataWithAddress = {
        ...validatedNamahattaData,
        address: address
      };
      
      const namahatta = await storage.updateNamahatta(id, namahattaDataWithAddress);
      res.json(namahatta);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ message: "Invalid namahatta data", error: errorMessage });
    }
  });

  app.get("/api/namahattas/:id/devotees", async (req, res) => {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const statusId = req.query.statusId ? parseInt(req.query.statusId as string) : undefined;
    
    const result = await storage.getDevoteesByNamahatta(id, page, size, statusId);
    res.json(result);
  });

  // Check registration number availability
  app.get("/api/namahattas/check-registration/:registrationNo", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const registrationNo = req.params.registrationNo;
    try {
      const exists = await storage.checkRegistrationNoExists(registrationNo);
      res.json({ exists });
    } catch (error) {
      res.status(500).json({ message: "Error checking registration number" });
    }
  });

  // Namahatta approval endpoints - only ADMIN and OFFICE users can approve/reject
  app.post("/api/namahattas/:id/approve", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
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
      
      await storage.approveNamahatta(id, registrationNo, registrationDate);
      res.json({ message: "Namahatta approved successfully" });
    } catch (error) {
      res.status(404).json({ message: "Namahatta not found" });
    }
  });

  app.post("/api/namahattas/:id/reject", authenticateJWT, authorize(['ADMIN', 'OFFICE']), async (req, res) => {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    try {
      await storage.rejectNamahatta(id, reason);
      res.json({ message: "Namahatta rejected successfully" });
    } catch (error) {
      res.status(404).json({ message: "Namahatta not found" });
    }
  });

  app.get("/api/namahattas/:id/updates", async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = await storage.getNamahattaUpdates(id);
    res.json(updates);
  });

  // Get all updates from all namahattas (optimized endpoint)
  app.get("/api/updates/all", async (req, res) => {
    const updates = await storage.getAllUpdates();
    res.json(updates);
  });

  app.get("/api/namahattas/:id/devotee-status-count", async (req, res) => {
    const id = parseInt(req.params.id);
    const counts = await storage.getNamahattaDevoteeStatusCount(id);
    res.json(counts);
  });

  app.get("/api/namahattas/:id/status-history", async (req, res) => {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const result = await storage.getNamahattaStatusHistory(id, page, size);
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
        namahattaId: Number(req.body.namahattaId),
        attendance: Number(req.body.attendance),
        prasadDistribution: req.body.prasadDistribution ? Number(req.body.prasadDistribution) : undefined,
      };
      
      const updateData = insertNamahattaUpdateSchema.parse(processedData);
      const update = await storage.createNamahattaUpdate(updateData);
      res.status(201).json(update);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(400).json({ message: "Invalid update data", error });
    }
  });

  // District Supervisor Registration (Admin only)
  app.post("/api/admin/register-supervisor", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const { username, fullName, email, phone, password, districts } = req.body;
      
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
        phone: phone || null,
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

  // Update user (Admin only) - supports partial updates including password-only changes
  app.put("/api/admin/users/:id", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const { fullName, email, password } = req.body;
      
      // Allow password-only updates
      if (!fullName && !email && !password) {
        return res.status(400).json({ error: "At least one field (fullName, email, or password) is required" });
      }

      const { getUser, updateUser } = await import('./storage-auth');
      const existingUser = await getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const updateData: any = {};
      
      // Only include fields that are provided
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
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

  // Register Office user (Admin only)
  app.post("/api/admin/register-office", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const { username, fullName, email, phone, password, districts } = req.body;

      if (!username || !fullName || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const { getUserByUsername, getUserByEmail, createUser, assignDistrictsToUser } = await import('./storage-auth');

      const existingUsername = await getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const user = await createUser({
        username,
        fullName,
        email,
        phone: phone || null,
        passwordHash: password,
        role: 'OFFICE'
      });

      // Assign districts if provided
      if (districts && districts.length > 0) {
        await assignDistrictsToUser(user.id, districts);
      }

      res.status(201).json({
        message: "Office user created successfully",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: 'OFFICE',
          districts: districts || []
        }
      });
    } catch (error) {
      console.error("Error creating office user:", error);
      res.status(500).json({ error: "Failed to create office user" });
    }
  });

  // Get devotees with leadership roles (Senapatis) - properly secured
  app.get("/api/admin/senapatis", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const senapatis = await (storage as any).getDevoteesWithLeadershipRoles();
      res.json(senapatis);
    } catch (error) {
      console.error("Error fetching senapatis:", error);
      res.status(500).json({ error: "Failed to fetch senapatis" });
    }
  });

  // Get senapatis without login (for registration)
  app.get("/api/admin/senapatis-without-login", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const allSenapatis = await (storage as any).getDevoteesWithLeadershipRoles();
      const senapotisWithoutLogin = allSenapatis.filter((s: any) => !s.user);
      res.json(senapotisWithoutLogin);
    } catch (error) {
      console.error("Error fetching senapatis without login:", error);
      res.status(500).json({ error: "Failed to fetch senapatis without login" });
    }
  });

  // Create user account for a senapati (devotee with leadership role)
  app.post("/api/admin/senapati-user", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const { devoteeId, username, password } = req.body;

      if (!devoteeId || !username || !password) {
        return res.status(400).json({ error: "Devotee ID, username, and password are required" });
      }

      // Get the devotee
      const devotee = await storage.getDevotee(devoteeId);
      if (!devotee) {
        return res.status(404).json({ error: "Devotee not found" });
      }

      if (!devotee.leadershipRole) {
        return res.status(400).json({ error: "Devotee does not have a leadership role" });
      }

      const { getUserByUsername, createUser } = await import('./storage-auth');

      const existingUsername = await getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Create user with DISTRICT_SUPERVISOR role (they need login access)
      const user = await createUser({
        username,
        fullName: devotee.legalName,
        email: devotee.email || `${username}@namahatta.local`,
        passwordHash: password,
        role: 'DISTRICT_SUPERVISOR',
        devoteeId
      });

      // Update devotee to have system access
      await storage.updateDevotee(devoteeId, { hasSystemAccess: true });

      res.status(201).json({
        message: "Senapati user account created successfully",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          devoteeId,
          leadershipRole: devotee.leadershipRole
        }
      });
    } catch (error) {
      console.error("Error creating senapati user:", error);
      res.status(500).json({ error: "Failed to create senapati user account" });
    }
  });

  // Reactivate a deactivated user
  app.post("/api/admin/users/:id/reactivate", authenticateJWT, authorize(['ADMIN']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const { reactivateUser } = await import('./storage-auth');
      const success = await reactivateUser(userId);
      
      if (success) {
        res.json({ message: "User reactivated successfully" });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error reactivating user:", error);
      res.status(500).json({ error: "Failed to reactivate user" });
    }
  });

  // ====================================================================================
  // SENAPOTI ROLE MANAGEMENT SYSTEM API ENDPOINTS
  // ====================================================================================

  // Transfer subordinates from one supervisor to another
  app.post("/api/senapoti/transfer-subordinates", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'DISTRICT_SUPERVISOR']), async (req, res) => {
    try {
      const validatedData = transferSubordinatesSchema.parse(req.body);
      
      // Get user's district if they are a district supervisor for validation
      let allowedDistricts: string[] = [];
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        allowedDistricts = req.user.districts || [];
      }
      
      // Validate subordinate transfer
      const validation = await storage.validateSubordinateTransfer({
        fromDevoteeId: validatedData.fromDevoteeId,
        toDevoteeId: validatedData.toDevoteeId,
        subordinateIds: validatedData.subordinateIds,
        districtCode: validatedData.districtCode || (allowedDistricts[0] || '')
      });

      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Transfer validation failed', 
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Perform the transfer
      const result = await storage.transferSubordinates({
        fromDevoteeId: validatedData.fromDevoteeId,
        toDevoteeId: validatedData.toDevoteeId,
        subordinateIds: validatedData.subordinateIds,
        changedBy: req.user!.id,
        reason: validatedData.reason,
        districtCode: validatedData.districtCode
      });

      res.json({
        message: `Successfully transferred ${result.transferred} subordinates`,
        transferred: result.transferred,
        subordinates: result.subordinates
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: 'Failed to transfer subordinates', message: errorMessage });
    }
  });

  // Promote devotee to higher role
  app.post("/api/senapoti/promote", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'DISTRICT_SUPERVISOR']), async (req, res) => {
    try {
      const validatedData = promoteDevoteeSchema.parse(req.body);
      
      // Get user's district for validation
      let districtCode = '';
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        districtCode = req.user.districts?.[0] || '';
      }

      // Perform role change (promotion)
      const result = await storage.changeDevoteeRole({
        devoteeId: validatedData.devoteeId,
        newRole: validatedData.targetRole,
        newReportingTo: validatedData.newReportingTo,
        changedBy: req.user!.id,
        reason: `Promotion: ${validatedData.reason}`,
        districtCode: districtCode
      });

      res.json({
        message: `Successfully promoted devotee to ${validatedData.targetRole}`,
        devotee: result.devotee,
        subordinatesTransferred: result.subordinatesTransferred,
        roleChangeRecord: result.roleChangeRecord
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: 'Failed to promote devotee', message: errorMessage });
    }
  });

  // Demote devotee to lower role
  app.post("/api/senapoti/demote", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'DISTRICT_SUPERVISOR']), async (req, res) => {
    try {
      const validatedData = demoteDevoteeSchema.parse(req.body);
      
      // Get user's district for validation
      let districtCode = '';
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        districtCode = req.user.districts?.[0] || '';
      }

      // Perform role change (demotion)
      const result = await storage.changeDevoteeRole({
        devoteeId: validatedData.devoteeId,
        newRole: validatedData.targetRole,
        newReportingTo: validatedData.newReportingTo,
        changedBy: req.user!.id,
        reason: `Demotion: ${validatedData.reason}`,
        districtCode: districtCode
      });

      res.json({
        message: `Successfully demoted devotee${validatedData.targetRole ? ` to ${validatedData.targetRole}` : ' (role removed)'}`,
        devotee: result.devotee,
        subordinatesTransferred: result.subordinatesTransferred,
        roleChangeRecord: result.roleChangeRecord
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: 'Failed to demote devotee', message: errorMessage });
    }
  });

  // Remove role from devotee completely
  app.post("/api/senapoti/remove-role", sanitizeInput, modifyRateLimit, authenticateJWT, authorize(['ADMIN', 'DISTRICT_SUPERVISOR']), async (req, res) => {
    try {
      const validatedData = removeRoleSchema.parse(req.body);
      
      // Get user's district for validation
      let districtCode = '';
      if (req.user?.role === 'DISTRICT_SUPERVISOR') {
        districtCode = req.user.districts?.[0] || '';
      }

      // Perform role removal
      const result = await storage.changeDevoteeRole({
        devoteeId: validatedData.devoteeId,
        newRole: null, // Remove role completely
        newReportingTo: null,
        changedBy: req.user!.id,
        reason: `Role Removal: ${validatedData.reason}`,
        districtCode: districtCode
      });

      res.json({
        message: 'Successfully removed leadership role from devotee',
        devotee: result.devotee,
        subordinatesTransferred: result.subordinatesTransferred,
        roleChangeRecord: result.roleChangeRecord
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: 'Failed to remove role', message: errorMessage });
    }
  });

  // Get available supervisors for a target role within a district
  app.get("/api/senapoti/available-supervisors/:districtCode/:targetRole", authenticateJWT, authorize(['ADMIN', 'DISTRICT_SUPERVISOR']), async (req, res) => {
    try {
      const districtCode = req.params.districtCode;
      const targetRole = roleParamSchema.parse(req.params.targetRole);
      const excludeIds = req.query.excludeIds ? 
        String(req.query.excludeIds).split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : 
        [];

      const supervisors = await storage.getAvailableSupervisors({
        targetRole,
        districtCode,
        excludeDevoteeIds: excludeIds
      });

      res.json({
        districtCode,
        targetRole,
        supervisors
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: 'Failed to get available supervisors', message: errorMessage });
    }
  });

  // Get direct subordinates of a devotee
  app.get("/api/senapoti/subordinates/:devoteeId", authenticateJWT, authorize(['ADMIN', 'DISTRICT_SUPERVISOR']), async (req, res) => {
    try {
      const devoteeId = parseInt(req.params.devoteeId);
      if (isNaN(devoteeId)) {
        return res.status(400).json({ error: 'Invalid devotee ID' });
      }

      const subordinates = await storage.getDirectSubordinates(devoteeId);
      
      res.json({
        devoteeId,
        subordinates,
        count: subordinates.length
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: 'Failed to get subordinates', message: errorMessage });
    }
  });

  // Get role change history for a devotee
  app.get("/api/senapoti/role-history/:devoteeId", authenticateJWT, authorize(['ADMIN', 'DISTRICT_SUPERVISOR']), async (req, res) => {
    try {
      const devoteeId = parseInt(req.params.devoteeId);
      if (isNaN(devoteeId)) {
        return res.status(400).json({ error: 'Invalid devotee ID' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const size = parseInt(req.query.size as string) || 10;

      const history = await storage.getRoleChangeHistory(devoteeId, page, size);
      
      res.json(history);
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: 'Failed to get role change history', message: errorMessage });
    }
  });

  // Get all subordinates in chain (recursive)
  app.get("/api/senapoti/subordinates/:devoteeId/all", authenticateJWT, authorize(['ADMIN', 'DISTRICT_SUPERVISOR']), async (req, res) => {
    try {
      const devoteeId = parseInt(req.params.devoteeId);
      if (isNaN(devoteeId)) {
        return res.status(400).json({ error: 'Invalid devotee ID' });
      }

      const allSubordinates = await storage.getAllSubordinatesInChain(devoteeId);
      
      res.json({
        devoteeId,
        allSubordinates,
        count: allSubordinates.length
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: 'Failed to get all subordinates', message: errorMessage });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
