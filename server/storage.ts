import { Devotee, InsertDevotee, Namahatta, InsertNamahatta, DevotionalStatus, InsertDevotionalStatus, Shraddhakutir, InsertShraddhakutir, NamahattaUpdate, InsertNamahattaUpdate, Leader, StatusHistory, User, InsertUser, RoleChangeHistory, InsertRoleChangeHistory } from "@shared/schema";
import { IStorage } from "./storage-fresh";

// Import Gurudev type
import { Gurudev, InsertGurudev } from "@shared/schema";

// Memory storage implementation for the migration
export class MemStorage implements IStorage {
  private devotees: Devotee[] = [];
  private namahattas: Namahatta[] = [];
  private devotionalStatuses: DevotionalStatus[] = [];
  private shraddhakutirs: Shraddhakutir[] = [];
  private namahattaUpdates: NamahattaUpdate[] = [];
  private leaders: Leader[] = [];
  private statusHistory: StatusHistory[] = [];
  private gurudevs: Gurudev[] = [];
  private users: User[] = [];
  private nextId = 1;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with some sample data
    this.devotionalStatuses = [
      { id: 1, name: "Shraddhavan", createdAt: new Date() },
      { id: 2, name: "Sadhusangi", createdAt: new Date() },
      { id: 3, name: "Gour/Krishna Sevak", createdAt: new Date() },
      { id: 4, name: "Gour/Krishna Sadhak", createdAt: new Date() },
      { id: 5, name: "Sri Guru Charan Asraya", createdAt: new Date() },
      { id: 6, name: "Harinam Diksha", createdAt: new Date() },
      { id: 7, name: "Pancharatrik Diksha", createdAt: new Date() }
    ];

