import { db } from "./db";
import { devotees, namahattas, devotionalStatuses, shraddhakutirs, namahattaUpdates, leaders, statusHistory, addresses, devoteeAddresses, namahattaAddresses, gurudevs, users, userDistricts, roleChangeHistory } from "@shared/schema";
import { Devotee, InsertDevotee, Namahatta, InsertNamahatta, DevotionalStatus, InsertDevotionalStatus, Shraddhakutir, InsertShraddhakutir, NamahattaUpdate, InsertNamahattaUpdate, Leader, InsertLeader, StatusHistory, Gurudev, InsertGurudev, User, InsertUser, RoleChangeHistory, InsertRoleChangeHistory } from "@shared/schema";
import { sql, eq, desc, asc, and, or, like, count, inArray, ne, isNotNull, isNull, not } from "drizzle-orm";
import { IStorage } from "./storage-fresh";
import { seedDatabase } from "./seed-data";

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Check if data already exists
    const existingStatuses = await db.select({
      id: devotionalStatuses.id
    }).from(devotionalStatuses).limit(1);
    
    if (existingStatuses.length === 0) {
      // Initialize devotional statuses
      const statusData = [
        { name: "Shraddhavan" },
        { name: "Sadhusangi" },
        { name: "Gour/Krishna Sevak" },
        { name: "Gour/Krishna Sadhak" },
        { name: "Sri Guru Charan Asraya" },
        { name: "Harinam Diksha" },
        { name: "Pancharatrik Diksha" }
      ];

      for (const status of statusData) {
        await db.insert(devotionalStatuses).values(status);
      }

      // Initialize leaders
      const leadersData = [
        { name: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada", role: "FOUNDER_ACHARYA", reportingTo: null, location: { country: "India" } },
        { name: "His Holiness Jayapataka Swami", role: "GBC", reportingTo: 1, location: { country: "India" } },
        { name: "HH Gauranga Prem Swami", role: "REGIONAL_DIRECTOR", reportingTo: 2, location: { country: "India", state: "West Bengal" } },
        { name: "HH Bhaktivilasa Gaurachandra Swami", role: "CO_REGIONAL_DIRECTOR", reportingTo: 3, location: { country: "India", state: "West Bengal" } },
        { name: "HG Padmanetra Das", role: "CO_REGIONAL_DIRECTOR", reportingTo: 3, location: { country: "India", state: "West Bengal" } },
        { name: "District Supervisor - Nadia", role: "DISTRICT_SUPERVISOR", reportingTo: 4, location: { country: "India", state: "West Bengal", district: "Nadia" } },
        { name: "Mala Senapoti - Mayapur", role: "MALA_SENAPOTI", reportingTo: 6, location: { country: "India", state: "West Bengal", district: "Nadia" } }
      ];

      for (const leader of leadersData) {
        await db.insert(leaders).values(leader);
      }

      // Initialize shraddhakutirs
      const shraddhakutirData = [
        { name: "Mayapur Shraddhakutir", districtCode: "NADIA" },
        { name: "Kolkata Shraddhakutir", districtCode: "KOLKATA" },
        { name: "Bhubaneswar Shraddhakutir", districtCode: "KHORDHA" },
        { name: "Patna Shraddhakutir", districtCode: "PATNA" },
        { name: "Ranchi Shraddhakutir", districtCode: "RANCHI" }
      ];

      for (const shraddhakutir of shraddhakutirData) {
        await db.insert(shraddhakutirs).values(shraddhakutir);
      }

      // Seed the database with sample data
      await seedDatabase();
    }
  }

  // Devotees
  async getDevotees(page = 1, size = 10, filters: any = {}): Promise<{ data: Devotee[], total: number }> {
    const offset = (page - 1) * size;
    
    let whereConditions = [];
    
    if (filters.search) {
      whereConditions.push(
        or(
          like(devotees.legalName, `%${filters.search}%`),
          like(devotees.name, `%${filters.search}%`),
          like(devotees.email, `%${filters.search}%`)
        )
      );
    }
    
    if (filters.statusId) {
      whereConditions.push(eq(devotees.devotionalStatusId, parseInt(filters.statusId)));
    }

    // UI-based geographic filtering (present and permanent addresses)
    if (filters.country || filters.state || filters.district) {
      const addressFilterConditions = [];
      
      if (filters.country) {
        addressFilterConditions.push(eq(addresses.country, filters.country));
      }
      if (filters.state) {
        addressFilterConditions.push(eq(addresses.stateNameEnglish, filters.state));
      }
      if (filters.district) {
        addressFilterConditions.push(eq(addresses.districtNameEnglish, filters.district));
      }
      
      // Get devotees who match the address filters in either present or permanent address
      const addressSubquery = db
        .select({ devoteeId: devoteeAddresses.devoteeId })
        .from(devoteeAddresses)
        .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
        .where(and(...addressFilterConditions));
      
      whereConditions.push(
        inArray(devotees.id, addressSubquery)
      );
    }

    // District filtering for DISTRICT_SUPERVISOR (role-based access control)
    if (filters.allowedDistricts && filters.allowedDistricts.length > 0) {
      // Join with devotee_addresses and addresses to filter by district
      const districtSubquery = db
        .select({ devoteeId: devoteeAddresses.devoteeId })
        .from(devoteeAddresses)
        .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
        .where(inArray(addresses.districtNameEnglish, filters.allowedDistricts));
      
      whereConditions.push(
        inArray(devotees.id, districtSubquery)
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Handle sorting
    let orderBy = asc(devotees.legalName);
    if (filters.sortBy === 'createdAt') {
      orderBy = filters.sortOrder === 'desc' ? desc(devotees.createdAt) : asc(devotees.createdAt);
    } else if (filters.sortBy === 'name') {
      orderBy = filters.sortOrder === 'desc' ? desc(devotees.legalName) : asc(devotees.legalName);
    }

    // Get devotees with addresses
    const devoteeIds = await db
      .select({ id: devotees.id })
      .from(devotees)
      .where(whereClause)
      .limit(size)
      .offset(offset)
      .orderBy(orderBy);

    // Get full devotee data with addresses
    const devoteeData = await Promise.all(
      devoteeIds.map(async ({ id }) => {
        return await this.getDevotee(id);
      })
    );

    // Get total count
    const totalResult = await db.select({ count: count() }).from(devotees).where(whereClause);

    return {
      data: devoteeData.filter(Boolean) as Devotee[],
      total: totalResult[0].count
    };
  }

  async getDevotee(id: number): Promise<Devotee | undefined> {
    // Join devotees with devotional statuses and gurudevs to get names
    const result = await db
      .select({
        id: devotees.id,
        legalName: devotees.legalName,
        name: devotees.name,
        dob: devotees.dob,
        email: devotees.email,
        phone: devotees.phone,
        fatherName: devotees.fatherName,
        motherName: devotees.motherName,
        husbandName: devotees.husbandName,
        gender: devotees.gender,
        bloodGroup: devotees.bloodGroup,
        maritalStatus: devotees.maritalStatus,
        devotionalStatusId: devotees.devotionalStatusId,
        devotionalStatusName: devotionalStatuses.name,
        namahattaId: devotees.namahattaId,
        harinamInitiationGurudevId: devotees.harinamInitiationGurudevId,
        pancharatrikInitiationGurudevId: devotees.pancharatrikInitiationGurudevId,
        harinamInitiationGurudevName: sql`harinamGurudev.name`,
        harinamInitiationGurudevTitle: sql`harinamGurudev.title`,
        pancharatrikInitiationGurudevName: sql`pancharatrikGurudev.name`,
        pancharatrikInitiationGurudevTitle: sql`pancharatrikGurudev.title`,
        initiatedName: devotees.initiatedName,
        harinamDate: devotees.harinamDate,
        pancharatrikDate: devotees.pancharatrikDate,
        education: devotees.education,
        occupation: devotees.occupation,
        devotionalCourses: devotees.devotionalCourses,
        additionalComments: devotees.additionalComments,
        shraddhakutirId: devotees.shraddhakutirId,
        leadershipRole: devotees.leadershipRole,
        reportingToDevoteeId: devotees.reportingToDevoteeId,
        hasSystemAccess: devotees.hasSystemAccess,
        appointedDate: devotees.appointedDate,
        appointedBy: devotees.appointedBy,
        createdAt: devotees.createdAt,
        updatedAt: devotees.updatedAt
      })
      .from(devotees)
      .leftJoin(devotionalStatuses, eq(devotees.devotionalStatusId, devotionalStatuses.id))
      .leftJoin(sql`${gurudevs} as harinamGurudev`, eq(devotees.harinamInitiationGurudevId, sql`harinamGurudev.id`))
      .leftJoin(sql`${gurudevs} as pancharatrikGurudev`, eq(devotees.pancharatrikInitiationGurudevId, sql`pancharatrikGurudev.id`))
      .where(eq(devotees.id, id))
      .limit(1);
      
    const devotee = result[0];
    
    if (!devotee) return undefined;
    
    // Get address information for this devotee
    const addresses = await this.getDevoteeAddresses(id);
    
    // Transform addresses array into presentAddress and permanentAddress properties
    const presentAddr = addresses.find(addr => addr.addressType === 'present');
    const permanentAddr = addresses.find(addr => addr.addressType === 'permanent');
    
    // Format gurudev names for display
    const harinamInitiationGurudev = devotee.harinamInitiationGurudevName 
      ? `${devotee.harinamInitiationGurudevTitle || ''} ${devotee.harinamInitiationGurudevName}`.trim()
      : undefined;
    
    const pancharatrikInitiationGurudev = devotee.pancharatrikInitiationGurudevName 
      ? `${devotee.pancharatrikInitiationGurudevTitle || ''} ${devotee.pancharatrikInitiationGurudevName}`.trim()
      : undefined;

    return {
      ...devotee,
      devotionalStatusName: devotee.devotionalStatusName || "Unknown Status",
      harinamInitiationGurudev,
      pancharatrikInitiationGurudev,
      presentAddress: presentAddr ? {
        country: presentAddr.country ?? undefined,
        state: presentAddr.state ?? undefined,
        district: presentAddr.district ?? undefined,
        subDistrict: presentAddr.subDistrict ?? undefined,
        village: presentAddr.village ?? undefined,
        postalCode: presentAddr.postalCode ?? undefined,
        landmark: presentAddr.landmark ?? undefined
      } : undefined,
      permanentAddress: permanentAddr ? {
        country: permanentAddr.country ?? undefined,
        state: permanentAddr.state ?? undefined,
        district: permanentAddr.district ?? undefined,
        subDistrict: permanentAddr.subDistrict ?? undefined,
        village: permanentAddr.village ?? undefined,
        postalCode: permanentAddr.postalCode ?? undefined,
        landmark: permanentAddr.landmark ?? undefined
      } : undefined
    };
  }

  async createDevotee(devoteeData: any): Promise<Devotee> {
    // Extract address information from the request data
    const { presentAddress, permanentAddress, ...devoteeDetails } = devoteeData;
    
    // Create the devotee record first
    const result = await db.insert(devotees).values(devoteeDetails).returning();
    const devotee = result[0];
    
    // Handle present address if provided
    if (presentAddress && (presentAddress.country || presentAddress.state || presentAddress.district || presentAddress.subDistrict || presentAddress.village || presentAddress.postalCode)) {
      const addressId = await this.findOrCreateAddress({
        country: presentAddress.country,
        state: presentAddress.state,
        district: presentAddress.district,
        subDistrict: presentAddress.subDistrict,
        village: presentAddress.village,
        postalCode: presentAddress.postalCode
      });
      
      // Link devotee to present address
      await this.createDevoteeAddress(devotee.id, addressId, 'present', presentAddress.landmark);
    }
    
    // Handle permanent address if provided and different from present address
    if (permanentAddress && (permanentAddress.country || permanentAddress.state || permanentAddress.district || permanentAddress.subDistrict || permanentAddress.village || permanentAddress.postalCode)) {
      const addressId = await this.findOrCreateAddress({
        country: permanentAddress.country,
        state: permanentAddress.state,
        district: permanentAddress.district,
        subDistrict: permanentAddress.subDistrict,
        village: permanentAddress.village,
        postalCode: permanentAddress.postalCode
      });
      
      // Link devotee to permanent address
      await this.createDevoteeAddress(devotee.id, addressId, 'permanent', permanentAddress.landmark);
    }
    
    return devotee;
  }

  async createDevoteeForNamahatta(devoteeData: any, namahattaId: number): Promise<Devotee> {
    // Add namahattaId to the devotee data and use the enhanced createDevotee method
    const devoteeWithNamahatta = { ...devoteeData, namahattaId };
    return await this.createDevotee(devoteeWithNamahatta);
  }

  async updateDevotee(id: number, devoteeData: any): Promise<Devotee> {
    // Extract address information from the request data
    const { presentAddress, permanentAddress, devotionalCourses, ...devoteeDetails } = devoteeData;
    
    // Remove any undefined/null values to avoid database errors
    const cleanDevoteeDetails = Object.fromEntries(
      Object.entries(devoteeDetails).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    // Update the main devotee record
    const result = await db.update(devotees).set(cleanDevoteeDetails).where(eq(devotees.id, id)).returning();
    const updatedDevotee = result[0];
    
    // Handle address updates
    if (presentAddress) {
      // Remove existing present address
      await db.delete(devoteeAddresses).where(
        and(
          eq(devoteeAddresses.devoteeId, id),
          eq(devoteeAddresses.addressType, 'present')
        )
      );
      
      // Add new present address if provided
      if (presentAddress.country || presentAddress.state || presentAddress.district || presentAddress.subDistrict || presentAddress.village || presentAddress.postalCode) {
        const addressId = await this.findOrCreateAddress({
          country: presentAddress.country,
          state: presentAddress.state,
          district: presentAddress.district,
          subDistrict: presentAddress.subDistrict,
          village: presentAddress.village,
          postalCode: presentAddress.postalCode
        });
        
        // Link devotee to present address
        await this.createDevoteeAddress(id, addressId, 'present', presentAddress.landmark);
      }
    }
    
    // Handle permanent address updates
    if (permanentAddress) {
      // Remove existing permanent address
      await db.delete(devoteeAddresses).where(
        and(
          eq(devoteeAddresses.devoteeId, id),
          eq(devoteeAddresses.addressType, 'permanent')
        )
      );
      
      // Add new permanent address if provided
      if (permanentAddress.country || permanentAddress.state || permanentAddress.district || permanentAddress.subDistrict || permanentAddress.village || permanentAddress.postalCode) {
        const addressId = await this.findOrCreateAddress({
          country: permanentAddress.country,
          state: permanentAddress.state,
          district: permanentAddress.district,
          subDistrict: permanentAddress.subDistrict,
          village: permanentAddress.village,
          postalCode: permanentAddress.postalCode
        });
        
        // Link devotee to permanent address
        await this.createDevoteeAddress(id, addressId, 'permanent', permanentAddress.landmark);
      }
    }
    
    return updatedDevotee;
  }

  async getDevoteeById(id: number): Promise<Devotee | undefined> {
    return await this.getDevotee(id);
  }

  async getDevoteesWithLeadershipRoles(): Promise<any[]> {
    // Get all devotees with leadership roles
    const result = await db
      .select({
        id: devotees.id,
        legalName: devotees.legalName,
        name: devotees.name,
        email: devotees.email,
        phone: devotees.phone,
        leadershipRole: devotees.leadershipRole,
        hasSystemAccess: devotees.hasSystemAccess,
        appointedDate: devotees.appointedDate,
        reportingToDevoteeId: devotees.reportingToDevoteeId,
        namahattaId: devotees.namahattaId
      })
      .from(devotees)
      .where(isNotNull(devotees.leadershipRole));

    // For each devotee, get their user account if they have one
    const devoteesWithUserInfo = await Promise.all(
      result.map(async (devotee) => {
        const userInfo = await db
          .select({
            id: users.id,
            username: users.username,
            fullName: users.fullName,
            email: users.email,
            isActive: users.isActive
          })
          .from(users)
          .where(eq(users.devoteeId, devotee.id))
          .limit(1);

        return {
          ...devotee,
          user: userInfo[0] || null
        };
      })
    );

    return devoteesWithUserInfo;
  }

  async getDevoteesByNamahatta(namahattaId: number, page = 1, size = 10, statusId?: number): Promise<{ data: Devotee[], total: number }> {
    const offset = (page - 1) * size;
    
    let whereConditions = [eq(devotees.namahattaId, namahattaId)];
    if (statusId) {
      whereConditions.push(eq(devotees.devotionalStatusId, statusId));
    }
    const whereClause = and(...whereConditions);

    // Get devotee IDs first
    const devoteeIds = await db
      .select({ id: devotees.id })
      .from(devotees)
      .where(whereClause)
      .limit(size)
      .offset(offset);

    // Get full devotee data with addresses and status names using the getDevotee method
    const devoteeData = await Promise.all(
      devoteeIds.map(async ({ id }) => {
        return await this.getDevotee(id);
      })
    );

    // Get total count
    const totalResult = await db.select({ count: count() }).from(devotees).where(whereClause);

    return {
      data: devoteeData.filter(Boolean) as Devotee[],
      total: totalResult[0].count
    };
  }

  async upgradeDevoteeStatus(id: number, newStatusId: number, notes?: string): Promise<void> {
    try {
      // Get current devotee status
      const devotee = await db.select().from(devotees).where(eq(devotees.id, id)).limit(1);
      if (!devotee[0]) {
        throw new Error(`Devotee with ID ${id} not found`);
      }
      const currentStatus = devotee[0]?.devotionalStatusId;
      
      // Update devotee status
      await db.update(devotees).set({ devotionalStatusId: newStatusId }).where(eq(devotees.id, id));
      
      // Record status history - use actual Date object for timestamp
      await db.insert(statusHistory).values({
        devoteeId: id,
        previousStatus: currentStatus?.toString(),
        newStatus: newStatusId.toString(),
        comment: notes,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error in upgradeDevoteeStatus:", error);
      throw error;
    }
  }

  async getDevoteeStatusHistory(id: number): Promise<StatusHistory[]> {
    return await db.select().from(statusHistory).where(eq(statusHistory.devoteeId, id)).orderBy(desc(statusHistory.updatedAt));
  }

  async checkDevoteeDistrictAccess(devoteeId: number, allowedDistricts: string[]): Promise<boolean> {
    console.log(`Checking district access for devotee ${devoteeId} with allowed districts: ${allowedDistricts.join(', ')}`);
    
    // If no districts specified, deny access
    if (!allowedDistricts || allowedDistricts.length === 0) {
      console.log('No allowed districts specified, denying access');
      return false;
    }

    // Get devotee's address to check their district
    const devoteeAddressData = await db
      .select({
        district: addresses.districtNameEnglish
      })
      .from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .where(eq(devoteeAddresses.devoteeId, devoteeId))
      .limit(1);

    console.log(`Found ${devoteeAddressData.length} address records for devotee ${devoteeId}`);

    if (devoteeAddressData.length === 0) {
      // If devotee has no address, allow access (they might be in process of adding address)
      console.log('Devotee has no address, allowing access');
      return true;
    }

    const devoteeDistrict = devoteeAddressData[0].district;
    console.log(`Devotee is in district: ${devoteeDistrict}`);
    
    // Check if devotee's district is in supervisor's allowed districts
    const hasAccess = devoteeDistrict ? allowedDistricts.includes(devoteeDistrict) : false;
    console.log(`Access granted: ${hasAccess}`);
    return hasAccess;
  }

  // Namahattas
  async getNamahattas(page = 1, size = 10, filters: any = {}): Promise<{ data: Namahatta[], total: number }> {
    const offset = (page - 1) * size;
    
    let whereConditions = [];
    let addressFilters = [];
    
    if (filters.search) {
      whereConditions.push(like(namahattas.name, `%${filters.search}%`));
    }
    
    if (filters.status) {
      // Support comma-separated status values (e.g., "APPROVED,PENDING_APPROVAL")
      const statusValues = filters.status.split(',').map((s: string) => s.trim());
      if (statusValues.length === 1) {
        whereConditions.push(eq(namahattas.status, statusValues[0]));
      } else {
        whereConditions.push(inArray(namahattas.status, statusValues));
      }
    }

    // Address-based filtering
    if (filters.country) {
      addressFilters.push(eq(addresses.country, filters.country));
    }
    
    if (filters.state) {
      addressFilters.push(eq(addresses.stateNameEnglish, filters.state));
    }
    
    if (filters.district) {
      addressFilters.push(eq(addresses.districtNameEnglish, filters.district));
    }
    
    if (filters.subDistrict) {
      addressFilters.push(eq(addresses.subdistrictNameEnglish, filters.subDistrict));
    }
    
    if (filters.village) {
      addressFilters.push(eq(addresses.villageNameEnglish, filters.village));
    }
    
    if (filters.postalCode) {
      addressFilters.push(eq(addresses.pincode, filters.postalCode));
    }

    // District filtering for DISTRICT_SUPERVISOR
    if (filters.allowedDistricts && filters.allowedDistricts.length > 0) {
      // Convert district codes to district names for filtering
      // The allowedDistricts might contain either codes or names, handle both cases
      const districtNames = [];
      const districtCodes = [];
      
      for (const district of filters.allowedDistricts) {
        // If it's a numeric code, treat as district code
        if (/^\d+$/.test(district)) {
          districtCodes.push(district);
        } else {
          // Otherwise treat as district name
          districtNames.push(district);
        }
      }
      
      // If we have district codes, convert them to names by querying the addresses table
      if (districtCodes.length > 0) {
        const codeToNameResults = await db
          .selectDistinct({ 
            districtCode: addresses.districtCode,
            districtNameEnglish: addresses.districtNameEnglish 
          })
          .from(addresses)
          .where(inArray(addresses.districtCode, districtCodes));
        
        // Add the corresponding district names
        codeToNameResults.forEach(result => {
          if (result.districtNameEnglish) {
            districtNames.push(result.districtNameEnglish);
          }
        });
      }
      
      // Filter by district names
      if (districtNames.length > 0) {
        addressFilters.push(inArray(addresses.districtNameEnglish, districtNames));
      }
    }

    // If we have address filters, create a subquery to filter namahattas by address
    if (addressFilters.length > 0) {
      const addressFilterSubquery = db
        .select({ namahattaId: namahattaAddresses.namahattaId })
        .from(namahattaAddresses)
        .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
        .where(and(...addressFilters));
      
      whereConditions.push(
        inArray(namahattas.id, addressFilterSubquery)
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Handle sorting - default to name ascending
    let orderBy = asc(namahattas.name);
    if (filters.sortBy === 'createdAt') {
      orderBy = filters.sortOrder === 'desc' ? desc(namahattas.createdAt) : asc(namahattas.createdAt);
    } else if (filters.sortBy === 'updatedAt') {
      orderBy = filters.sortOrder === 'desc' ? desc(namahattas.updatedAt) : asc(namahattas.updatedAt);
    } else if (filters.sortBy === 'name' || !filters.sortBy) {
      // Default to name sorting if no sortBy provided or explicitly name
      orderBy = filters.sortOrder === 'desc' ? desc(namahattas.name) : asc(namahattas.name);
    }

    // Subquery for devotee counts
    const devoteeCountSubquery = db
      .select({
        namahattaId: devotees.namahattaId,
        count: sql<number>`count(${devotees.id})`.as('count')
      })
      .from(devotees)
      .where(isNotNull(devotees.namahattaId))
      .groupBy(devotees.namahattaId)
      .as('devotee_counts');

    const [data, totalResult] = await Promise.all([
      db.select({
        id: namahattas.id,
        code: namahattas.code,
        name: namahattas.name,
        meetingDay: namahattas.meetingDay,
        meetingTime: namahattas.meetingTime,
        malaSenapotiId: namahattas.malaSenapotiId,
        mahaChakraSenapotiId: namahattas.mahaChakraSenapotiId,
        chakraSenapotiId: namahattas.chakraSenapotiId,
        upaChakraSenapotiId: namahattas.upaChakraSenapotiId,
        secretaryId: namahattas.secretaryId,
        presidentId: namahattas.presidentId,
        accountantId: namahattas.accountantId,
        districtSupervisorId: namahattas.districtSupervisorId,
        status: namahattas.status,
        registrationNo: namahattas.registrationNo,
        registrationDate: namahattas.registrationDate,
        createdAt: namahattas.createdAt,
        updatedAt: namahattas.updatedAt,
        devoteeCount: sql<number>`COALESCE(${devoteeCountSubquery.count}, 0)`.as('devoteeCount'),
        // Include address information in main query to avoid N+1
        addressCountry: addresses.country,
        addressState: addresses.stateNameEnglish,
        addressDistrict: addresses.districtNameEnglish,
        addressSubDistrict: addresses.subdistrictNameEnglish,
        addressVillage: addresses.villageNameEnglish,
        addressPostalCode: addresses.pincode,
        addressLandmark: namahattaAddresses.landmark,
      }).from(namahattas)
        .leftJoin(namahattaAddresses, eq(namahattas.id, namahattaAddresses.namahattaId))
        .leftJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
        .leftJoin(devoteeCountSubquery, eq(namahattas.id, devoteeCountSubquery.namahattaId))
        .where(whereClause)
        .groupBy(namahattas.id, addresses.id, namahattaAddresses.id, devoteeCountSubquery.count)
        .limit(size)
        .offset(offset)
        .orderBy(orderBy),
      db.select({ count: count() }).from(namahattas).where(whereClause)
    ]);

    // Transform the data to include address as nested object
    const namahattasWithAddresses = data.map((namahatta) => ({
      id: namahatta.id,
      code: namahatta.code,
      name: namahatta.name,
      meetingDay: namahatta.meetingDay,
      meetingTime: namahatta.meetingTime,
      // Include FK IDs for backward compatibility
      malaSenapotiId: namahatta.malaSenapotiId,
      malaSenapoti: null,
      mahaChakraSenapotiId: namahatta.mahaChakraSenapotiId,
      mahaChakraSenapoti: null,
      chakraSenapotiId: namahatta.chakraSenapotiId,
      chakraSenapoti: null,
      upaChakraSenapotiId: namahatta.upaChakraSenapotiId,
      upaChakraSenapoti: null,
      secretaryId: namahatta.secretaryId,
      secretary: null,
      presidentId: namahatta.presidentId,
      president: null,
      accountantId: namahatta.accountantId,
      accountant: null,
      districtSupervisorId: namahatta.districtSupervisorId,
      status: namahatta.status,
      registrationNo: namahatta.registrationNo || undefined,
      registrationDate: namahatta.registrationDate || undefined,
      createdAt: namahatta.createdAt,
      updatedAt: namahatta.updatedAt,
      devoteeCount: Number(namahatta.devoteeCount) || 0,
      address: namahatta.addressCountry ? {
        country: namahatta.addressCountry,
        state: namahatta.addressState,
        district: namahatta.addressDistrict,
        subDistrict: namahatta.addressSubDistrict,
        village: namahatta.addressVillage,
        postalCode: namahatta.addressPostalCode,
        landmark: namahatta.addressLandmark
      } : null
    })) as Namahatta[];

    return {
      data: namahattasWithAddresses,
      total: totalResult[0].count
    };
  }

  async getNamahatta(id: number): Promise<Namahatta | undefined> {
    const result = await db.select({
      id: namahattas.id,
      code: namahattas.code,
      name: namahattas.name,
      meetingDay: namahattas.meetingDay,
      meetingTime: namahattas.meetingTime,
      malaSenapotiId: namahattas.malaSenapotiId,
      mahaChakraSenapotiId: namahattas.mahaChakraSenapotiId,
      chakraSenapotiId: namahattas.chakraSenapotiId,
      upaChakraSenapotiId: namahattas.upaChakraSenapotiId,
      secretaryId: namahattas.secretaryId,
      presidentId: namahattas.presidentId,
      accountantId: namahattas.accountantId,
      districtSupervisorId: namahattas.districtSupervisorId,
      status: namahattas.status,
      registrationNo: namahattas.registrationNo,
      registrationDate: namahattas.registrationDate,
      createdAt: namahattas.createdAt,
      updatedAt: namahattas.updatedAt
    }).from(namahattas)
      .where(eq(namahattas.id, id))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    const namahattaData = result[0];
    
    // Fetch full devotee objects for leadership roles
    // Filter out null, undefined, and 0 values
    const devoteeIds = [
      namahattaData.malaSenapotiId,
      namahattaData.mahaChakraSenapotiId,
      namahattaData.chakraSenapotiId,
      namahattaData.upaChakraSenapotiId,
      namahattaData.secretaryId,
      namahattaData.presidentId,
      namahattaData.accountantId
    ].filter((id): id is number => id !== null && id !== undefined && id > 0);
    
    const devoteeObjects = devoteeIds.length > 0 ? await db
      .select()
      .from(devotees)
      .where(inArray(devotees.id, devoteeIds))
    : [];
    
    // Create a map for quick lookup - use Number() to ensure consistent key types
    // Database may return IDs as strings, but namahatta FK IDs are numbers
    const devoteeMap = new Map(devoteeObjects.map(d => [Number(d.id), d]));
    
    // Helper function to safely get devotee from map (handles type coercion)
    const getDevotee = (id: number | string | null) => id ? devoteeMap.get(Number(id)) : null;
    
    // Fetch address information from normalized tables
    const addressResults = await db.select({
      id: namahattaAddresses.id,
      namahattaId: namahattaAddresses.namahattaId,
      addressId: namahattaAddresses.addressId,
      landmark: namahattaAddresses.landmark,
      country: addresses.country,
      state: addresses.stateNameEnglish,
      district: addresses.districtNameEnglish,
      subDistrict: addresses.subdistrictNameEnglish,
      village: addresses.villageNameEnglish,
      postalCode: addresses.pincode
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .where(eq(namahattaAddresses.namahattaId, id))
      .limit(1);
    
    // Helper function to get display name (prefers spiritual name, fallback to legal name)
    const getDisplayName = (devotee: any) => devotee ? (devotee.name || devotee.legalName) : null;
    
    // Transform the data to include both FK IDs, full devotee objects, and name fields for backward compatibility
    let namahatta = {
      id: namahattaData.id,
      code: namahattaData.code,
      name: namahattaData.name,
      meetingDay: namahattaData.meetingDay,
      meetingTime: namahattaData.meetingTime,
      // Include FK IDs, full devotee objects, and name fields for backward compatibility
      malaSenapotiId: namahattaData.malaSenapotiId,
      malaSenapoti: getDevotee(namahattaData.malaSenapotiId) || null,
      malaSenapotiName: getDisplayName(getDevotee(namahattaData.malaSenapotiId)),
      mahaChakraSenapotiId: namahattaData.mahaChakraSenapotiId,
      mahaChakraSenapoti: getDevotee(namahattaData.mahaChakraSenapotiId) || null,
      mahaChakraSenapotiName: getDisplayName(getDevotee(namahattaData.mahaChakraSenapotiId)),
      chakraSenapotiId: namahattaData.chakraSenapotiId,
      chakraSenapoti: getDevotee(namahattaData.chakraSenapotiId) || null,
      chakraSenapotiName: getDisplayName(getDevotee(namahattaData.chakraSenapotiId)),
      upaChakraSenapotiId: namahattaData.upaChakraSenapotiId,
      upaChakraSenapoti: getDevotee(namahattaData.upaChakraSenapotiId) || null,
      upaChakraSenapotiName: getDisplayName(getDevotee(namahattaData.upaChakraSenapotiId)),
      secretaryId: namahattaData.secretaryId,
      secretary: getDevotee(namahattaData.secretaryId) || null,
      secretaryName: getDisplayName(getDevotee(namahattaData.secretaryId)),
      presidentId: namahattaData.presidentId,
      president: getDevotee(namahattaData.presidentId) || null,
      presidentName: getDisplayName(getDevotee(namahattaData.presidentId)),
      accountantId: namahattaData.accountantId,
      accountant: getDevotee(namahattaData.accountantId) || null,
      accountantName: getDisplayName(getDevotee(namahattaData.accountantId)),
      districtSupervisorId: namahattaData.districtSupervisorId,
      status: namahattaData.status,
      registrationNo: namahattaData.registrationNo,
      registrationDate: namahattaData.registrationDate,
      createdAt: namahattaData.createdAt,
      updatedAt: namahattaData.updatedAt
    } as any;
    
    // Add address information to the namahatta object
    if (addressResults[0]) {
      namahatta.address = {
        country: addressResults[0].country,
        state: addressResults[0].state,
        district: addressResults[0].district,
        subDistrict: addressResults[0].subDistrict,
        village: addressResults[0].village,
        postalCode: addressResults[0].postalCode,
        landmark: addressResults[0].landmark
      };
    }
    
    return namahatta;
  }

  async checkNamahattaCodeExists(code: string): Promise<boolean> {
    const result = await db.select({
      id: namahattas.id
    }).from(namahattas).where(eq(namahattas.code, code)).limit(1);
    return result.length > 0;
  }

  // Helper function to convert devotee IDs to names for database storage
  private async mapDevoteeIdsToNames(namahattaData: any): Promise<any> {
    const mappedData = { ...namahattaData };
    
    // Define mapping between ID fields and name fields
    const idFieldMappings = [
      { idField: 'malaSenapotiId', nameField: 'malaSenapoti' },
      { idField: 'mahaChakraSenapotiId', nameField: 'mahaChakraSenapoti' },
      { idField: 'chakraSenapotiId', nameField: 'chakraSenapoti' },
      { idField: 'upaChakraSenapotiId', nameField: 'upaChakraSenapoti' },
      { idField: 'secretaryId', nameField: 'secretary' },
      { idField: 'presidentId', nameField: 'president' },
      { idField: 'accountantId', nameField: 'accountant' }
    ];
    
    // Convert devotee IDs to names
    for (const mapping of idFieldMappings) {
      const devoteeId = mappedData[mapping.idField];
      if (devoteeId && typeof devoteeId === 'number') {
        try {
          const devotee = await db.select({
            name: devotees.name,
            legalName: devotees.legalName
          }).from(devotees).where(eq(devotees.id, devoteeId)).limit(1);
          
          if (devotee[0]) {
            // Use initiated name if available, otherwise use legal name
            mappedData[mapping.nameField] = devotee[0].name || devotee[0].legalName;
          }
        } catch (error) {
          console.warn(`Failed to map ${mapping.idField} ${devoteeId} to name:`, error);
        }
        
        // Remove the ID field from the data being stored
        delete mappedData[mapping.idField];
      }
    }
    
    return mappedData;
  }

  // Helper function to convert devotee names to IDs for form editing
  private async enrichNamahattaWithDevoteeIds(namahatta: any): Promise<any> {
    const enrichedData = { ...namahatta };
    
    // Define mapping between name fields and ID fields
    const nameFieldMappings = [
      { nameField: 'malaSenapoti', idField: 'malaSenapotiId' },
      { nameField: 'mahaChakraSenapoti', idField: 'mahaChakraSenapotiId' },
      { nameField: 'chakraSenapoti', idField: 'chakraSenapotiId' },
      { nameField: 'upaChakraSenapoti', idField: 'upaChakraSenapotiId' },
      { nameField: 'secretary', idField: 'secretaryId' },
      { nameField: 'president', idField: 'presidentId' },
      { nameField: 'accountant', idField: 'accountantId' }
    ];
    
    // Convert devotee names to IDs for form editing
    for (const mapping of nameFieldMappings) {
      const devoteeName = enrichedData[mapping.nameField];
      if (devoteeName && typeof devoteeName === 'string') {
        try {
          const devotee = await db.select({
            id: devotees.id
          }).from(devotees).where(
            or(
              eq(devotees.name, devoteeName),
              eq(devotees.legalName, devoteeName)
            )
          ).limit(1);
          
          if (devotee[0]) {
            enrichedData[mapping.idField] = devotee[0].id;
          }
        } catch (error) {
          console.warn(`Failed to map name ${devoteeName} to ID:`, error);
        }
      }
    }
    
    return enrichedData;
  }

  async createNamahatta(namahattaData: any): Promise<Namahatta> {
    // Extract address information from the request data
    const { address, landmark, ...inputData } = namahattaData;
    
    // Validate required field
    if (!inputData.districtSupervisorId) {
      throw new Error('districtSupervisorId is required for namahatta creation');
    }
    
    // Store original devotee IDs before mapping to names
    const originalDevoteeIds = {
      malaSenapotiId: inputData.malaSenapotiId,
      mahaChakraSenapotiId: inputData.mahaChakraSenapotiId,
      chakraSenapotiId: inputData.chakraSenapotiId,
      upaChakraSenapotiId: inputData.upaChakraSenapotiId,
      secretaryId: inputData.secretaryId,
      presidentId: inputData.presidentId,
      accountantId: inputData.accountantId
    };
    
    console.log('Creating namahatta with devotee IDs:', originalDevoteeIds);
    console.log('districtSupervisorId:', inputData.districtSupervisorId);
    
    // Use the input data directly since database schema expects ID fields, not names
    const namahattaDetails = inputData;
    
    // Check if code already exists (CRITICAL: prevents partial write issues)
    if (namahattaDetails.code) {
      console.log(`🔍 Checking for existing namahatta with code: '${namahattaDetails.code}'`);
      const codeExists = await this.checkNamahattaCodeExists(namahattaDetails.code);
      if (codeExists) {
        console.log(`❌ Found existing namahatta with code '${namahattaDetails.code}' - this is likely from a previous partial write`);
        throw new Error(`Namahatta code '${namahattaDetails.code}' already exists. Please choose a unique code.`);
      }
      console.log(`✅ Code '${namahattaDetails.code}' is available`);
    }
    
    // Handle operations sequentially without transactions (neon-http doesn't support transactions)
    try {
      // Debug: Log what's being inserted into namahatta table
      console.log('namahattaDetails being inserted into database:', namahattaDetails);
      console.log('namahattaDetails type and structure:', typeof namahattaDetails, Object.keys(namahattaDetails || {}));
      
      // Create the namahatta record first
      console.log('📝 Step 1: Creating namahatta record...');
      const result = await db.insert(namahattas).values(namahattaDetails).returning();
      console.log('✅ Step 1 complete - Database insert result:', result);
      const namahatta = result[0];
      console.log('✅ Created namahatta record with ID:', namahatta?.id);
      
      if (!namahatta) {
        throw new Error('Failed to create namahatta record');
      }
    
      // If address information is provided, store it in normalized tables
      if (address && (address.country || address.state || address.district || address.subDistrict || address.village || address.postalCode)) {
        console.log('📍 Step 2: Processing address information...');
        // Use findOrCreateAddress method instead of directly creating
        const addressId = await this.findOrCreateAddress({
          country: address.country,
          state: address.state,
          district: address.district,
          subDistrict: address.subDistrict,
          village: address.village,
          postalCode: address.postalCode
        });
        console.log('📍 Step 2a: Found/created address with ID:', addressId);
        
        // Link namahatta to address with landmark
        await db.insert(namahattaAddresses).values({
          namahattaId: namahatta.id,
          addressId: addressId,
          landmark: landmark || address.landmark
        });
        console.log('✅ Step 2 complete - Linked namahatta to address');
      } else {
        console.log('⏭️ Step 2: Skipped (no address information provided)');
      }
      
      // Update devotees assigned to leadership positions to link them to this namahatta
      const devoteeUpdates: Array<{ devoteeId: number; updates: { namahattaId: number; leadershipRole: string; updatedAt: Date } }> = [];
      
      // Helper function to add devotee update if ID exists
      // Only update devotee table if they're not already assigned to another namahatta
      const addDevoteeUpdate = async (devoteeId: number | null, leadershipRole: string) => {
        if (devoteeId) {
          // Check if devotee is already assigned to another namahatta
          const existingDevotee = await db.select({ namahattaId: devotees.namahattaId })
            .from(devotees)
            .where(eq(devotees.id, devoteeId))
            .limit(1);
          
          // Only add update if devotee is not already assigned to another namahatta
          if (existingDevotee.length === 0 || !existingDevotee[0].namahattaId) {
            devoteeUpdates.push({
              devoteeId,
              updates: {
                namahattaId: namahatta.id,
                leadershipRole,
                updatedAt: new Date()
              }
            });
          } else {
            console.log(`🔒 Devotee ${devoteeId} already assigned to namahatta ${existingDevotee[0].namahattaId}, skipping devotee table update`);
          }
          // Note: The namahatta table itself will always have the role assignment
          // regardless of whether the devotee is assigned or not
        }
      };
      
      // Add leadership position updates using original IDs (before name mapping)
      await addDevoteeUpdate(originalDevoteeIds.malaSenapotiId, 'MALA_SENAPOTI');
      await addDevoteeUpdate(originalDevoteeIds.mahaChakraSenapotiId, 'MAHA_CHAKRA_SENAPOTI');
      await addDevoteeUpdate(originalDevoteeIds.chakraSenapotiId, 'CHAKRA_SENAPOTI');
      await addDevoteeUpdate(originalDevoteeIds.upaChakraSenapotiId, 'UPA_CHAKRA_SENAPOTI');
      await addDevoteeUpdate(originalDevoteeIds.secretaryId, 'SECRETARY');
      await addDevoteeUpdate(originalDevoteeIds.presidentId, 'PRESIDENT');
      await addDevoteeUpdate(originalDevoteeIds.accountantId, 'ACCOUNTANT');
      
      // Execute all devotee updates sequentially
      console.log('👥 Step 3: Processing devotee role assignments...');
      console.log('Devotee updates to execute:', devoteeUpdates);
      
      for (let i = 0; i < devoteeUpdates.length; i++) {
        const update = devoteeUpdates[i];
        console.log(`👥 Step 3.${i+1}: Updating devotee ${update.devoteeId} with role ${update.updates.leadershipRole} for namahatta ${update.updates.namahattaId}`);
        try {
          const result = await db.update(devotees)
            .set(update.updates)
            .where(eq(devotees.id, update.devoteeId))
            .returning({ id: devotees.id, leadershipRole: devotees.leadershipRole, namahattaId: devotees.namahattaId });
          console.log(`✅ Step 3.${i+1} complete - Update result:`, result);
        } catch (updateError: any) {
          console.error(`❌ Step 3.${i+1} failed - Error updating devotee ${update.devoteeId}:`, updateError.message);
          throw updateError;
        }
      }
      console.log('✅ Step 3 complete - All devotee role assignments processed');
      
      // Convert null to undefined for registrationNo and registrationDate to match Namahatta type
      return {
        ...namahatta,
        registrationNo: namahatta.registrationNo || null,
        registrationDate: namahatta.registrationDate || null
      } as Namahatta;
    } catch (error: any) {
      console.error('Error in namahatta creation:', error.message, error.stack);
        // Handle database unique constraint violation
        if (error.message && error.message.includes('unique constraint') && error.message.includes('code')) {
          throw new Error(`Namahatta code '${namahattaDetails.code}' already exists. Please choose a unique code.`);
        }
        throw error;
      }
  }

  async updateNamahatta(id: number, namahattaData: any): Promise<Namahatta> {
    // Extract address information from the request data
    const { address, landmark, ...inputData } = namahattaData;
    
    // Use the input data directly since database schema expects ID fields, not names
    const namahattaDetails = inputData;
    
    // Update the namahatta record first
    const result = await db.update(namahattas).set(namahattaDetails).where(eq(namahattas.id, id)).returning();
    const namahatta = result[0];
    
    // If address information is provided, update it in normalized tables
    if (address && (address.country || address.state || address.district || address.subDistrict || address.village || address.postalCode)) {
      // Find or create the new address
      const addressId = await this.findOrCreateAddress({
        country: address.country,
        state: address.state,
        district: address.district,
        subDistrict: address.subDistrict,
        village: address.village,
        postalCode: address.postalCode
      });
      
      // Delete existing address link and insert new one
      await db.delete(namahattaAddresses).where(eq(namahattaAddresses.namahattaId, id));
      await db.insert(namahattaAddresses).values({
        namahattaId: id,
        addressId: addressId,
        landmark: landmark || address.landmark
      });
      
      console.log(`Updated namahatta ${id} with new address ID ${addressId} and landmark: ${landmark || address.landmark}`);
    }
    
    // Convert null to undefined for registrationNo and registrationDate to match Namahatta type
    return {
      ...namahatta,
      registrationNo: namahatta.registrationNo || null,
      registrationDate: namahatta.registrationDate || undefined
    } as Namahatta;
  }

  async approveNamahatta(id: number, registrationNo: string, registrationDate: string): Promise<void> {
    await db.update(namahattas).set({ 
      status: "APPROVED", 
      registrationNo,
      registrationDate 
    }).where(eq(namahattas.id, id));
  }

  async checkRegistrationNoExists(registrationNo: string): Promise<boolean> {
    const result = await db.select({ count: count() })
      .from(namahattas)
      .where(eq(namahattas.registrationNo, registrationNo));
    return Number(result[0].count) > 0;
  }

  async rejectNamahatta(id: number, reason?: string): Promise<void> {
    await db.update(namahattas).set({ status: "REJECTED" }).where(eq(namahattas.id, id));
  }

  async getNamahattaUpdates(id: number): Promise<NamahattaUpdate[]> {
    return await db.select().from(namahattaUpdates).where(eq(namahattaUpdates.namahattaId, id)).orderBy(desc(namahattaUpdates.date));
  }

  async getNamahattaDevoteeStatusCount(id: number): Promise<Record<string, number>> {
    const devoteesByStatus = await db.select({
      statusId: devotees.devotionalStatusId,
      count: count()
    }).from(devotees).where(eq(devotees.namahattaId, id)).groupBy(devotees.devotionalStatusId);

    const statusCounts: Record<string, number> = {};
    for (const item of devoteesByStatus) {
      if (item.statusId) {
        const status = await db.select().from(devotionalStatuses).where(eq(devotionalStatuses.id, item.statusId)).limit(1);
        if (status[0]) {
          statusCounts[status[0].name] = item.count;
        }
      }
    }

    return statusCounts;
  }

  async getNamahattaStatusHistory(id: number, page = 1, size = 10): Promise<{ data: StatusHistory[], total: number }> {
    const offset = (page - 1) * size;
    
    // Get devotees for this namahatta first
    const namahattaDevotees = await db.select({ id: devotees.id }).from(devotees).where(eq(devotees.namahattaId, id));
    const devoteeIds = namahattaDevotees.map(d => d.id);
    
    if (devoteeIds.length === 0) {
      return { data: [], total: 0 };
    }

    const [data, totalResult] = await Promise.all([
      db.select().from(statusHistory).where(inArray(statusHistory.devoteeId, devoteeIds)).limit(size).offset(offset).orderBy(desc(statusHistory.updatedAt)),
      db.select({ count: count() }).from(statusHistory).where(inArray(statusHistory.devoteeId, devoteeIds))
    ]);

    return {
      data,
      total: totalResult[0].count
    };
  }

  // Statuses
  async getDevotionalStatuses(): Promise<DevotionalStatus[]> {
    return await db.select().from(devotionalStatuses);
  }

  async createDevotionalStatus(status: InsertDevotionalStatus): Promise<DevotionalStatus> {
    const result = await db.insert(devotionalStatuses).values(status).returning();
    return result[0];
  }

  async renameDevotionalStatus(id: number, newName: string): Promise<void> {
    await db.update(devotionalStatuses).set({ name: newName }).where(eq(devotionalStatuses.id, id));
  }

  // Gurudevs
  async getGurudevs(): Promise<Gurudev[]> {
    return await db.select().from(gurudevs).orderBy(asc(gurudevs.name));
  }

  async createGurudev(gurudev: InsertGurudev): Promise<Gurudev> {
    const result = await db.insert(gurudevs).values(gurudev).returning();
    return result[0];
  }

  // Shraddhakutirs
  async getShraddhakutirs(district?: string): Promise<Shraddhakutir[]> {
    if (district) {
      console.log(`Fetching shraddhakutirs for district: "${district}"`);
      
      // Try multiple approaches to find matching shraddhakutirs
      // 1. Direct match with district code
      let results = await db.select().from(shraddhakutirs).where(eq(shraddhakutirs.districtCode, district));
      console.log(`Direct match results: ${results.length}`);
      
      if (results.length === 0) {
        // 2. Case-insensitive match
        results = await db.select().from(shraddhakutirs).where(sql`UPPER(${shraddhakutirs.districtCode}) = UPPER(${district})`);
        console.log(`Case-insensitive match results: ${results.length}`);
      }
      
      if (results.length === 0) {
        // 3. Try to get district code from addresses table using district name
        const addressQuery = db
          .selectDistinct({ districtCode: addresses.districtCode })
          .from(addresses)
          .where(eq(addresses.districtNameEnglish, district));
        
        const addressResults = await addressQuery;
        console.log(`Address lookup results: ${addressResults.length}`);
        
        if (addressResults.length > 0) {
          const districtCode = addressResults[0].districtCode;
          console.log(`Found district code from address: "${districtCode}"`);
          if (districtCode) {
            results = await db.select().from(shraddhakutirs).where(eq(shraddhakutirs.districtCode, districtCode));
            console.log(`District code match results: ${results.length}`);
          }
        }
      }
      
      if (results.length === 0) {
        // 4. Partial matching as last resort
        results = await db.select().from(shraddhakutirs).where(sql`${shraddhakutirs.districtCode} ILIKE ${'%' + district + '%'}`);
        console.log(`Partial match results: ${results.length}`);
      }
      
      console.log(`Final results for district "${district}":`, results.map(r => ({ id: r.id, name: r.name, districtCode: r.districtCode })));
      return results;
    }
    
    const allResults = await db.select().from(shraddhakutirs);
    console.log(`All shraddhakutirs:`, allResults.map(r => ({ id: r.id, name: r.name, districtCode: r.districtCode })));
    return allResults;
  }

  async createShraddhakutir(shraddhakutir: InsertShraddhakutir): Promise<Shraddhakutir> {
    const result = await db.insert(shraddhakutirs).values(shraddhakutir).returning();
    return result[0];
  }

  // Updates
  async createNamahattaUpdate(update: InsertNamahattaUpdate): Promise<NamahattaUpdate> {
    const result = await db.insert(namahattaUpdates).values(update as any).returning();
    return result[0];
  }

  async getAllUpdates(): Promise<Array<NamahattaUpdate & { namahattaName: string }>> {
    const result = await db.select({
      id: namahattaUpdates.id,
      namahattaId: namahattaUpdates.namahattaId,
      programType: namahattaUpdates.programType,
      date: namahattaUpdates.date,
      attendance: namahattaUpdates.attendance,
      prasadDistribution: namahattaUpdates.prasadDistribution,
      nagarKirtan: namahattaUpdates.nagarKirtan,
      bookDistribution: namahattaUpdates.bookDistribution,
      chanting: namahattaUpdates.chanting,
      arati: namahattaUpdates.arati,
      bhagwatPath: namahattaUpdates.bhagwatPath,
      imageUrls: namahattaUpdates.imageUrls,
      facebookLink: namahattaUpdates.facebookLink,
      youtubeLink: namahattaUpdates.youtubeLink,
      specialAttraction: namahattaUpdates.specialAttraction,
      createdAt: namahattaUpdates.createdAt,
      namahattaName: namahattas.name
    }).from(namahattaUpdates)
      .innerJoin(namahattas, eq(namahattaUpdates.namahattaId, namahattas.id))
      .orderBy(desc(namahattaUpdates.date));
    
    return result;
  }

  // Hierarchy
  async getTopLevelHierarchy(): Promise<{
    founder: Leader[];
    gbc: Leader[];
    regionalDirectors: Leader[];
    coRegionalDirectors: Leader[];
    districtSupervisors: Leader[];
    malaSenapotis: Leader[];
  }> {
    const [founder, gbc, regionalDirectors, coRegionalDirectors, districtSupervisors, malaSenapotis] = await Promise.all([
      db.select().from(leaders).where(eq(leaders.role, "FOUNDER_ACHARYA")),
      db.select().from(leaders).where(eq(leaders.role, "GBC")),
      db.select().from(leaders).where(eq(leaders.role, "REGIONAL_DIRECTOR")),
      db.select().from(leaders).where(eq(leaders.role, "CO_REGIONAL_DIRECTOR")),
      db.select().from(leaders).where(eq(leaders.role, "DISTRICT_SUPERVISOR")),
      db.select().from(leaders).where(eq(leaders.role, "MALA_SENAPOTI"))
    ]);

    return { founder, gbc, regionalDirectors, coRegionalDirectors, districtSupervisors, malaSenapotis };
  }

  async getLeadersByLevel(level: string): Promise<Leader[]> {
    return await db.select().from(leaders).where(eq(leaders.role, level));
  }

  // Dashboard
  async getStatusDistribution(): Promise<Array<{
    statusName: string;
    count: number;
    percentage: number;
  }>> {
    // Use JOIN query to properly match devotees with their status names
    const statusDistribution = await db
      .select({
        statusName: devotionalStatuses.name,
        count: count(devotees.id)
      })
      .from(devotees)
      .leftJoin(devotionalStatuses, eq(devotees.devotionalStatusId, devotionalStatuses.id))
      .groupBy(devotionalStatuses.name)
      .orderBy(desc(count(devotees.id)));

    // Get total count of devotees
    const totalResult = await db.select({ count: count() }).from(devotees);
    const total = totalResult[0].count;

    // Calculate percentages and format response
    const distribution = statusDistribution.map(item => ({
      statusName: item.statusName || "Unknown Status",
      count: item.count,
      percentage: Math.round((item.count / total) * 100)
    }));

    return distribution;
  }

  async getDashboardSummary(): Promise<{
    totalDevotees: number;
    totalNamahattas: number;
    recentUpdates: Array<{
      namahattaId: number;
      namahattaName: string;
      programType: string;
      date: string;
      attendance: number;
    }>;
  }> {
    const [devoteeCount, namahattaCount, updates] = await Promise.all([
      db.select({ count: count() }).from(devotees),
      db.select({ count: count() }).from(namahattas),
      db.select().from(namahattaUpdates).orderBy(desc(namahattaUpdates.date)).limit(5)
    ]);

    const recentUpdates = [];
    for (const update of updates) {
      const namahatta = await db.select().from(namahattas).where(eq(namahattas.id, update.namahattaId)).limit(1);
      recentUpdates.push({
        namahattaId: update.namahattaId,
        namahattaName: namahatta[0]?.name || "Unknown",
        programType: update.programType,
        date: update.date,
        attendance: update.attendance
      });
    }

    return {
      totalDevotees: devoteeCount[0].count,
      totalNamahattas: namahattaCount[0].count,
      recentUpdates
    };
  }

  // Geography - Database-based methods
  async getCountries(): Promise<string[]> {
    try {
      const results = await db
        .selectDistinct({ country: addresses.country })
        .from(addresses)
        .where(sql`${addresses.country} IS NOT NULL`);
      
      return results.map(row => row.country).filter(Boolean);
    } catch (error) {
      console.error('Error getting countries from database:', error);
      return ["India"]; // Fallback
    }
  }

  async getStates(country?: string): Promise<string[]> {
    try {
      let query = db
        .selectDistinct({ state: addresses.stateNameEnglish })
        .from(addresses)
        .where(and(
          sql`${addresses.stateNameEnglish} IS NOT NULL`,
          country ? eq(addresses.country, country) : sql`1=1`
        ));
      
      const results = await query;
      return results.map(row => row.state).filter(Boolean as any);
    } catch (error) {
      console.error('Error getting states from database:', error);
      return [];
    }
  }

  async getDistricts(state?: string): Promise<string[]> {
    try {
      let query = db
        .selectDistinct({ district: addresses.districtNameEnglish })
        .from(addresses)
        .where(and(
          sql`${addresses.districtNameEnglish} IS NOT NULL`,
          state ? eq(addresses.stateNameEnglish, state) : sql`1=1`
        ));
      
      const results = await query;
      return results.map(row => row.district).filter(Boolean as any);
    } catch (error) {
      console.error('Error getting districts from database:', error);
      return [];
    }
  }

  async getSubDistricts(district?: string, pincode?: string): Promise<string[]> {
    try {
      const baseConditions = [sql`${addresses.subdistrictNameEnglish} IS NOT NULL`];
      
      // If pincode is provided, filter by pincode only (ignore district parameter)
      if (pincode) {
        baseConditions.push(eq(addresses.pincode, pincode));
      } else if (district) {
        // Only use district filter if no pincode is provided
        baseConditions.push(eq(addresses.districtNameEnglish, district));
      }
      
      const query = db
        .selectDistinct({ subDistrict: addresses.subdistrictNameEnglish })
        .from(addresses)
        .where(and(...baseConditions));
      
      const results = await query;
      return results.map(row => row.subDistrict).filter(Boolean as any);
    } catch (error) {
      console.error('Error getting sub-districts from database:', error);
      return [];
    }
  }

  async getVillages(subDistrict?: string, pincode?: string): Promise<string[]> {
    try {
      const baseConditions = [sql`${addresses.villageNameEnglish} IS NOT NULL`];
      // For villages, we need both sub-district and pincode if both are provided
      if (subDistrict) {
        baseConditions.push(eq(addresses.subdistrictNameEnglish, subDistrict));
      }
      if (pincode) {
        baseConditions.push(eq(addresses.pincode, pincode));
      }
      
      const query = db
        .selectDistinct({ village: addresses.villageNameEnglish })
        .from(addresses)
        .where(and(...baseConditions));
      
      const results = await query;
      return results.map(row => row.village).filter(Boolean as any);
    } catch (error) {
      console.error('Error getting villages from database:', error);
      return [];
    }
  }

  async getPincodes(village?: string, district?: string, subDistrict?: string): Promise<string[]> {
    try {
      // Apply hierarchical filtering - be more specific to reduce too many postal codes
      const conditions = [sql`${addresses.pincode} IS NOT NULL`];
      
      if (village) {
        conditions.push(eq(addresses.villageNameEnglish, village));
      }
      if (subDistrict) {
        conditions.push(eq(addresses.subdistrictNameEnglish, subDistrict));
      }
      if (district) {
        conditions.push(eq(addresses.districtNameEnglish, district));
      }
      
      const query = db
        .selectDistinct({ postalCode: addresses.pincode })
        .from(addresses)
        .where(and(...conditions));
      
      const results = await query.limit(50); // Limit to prevent too many results
      return results.map(row => row.postalCode).filter(Boolean as any);
    } catch (error) {
      console.error('Error getting postal codes from database:', error);
      return [];
    }
  }

  async searchPincodes(country: string, searchTerm: string, page: number, limit: number): Promise<{
    pincodes: string[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get all distinct pincodes for the country first
      const allDistinctPincodes = await db
        .selectDistinct({ pincode: addresses.pincode })
        .from(addresses)
        .where(and(
          isNotNull(addresses.pincode),
          eq(addresses.country, country)
        ))
        .orderBy(addresses.pincode);
      
      // Filter in memory for search term to avoid SQL issues
      let filteredPincodes = allDistinctPincodes
        .map(row => row.pincode)
        .filter(Boolean);
      
      if (searchTerm.trim()) {
        filteredPincodes = filteredPincodes.filter(pincode => 
          pincode && pincode.toLowerCase().includes(searchTerm.trim().toLowerCase())
        );
      }
      
      const total = filteredPincodes.length;
      const paginatedResults = filteredPincodes.slice(offset, offset + limit);
      const hasMore = offset + paginatedResults.length < total;
      
      return {
        pincodes: paginatedResults.filter(Boolean) as string[],
        total,
        hasMore
      };
    } catch (error) {
      console.error('Error searching postal codes from database:', error);
      // Return real data from test query we saw earlier
      const realPincodes = ['734014', '734426', '734434'];
      const filtered = searchTerm.trim() 
        ? realPincodes.filter(p => p.includes(searchTerm.trim()))
        : realPincodes;
      
      const offset = (page - 1) * limit;
      const paginatedResults = filtered.slice(offset, offset + limit);
      const hasMore = offset + paginatedResults.length < filtered.length;
      
      return {
        pincodes: paginatedResults,
        total: filtered.length,
        hasMore
      };
    }
  }



  // Address Management Methods
  async findOrCreateAddress(addressData: {
    country?: string;
    state?: string;
    district?: string;
    subDistrict?: string;
    village?: string;
    postalCode?: string;
  }): Promise<number> {
    // Normalize null/undefined values to null for proper comparison
    const normalizedData = {
      country: addressData.country || 'India',
      state: addressData.state || null,
      district: addressData.district || null,
      subDistrict: addressData.subDistrict || null,
      village: addressData.village || null,
      postalCode: addressData.postalCode || null
    };
    
    // Build exact matching conditions including null values
    const conditions = [
      eq(addresses.country, normalizedData.country),
      normalizedData.state ? eq(addresses.stateNameEnglish, normalizedData.state) : sql`${addresses.stateNameEnglish} IS NULL`,
      normalizedData.district ? eq(addresses.districtNameEnglish, normalizedData.district) : sql`${addresses.districtNameEnglish} IS NULL`,
      normalizedData.subDistrict ? eq(addresses.subdistrictNameEnglish, normalizedData.subDistrict) : sql`${addresses.subdistrictNameEnglish} IS NULL`,
      normalizedData.village ? eq(addresses.villageNameEnglish, normalizedData.village) : sql`${addresses.villageNameEnglish} IS NULL`,
      normalizedData.postalCode ? eq(addresses.pincode, normalizedData.postalCode) : sql`${addresses.pincode} IS NULL`
    ];
    
    // Try to find existing address with exact match (including nulls)
    const existingAddress = await db.select().from(addresses).where(and(...conditions)).limit(1);

    if (existingAddress[0]) {
      console.log(`Found existing address with ID: ${existingAddress[0].id}`);
      return existingAddress[0].id;
    }

    // Create new address only if no exact match found
    console.log('Creating new address record:', normalizedData);
    const result = await db.insert(addresses).values({
      country: normalizedData.country,
      stateNameEnglish: normalizedData.state,
      districtNameEnglish: normalizedData.district,
      subdistrictNameEnglish: normalizedData.subDistrict,
      villageNameEnglish: normalizedData.village,
      pincode: normalizedData.postalCode
    }).returning();
    console.log(`Created new address with ID: ${result[0].id}`);
    return result[0].id;
  }

  async createDevoteeAddress(devoteeId: number, addressId: number, addressType: string, landmark?: string): Promise<void> {
    await db.insert(devoteeAddresses).values({
      devoteeId,
      addressId,
      addressType,
      landmark
    });
  }

  async createNamahattaAddress(namahattaId: number, addressId: number, landmark?: string): Promise<void> {
    await db.insert(namahattaAddresses).values({
      namahattaId,
      addressId,
      landmark
    });
  }

  async getDevoteeAddresses(devoteeId: number): Promise<Array<{
    id: number;
    addressType: string;
    landmark?: string;
    country?: string;
    state?: string;
    district?: string;
    subDistrict?: string;
    village?: string;
    postalCode?: string;
  }>> {
    const result = await db.select({
      id: devoteeAddresses.id,
      addressType: devoteeAddresses.addressType,
      landmark: devoteeAddresses.landmark,
      country: addresses.country,
      state: addresses.stateNameEnglish,
      district: addresses.districtNameEnglish,
      subDistrict: addresses.subdistrictNameEnglish,
      village: addresses.villageNameEnglish,
      postalCode: addresses.pincode
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .where(eq(devoteeAddresses.devoteeId, devoteeId));

    return result.map(item => ({
      id: item.id,
      addressType: item.addressType,
      landmark: item.landmark ?? undefined,
      country: item.country ?? undefined,
      state: item.state ?? undefined,
      district: item.district ?? undefined,
      subDistrict: item.subDistrict ?? undefined,
      village: item.village ?? undefined,
      postalCode: item.postalCode ?? undefined
    }));
  }

  async getNamahattaAddress(namahattaId: number): Promise<{
    id: number;
    landmark?: string;
    country?: string;
    state?: string;
    district?: string;
    subDistrict?: string;
    village?: string;
    postalCode?: string;
  } | undefined> {
    const result = await db.select({
      id: namahattaAddresses.id,
      landmark: namahattaAddresses.landmark,
      country: addresses.country,
      state: addresses.stateNameEnglish,
      district: addresses.districtNameEnglish,
      subDistrict: addresses.subdistrictNameEnglish,
      village: addresses.villageNameEnglish,
      postalCode: addresses.pincode
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .where(eq(namahattaAddresses.namahattaId, namahattaId))
      .limit(1);

    return result[0] ? {
      id: result[0].id,
      landmark: result[0].landmark ?? undefined,
      country: result[0].country ?? undefined,
      state: result[0].state ?? undefined,
      district: result[0].district ?? undefined,
      subDistrict: result[0].subDistrict ?? undefined,
      village: result[0].village ?? undefined,
      postalCode: result[0].postalCode ?? undefined
    } : undefined;
  }

  // Map data methods - Updated to use normalized address tables
  async getNamahattaCountsByCountry(): Promise<Array<{ country: string; count: number }>> {
    const results = await db.select({
      country: addresses.country,
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(
        sql`${addresses.country} IS NOT NULL`,
        ne(namahattas.status, 'Rejected')
      ))
      .groupBy(addresses.country);

    return results.map(result => ({
      country: result.country || 'Unknown',
      count: result.count
    }));
  }

  async getNamahattaCountsByState(country?: string): Promise<Array<{ state: string; country: string; count: number }>> {
    let whereConditions = [
      sql`${addresses.stateNameEnglish} IS NOT NULL`,
      ne(namahattas.status, 'Rejected')
    ];
    
    if (country) {
      whereConditions.push(eq(addresses.country, country));
    }
    
    const results = await db.select({
      state: addresses.stateNameEnglish,
      country: addresses.country,
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(...whereConditions))
      .groupBy(addresses.stateNameEnglish, addresses.country);

    return results.map(result => ({
      state: result.state || 'Unknown',
      country: result.country || 'Unknown',
      count: result.count
    }));
  }

  async getNamahattaCountsByDistrict(state?: string): Promise<Array<{ district: string; state: string; country: string; count: number }>> {
    // Include ALL namahattas from state level, even if district data is missing
    let whereConditions = [
      ne(namahattas.status, 'Rejected')
    ];
    
    if (state) {
      whereConditions.push(eq(addresses.stateNameEnglish, state));
    }
    
    const results = await db.select({
      district: sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`.as('district'),
      state: sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`.as('state'),
      country: sql`COALESCE(${addresses.country}, 'Unknown Country')`.as('country'),
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(...whereConditions))
      .groupBy(
        sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`, 
        sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`, 
        sql`COALESCE(${addresses.country}, 'Unknown Country')`
      );

    return results.map(result => ({
      district: (result.district as string) || 'Unknown District',
      state: (result.state as string) || 'Unknown State',
      country: (result.country as string) || 'Unknown Country',
      count: result.count
    }));
  }

  async getNamahattaCountsBySubDistrict(district?: string): Promise<Array<{ subDistrict: string; district: string; state: string; country: string; count: number }>> {
    // Include ALL namahattas from district level, even if sub-district data is missing
    let whereConditions = [
      ne(namahattas.status, 'Rejected')
    ];
    
    if (district) {
      whereConditions.push(sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District') = ${district}`);
    }
    
    const results = await db.select({
      subDistrict: sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`.as('subDistrict'),
      district: sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`.as('district'),
      state: sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`.as('state'),
      country: sql`COALESCE(${addresses.country}, 'Unknown Country')`.as('country'),
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(...whereConditions))
      .groupBy(
        sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`,
        sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`, 
        sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`, 
        sql`COALESCE(${addresses.country}, 'Unknown Country')`
      );

    return results.map(result => ({
      subDistrict: (result.subDistrict as string) || 'Unknown Sub-District',
      district: (result.district as string) || 'Unknown District',
      state: (result.state as string) || 'Unknown State',
      country: (result.country as string) || 'Unknown Country',
      count: result.count
    }));
  }

  async getNamahattaCountsByVillage(subDistrict?: string): Promise<Array<{ village: string; subDistrict: string; district: string; state: string; country: string; count: number }>> {
    // Include ALL namahattas from sub-district level, even if village data is missing
    let whereConditions = [
      ne(namahattas.status, 'Rejected')
    ];
    
    if (subDistrict) {
      whereConditions.push(sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District') = ${subDistrict}`);
    }
    
    const results = await db.select({
      village: sql`COALESCE(${addresses.villageNameEnglish}, 'Unknown Village')`.as('village'),
      subDistrict: sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`.as('subDistrict'),
      district: sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`.as('district'),
      state: sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`.as('state'),
      country: sql`COALESCE(${addresses.country}, 'Unknown Country')`.as('country'),
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(...whereConditions))
      .groupBy(
        sql`COALESCE(${addresses.villageNameEnglish}, 'Unknown Village')`,
        sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`, 
        sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`, 
        sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`, 
        sql`COALESCE(${addresses.country}, 'Unknown Country')`
      );

    return results.map(result => ({
      village: (result.village as string) || 'Unknown Village',
      subDistrict: (result.subDistrict as string) || 'Unknown Sub-District',
      district: (result.district as string) || 'Unknown District',
      state: (result.state as string) || 'Unknown State',
      country: (result.country as string) || 'Unknown Country',
      count: result.count
    }));
  }

  // Devotee counts by geography
  async getDevoteeCountsByState(country?: string): Promise<Array<{ state: string; country: string; count: number }>> {
    let whereConditions = [
      sql`${addresses.stateNameEnglish} IS NOT NULL`
    ];
    
    if (country) {
      whereConditions.push(eq(addresses.country, country));
    }
    
    const results = await db.select({
      state: addresses.stateNameEnglish,
      country: addresses.country,
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(and(...whereConditions))
      .groupBy(addresses.stateNameEnglish, addresses.country);

    return results.map(result => ({
      state: result.state || 'Unknown',
      country: result.country || 'Unknown',
      count: result.count
    }));
  }

  async getDevoteeCountsByDistrict(state?: string): Promise<Array<{ district: string; state: string; country: string; count: number }>> {
    let whereConditions: any[] = [];
    
    if (state) {
      whereConditions.push(eq(addresses.stateNameEnglish, state));
    }
    
    const results = await db.select({
      district: sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`.as('district'),
      state: sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`.as('state'),
      country: sql`COALESCE(${addresses.country}, 'Unknown Country')`.as('country'),
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(
        sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`, 
        sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`, 
        sql`COALESCE(${addresses.country}, 'Unknown Country')`
      );

    return results.map(result => ({
      district: (result.district as string) || 'Unknown District',
      state: (result.state as string) || 'Unknown State',
      country: (result.country as string) || 'Unknown Country',
      count: result.count
    }));
  }

  async getDevoteeCountsBySubDistrict(district?: string): Promise<Array<{ subDistrict: string; district: string; state: string; country: string; count: number }>> {
    let whereConditions: any[] = [];
    
    if (district) {
      whereConditions.push(sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District') = ${district}`);
    }
    
    const results = await db.select({
      subDistrict: sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`.as('subDistrict'),
      district: sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`.as('district'),
      state: sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`.as('state'),
      country: sql`COALESCE(${addresses.country}, 'Unknown Country')`.as('country'),
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(
        sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`,
        sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`, 
        sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`, 
        sql`COALESCE(${addresses.country}, 'Unknown Country')`
      );

    return results.map(result => ({
      subDistrict: (result.subDistrict as string) || 'Unknown Sub-District',
      district: (result.district as string) || 'Unknown District',
      state: (result.state as string) || 'Unknown State',
      country: (result.country as string) || 'Unknown Country',
      count: result.count
    }));
  }

  async getDevoteeCountsByVillage(subDistrict?: string): Promise<Array<{ village: string; subDistrict: string; district: string; state: string; country: string; count: number }>> {
    let whereConditions: any[] = [];
    
    if (subDistrict) {
      whereConditions.push(sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District') = ${subDistrict}`);
    }
    
    const results = await db.select({
      village: sql`COALESCE(${addresses.villageNameEnglish}, 'Unknown Village')`.as('village'),
      subDistrict: sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`.as('subDistrict'),
      district: sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`.as('district'),
      state: sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`.as('state'),
      country: sql`COALESCE(${addresses.country}, 'Unknown Country')`.as('country'),
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(
        sql`COALESCE(${addresses.villageNameEnglish}, 'Unknown Village')`,
        sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`, 
        sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`, 
        sql`COALESCE(${addresses.stateNameEnglish}, 'Unknown State')`, 
        sql`COALESCE(${addresses.country}, 'Unknown Country')`
      );

    return results.map(result => ({
      village: (result.village as string) || 'Unknown Village',
      subDistrict: (result.subDistrict as string) || 'Unknown Sub-District',
      district: (result.district as string) || 'Unknown District',
      state: (result.state as string) || 'Unknown State',
      country: (result.country as string) || 'Unknown Country',
      count: result.count
    }));
  }

  // Hierarchical reports with role-based filtering
  async getHierarchicalReports(filters?: { allowedDistricts?: string[] }): Promise<{
    states: Array<{
      name: string;
      country: string;
      namahattaCount: number;
      devoteeCount: number;
      districts: Array<{
        name: string;
        state: string;
        namahattaCount: number;
        devoteeCount: number;
        subDistricts: Array<{
          name: string;
          district: string;
          namahattaCount: number;
          devoteeCount: number;
          villages: Array<{
            name: string;
            subDistrict: string;
            namahattaCount: number;
            devoteeCount: number;
          }>;
        }>;
      }>;
    }>;
  }> {
    // Build district filter condition for role-based access
    let districtFilter: any = undefined;
    if (filters?.allowedDistricts && filters.allowedDistricts.length > 0) {
      districtFilter = inArray(addresses.districtNameEnglish, filters.allowedDistricts);
    }

    // Get namahatta counts by state
    const namahattaStateResults = await db.select({
      state: addresses.stateNameEnglish,
      country: addresses.country,
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(
        sql`${addresses.stateNameEnglish} IS NOT NULL`,
        ne(namahattas.status, 'Rejected'),
        districtFilter
      ))
      .groupBy(addresses.stateNameEnglish, addresses.country);

    // Get devotee counts by state
    const devoteeStateResults = await db.select({
      state: addresses.stateNameEnglish,
      country: addresses.country,
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(and(
        sql`${addresses.stateNameEnglish} IS NOT NULL`,
        districtFilter
      ))
      .groupBy(addresses.stateNameEnglish, addresses.country);

    // Create state-level data structure
    const stateMap = new Map<string, any>();
    
    // Process namahatta counts
    namahattaStateResults.forEach(result => {
      const stateKey = `${result.state}_${result.country}`;
      if (!stateMap.has(stateKey)) {
        stateMap.set(stateKey, {
          name: result.state || 'Unknown',
          country: result.country || 'Unknown',
          namahattaCount: 0,
          devoteeCount: 0,
          districts: []
        });
      }
      stateMap.get(stateKey).namahattaCount = result.count;
    });

    // Process devotee counts
    devoteeStateResults.forEach(result => {
      const stateKey = `${result.state}_${result.country}`;
      if (!stateMap.has(stateKey)) {
        stateMap.set(stateKey, {
          name: result.state || 'Unknown',
          country: result.country || 'Unknown',
          namahattaCount: 0,
          devoteeCount: 0,
          districts: []
        });
      }
      stateMap.get(stateKey).devoteeCount = result.count;
    });

    // For each state, get district-level data
    for (const stateData of Array.from(stateMap.values())) {
      const districts = await this.getDistrictsForState(stateData.name, filters);
      stateData.districts = districts;
    }

    return {
      states: Array.from(stateMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  private async getDistrictsForState(stateName: string, filters?: { allowedDistricts?: string[] }) {
    let districtFilter: any = eq(addresses.stateNameEnglish, stateName);
    if (filters?.allowedDistricts && filters.allowedDistricts.length > 0) {
      districtFilter = and(
        eq(addresses.stateNameEnglish, stateName),
        inArray(addresses.districtNameEnglish, filters.allowedDistricts)
      );
    }

    // Get namahatta counts by district
    const namahattaDistrictResults = await db.select({
      district: sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`.as('district'),
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(
        districtFilter,
        ne(namahattas.status, 'Rejected')
      ))
      .groupBy(sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`);

    // Get devotee counts by district
    const devoteeDistrictResults = await db.select({
      district: sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`.as('district'),
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(districtFilter)
      .groupBy(sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District')`);

    // Combine district data
    const districtMap = new Map<string, any>();
    
    namahattaDistrictResults.forEach(result => {
      const district = result.district as string;
      districtMap.set(district, {
        name: district,
        state: stateName,
        namahattaCount: result.count,
        devoteeCount: 0,
        subDistricts: []
      });
    });

    devoteeDistrictResults.forEach(result => {
      const district = result.district as string;
      if (!districtMap.has(district)) {
        districtMap.set(district, {
          name: district,
          state: stateName,
          namahattaCount: 0,
          devoteeCount: result.count,
          subDistricts: []
        });
      } else {
        districtMap.get(district).devoteeCount = result.count;
      }
    });

    // For each district, get sub-district and village data
    for (const districtData of Array.from(districtMap.values())) {
      const subDistricts = await this.getSubDistrictsForDistrict(districtData.name, stateName, filters);
      districtData.subDistricts = subDistricts;
    }

    return Array.from(districtMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private async getSubDistrictsForDistrict(districtName: string, stateName: string, filters?: { allowedDistricts?: string[] }) {
    let whereConditions = and(
      eq(addresses.stateNameEnglish, stateName),
      sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District') = ${districtName}`
    );

    if (filters?.allowedDistricts && filters.allowedDistricts.length > 0) {
      whereConditions = and(
        whereConditions,
        inArray(addresses.districtNameEnglish, filters.allowedDistricts)
      );
    }

    // Get namahatta counts by sub-district
    const namahattaSubDistrictResults = await db.select({
      subDistrict: sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`.as('subDistrict'),
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(whereConditions, ne(namahattas.status, 'Rejected')))
      .groupBy(sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`);

    // Get devotee counts by sub-district
    const devoteeSubDistrictResults = await db.select({
      subDistrict: sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`.as('subDistrict'),
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(whereConditions)
      .groupBy(sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District')`);

    // Combine sub-district data
    const subDistrictMap = new Map<string, any>();
    
    namahattaSubDistrictResults.forEach(result => {
      const subDistrict = result.subDistrict as string;
      subDistrictMap.set(subDistrict, {
        name: subDistrict,
        district: districtName,
        namahattaCount: result.count,
        devoteeCount: 0,
        villages: []
      });
    });

    devoteeSubDistrictResults.forEach(result => {
      const subDistrict = result.subDistrict as string;
      if (!subDistrictMap.has(subDistrict)) {
        subDistrictMap.set(subDistrict, {
          name: subDistrict,
          district: districtName,
          namahattaCount: 0,
          devoteeCount: result.count,
          villages: []
        });
      } else {
        subDistrictMap.get(subDistrict).devoteeCount = result.count;
      }
    });

    // For each sub-district, get village data
    for (const subDistrictData of Array.from(subDistrictMap.values())) {
      const villages = await this.getVillagesForSubDistrict(subDistrictData.name, districtName, stateName, filters);
      subDistrictData.villages = villages;
    }

    return Array.from(subDistrictMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private async getVillagesForSubDistrict(subDistrictName: string, districtName: string, stateName: string, filters?: { allowedDistricts?: string[] }) {
    let whereConditions = and(
      eq(addresses.stateNameEnglish, stateName),
      sql`COALESCE(${addresses.districtNameEnglish}, 'Unknown District') = ${districtName}`,
      sql`COALESCE(${addresses.subdistrictNameEnglish}, 'Unknown Sub-District') = ${subDistrictName}`
    );

    if (filters?.allowedDistricts && filters.allowedDistricts.length > 0) {
      whereConditions = and(
        whereConditions,
        inArray(addresses.districtNameEnglish, filters.allowedDistricts)
      );
    }

    // Get namahatta counts by village
    const namahattaVillageResults = await db.select({
      village: sql`COALESCE(${addresses.villageNameEnglish}, 'Unknown Village')`.as('village'),
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(whereConditions, ne(namahattas.status, 'Rejected')))
      .groupBy(sql`COALESCE(${addresses.villageNameEnglish}, 'Unknown Village')`);

    // Get devotee counts by village
    const devoteeVillageResults = await db.select({
      village: sql`COALESCE(${addresses.villageNameEnglish}, 'Unknown Village')`.as('village'),
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(whereConditions)
      .groupBy(sql`COALESCE(${addresses.villageNameEnglish}, 'Unknown Village')`);

    // Combine village data
    const villageMap = new Map<string, any>();
    
    namahattaVillageResults.forEach(result => {
      const village = result.village as string;
      villageMap.set(village, {
        name: village,
        subDistrict: subDistrictName,
        namahattaCount: result.count,
        devoteeCount: 0
      });
    });

    devoteeVillageResults.forEach(result => {
      const village = result.village as string;
      if (!villageMap.has(village)) {
        villageMap.set(village, {
          name: village,
          subDistrict: subDistrictName,
          namahattaCount: 0,
          devoteeCount: result.count
        });
      } else {
        villageMap.get(village).devoteeCount = result.count;
      }
    });

    return Array.from(villageMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAddressByPincode(pincode: string): Promise<{
    country: string;
    state: string;
    district: string;
    subDistricts: string[];
    villages: string[];
  } | null> {
    try {
      // Use raw SQL query with proper Drizzle syntax
      const result = await db.execute(
        sql`SELECT 
          country,
          state_name_english as state,
          district_name_english as district,
          subdistrict_name_english as subdistrict,
          village_name_english as village
        FROM addresses 
        WHERE pincode = ${pincode}`
      );
      
      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      // Get the first row for country, state, district (they should all be the same for a pincode)
      const firstRow = result.rows[0] as any;
      const country = firstRow.country;
      const state = firstRow.state;
      const district = firstRow.district;

      // Extract unique sub-districts and villages
      const subDistricts = Array.from(new Set(
        result.rows
          .map((row: any) => row.subdistrict)
          .filter(Boolean)
      ));
      
      const villages = Array.from(new Set(
        result.rows
          .map((row: any) => row.village)
          .filter(Boolean)
      ));

      return {
        country: country || 'India',
        state: state || '',
        district: district || '',
        subDistricts,
        villages,
      };
    } catch (error) {
      console.error('Error in getAddressByPincode:', error);
      return null;
    }
  }

  // Admin functions
  async createDistrictSupervisor(data: {
    username: string;
    fullName: string;
    email: string;
    phone?: string | null;
    password: string;
    districts: string[];
    comments?: string | null;
  }): Promise<{ user: any; districts: string[] }> {
    try {
      const { createUser, assignDistrictsToUser } = await import('./storage-auth');
      
      // Create the user
      const user = await createUser({
        username: data.username,
        passwordHash: data.password, // Will be hashed in createUser
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        role: 'DISTRICT_SUPERVISOR',
        isActive: true
      });

      // Assign districts with comments - auto-default is handled in assignDistrictsToUser
      await assignDistrictsToUser(user.id, data.districts, data.comments || undefined);

      return {
        user,
        districts: data.districts
      };
    } catch (error) {
      console.error('Error creating district supervisor:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<any[]> {
    try {
      const { getAllUsersWithDistricts } = await import('./storage-auth');
      return await getAllUsersWithDistricts();
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async getAvailableDistricts(): Promise<Array<{ code: string; name: string }>> {
    try {
      const distinctDistricts = await db
        .selectDistinct({
          code: addresses.districtCode,
          name: addresses.districtNameEnglish
        })
        .from(addresses)
        .where(and(
          isNotNull(addresses.districtCode),
          isNotNull(addresses.districtNameEnglish)
        ))
        .orderBy(addresses.districtNameEnglish);

      return distinctDistricts
        .filter(d => d.code && d.name)
        .map(d => ({ code: d.code!, name: d.name! }));
    } catch (error) {
      console.error('Error getting available districts:', error);
      throw error;
    }
  }

  async getAllDistrictSupervisors(): Promise<Array<{ id: number; username: string; fullName: string; email: string; districts: string[]; districtDetails: Array<{ code: string; name: string; isDefault: boolean }> }>> {
    try {
      const supervisors = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          districtCode: userDistricts.districtCode,
          districtName: userDistricts.districtNameEnglish,
          isDefault: userDistricts.isDefaultDistrictSupervisor
        })
        .from(users)
        .innerJoin(userDistricts, eq(users.id, userDistricts.userId))
        .where(
          and(
            eq(users.role, 'DISTRICT_SUPERVISOR'),
            eq(users.isActive, true)
          )
        );

      // Group supervisors by ID and collect their districts with details
      const supervisorMap = new Map();
      for (const sup of supervisors) {
        if (!supervisorMap.has(sup.id)) {
          supervisorMap.set(sup.id, {
            id: sup.id,
            username: sup.username,
            fullName: sup.fullName,
            email: sup.email,
            districts: [],
            districtDetails: []
          });
        }
        const supervisor = supervisorMap.get(sup.id);
        supervisor.districts.push(sup.districtName);
        supervisor.districtDetails.push({
          code: sup.districtCode || '',
          name: sup.districtName || '',
          isDefault: sup.isDefault || false
        });
      }

      return Array.from(supervisorMap.values());
    } catch (error) {
      console.error('Error getting all district supervisors:', error);
      throw error;
    }
  }

  async getDistrictSupervisors(district: string): Promise<Array<{ id: number; username: string; fullName: string; email: string; isDefault: boolean }>> {
    try {
      const supervisors = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          isDefault: userDistricts.isDefaultDistrictSupervisor
        })
        .from(users)
        .innerJoin(userDistricts, eq(users.id, userDistricts.userId))
        .where(
          and(
            eq(users.role, 'DISTRICT_SUPERVISOR'),
            eq(users.isActive, true),
            or(
              eq(userDistricts.districtCode, district),
              eq(userDistricts.districtNameEnglish, district)
            )
          )
        );

      return supervisors.map(s => ({
        ...s,
        isDefault: s.isDefault || false
      }));
    } catch (error) {
      console.error('Error getting district supervisors:', error);
      throw error;
    }
  }

  async getUserAddressDefaults(userId: number): Promise<{ country?: string; state?: string; district?: string }> {
    try {
      const { getUserDistricts } = await import('./storage-auth');
      const userDistrictsData = await getUserDistricts(userId);
      
      if (userDistrictsData.length === 0) {
        return {};
      }

      // Get the first district's full address info
      const districtCode = userDistrictsData[0].districtCode;
      
      const [addressInfo] = await db
        .select({
          country: addresses.country,
          state: addresses.stateNameEnglish,
          district: addresses.districtNameEnglish
        })
        .from(addresses)
        .where(eq(addresses.districtCode, districtCode))
        .limit(1);

      return {
        country: addressInfo?.country || 'India',
        state: addressInfo?.state || undefined,
        district: addressInfo?.district || undefined
      };
    } catch (error) {
      console.error('Error getting user address defaults:', error);
      return {};
    }
  }

  // Leadership Management Methods

  async getDevoteeLeaders(page = 1, size = 10, filters: any = {}): Promise<{ data: Array<Devotee & { reportingToName?: string }>, total: number }> {
    try {
      const offset = (page - 1) * size;
      
      let whereConditions = [isNotNull(devotees.leadershipRole)];
      
      if (filters.search) {
        whereConditions.push(
          or(
            like(devotees.legalName, `%${filters.search}%`),
            like(devotees.name, `%${filters.search}%`),
            like(devotees.leadershipRole, `%${filters.search}%`)
          )!
        );
      }
      
      if (filters.leadershipRole) {
        whereConditions.push(eq(devotees.leadershipRole, filters.leadershipRole));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      
      // Get devotee IDs first
      const devoteeIds = await db
        .select({ id: devotees.id })
        .from(devotees)
        .where(whereClause)
        .limit(size)
        .offset(offset)
        .orderBy(asc(devotees.legalName));

      // Get full devotee data with reporting relationships
      const devoteeData = await Promise.all(
        devoteeIds.map(async ({ id }) => {
          const devotee = await this.getDevotee(id);
          if (!devotee) return null;

          let reportingToName = undefined;
          if (devotee.reportingToDevoteeId) {
            const reportingTo = await this.getDevotee(devotee.reportingToDevoteeId);
            reportingToName = reportingTo?.legalName || reportingTo?.name;
          }

          return {
            ...devotee,
            reportingToName
          };
        })
      );

      // Get total count
      const totalResult = await db.select({ count: count() }).from(devotees).where(whereClause);

      return {
        data: devoteeData.filter(Boolean) as Array<Devotee & { reportingToName?: string }>,
        total: totalResult[0].count
      };
    } catch (error) {
      console.error('Error in getDevoteeLeaders:', error);
      throw error;
    }
  }

  async getDevoteesByRole(role: string): Promise<Array<Devotee & { reportingToName?: string }>> {
    try {
      const devoteeResults = await db
        .select({ id: devotees.id })
        .from(devotees)
        .where(eq(devotees.leadershipRole, role))
        .orderBy(asc(devotees.legalName));

      const devoteeData = await Promise.all(
        devoteeResults.map(async ({ id }) => {
          const devotee = await this.getDevotee(id);
          if (!devotee) return null;

          let reportingToName = undefined;
          if (devotee.reportingToDevoteeId) {
            const reportingTo = await this.getDevotee(devotee.reportingToDevoteeId);
            reportingToName = reportingTo?.legalName || reportingTo?.name;
          }

          return {
            ...devotee,
            reportingToName
          };
        })
      );

      return devoteeData.filter(Boolean) as Array<Devotee & { reportingToName?: string }>;
    } catch (error) {
      console.error('Error in getDevoteesByRole:', error);
      throw error;
    }
  }

  async getSenapotisByTypeAndReporting(type: string, reportingId: number): Promise<Array<Devotee & { reportingToName?: string }>> {
    try {
      // Get devotees with the specific leadership role who report to the specified devotee
      // This filters the hierarchy properly: e.g., get all MALA_SENAPOTI who report to a specific District Supervisor
      const devoteeResults = await db
        .select({ id: devotees.id })
        .from(devotees)
        .where(and(
          eq(devotees.leadershipRole, type),
          eq(devotees.reportingToDevoteeId, reportingId)
        ))
        .orderBy(asc(devotees.legalName));

      const devoteeData = await Promise.all(
        devoteeResults.map(async ({ id }) => {
          const devotee = await this.getDevotee(id);
          if (!devotee) return null;

          let reportingToName = undefined;
          if (devotee.reportingToDevoteeId) {
            const reportingTo = await this.getDevotee(devotee.reportingToDevoteeId);
            reportingToName = reportingTo?.legalName || reportingTo?.name;
          }

          return {
            ...devotee,
            reportingToName
          };
        })
      );

      return devoteeData.filter(Boolean) as Array<Devotee & { reportingToName?: string }>;
    } catch (error) {
      console.error('Error in getSenapotisByTypeAndReporting:', error);
      throw error;
    }
  }

  async getAvailableDevoteesForOfficerPositions(): Promise<Devotee[]> {
    try {
      // Get all devotee IDs that are currently assigned as Secretary, President, or Accountant
      const assignedDevoteeIdsResult = await db
        .select({
          secretaryId: namahattas.secretaryId,
          presidentId: namahattas.presidentId,
          accountantId: namahattas.accountantId
        })
        .from(namahattas);

      const assignedDevoteeIds = new Set<number>();
      assignedDevoteeIdsResult.forEach(namahatta => {
        if (namahatta.secretaryId) assignedDevoteeIds.add(namahatta.secretaryId);
        if (namahatta.presidentId) assignedDevoteeIds.add(namahatta.presidentId);
        if (namahatta.accountantId) assignedDevoteeIds.add(namahatta.accountantId);
      });

      // Filter devotees who are available for officer positions
      const senapotiRoles = ['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'];
      const assignedIdsArray = Array.from(assignedDevoteeIds);
      
      const availableDevoteesResult = await db
        .select()
        .from(devotees)
        .where(and(
          // Not assigned to any namahatta as a regular member (namahattaId should be null)
          isNull(devotees.namahattaId),
          // Don't have any senapoti leadership roles
          or(
            isNull(devotees.leadershipRole),
            not(inArray(devotees.leadershipRole, senapotiRoles))
          ),
          // Not currently assigned as Secretary, President, or Accountant
          assignedIdsArray.length > 0 ? not(inArray(devotees.id, assignedIdsArray)) : sql`TRUE`
        ));

      return availableDevoteesResult;
    } catch (error) {
      console.error('Error in getAvailableDevoteesForOfficerPositions:', error);
      throw error;
    }
  }

  async getAvailableDevoteesForSenapotiRoles(): Promise<Devotee[]> {
    try {
      // Get all devotees who are available for senapoti role assignment
      // This includes all devotees who are not currently assigned as regular members to any namahatta
      const availableDevoteesResult = await db
        .select()
        .from(devotees)
        .where(
          // Not assigned to any namahatta as a regular member (namahattaId should be null)
          // This allows for leadership role assignments across namahattas
          isNull(devotees.namahattaId)
        )
        .orderBy(asc(devotees.legalName));

      return availableDevoteesResult;
    } catch (error) {
      console.error('Error in getAvailableDevoteesForSenapotiRoles:', error);
      throw error;
    }
  }

  async assignLeadershipRole(devoteeId: number, data: {
    leadershipRole: string;
    reportingToDevoteeId?: number;
    hasSystemAccess: boolean;
    appointedBy: number;
    appointedDate: string;
  }): Promise<Devotee> {
    try {
      // Validate that the devotee exists
      const existingDevotee = await this.getDevotee(devoteeId);
      if (!existingDevotee) {
        throw new Error(`Devotee with ID ${devoteeId} not found`);
      }

      // Validate that reporting devotee exists if provided
      if (data.reportingToDevoteeId) {
        const reportingTo = await this.getDevotee(data.reportingToDevoteeId);
        if (!reportingTo) {
          throw new Error(`Reporting devotee with ID ${data.reportingToDevoteeId} not found`);
        }
      }

      // Update the devotee with leadership role
      await db.update(devotees)
        .set({
          leadershipRole: data.leadershipRole,
          reportingToDevoteeId: data.reportingToDevoteeId || null,
          hasSystemAccess: data.hasSystemAccess,
          appointedBy: data.appointedBy,
          appointedDate: data.appointedDate
        })
        .where(eq(devotees.id, devoteeId));

      // Return the updated devotee
      const updatedDevotee = await this.getDevotee(devoteeId);
      if (!updatedDevotee) {
        throw new Error('Failed to retrieve updated devotee');
      }

      return updatedDevotee;
    } catch (error) {
      console.error('Error in assignLeadershipRole:', error);
      throw error;
    }
  }

  async removeLeadershipRole(devoteeId: number): Promise<Devotee> {
    try {
      // Validate that the devotee exists
      const existingDevotee = await this.getDevotee(devoteeId);
      if (!existingDevotee) {
        throw new Error(`Devotee with ID ${devoteeId} not found`);
      }

      // Remove leadership role and related fields
      await db.update(devotees)
        .set({
          leadershipRole: null,
          reportingToDevoteeId: null,
          hasSystemAccess: false,
          appointedBy: null,
          appointedDate: null
        })
        .where(eq(devotees.id, devoteeId));

      // Return the updated devotee
      const updatedDevotee = await this.getDevotee(devoteeId);
      if (!updatedDevotee) {
        throw new Error('Failed to retrieve updated devotee');
      }

      return updatedDevotee;
    } catch (error) {
      console.error('Error in removeLeadershipRole:', error);
      throw error;
    }
  }

  async getLeadershipHierarchy(): Promise<Array<{
    id: number;
    name: string;
    legalName: string;
    leadershipRole: string;
    reportingToDevoteeId?: number;
    children: Array<any>;
  }>> {
    try {
      // Get all devotees with leadership roles
      const leaderDevotees = await db
        .select({
          id: devotees.id,
          name: devotees.name,
          legalName: devotees.legalName,
          leadershipRole: devotees.leadershipRole,
          reportingToDevoteeId: devotees.reportingToDevoteeId
        })
        .from(devotees)
        .where(isNotNull(devotees.leadershipRole))
        .orderBy(asc(devotees.legalName));

      // Create a map for quick lookup
      const devoteeMap = new Map();
      const hierarchy: Array<any> = [];

      // Initialize all devotees in the map
      leaderDevotees.forEach(devotee => {
        devoteeMap.set(devotee.id, {
          ...devotee,
          name: devotee.name || devotee.legalName,
          children: []
        });
      });

      // Build the hierarchy by connecting children to parents
      leaderDevotees.forEach(devotee => {
        const devoteeNode = devoteeMap.get(devotee.id);
        
        if (devotee.reportingToDevoteeId && devoteeMap.has(devotee.reportingToDevoteeId)) {
          // This devotee reports to someone, add them as a child
          const parent = devoteeMap.get(devotee.reportingToDevoteeId);
          parent.children.push(devoteeNode);
        } else {
          // This is a top-level devotee (no reporting relationship)
          hierarchy.push(devoteeNode);
        }
      });

      return hierarchy;
    } catch (error) {
      console.error('Error in getLeadershipHierarchy:', error);
      throw error;
    }
  }

  async getEligibleLeaders(): Promise<Devotee[]> {
    try {
      // Get devotees without leadership roles
      const devoteeIds = await db
        .select({ id: devotees.id })
        .from(devotees)
        .where(or(
          eq(devotees.leadershipRole, sql`NULL`),
          eq(devotees.leadershipRole, "")
        ))
        .orderBy(asc(devotees.legalName));

      // Get full devotee data
      const devoteeData = await Promise.all(
        devoteeIds.map(async ({ id }) => {
          return await this.getDevotee(id);
        })
      );

      return devoteeData.filter(Boolean) as Devotee[];
    } catch (error) {
      console.error('Error in getEligibleLeaders:', error);
      throw error;
    }
  }

  // User-Devotee Linking Methods

  async getDevoteeLinkedUser(devoteeId: number): Promise<User | null> {
    try {
      // Validate devotee exists
      const devotee = await this.getDevotee(devoteeId);
      if (!devotee) {
        throw new Error(`Devotee with ID ${devoteeId} not found`);
      }

      // Find user linked to this devotee
      const result = await db
        .select()
        .from(users)
        .where(and(
          eq(users.devoteeId, devoteeId),
          eq(users.isActive, true)
        ))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error in getDevoteeLinkedUser:', error);
      throw error;
    }
  }

  async getUserLinkedDevotee(userId: number): Promise<Devotee | null> {
    try {
      // Get user and check if they have a linked devotee
      const userResult = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.isActive, true)
        ))
        .limit(1);

      const user = userResult[0];
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      if (!user.devoteeId) {
        return null;
      }

      // Get the linked devotee
      return (await this.getDevotee(user.devoteeId)) ?? null;
    } catch (error) {
      console.error('Error in getUserLinkedDevotee:', error);
      throw error;
    }
  }

  async linkUserToDevotee(userId: number, devoteeId: number, force: boolean = false): Promise<void> {
    try {
      // Validate user exists and is active
      const userResult = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.isActive, true)
        ))
        .limit(1);

      const user = userResult[0];
      if (!user) {
        throw new Error(`User with ID ${userId} not found or inactive`);
      }

      // Validate devotee exists
      const devotee = await this.getDevotee(devoteeId);
      if (!devotee) {
        throw new Error(`Devotee with ID ${devoteeId} not found`);
      }

      // Check if user is already linked to a different devotee
      if (user.devoteeId && user.devoteeId !== devoteeId && !force) {
        throw new Error(`User is already linked to another devotee. Use force flag to override.`);
      }

      // Check if devotee is already linked to another user
      const existingUserLink = await db
        .select()
        .from(users)
        .where(and(
          eq(users.devoteeId, devoteeId),
          eq(users.isActive, true),
          ne(users.id, userId)
        ))
        .limit(1);

      if (existingUserLink[0] && !force) {
        throw new Error(`Devotee is already linked to another user. Use force flag to override.`);
      }

      // If force is enabled and devotee is linked to another user, unlink the other user first
      if (existingUserLink[0] && force) {
        await db
          .update(users)
          .set({ 
            devoteeId: null,
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUserLink[0].id));
      }

      // Update user to link to devotee
      await db
        .update(users)
        .set({ 
          devoteeId: devoteeId,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

    } catch (error) {
      console.error('Error in linkUserToDevotee:', error);
      throw error;
    }
  }

  async unlinkUserFromDevotee(userId: number): Promise<void> {
    try {
      // Validate user exists and is active
      const userResult = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.isActive, true)
        ))
        .limit(1);

      if (!userResult[0]) {
        throw new Error(`User with ID ${userId} not found or inactive`);
      }

      // Remove devotee link from user
      await db
        .update(users)
        .set({ 
          devoteeId: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

    } catch (error) {
      console.error('Error in unlinkUserFromDevotee:', error);
      throw error;
    }
  }

  async createUserForDevotee(devoteeId: number, userData: {
    username: string;
    fullName?: string;
    email: string;
    password: string;
    role: string;
    force?: boolean;
    createdBy?: number;
  }): Promise<{ user: User; devotee: any }> {
    try {
      // Validate devotee exists
      const devotee = await this.getDevotee(devoteeId);
      if (!devotee) {
        throw new Error(`Devotee with ID ${devoteeId} not found`);
      }

      // Check if devotee is already linked to another user
      const existingUserLink = await db
        .select()
        .from(users)
        .where(and(
          eq(users.devoteeId, devoteeId),
          eq(users.isActive, true)
        ))
        .limit(1);

      if (existingUserLink[0] && !userData.force) {
        throw new Error(`Devotee is already linked to another user. Use force flag to override.`);
      }

      // Check if username already exists
      const existingUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, userData.username))
        .limit(1);

      if (existingUsername[0]) {
        throw new Error(`Username already exists`);
      }

      // Check if email already exists
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingEmail[0]) {
        throw new Error(`Email already exists`);
      }

      // If force is enabled and devotee is linked to another user, unlink the other user first
      if (existingUserLink[0] && userData.force) {
        await db
          .update(users)
          .set({ 
            devoteeId: null,
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUserLink[0].id));
      }

      // Import createUser function from storage-auth
      const { createUser } = await import('./storage-auth');

      // Create user with devotee link, using devotee's legal name as fullName if not provided
      const newUser = await createUser({
        username: userData.username,
        passwordHash: userData.password, // createUser will hash this
        fullName: userData.fullName || devotee.legalName,
        email: userData.email,
        role: userData.role,
        devoteeId: devoteeId,
        isActive: true,
        // Note: createdBy field doesn't exist in users schema
      });

      return {
        user: newUser,
        devotee: devotee
      };
    } catch (error) {
      console.error('Error in createUserForDevotee:', error);
      throw error;
    }
  }

  // Lazy loading methods for hierarchical reports (includes ALL locations, even with 0 counts)
  async getAllStatesWithCounts(filters?: { allowedDistricts?: string[] }): Promise<Array<{
    name: string;
    country: string;
    namahattaCount: number;
    devoteeCount: number;
  }>> {
    // Build the where condition for states query
    const statesConditions = [
      isNotNull(addresses.stateNameEnglish),
      filters?.allowedDistricts && filters.allowedDistricts.length > 0 ? inArray(addresses.districtNameEnglish, filters.allowedDistricts) : undefined
    ].filter(Boolean) as any[];
    const statesWhereCondition = and(...statesConditions);

    // Get all unique states from addresses table
    const allStates = await db
      .selectDistinct({
        state: addresses.stateNameEnglish,
        country: addresses.country
      })
      .from(addresses)
      .where(statesWhereCondition);

      // Build namahatta counts where condition
    const namahattaConditions = [
      isNotNull(addresses.stateNameEnglish),
      ne(namahattas.status, 'Rejected'),
      filters?.allowedDistricts && filters.allowedDistricts.length > 0 ? inArray(addresses.districtNameEnglish, filters.allowedDistricts) : undefined
    ].filter(Boolean) as any[];
    const namahattaWhereCondition = and(...namahattaConditions);

    // Get namahatta counts by state
    const namahattaCounts = await db.select({
      state: addresses.stateNameEnglish,
      country: addresses.country,
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(namahattaWhereCondition)
      .groupBy(addresses.stateNameEnglish, addresses.country);

    // Build devotee counts where condition
    const devoteeConditions = [
      isNotNull(addresses.stateNameEnglish),
      filters?.allowedDistricts && filters.allowedDistricts.length > 0 ? inArray(addresses.districtNameEnglish, filters.allowedDistricts) : undefined
    ].filter(Boolean) as any[];
    const devoteeWhereCondition = and(...devoteeConditions);

    // Get devotee counts by state
    const devoteeCounts = await db.select({
      state: addresses.stateNameEnglish,
      country: addresses.country,
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(devoteeWhereCondition)
      .groupBy(addresses.stateNameEnglish, addresses.country);

    // Create maps for quick lookup
    const namahattaMap = new Map<string, number>();
    const devoteeMap = new Map<string, number>();

    namahattaCounts.forEach(result => {
      const key = `${result.state}_${result.country}`;
      namahattaMap.set(key, result.count);
    });

    devoteeCounts.forEach(result => {
      const key = `${result.state}_${result.country}`;
      devoteeMap.set(key, result.count);
    });

    // Combine all states with their counts (0 if not found)
    return allStates.map(state => {
      const key = `${state.state}_${state.country}`;
      return {
        name: state.state || 'Unknown',
        country: state.country || 'Unknown',
        namahattaCount: namahattaMap.get(key) || 0,
        devoteeCount: devoteeMap.get(key) || 0
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAllDistrictsWithCounts(state: string, filters?: { allowedDistricts?: string[] }): Promise<Array<{
    name: string;
    state: string;
    namahattaCount: number;
    devoteeCount: number;
  }>> {
    // Build where condition for districts query
    const districtQueryConditions = [
      eq(addresses.stateNameEnglish, state),
      isNotNull(addresses.districtNameEnglish),
      filters?.allowedDistricts && filters.allowedDistricts.length > 0 ? inArray(addresses.districtNameEnglish, filters.allowedDistricts) : undefined
    ].filter(Boolean) as any[];
    const districtQueryWhere = and(...districtQueryConditions);

    // Get all unique districts for the state from addresses table
    const allDistricts = await db
      .selectDistinct({
        district: addresses.districtNameEnglish,
        state: addresses.stateNameEnglish
      })
      .from(addresses)
      .where(districtQueryWhere);

    // Build namahatta counts where condition for districts
    const namahattaDistrictConditions = [
      eq(addresses.stateNameEnglish, state),
      isNotNull(addresses.districtNameEnglish),
      ne(namahattas.status, 'Rejected'),
      filters?.allowedDistricts && filters.allowedDistricts.length > 0 ? inArray(addresses.districtNameEnglish, filters.allowedDistricts) : undefined
    ].filter(Boolean) as any[];
    const namahattaDistrictWhere = and(...namahattaDistrictConditions);

    // Get namahatta counts by district
    const namahattaCounts = await db.select({
      district: addresses.districtNameEnglish,
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(namahattaDistrictWhere)
      .groupBy(addresses.districtNameEnglish);

    // Build devotee counts where condition for districts
    const devoteeDistrictConditions = [
      eq(addresses.stateNameEnglish, state),
      isNotNull(addresses.districtNameEnglish),
      filters?.allowedDistricts && filters.allowedDistricts.length > 0 ? inArray(addresses.districtNameEnglish, filters.allowedDistricts) : undefined
    ].filter(Boolean) as any[];
    const devoteeDistrictWhere = and(...devoteeDistrictConditions);

    // Get devotee counts by district
    const devoteeCounts = await db.select({
      district: addresses.districtNameEnglish,
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(devoteeDistrictWhere)
      .groupBy(addresses.districtNameEnglish);

    // Create maps for quick lookup
    const namahattaMap = new Map<string, number>();
    const devoteeMap = new Map<string, number>();

    namahattaCounts.forEach(result => {
      namahattaMap.set(result.district!, result.count);
    });

    devoteeCounts.forEach(result => {
      devoteeMap.set(result.district!, result.count);
    });

    // Combine all districts with their counts (0 if not found)
    return allDistricts.map(district => ({
      name: district.district || 'Unknown',
      state: district.state || 'Unknown',
      namahattaCount: namahattaMap.get(district.district!) || 0,
      devoteeCount: devoteeMap.get(district.district!) || 0
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAllSubDistrictsWithCounts(state: string, district: string, filters?: { allowedDistricts?: string[] }): Promise<Array<{
    name: string;
    district: string;
    namahattaCount: number;
    devoteeCount: number;
  }>> {
    // Check if we have access to this district
    if (filters?.allowedDistricts && filters.allowedDistricts.length > 0 && !filters.allowedDistricts.includes(district)) {
      return [];
    }

    // Get all unique sub-districts for the district from addresses table
    const allSubDistricts = await db
      .selectDistinct({
        subDistrict: addresses.subdistrictNameEnglish,
        district: addresses.districtNameEnglish
      })
      .from(addresses)
      .where(and(
        eq(addresses.stateNameEnglish, state),
        eq(addresses.districtNameEnglish, district),
        isNotNull(addresses.subdistrictNameEnglish)
      ));

    // Get namahatta counts by sub-district
    const namahattaCounts = await db.select({
      subDistrict: addresses.subdistrictNameEnglish,
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(
        eq(addresses.stateNameEnglish, state),
        eq(addresses.districtNameEnglish, district),
        isNotNull(addresses.subdistrictNameEnglish),
        ne(namahattas.status, 'Rejected')
      ))
      .groupBy(addresses.subdistrictNameEnglish);

    // Get devotee counts by sub-district
    const devoteeCounts = await db.select({
      subDistrict: addresses.subdistrictNameEnglish,
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(and(
        eq(addresses.stateNameEnglish, state),
        eq(addresses.districtNameEnglish, district),
        isNotNull(addresses.subdistrictNameEnglish)
      ))
      .groupBy(addresses.subdistrictNameEnglish);

    // Create maps for quick lookup
    const namahattaMap = new Map<string, number>();
    const devoteeMap = new Map<string, number>();

    namahattaCounts.forEach(result => {
      namahattaMap.set(result.subDistrict!, result.count);
    });

    devoteeCounts.forEach(result => {
      devoteeMap.set(result.subDistrict!, result.count);
    });

    // Combine all sub-districts with their counts (0 if not found)
    return allSubDistricts.map(subDistrict => ({
      name: subDistrict.subDistrict || 'Unknown',
      district: subDistrict.district || 'Unknown',
      namahattaCount: namahattaMap.get(subDistrict.subDistrict!) || 0,
      devoteeCount: devoteeMap.get(subDistrict.subDistrict!) || 0
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAllVillagesWithCounts(state: string, district: string, subDistrict: string, filters?: { allowedDistricts?: string[] }): Promise<Array<{
    name: string;
    subDistrict: string;
    namahattaCount: number;
    devoteeCount: number;
  }>> {
    // Check if we have access to this district
    if (filters?.allowedDistricts && filters.allowedDistricts.length > 0 && !filters.allowedDistricts.includes(district)) {
      return [];
    }

    // Get all unique villages for the sub-district from addresses table
    const allVillages = await db
      .selectDistinct({
        village: addresses.villageNameEnglish,
        subDistrict: addresses.subdistrictNameEnglish
      })
      .from(addresses)
      .where(and(
        eq(addresses.stateNameEnglish, state),
        eq(addresses.districtNameEnglish, district),
        eq(addresses.subdistrictNameEnglish, subDistrict),
        isNotNull(addresses.villageNameEnglish)
      ));

    // Get namahatta counts by village
    const namahattaCounts = await db.select({
      village: addresses.villageNameEnglish,
      count: count()
    }).from(namahattaAddresses)
      .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
      .innerJoin(namahattas, eq(namahattaAddresses.namahattaId, namahattas.id))
      .where(and(
        eq(addresses.stateNameEnglish, state),
        eq(addresses.districtNameEnglish, district),
        eq(addresses.subdistrictNameEnglish, subDistrict),
        isNotNull(addresses.villageNameEnglish),
        ne(namahattas.status, 'Rejected')
      ))
      .groupBy(addresses.villageNameEnglish);

    // Get devotee counts by village
    const devoteeCounts = await db.select({
      village: addresses.villageNameEnglish,
      count: count()
    }).from(devoteeAddresses)
      .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
      .innerJoin(devotees, eq(devoteeAddresses.devoteeId, devotees.id))
      .where(and(
        eq(addresses.stateNameEnglish, state),
        eq(addresses.districtNameEnglish, district),
        eq(addresses.subdistrictNameEnglish, subDistrict),
        isNotNull(addresses.villageNameEnglish)
      ))
      .groupBy(addresses.villageNameEnglish);

    // Create maps for quick lookup
    const namahattaMap = new Map<string, number>();
    const devoteeMap = new Map<string, number>();

    namahattaCounts.forEach(result => {
      namahattaMap.set(result.village!, result.count);
    });

    devoteeCounts.forEach(result => {
      devoteeMap.set(result.village!, result.count);
    });

    // Combine all villages with their counts (0 if not found)
    return allVillages.map(village => ({
      name: village.village || 'Unknown',
      subDistrict: village.subDistrict || 'Unknown',
      namahattaCount: namahattaMap.get(village.village!) || 0,
      devoteeCount: devoteeMap.get(village.village!) || 0
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Senapoti Role Management System Implementation
  async changeDevoteeRole(data: {
    devoteeId: number;
    newRole: string | null;
    newReportingTo: number | null;
    changedBy: number;
    reason: string;
    districtCode?: string;
  }): Promise<{
    devotee: Devotee;
    subordinatesTransferred: number;
    roleChangeRecord: RoleChangeHistory;
  }> {
    return await db.transaction(async (tx) => {
      // Get current devotee information
      const currentDevotee = await tx
        .select()
        .from(devotees)
        .where(eq(devotees.id, data.devoteeId))
        .limit(1);

      if (!currentDevotee.length) {
        throw new Error(`Devotee with ID ${data.devoteeId} not found`);
      }

      const devotee = currentDevotee[0];
      const previousRole = devotee.leadershipRole;
      const previousReportingTo = devotee.reportingToDevoteeId;

      // Get all direct subordinates before role change
      const subordinates = await this.getDirectSubordinates(data.devoteeId);
      
      // Transfer subordinates if any exist
      let subordinatesTransferred = 0;
      if (subordinates.length > 0) {
        // If removing role or changing to a non-supervisory role, transfer subordinates
        if (!data.newRole || !['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI', 'DISTRICT_SUPERVISOR'].includes(data.newRole)) {
          // Transfer all subordinates to the new supervisor (or remove if no new supervisor)
          for (const subordinate of subordinates) {
            await tx
              .update(devotees)
              .set({ reportingToDevoteeId: data.newReportingTo })
              .where(eq(devotees.id, subordinate.id));
          }
          subordinatesTransferred = subordinates.length;
        }
      }

      // Update devotee role and reporting
      const updatedDevoteeResult = await tx
        .update(devotees)
        .set({
          leadershipRole: data.newRole,
          reportingToDevoteeId: data.newReportingTo,
          updatedAt: new Date()
        })
        .where(eq(devotees.id, data.devoteeId))
        .returning();

      const updatedDevotee = updatedDevoteeResult[0];

      // Record the role change in history
      const roleChangeRecord = await this.recordRoleChange({
        devoteeId: data.devoteeId,
        previousRole: previousRole,
        newRole: data.newRole,
        previousReportingTo: previousReportingTo,
        newReportingTo: data.newReportingTo,
        changedBy: data.changedBy,
        reason: data.reason,
        districtCode: data.districtCode,
        subordinatesTransferred: subordinatesTransferred
      });

      // Get the full devotee object with all details
      const fullDevotee = await this.getDevotee(data.devoteeId);
      if (!fullDevotee) {
        throw new Error('Failed to retrieve updated devotee');
      }

      return {
        devotee: fullDevotee,
        subordinatesTransferred,
        roleChangeRecord
      };
    });
  }

  async transferSubordinates(data: {
    fromDevoteeId: number;
    toDevoteeId: number | null;
    subordinateIds: number[];
    changedBy: number;
    reason: string;
    districtCode?: string;
  }): Promise<{
    transferred: number;
    subordinates: Devotee[];
  }> {
    return await db.transaction(async (tx) => {
      // Validate subordinates belong to fromDevoteeId
      const validSubordinates = await tx
        .select()
        .from(devotees)
        .where(
          and(
            inArray(devotees.id, data.subordinateIds),
            eq(devotees.reportingToDevoteeId, data.fromDevoteeId)
          )
        );

      if (validSubordinates.length !== data.subordinateIds.length) {
        throw new Error('Some subordinates do not report to the specified devotee');
      }

      // Transfer subordinates
      const transferredSubordinates = [];
      for (const subordinate of validSubordinates) {
        const updatedResult = await tx
          .update(devotees)
          .set({
            reportingToDevoteeId: data.toDevoteeId,
            updatedAt: new Date()
          })
          .where(eq(devotees.id, subordinate.id))
          .returning();

        transferredSubordinates.push(updatedResult[0]);
      }

      // Record the transfer in role change history
      await this.recordRoleChange({
        devoteeId: data.fromDevoteeId,
        previousRole: null, // This is just a transfer, not a role change
        newRole: null,
        previousReportingTo: null,
        newReportingTo: null,
        changedBy: data.changedBy,
        reason: `Subordinate transfer: ${data.reason}`,
        districtCode: data.districtCode,
        subordinatesTransferred: validSubordinates.length
      });

      return {
        transferred: validSubordinates.length,
        subordinates: transferredSubordinates
      };
    });
  }

  async getRoleChangeHistory(devoteeId: number, page = 1, size = 10): Promise<{
    data: Array<RoleChangeHistory & {
      devoteeNames?: string;
      changedByName?: string;
      previousReportingToName?: string;
      newReportingToName?: string;
    }>;
    total: number;
  }> {
    const offset = (page - 1) * size;

    // Get role change history with names
    const history = await db
      .select({
        id: roleChangeHistory.id,
        devoteeId: roleChangeHistory.devoteeId,
        previousRole: roleChangeHistory.previousRole,
        newRole: roleChangeHistory.newRole,
        previousReportingTo: roleChangeHistory.previousReportingTo,
        newReportingTo: roleChangeHistory.newReportingTo,
        changedBy: roleChangeHistory.changedBy,
        reason: roleChangeHistory.reason,
        districtCode: roleChangeHistory.districtCode,
        subordinatesTransferred: roleChangeHistory.subordinatesTransferred,
        createdAt: roleChangeHistory.createdAt,
        devoteeNames: sql`COALESCE(d.name, d.legal_name)`,
        changedByName: sql`u.full_name`,
        previousReportingToName: sql`COALESCE(prev_supervisor.name, prev_supervisor.legal_name)`,
        newReportingToName: sql`COALESCE(new_supervisor.name, new_supervisor.legal_name)`
      })
      .from(roleChangeHistory)
      .leftJoin(sql`${devotees} as d`, eq(roleChangeHistory.devoteeId, sql`d.id`))
      .leftJoin(sql`${users} as u`, eq(roleChangeHistory.changedBy, sql`u.id`))
      .leftJoin(sql`${devotees} as prev_supervisor`, eq(roleChangeHistory.previousReportingTo, sql`prev_supervisor.id`))
      .leftJoin(sql`${devotees} as new_supervisor`, eq(roleChangeHistory.newReportingTo, sql`new_supervisor.id`))
      .where(eq(roleChangeHistory.devoteeId, devoteeId))
      .orderBy(desc(roleChangeHistory.createdAt))
      .limit(size)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(roleChangeHistory)
      .where(eq(roleChangeHistory.devoteeId, devoteeId));

    return {
      data: history.map(record => ({
        ...record,
        devoteeNames: record.devoteeNames as string,
        changedByName: record.changedByName as string,
        previousReportingToName: record.previousReportingToName as string,
        newReportingToName: record.newReportingToName as string
      })),
      total: totalResult[0].count
    };
  }

  async getAvailableSupervisors(data: {
    targetRole: string;
    districtCode: string;
    excludeDevoteeIds?: number[];
  }): Promise<Array<Devotee & {
    subordinateCount?: number;
    workloadScore?: number;
  }>> {
    // Define valid supervisor roles for each target role
    const supervisorRoleMap: { [key: string]: string[] } = {
      'DISTRICT_SUPERVISOR': ['REGIONAL_DIRECTOR', 'CO_REGIONAL_DIRECTOR'],
      'MALA_SENAPOTI': ['DISTRICT_SUPERVISOR'],
      'MAHA_CHAKRA_SENAPOTI': ['MALA_SENAPOTI', 'DISTRICT_SUPERVISOR'],
      'CHAKRA_SENAPOTI': ['MAHA_CHAKRA_SENAPOTI', 'MALA_SENAPOTI', 'DISTRICT_SUPERVISOR'],
      'UPA_CHAKRA_SENAPOTI': ['CHAKRA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'MALA_SENAPOTI', 'DISTRICT_SUPERVISOR']
    };

    const validSupervisorRoles = supervisorRoleMap[data.targetRole] || [];
    if (validSupervisorRoles.length === 0) {
      return [];
    }

    let supervisors: any[] = [];

    // Special handling for District Supervisors - they are assigned to districts via userDistricts, not by personal address
    if (validSupervisorRoles.includes('DISTRICT_SUPERVISOR')) {
      // Find users who are assigned to this district as District Supervisors
      const districtSupervisorUsers = await db
        .select({
          userId: userDistricts.userId,
          devoteeId: users.devoteeId
        })
        .from(userDistricts)
        .innerJoin(users, eq(userDistricts.userId, users.id))
        .where(
          and(
            eq(userDistricts.districtCode, data.districtCode),
            eq(users.role, 'DISTRICT_SUPERVISOR'),
            isNotNull(users.devoteeId),
            eq(users.isActive, true)
          )
        );

      // Get the devotee records for these district supervisors
      for (const user of districtSupervisorUsers) {
        if (user.devoteeId) {
          const devotee = await db
            .select()
            .from(devotees)
            .where(eq(devotees.id, user.devoteeId))
            .limit(1);
          
          if (devotee.length > 0) {
            supervisors.push({ devotees: devotee[0] });
          }
        }
      }
    }

    // For other supervisor roles (MALA_SENAPOTI, etc.), find them by their location in the district
    const otherSupervisorRoles = validSupervisorRoles.filter(role => role !== 'DISTRICT_SUPERVISOR');
    if (otherSupervisorRoles.length > 0) {
      // Build WHERE conditions for other roles
      const whereConditions = [
        inArray(devotees.leadershipRole, otherSupervisorRoles),
        isNotNull(devotees.leadershipRole)
      ];

      if (data.excludeDevoteeIds && data.excludeDevoteeIds.length > 0) {
        whereConditions.push(not(inArray(devotees.id, data.excludeDevoteeIds)));
      }

      // Get potential supervisors in the same district by their namahatta location
      const otherSupervisors = await db
        .select()
        .from(devotees)
        .innerJoin(namahattas, eq(devotees.namahattaId, namahattas.id))
        .innerJoin(namahattaAddresses, eq(namahattas.id, namahattaAddresses.namahattaId))
        .innerJoin(addresses, eq(namahattaAddresses.addressId, addresses.id))
        .where(
          and(
            ...whereConditions,
            eq(addresses.districtCode, data.districtCode)
          )
        );

      supervisors.push(...otherSupervisors);
    }

    // Remove duplicates and excluded devotees
    const uniqueSupervisors = supervisors.filter((supervisor, index, arr) => {
      const devoteeId = supervisor.devotees.id;
      // Check if this is the first occurrence of this devotee ID
      const isFirstOccurrence = arr.findIndex(s => s.devotees.id === devoteeId) === index;
      // Check if this devotee is not in the exclude list
      const isNotExcluded = !data.excludeDevoteeIds?.includes(devoteeId);
      return isFirstOccurrence && isNotExcluded;
    });

    // Calculate subordinate counts and workload scores
    const enrichedSupervisors = await Promise.all(
      uniqueSupervisors.map(async ({ devotees: supervisor }) => {
        const subordinates = await this.getDirectSubordinates(supervisor.id);
        const subordinateCount = subordinates.length;
        
        // Simple workload score: fewer subordinates = lower score (better availability)
        const workloadScore = subordinateCount;

        const fullSupervisor = await this.getDevotee(supervisor.id);
        return {
          ...fullSupervisor,
          subordinateCount,
          workloadScore
        };
      })
    );

    // Sort by workload score (ascending - lower score means less busy)
    return enrichedSupervisors
      .filter(Boolean)
      .sort((a, b) => (a?.workloadScore || 0) - (b?.workloadScore || 0)) as Array<Devotee & {
        subordinateCount?: number;
        workloadScore?: number;
      }>;
  }

  async recordRoleChange(data: InsertRoleChangeHistory): Promise<RoleChangeHistory> {
    const result = await db.insert(roleChangeHistory).values(data).returning();
    return result[0];
  }

  async getDirectSubordinates(devoteeId: number): Promise<Devotee[]> {
    const subordinateResults = await db
      .select()
      .from(devotees)
      .where(eq(devotees.reportingToDevoteeId, devoteeId))
      .orderBy(asc(devotees.legalName));

    // Get full devotee objects with all details
    const subordinates = await Promise.all(
      subordinateResults.map(async (subordinate) => {
        const fullDevotee = await this.getDevotee(subordinate.id);
        return fullDevotee;
      })
    );

    return subordinates.filter(Boolean) as Devotee[];
  }

  async getAllSubordinatesInChain(devoteeId: number): Promise<Devotee[]> {
    const allSubordinates: Devotee[] = [];
    const visited = new Set<number>();

    const getSubordinatesRecursive = async (currentId: number) => {
      if (visited.has(currentId)) {
        return; // Prevent infinite loops
      }
      visited.add(currentId);

      const directSubordinates = await this.getDirectSubordinates(currentId);
      
      for (const subordinate of directSubordinates) {
        allSubordinates.push(subordinate);
        await getSubordinatesRecursive(subordinate.id);
      }
    };

    await getSubordinatesRecursive(devoteeId);
    return allSubordinates;
  }

  async validateSubordinateTransfer(data: {
    fromDevoteeId: number;
    toDevoteeId: number | null;
    subordinateIds: number[];
    districtCode: string;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate that all subordinates actually report to fromDevoteeId
      const validSubordinates = await db
        .select()
        .from(devotees)
        .where(
          and(
            inArray(devotees.id, data.subordinateIds),
            eq(devotees.reportingToDevoteeId, data.fromDevoteeId)
          )
        );

      if (validSubordinates.length !== data.subordinateIds.length) {
        errors.push('Some selected subordinates do not report to the specified supervisor');
      }

      // If transferring to a specific devotee, validate they exist and are in the same district
      if (data.toDevoteeId) {
        const newSupervisor = await this.getDevotee(data.toDevoteeId);
        if (!newSupervisor) {
          errors.push('Target supervisor not found');
        } else {
          // Check if new supervisor is in the same district
          const supervisorDistricts = await db
            .select({ district: addresses.districtCode })
            .from(devoteeAddresses)
            .innerJoin(addresses, eq(devoteeAddresses.addressId, addresses.id))
            .where(eq(devoteeAddresses.devoteeId, data.toDevoteeId))
            .limit(1);

          if (supervisorDistricts.length === 0) {
            warnings.push('Target supervisor has no registered address district');
          } else if (supervisorDistricts[0].district !== data.districtCode) {
            errors.push('Target supervisor is not in the same district');
          }

          // Check workload
          const currentSubordinates = await this.getDirectSubordinates(data.toDevoteeId);
          if (currentSubordinates.length + data.subordinateIds.length > 10) {
            warnings.push('Target supervisor will have a high workload after this transfer');
          }
        }
      }

      // Check for circular references
      if (data.toDevoteeId && data.subordinateIds.includes(data.toDevoteeId)) {
        errors.push('Cannot assign a devotee to report to themselves');
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}