    this.leaders = [
      { id: 1, name: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada", role: "FOUNDER_ACHARYA", reportingTo: null, location: { country: "India" }, createdAt: new Date() },
      { id: 2, name: "His Holiness Jayapataka Swami", role: "GBC", reportingTo: 1, location: { country: "India" }, createdAt: new Date() },
      { id: 3, name: "HH Gauranga Prem Swami", role: "REGIONAL_DIRECTOR", reportingTo: 2, location: { country: "India", state: "West Bengal" }, createdAt: new Date() },
      { id: 4, name: "HG Nitai Gauranga Das", role: "DISTRICT_SUPERVISOR", reportingTo: 3, location: { country: "India", state: "West Bengal", district: "Bankura" }, createdAt: new Date() },
      { id: 5, name: "HG Chaitanya Das", role: "DISTRICT_SUPERVISOR", reportingTo: 3, location: { country: "India", state: "West Bengal", district: "Nadia" }, createdAt: new Date() }
    ];

    this.shraddhakutirs = [
      { id: 1, name: "Mayapur Shraddhakutir", districtCode: "NADIA", createdAt: new Date() },
      { id: 2, name: "Kolkata Shraddhakutir", districtCode: "KOLKATA", createdAt: new Date() }
    ];

    this.gurudevs = [
      { id: 1, name: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada", title: "His Divine Grace", createdAt: new Date() },
      { id: 2, name: "His Holiness Jayapataka Swami", title: "His Holiness", createdAt: new Date() },
      { id: 3, name: "His Grace Nitai Gauranga Das", title: "His Grace", createdAt: new Date() }
    ];

    this.users = [
      { 
        id: 1, 
        username: "nitai.gauranga", 
        passwordHash: "dummy_hash", 
        fullName: "HG Nitai Gauranga Das", 
        email: "nitai.gauranga@example.com", 
        role: "DISTRICT_SUPERVISOR",
        devoteeId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 2, 
        username: "chaitanya.das", 
        passwordHash: "dummy_hash", 
        fullName: "HG Chaitanya Das", 
        email: "chaitanya.das@example.com", 
        role: "DISTRICT_SUPERVISOR",
        devoteeId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.nextId = 10;
  }

  // Devotees
  async getDevotees(page = 1, size = 10, filters: any = {}): Promise<{ data: Devotee[], total: number }> {
    let filteredDevotees = [...this.devotees];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredDevotees = filteredDevotees.filter(d => 
        d.legalName.toLowerCase().includes(searchLower) ||
        (d.name && d.name.toLowerCase().includes(searchLower))
      );
    }

    const total = filteredDevotees.length;
    const offset = (page - 1) * size;
    const data = filteredDevotees.slice(offset, offset + size);

    return { data, total };
  }

  async getDevotee(id: number): Promise<Devotee | undefined> {
    return this.devotees.find(d => d.id === id);
  }

  async createDevotee(devotee: InsertDevotee): Promise<Devotee> {
    const newDevotee: Devotee = {
      id: this.nextId++,
      legalName: devotee.legalName,
      name: devotee.name || null,
      dob: devotee.dob || null,
      email: devotee.email || null,
      phone: devotee.phone || null,
      fatherName: devotee.fatherName || null,
      motherName: devotee.motherName || null,
      husbandName: devotee.husbandName || null,
      gender: devotee.gender || null,
      bloodGroup: devotee.bloodGroup || null,
      maritalStatus: devotee.maritalStatus || null,
      devotionalStatusId: devotee.devotionalStatusId || null,
      namahattaId: devotee.namahattaId || null,
      harinamInitiationGurudevId: devotee.harinamInitiationGurudevId || null,
      pancharatrikInitiationGurudevId: devotee.pancharatrikInitiationGurudevId || null,
      initiatedName: devotee.initiatedName || null,
      harinamDate: devotee.harinamDate || null,
      pancharatrikDate: devotee.pancharatrikDate || null,
      education: devotee.education || null,
      occupation: devotee.occupation || null,
      devotionalCourses: devotee.devotionalCourses as any || null,
      additionalComments: devotee.additionalComments || null,
      shraddhakutirId: devotee.shraddhakutirId || null,
      // Leadership fields
      leadershipRole: devotee.leadershipRole || null,
      reportingToDevoteeId: devotee.reportingToDevoteeId || null,
      hasSystemAccess: devotee.hasSystemAccess || false,
      appointedDate: devotee.appointedDate || null,
      appointedBy: devotee.appointedBy || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.devotees.push(newDevotee);
    return newDevotee;
  }

  async createDevoteeForNamahatta(devotee: InsertDevotee, namahattaId: number): Promise<Devotee> {
    return this.createDevotee({ ...devotee, namahattaId });
  }

  async updateDevotee(id: number, devotee: Partial<InsertDevotee>): Promise<Devotee> {
    const index = this.devotees.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Devotee not found');
    
    const existing = this.devotees[index];
    this.devotees[index] = { 
      ...existing, 
      legalName: devotee.legalName || existing.legalName,
      name: devotee.name !== undefined ? devotee.name : existing.name,
      dob: devotee.dob !== undefined ? devotee.dob : existing.dob,
      email: devotee.email !== undefined ? devotee.email : existing.email,
      phone: devotee.phone !== undefined ? devotee.phone : existing.phone,
      fatherName: devotee.fatherName !== undefined ? devotee.fatherName : existing.fatherName,
      motherName: devotee.motherName !== undefined ? devotee.motherName : existing.motherName,
      husbandName: devotee.husbandName !== undefined ? devotee.husbandName : existing.husbandName,
      gender: devotee.gender !== undefined ? devotee.gender : existing.gender,
      bloodGroup: devotee.bloodGroup !== undefined ? devotee.bloodGroup : existing.bloodGroup,
      maritalStatus: devotee.maritalStatus !== undefined ? devotee.maritalStatus : existing.maritalStatus,
      devotionalStatusId: devotee.devotionalStatusId !== undefined ? devotee.devotionalStatusId : existing.devotionalStatusId,
      namahattaId: devotee.namahattaId !== undefined ? devotee.namahattaId : existing.namahattaId,
      harinamInitiationGurudevId: devotee.harinamInitiationGurudevId !== undefined ? devotee.harinamInitiationGurudevId : existing.harinamInitiationGurudevId,
      pancharatrikInitiationGurudevId: devotee.pancharatrikInitiationGurudevId !== undefined ? devotee.pancharatrikInitiationGurudevId : existing.pancharatrikInitiationGurudevId,
      initiatedName: devotee.initiatedName !== undefined ? devotee.initiatedName : existing.initiatedName,
      harinamDate: devotee.harinamDate !== undefined ? devotee.harinamDate : existing.harinamDate,
      pancharatrikDate: devotee.pancharatrikDate !== undefined ? devotee.pancharatrikDate : existing.pancharatrikDate,
      education: devotee.education !== undefined ? devotee.education : existing.education,
      occupation: devotee.occupation !== undefined ? devotee.occupation : existing.occupation,
      devotionalCourses: devotee.devotionalCourses !== undefined ? devotee.devotionalCourses as any : existing.devotionalCourses,
      additionalComments: devotee.additionalComments !== undefined ? devotee.additionalComments : existing.additionalComments,
      shraddhakutirId: devotee.shraddhakutirId !== undefined ? devotee.shraddhakutirId : existing.shraddhakutirId,
      // Leadership fields
      leadershipRole: devotee.leadershipRole !== undefined ? devotee.leadershipRole : existing.leadershipRole,
      reportingToDevoteeId: devotee.reportingToDevoteeId !== undefined ? devotee.reportingToDevoteeId : existing.reportingToDevoteeId,
      hasSystemAccess: devotee.hasSystemAccess !== undefined ? devotee.hasSystemAccess : existing.hasSystemAccess,
      appointedDate: devotee.appointedDate !== undefined ? devotee.appointedDate : existing.appointedDate,
      appointedBy: devotee.appointedBy !== undefined ? devotee.appointedBy : existing.appointedBy,
      updatedAt: new Date()
    };
    return this.devotees[index];
  }

  async getDevoteesByNamahatta(namahattaId: number, page = 1, size = 10, statusId?: number): Promise<{ data: Devotee[], total: number }> {
    let filteredDevotees = this.devotees.filter(d => d.namahattaId === namahattaId);
    
    if (statusId) {
      filteredDevotees = filteredDevotees.filter(d => d.devotionalStatusId === statusId);
    }

    const total = filteredDevotees.length;
    const offset = (page - 1) * size;
    const data = filteredDevotees.slice(offset, offset + size);

    return { data, total };
  }

  async upgradeDevoteeStatus(id: number, newStatusId: number, notes?: string): Promise<void> {
    const devotee = this.devotees.find(d => d.id === id);
    if (!devotee) throw new Error('Devotee not found');

    const oldStatus = devotee.devotionalStatusId;
    devotee.devotionalStatusId = newStatusId;
    devotee.updatedAt = new Date();

    // Add to status history
    this.statusHistory.push({
      id: this.nextId++,
      devoteeId: id,
      previousStatus: oldStatus?.toString() || null,
      newStatus: newStatusId.toString(),
      updatedAt: new Date(),
      comment: notes || null
    });
  }

  async getDevoteeStatusHistory(id: number): Promise<StatusHistory[]> {
    return this.statusHistory.filter(h => h.devoteeId === id);
  }

  // Namahattas
  async getNamahattas(page = 1, size = 10, filters: any = {}): Promise<{ data: Namahatta[], total: number }> {
    let filteredNamahattas = [...this.namahattas];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredNamahattas = filteredNamahattas.filter(n => 
        n.name.toLowerCase().includes(searchLower) ||
        n.code.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredNamahattas.length;
    const offset = (page - 1) * size;
    const data = filteredNamahattas.slice(offset, offset + size);

    return { data, total };
  }

  async getNamahatta(id: number): Promise<Namahatta | undefined> {
    return this.namahattas.find(n => n.id === id);
  }

  async createNamahatta(namahatta: InsertNamahatta): Promise<Namahatta> {
    const newNamahatta: Namahatta = {
      id: this.nextId++,
      name: namahatta.name,
      code: namahatta.code,
      meetingDay: namahatta.meetingDay || null,
      meetingTime: namahatta.meetingTime || null,
      malaSenapotiId: namahatta.malaSenapotiId || null,
      mahaChakraSenapotiId: namahatta.mahaChakraSenapotiId || null,
      chakraSenapotiId: namahatta.chakraSenapotiId || null,
      upaChakraSenapotiId: namahatta.upaChakraSenapotiId || null,
      secretaryId: namahatta.secretaryId || null,
      presidentId: namahatta.presidentId || null,
      accountantId: namahatta.accountantId || null,
      districtSupervisorId: namahatta.districtSupervisorId,
      status: namahatta.status || "PENDING_APPROVAL",
      registrationNo: namahatta.registrationNo || null,
      registrationDate: namahatta.registrationDate || null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Namahatta;
    this.namahattas.push(newNamahatta);
    
    // Update devotees assigned to leadership positions to link them to this namahatta
    // Only update the devotee table if they are not already tagged to another namahatta
    const updateDevotee = (devoteeId: number | null, leadershipRole: string) => {
      if (devoteeId) {
        const devotee = this.devotees.find(d => d.id === devoteeId);
        if (devotee) {
          // Only assign to the new namahatta if devotee is not already assigned to another namahatta
          if (!devotee.namahattaId) {
            devotee.namahattaId = newNamahatta.id;
            devotee.leadershipRole = leadershipRole;
            devotee.updatedAt = new Date();
          }
          // Note: The namahatta table itself will always have the role assignment
          // regardless of whether the devotee is assigned or not
        }
      }
    };
    
    // Update all assigned devotees
    updateDevotee(namahatta.malaSenapotiId, 'MALA_SENAPOTI');
    updateDevotee(namahatta.mahaChakraSenapotiId, 'MAHA_CHAKRA_SENAPOTI');
    updateDevotee(namahatta.chakraSenapotiId, 'CHAKRA_SENAPOTI');
    updateDevotee(namahatta.upaChakraSenapotiId, 'UPA_CHAKRA_SENAPOTI');
    updateDevotee(namahatta.secretaryId, 'SECRETARY');
    updateDevotee(namahatta.presidentId, 'PRESIDENT');
    updateDevotee(namahatta.accountantId, 'ACCOUNTANT');
    
    return newNamahatta;
  }

  async updateNamahatta(id: number, namahatta: Partial<InsertNamahatta>): Promise<Namahatta> {
    const index = this.namahattas.findIndex(n => n.id === id);
    if (index === -1) throw new Error('Namahatta not found');
    
    this.namahattas[index] = { ...this.namahattas[index], ...namahatta, updatedAt: new Date() } as Namahatta;
    return this.namahattas[index];
  }

  async approveNamahatta(id: number, registrationNo: string, registrationDate: string): Promise<void> {
    const index = this.namahattas.findIndex(n => n.id === id);
    if (index !== -1) {
      this.namahattas[index] = {
        ...this.namahattas[index],
        status: "APPROVED",
        registrationNo,
        registrationDate,
        updatedAt: new Date()
      } as Namahatta;
    }
  }

  async checkRegistrationNoExists(registrationNo: string): Promise<boolean> {
    return this.namahattas.some(n => n.registrationNo === registrationNo);
  }

  async rejectNamahatta(id: number, reason?: string): Promise<void> {
    await this.updateNamahatta(id, { status: "REJECTED" });
  }

  async getNamahattaUpdates(id: number): Promise<NamahattaUpdate[]> {
    return this.namahattaUpdates.filter(u => u.namahattaId === id);
  }

  async getNamahattaDevoteeStatusCount(id: number): Promise<Record<string, number>> {
    const devotees = this.devotees.filter(d => d.namahattaId === id);
    const statusCounts: Record<string, number> = {};
    
    for (const devotee of devotees) {
      if (devotee.devotionalStatusId) {
        const status = this.devotionalStatuses.find(s => s.id === devotee.devotionalStatusId);
        if (status) {
          statusCounts[status.name] = (statusCounts[status.name] || 0) + 1;
        }
      }
    }
    
    return statusCounts;
  }

  async getNamahattaStatusHistory(id: number, page = 1, size = 10): Promise<{ data: StatusHistory[], total: number }> {
    const devotees = this.devotees.filter(d => d.namahattaId === id);
    const devoteeIds = devotees.map(d => d.id);
    const history = this.statusHistory.filter(h => devoteeIds.includes(h.devoteeId));
    
    const total = history.length;
    const offset = (page - 1) * size;
    const data = history.slice(offset, offset + size);

    return { data, total };
  }

  // Statuses
  async getDevotionalStatuses(): Promise<DevotionalStatus[]> {
    return [...this.devotionalStatuses];
  }

  async createDevotionalStatus(status: InsertDevotionalStatus): Promise<DevotionalStatus> {
    const newStatus: DevotionalStatus = {
      ...status,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.devotionalStatuses.push(newStatus);
    return newStatus;
  }

  async renameDevotionalStatus(id: number, newName: string): Promise<void> {
    const status = this.devotionalStatuses.find(s => s.id === id);
    if (status) {
      status.name = newName;
    }
  }

  // Shraddhakutirs
  async getShraddhakutirs(district?: string): Promise<Shraddhakutir[]> {
    let filteredShraddhakutirs = [...this.shraddhakutirs];
    
    if (district) {
      filteredShraddhakutirs = filteredShraddhakutirs.filter(s => s.districtCode === district);
    }
    
    return filteredShraddhakutirs;
  }

  async createShraddhakutir(shraddhakutir: InsertShraddhakutir): Promise<Shraddhakutir> {
    const newShraddhakutir: Shraddhakutir = {
      ...shraddhakutir,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.shraddhakutirs.push(newShraddhakutir);
    return newShraddhakutir;
  }

  // Gurudevs
  async getGurudevs(): Promise<Gurudev[]> {
    return [...this.gurudevs];
  }

  async createGurudev(gurudev: InsertGurudev): Promise<Gurudev> {
    const newGurudev: Gurudev = {
      id: this.nextId++,
      name: gurudev.name,
      title: gurudev.title || null,
      createdAt: new Date()
    };
    this.gurudevs.push(newGurudev);
    return newGurudev;
  }

  // Updates
  async createNamahattaUpdate(update: InsertNamahattaUpdate): Promise<NamahattaUpdate> {
    const newUpdate: NamahattaUpdate = {
      id: this.nextId++,
      namahattaId: update.namahattaId,
      programType: update.programType,
      date: update.date,
      attendance: update.attendance,
      prasadDistribution: update.prasadDistribution || null,
      nagarKirtan: update.nagarKirtan || null,
      bookDistribution: update.bookDistribution || null,
      chanting: update.chanting || null,
      arati: update.arati || null,
      bhagwatPath: update.bhagwatPath || null,
      imageUrls: update.imageUrls as any || null,
      facebookLink: update.facebookLink || null,
      youtubeLink: update.youtubeLink || null,
      specialAttraction: update.specialAttraction || null,
      createdAt: new Date()
    };
    this.namahattaUpdates.push(newUpdate);
    return newUpdate;
  }

  async getAllUpdates(): Promise<Array<NamahattaUpdate & { namahattaName: string }>> {
    return this.namahattaUpdates.map(update => {
      const namahatta = this.namahattas.find(n => n.id === update.namahattaId);
      return {
        ...update,
        namahattaName: namahatta?.name || 'Unknown'
      };
    });
  }

  // Hierarchy
  async getTopLevelHierarchy(): Promise<{
    founder: Leader[];
    gbc: Leader[];
    regionalDirectors: Leader[];
    coRegionalDirectors: Leader[];
  }> {
    return {
      founder: this.leaders.filter(l => l.role === "FOUNDER_ACHARYA"),
      gbc: this.leaders.filter(l => l.role === "GBC"),
      regionalDirectors: this.leaders.filter(l => l.role === "REGIONAL_DIRECTOR"),
      coRegionalDirectors: this.leaders.filter(l => l.role === "CO_REGIONAL_DIRECTOR")
    };
  }

  async getLeadersByLevel(level: string): Promise<Leader[]> {
    return this.leaders.filter(l => l.role === level);
  }

  // Dashboard
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
    const recentUpdates = this.namahattaUpdates
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 5)
      .map(update => {
        const namahatta = this.namahattas.find(n => n.id === update.namahattaId);
        return {
          namahattaId: update.namahattaId,
          namahattaName: namahatta?.name || 'Unknown',
          programType: update.programType,
          date: update.date,
          attendance: update.attendance
        };
      });

    return {
      totalDevotees: this.devotees.length,
      totalNamahattas: this.namahattas.length,
      recentUpdates
    };
  }

  async getStatusDistribution(): Promise<Array<{
    statusName: string;
    count: number;
    percentage: number;
  }>> {
    const total = this.devotees.length;
    const distribution = this.devotionalStatuses.map(status => {
      const count = this.devotees.filter(d => d.devotionalStatusId === status.id).length;
      return {
        statusName: status.name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      };
    });

    return distribution;
  }

  // Geography - Basic implementation for migration
  async getCountries(): Promise<string[]> {
    return ["India"];
  }

  async getStates(country?: string): Promise<string[]> {
    return ["West Bengal", "Odisha", "Bihar"];
  }

  async getDistricts(state?: string): Promise<string[]> {
    if (state === "West Bengal") {
      return ["Nadia", "Kolkata", "North 24 Parganas"];
    }
    return ["Sample District"];
  }

  async getSubDistricts(district?: string, pincode?: string): Promise<string[]> {
    return ["Sample Sub-District"];
  }

  async getVillages(subDistrict?: string, pincode?: string): Promise<string[]> {
    return ["Sample Village"];
  }

  async getPincodes(village?: string, district?: string, subDistrict?: string): Promise<string[]> {
    return ["700001", "700002", "700003"];
  }

  async searchPincodes(country: string, searchTerm: string, page: number, limit: number): Promise<{ pincodes: string[]; total: number; hasMore: boolean }> {
    const allPincodes = ["700001", "700002", "700003", "734001", "734002"];
    let filteredPincodes = allPincodes;
    
    if (searchTerm) {
      filteredPincodes = allPincodes.filter(p => p.includes(searchTerm));
    }
    
    const offset = (page - 1) * limit;
    const pincodes = filteredPincodes.slice(offset, offset + limit);
    const hasMore = offset + limit < filteredPincodes.length;
    
    return { pincodes, total: filteredPincodes.length, hasMore };
  }

  async getAddressByPincode(pincode: string): Promise<{ country: string; state: string; district: string; subDistricts: string[]; villages: string[] } | null> {
    // Basic mapping for migration
    const addressMap: Record<string, { country: string; state: string; district: string; subDistricts: string[]; villages: string[] }> = {
      "700001": { country: "India", state: "West Bengal", district: "Kolkata", subDistricts: ["Kolkata North"], villages: ["Kolkata City"] },
      "700002": { country: "India", state: "West Bengal", district: "Kolkata", subDistricts: ["Salt Lake"], villages: ["Salt Lake"] },
      "734001": { country: "India", state: "West Bengal", district: "Nadia", subDistricts: ["Mayapur"], villages: ["Mayapur"] }
    };
    
    return addressMap[pincode] || null;
  }

  // Map data methods - Basic implementation for migration
  async getNamahattaCountsByCountry(): Promise<Array<{ country: string; count: number }>> {
    return [{ country: "India", count: this.namahattas.length }];
  }

  async getNamahattaCountsByState(country?: string): Promise<Array<{ state: string; country: string; count: number }>> {
    return [
      { state: "West Bengal", country: "India", count: Math.floor(this.namahattas.length * 0.6) },
      { state: "Odisha", country: "India", count: Math.floor(this.namahattas.length * 0.4) }
    ];
  }

  async getNamahattaCountsByDistrict(state?: string): Promise<Array<{ district: string; state: string; country: string; count: number }>> {
    if (state === "West Bengal") {
      return [
        { district: "Nadia", state: "West Bengal", country: "India", count: Math.floor(this.namahattas.length * 0.3) },
        { district: "Kolkata", state: "West Bengal", country: "India", count: Math.floor(this.namahattas.length * 0.3) }
      ];
    }
    return [{ district: "Sample District", state: state || "Sample State", country: "India", count: this.namahattas.length }];
  }

  async getNamahattaCountsBySubDistrict(district?: string): Promise<Array<{ subDistrict: string; district: string; state: string; country: string; count: number }>> {
    return [{ subDistrict: "Sample Sub-District", district: district || "Sample District", state: "Sample State", country: "India", count: this.namahattas.length }];
  }

  async getNamahattaCountsByVillage(subDistrict?: string): Promise<Array<{ village: string; subDistrict: string; district: string; state: string; country: string; count: number }>> {
    return [{ village: "Sample Village", subDistrict: subDistrict || "Sample Sub-District", district: "Sample District", state: "Sample State", country: "India", count: this.namahattas.length }];
  }

  // Admin functions
  async createDistrictSupervisor(data: {
    username: string;
    fullName: string;
    email: string;
    password: string;
    districts: string[];
  }): Promise<{ user: any; districts: string[] }> {
    const newUser: User = {
      id: this.nextId++,
      username: data.username,
      passwordHash: `hashed_${data.password}`,
      fullName: data.fullName,
      email: data.email,
      role: "DISTRICT_SUPERVISOR",
      devoteeId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(newUser);
    // For memory storage, we'll simulate district management by returning the districts array
    // In a real implementation, this would be stored in a separate userDistricts table
    return { user: newUser, districts: data.districts };
  }

  async getAllUsers(): Promise<any[]> {
    return [...this.users];
  }

  async getAvailableDistricts(): Promise<Array<{ code: string; name: string }>> {
    return [
      { code: "NADIA", name: "Nadia" },
      { code: "KOLKATA", name: "Kolkata" },
      { code: "BANKURA", name: "Bankura" }
    ];
  }

  async getDistrictSupervisors(district: string): Promise<Array<{ id: number; username: string; fullName: string; email: string; isDefault: boolean }>> {
    // For memory storage, return all district supervisors (simplified implementation)
    return this.users.filter(u => u.role === "DISTRICT_SUPERVISOR" && u.isActive).map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      isDefault: false // Memory storage doesn't track default flag - always false
    }));
  }

  async validateDistrictSupervisor(supervisorId: number, district: string): Promise<boolean> {
    const user = this.users.find(u => u.id === supervisorId);
    // For memory storage, assume all active district supervisors are valid for any district
    return user ? (user.role === "DISTRICT_SUPERVISOR" && user.isActive === true) : false;
  }

  async getUserAddressDefaults(userId: number): Promise<{ country?: string; state?: string; district?: string }> {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return { country: "India" };
    }
    
    // For memory storage, return default values (simplified implementation)
    return {
      country: "India",
      state: "West Bengal", // Default for this implementation
      district: "Nadia" // Default district
    };
  }

  // Leadership Management - Stub implementations for memory storage
  async getDevoteeLeaders(page = 1, size = 10, filters: any = {}): Promise<{ data: Array<Devotee & { reportingToName?: string }>, total: number }> {
    let leaders = this.devotees.filter(d => d.leadershipRole);
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      leaders = leaders.filter(d => 
        d.legalName.toLowerCase().includes(searchLower) ||
        (d.name && d.name.toLowerCase().includes(searchLower)) ||
        (d.leadershipRole && d.leadershipRole.toLowerCase().includes(searchLower))
      );
    }

    if (filters.role) {
      leaders = leaders.filter(d => d.leadershipRole === filters.role);
    }

    const total = leaders.length;
    const offset = (page - 1) * size;
    const data = leaders.slice(offset, offset + size).map(leader => {
      const reportingTo = leader.reportingToDevoteeId ? 
        this.devotees.find(d => d.id === leader.reportingToDevoteeId) : null;
      return {
        ...leader,
        reportingToName: reportingTo?.name || reportingTo?.legalName
      };
    });

    return { data, total };
  }

  async getDevoteesByRole(role: string): Promise<Array<Devotee & { reportingToName?: string }>> {
    const leaders = this.devotees.filter(d => d.leadershipRole === role);
    return leaders.map(leader => {
      const reportingTo = leader.reportingToDevoteeId ? 
        this.devotees.find(d => d.id === leader.reportingToDevoteeId) : null;
      return {
        ...leader,
        reportingToName: reportingTo?.name || reportingTo?.legalName
      };
    });
  }

  async assignLeadershipRole(devoteeId: number, data: {
    leadershipRole: string;
    reportingToDevoteeId?: number;
    hasSystemAccess: boolean;
    appointedBy: number;
    appointedDate: string;
  }): Promise<Devotee> {
    const index = this.devotees.findIndex(d => d.id === devoteeId);
    if (index === -1) throw new Error('Devotee not found');
    
    this.devotees[index] = {
      ...this.devotees[index],
      leadershipRole: data.leadershipRole,
      reportingToDevoteeId: data.reportingToDevoteeId || null,
      hasSystemAccess: data.hasSystemAccess,
      appointedBy: data.appointedBy,
      appointedDate: data.appointedDate,
      updatedAt: new Date()
    };
    
    return this.devotees[index];
  }

  async removeLeadershipRole(devoteeId: number): Promise<Devotee> {
    const index = this.devotees.findIndex(d => d.id === devoteeId);
    if (index === -1) throw new Error('Devotee not found');
    
    this.devotees[index] = {
      ...this.devotees[index],
      leadershipRole: null,
      reportingToDevoteeId: null,
      hasSystemAccess: false,
      appointedBy: null,
      appointedDate: null,
      updatedAt: new Date()
    };
    
    return this.devotees[index];
  }

  async getLeadershipHierarchy(): Promise<Array<{
    id: number;
    name: string;
    legalName: string;
    leadershipRole: string;
    reportingToDevoteeId?: number;
    children: Array<any>;
  }>> {
    const leaders = this.devotees.filter(d => d.leadershipRole);
    const hierarchy = leaders.map(leader => ({
      id: leader.id,
      name: leader.name || leader.legalName,
      legalName: leader.legalName,
      leadershipRole: leader.leadershipRole!,
      reportingToDevoteeId: leader.reportingToDevoteeId || undefined,
      children: [] as Array<any>
    }));

    // Build hierarchy tree (simple version for memory storage)
    const hierarchyMap = new Map();
    hierarchy.forEach(item => hierarchyMap.set(item.id, item));
    
    const roots: Array<any> = [];
    hierarchy.forEach(item => {
      if (item.reportingToDevoteeId && hierarchyMap.has(item.reportingToDevoteeId)) {
        hierarchyMap.get(item.reportingToDevoteeId).children.push(item);
      } else {
        roots.push(item);
      }
    });

    return roots;
  }

  async getAvailableDevoteesForOfficerPositions(): Promise<Devotee[]> {
    // Get all devotee IDs that are currently assigned as Secretary, President, or Accountant
    const assignedDevoteeIds = new Set<number>();
    this.namahattas.forEach(namahatta => {
      if (namahatta.secretaryId) assignedDevoteeIds.add(namahatta.secretaryId);
      if (namahatta.presidentId) assignedDevoteeIds.add(namahatta.presidentId);
      if (namahatta.accountantId) assignedDevoteeIds.add(namahatta.accountantId);
    });

    // Filter devotees who are available for officer positions
    const senapotiRoles = ['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'];
    
    return this.devotees.filter(devotee => 
      // Not assigned to any namahatta as a regular member
      !devotee.namahattaId &&
      // Don't have any senapoti leadership roles
      (!devotee.leadershipRole || !senapotiRoles.includes(devotee.leadershipRole)) &&
      // Not currently assigned as Secretary, President, or Accountant in any namahatta
      !assignedDevoteeIds.has(devotee.id)
    );
  }

  async getEligibleLeaders(): Promise<Devotee[]> {
    // Return devotees who could potentially be leaders (have higher devotional status)
    return this.devotees.filter(d => 
      d.devotionalStatusId && d.devotionalStatusId >= 5 // Sri Guru Charan Asraya or higher
    );
  }

  // User-Devotee Linking Methods (Memory Storage Stubs)

  async getDevoteeLinkedUser(devoteeId: number): Promise<User | null> {
    // Find user linked to this devotee
    const user = this.users.find(u => u.devoteeId === devoteeId && u.isActive);
    return user || null;
  }

  async getUserLinkedDevotee(userId: number): Promise<Devotee | null> {
    // Get user and check if they have a linked devotee
    const user = this.users.find(u => u.id === userId && u.isActive);
    if (!user || !user.devoteeId) {
      return null;
    }

    // Find the linked devotee
    const devotee = this.devotees.find(d => d.id === user.devoteeId);
    return devotee || null;
  }

  async linkUserToDevotee(userId: number, devoteeId: number, force: boolean = false): Promise<void> {
    // Find user
    const userIndex = this.users.findIndex(u => u.id === userId && u.isActive);
    if (userIndex === -1) {
      throw new Error(`User with ID ${userId} not found or inactive`);
    }

    const user = this.users[userIndex];

    // Find devotee
    const devotee = this.devotees.find(d => d.id === devoteeId);
    if (!devotee) {
      throw new Error(`Devotee with ID ${devoteeId} not found`);
    }

    // Check if user is already linked to a different devotee
    if (user.devoteeId && user.devoteeId !== devoteeId && !force) {
      throw new Error(`User is already linked to another devotee. Use force flag to override.`);
    }

    // Check if devotee is already linked to another user
    const existingUserLink = this.users.find(u => u.devoteeId === devoteeId && u.isActive && u.id !== userId);
    if (existingUserLink && !force) {
      throw new Error(`Devotee is already linked to another user. Use force flag to override.`);
    }

    // If force is enabled and devotee is linked to another user, unlink the other user first
    if (existingUserLink && force) {
      const existingUserIndex = this.users.findIndex(u => u.id === existingUserLink.id);
      if (existingUserIndex !== -1) {
        this.users[existingUserIndex] = {
          ...this.users[existingUserIndex],
          devoteeId: null,
          updatedAt: new Date()
        };
      }
    }

    // Update user to link to devotee
    this.users[userIndex] = {
      ...this.users[userIndex],
      devoteeId: devoteeId,
      updatedAt: new Date()
    };
  }

  async unlinkUserFromDevotee(userId: number): Promise<void> {
    // Find user
    const userIndex = this.users.findIndex(u => u.id === userId && u.isActive);
    if (userIndex === -1) {
      throw new Error(`User with ID ${userId} not found or inactive`);
    }

    // Remove devotee link from user
    this.users[userIndex] = {
      ...this.users[userIndex],
      devoteeId: null,
      updatedAt: new Date()
    };
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
    // Find devotee
    const devotee = this.devotees.find(d => d.id === devoteeId);
    if (!devotee) {
      throw new Error(`Devotee with ID ${devoteeId} not found`);
    }

    // Check if devotee is already linked to another user
    const existingUserLink = this.users.find(u => u.devoteeId === devoteeId && u.isActive);
    if (existingUserLink && !userData.force) {
      throw new Error(`Devotee is already linked to another user. Use force flag to override.`);
    }

    // Check if username already exists
    const existingUsername = this.users.find(u => u.username === userData.username);
    if (existingUsername) {
      throw new Error(`Username already exists`);
    }

    // Check if email already exists
    const existingEmail = this.users.find(u => u.email === userData.email);
    if (existingEmail) {
      throw new Error(`Email already exists`);
    }

    // If force is enabled and devotee is linked to another user, unlink the other user first
    if (existingUserLink && userData.force) {
      const existingUserIndex = this.users.findIndex(u => u.id === existingUserLink.id);
      if (existingUserIndex !== -1) {
        this.users[existingUserIndex] = {
          ...this.users[existingUserIndex],
          devoteeId: null,
          updatedAt: new Date()
        };
      }
    }

    // Create new user with devotee link, using devotee's legal name as fullName if not provided
    const newUser: User = {
      id: this.nextId++,
      username: userData.username,
      passwordHash: `hashed_${userData.password}`, // Simple hash simulation for memory storage
      fullName: userData.fullName || devotee.legalName,
      email: userData.email,
      role: userData.role,
      devoteeId: devoteeId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.push(newUser);
    return {
      user: newUser,
      devotee: devotee
    };
  }

  // Senapoti Role Management System - Memory Storage Stubs
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
    // Stub implementation for memory storage
    const devotee = await this.getDevotee(data.devoteeId);
    if (!devotee) throw new Error('Devotee not found');

    // Simple stub implementation
    const index = this.devotees.findIndex(d => d.id === data.devoteeId);
    if (index !== -1) {
      this.devotees[index].leadershipRole = data.newRole;
      this.devotees[index].reportingToDevoteeId = data.newReportingTo;
      this.devotees[index].updatedAt = new Date();
    }

    const roleChangeRecord: RoleChangeHistory = {
      id: this.nextId++,
      devoteeId: data.devoteeId,
      previousRole: devotee.leadershipRole || null,
      newRole: data.newRole,
      previousReportingTo: devotee.reportingToDevoteeId || null,
      newReportingTo: data.newReportingTo,
      changedBy: data.changedBy,
      reason: data.reason,
      districtCode: data.districtCode || null,
      subordinatesTransferred: 0,
      createdAt: new Date()
    };

    return {
      devotee: this.devotees[index],
      subordinatesTransferred: 0,
      roleChangeRecord
    };
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
    // Stub implementation for memory storage
    const transferred: Devotee[] = [];
    for (const subordinateId of data.subordinateIds) {
      const index = this.devotees.findIndex(d => d.id === subordinateId);
      if (index !== -1 && this.devotees[index].reportingToDevoteeId === data.fromDevoteeId) {
        this.devotees[index].reportingToDevoteeId = data.toDevoteeId;
        this.devotees[index].updatedAt = new Date();
        transferred.push(this.devotees[index]);
      }
    }

    return {
      transferred: transferred.length,
      subordinates: transferred
    };
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
    // Stub implementation - return empty array for memory storage
    return {
      data: [],
      total: 0
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
    // Stub implementation - return empty array for memory storage
    return [];
  }

  async recordRoleChange(data: InsertRoleChangeHistory): Promise<RoleChangeHistory> {
    // Stub implementation for memory storage
    const record: RoleChangeHistory = {
      id: this.nextId++,
      devoteeId: data.devoteeId,
      previousRole: data.previousRole || null,
      newRole: data.newRole || null,
      previousReportingTo: data.previousReportingTo || null,
      newReportingTo: data.newReportingTo || null,
      changedBy: data.changedBy,
      reason: data.reason,
      districtCode: data.districtCode || null,
      subordinatesTransferred: data.subordinatesTransferred || 0,
      createdAt: new Date()
    };
    return record;
  }

  async getDirectSubordinates(devoteeId: number): Promise<Devotee[]> {
    return this.devotees.filter(d => d.reportingToDevoteeId === devoteeId);
  }

  async getAllSubordinatesInChain(devoteeId: number): Promise<Devotee[]> {
    const allSubordinates: Devotee[] = [];
    const visited = new Set<number>();

    const getSubordinatesRecursive = (currentId: number) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const directSubordinates = this.devotees.filter(d => d.reportingToDevoteeId === currentId);
      for (const subordinate of directSubordinates) {
        allSubordinates.push(subordinate);
        getSubordinatesRecursive(subordinate.id);
      }
    };

    getSubordinatesRecursive(devoteeId);
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
    // Stub implementation for memory storage
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    const validSubordinates = this.devotees.filter(d =>
      data.subordinateIds.includes(d.id) && d.reportingToDevoteeId === data.fromDevoteeId
    );

    if (validSubordinates.length !== data.subordinateIds.length) {
      errors.push('Some subordinates do not report to the specified supervisor');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export the interface and storage instance
export { IStorage };
import { DatabaseStorage } from './storage-db';
export const storage = new DatabaseStorage();