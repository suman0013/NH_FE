import { Devotee, InsertDevotee, Namhatta, InsertNamhatta, DevotionalStatus, InsertDevotionalStatus, Shraddhakutir, InsertShraddhakutir, NamhattaUpdate, InsertNamhattaUpdate, Leader, StatusHistory } from "@shared/schema";

// Memory-based storage interface for the migration
export interface IStorage {
  // Devotees
  getDevotees(page?: number, size?: number, filters?: any): Promise<{ data: Devotee[], total: number }>;
  getDevotee(id: number): Promise<Devotee | undefined>;
  createDevotee(devotee: InsertDevotee): Promise<Devotee>;
  createDevoteeForNamhatta(devotee: InsertDevotee, namhattaId: number): Promise<Devotee>;
  updateDevotee(id: number, devotee: Partial<InsertDevotee>): Promise<Devotee>;
  getDevoteesByNamhatta(namhattaId: number, page?: number, size?: number, statusId?: number): Promise<{ data: Devotee[], total: number }>;
  upgradeDevoteeStatus(id: number, newStatusId: number, notes?: string): Promise<void>;
  getDevoteeStatusHistory(id: number): Promise<StatusHistory[]>;

  // Namhattas
  getNamhattas(page?: number, size?: number, filters?: any): Promise<{ data: Namhatta[], total: number }>;
  getNamhatta(id: number): Promise<Namhatta | undefined>;
  createNamhatta(namhatta: InsertNamhatta): Promise<Namhatta>;
  updateNamhatta(id: number, namhatta: Partial<InsertNamhatta>): Promise<Namhatta>;
  approveNamhatta(id: number): Promise<void>;
  rejectNamhatta(id: number, reason?: string): Promise<void>;
  getNamhattaUpdates(id: number): Promise<NamhattaUpdate[]>;
  getNamhattaDevoteeStatusCount(id: number): Promise<Record<string, number>>;
  getNamhattaStatusHistory(id: number, page?: number, size?: number): Promise<{ data: StatusHistory[], total: number }>;

  // Statuses
  getDevotionalStatuses(): Promise<DevotionalStatus[]>;
  createDevotionalStatus(status: InsertDevotionalStatus): Promise<DevotionalStatus>;
  renameDevotionalStatus(id: number, newName: string): Promise<void>;

  // Shraddhakutirs
  getShraddhakutirs(): Promise<Shraddhakutir[]>;
  createShraddhakutir(shraddhakutir: InsertShraddhakutir): Promise<Shraddhakutir>;

  // Updates
  createNamhattaUpdate(update: InsertNamhattaUpdate): Promise<NamhattaUpdate>;
  getAllUpdates(): Promise<Array<NamhattaUpdate & { namhattaName: string }>>;

  // Hierarchy
  getTopLevelHierarchy(): Promise<{
    founder: Leader[];
    gbc: Leader[];
    regionalDirectors: Leader[];
    coRegionalDirectors: Leader[];
  }>;
  getLeadersByLevel(level: string): Promise<Leader[]>;

  // Dashboard
  getDashboardSummary(): Promise<{
    totalDevotees: number;
    totalNamhattas: number;
    recentUpdates: Array<{
      namhattaId: number;
      namhattaName: string;
      programType: string;
      date: string;
      attendance: number;
    }>;
  }>;
  getStatusDistribution(): Promise<Array<{
    statusName: string;
    count: number;
    percentage: number;
  }>>;

  // Geography
  getCountries(): Promise<string[]>;
  getStates(country?: string): Promise<string[]>;
  getDistricts(state?: string): Promise<string[]>;
  getSubDistricts(district?: string, pincode?: string): Promise<string[]>;
  getVillages(subDistrict?: string, pincode?: string): Promise<string[]>;
  getPincodes(village?: string, district?: string, subDistrict?: string): Promise<string[]>;
  searchPincodes(query?: string, page?: number, size?: number): Promise<{ data: string[], hasMore: boolean }>;
  getAddressByPincode(pincode: string): Promise<{ state: string; district: string; villages: string[] } | null>;

  // Map data methods
  getNamhattaCountsByCountry(): Promise<Array<{ country: string; count: number }>>;
  getNamhattaCountsByState(country?: string): Promise<Array<{ state: string; country: string; count: number }>>;
  getNamhattaCountsByDistrict(state?: string): Promise<Array<{ district: string; state: string; country: string; count: number }>>;
  getNamhattaCountsBySubDistrict(district?: string): Promise<Array<{ subDistrict: string; district: string; state: string; country: string; count: number }>>;
  getNamhattaCountsByVillage(subDistrict?: string): Promise<Array<{ village: string; subDistrict: string; district: string; state: string; country: string; count: number }>>;

  // District Supervisor methods
  getDistrictSupervisors(district: string): Promise<Leader[]>;
  validateDistrictSupervisor(supervisorId: number, district: string): Promise<boolean>;
  getUserAddressDefaults(userId: number): Promise<{
    country?: string;
    state?: string;
    district?: string;
    readonly: string[];
  }>;
}

// Memory storage implementation for the migration
export class MemStorage implements IStorage {
  private devotees: Devotee[] = [];
  private namhattas: Namhatta[] = [];
  private devotionalStatuses: DevotionalStatus[] = [];
  private shraddhakutirs: Shraddhakutir[] = [];
  private namhattaUpdates: NamhattaUpdate[] = [];
  private leaders: Leader[] = [];
  private statusHistory: StatusHistory[] = [];
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

    this.nextId = 8;
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
      namhattaId: devotee.namhattaId || null,
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
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.devotees.push(newDevotee);
    return newDevotee;
  }

  async createDevoteeForNamhatta(devotee: InsertDevotee, namhattaId: number): Promise<Devotee> {
    return this.createDevotee({ ...devotee, namhattaId });
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
      namhattaId: devotee.namhattaId !== undefined ? devotee.namhattaId : existing.namhattaId,
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
      updatedAt: new Date()
    };
    return this.devotees[index];
  }

  async getDevoteesByNamhatta(namhattaId: number, page = 1, size = 10, statusId?: number): Promise<{ data: Devotee[], total: number }> {
    let filteredDevotees = this.devotees.filter(d => d.namhattaId === namhattaId);
    
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

  // Namhattas
  async getNamhattas(page = 1, size = 10, filters: any = {}): Promise<{ data: Namhatta[], total: number }> {
    let filteredNamhattas = [...this.namhattas];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredNamhattas = filteredNamhattas.filter(n => 
        n.name.toLowerCase().includes(searchLower) ||
        n.code.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredNamhattas.length;
    const offset = (page - 1) * size;
    const data = filteredNamhattas.slice(offset, offset + size);

    return { data, total };
  }

  async getNamhatta(id: number): Promise<Namhatta | undefined> {
    return this.namhattas.find(n => n.id === id);
  }

  async createNamhatta(namhatta: InsertNamhatta): Promise<Namhatta> {
    const newNamhatta: Namhatta = {
      id: this.nextId++,
      name: namhatta.name,
      code: namhatta.code,
      meetingDay: namhatta.meetingDay || null,
      meetingTime: namhatta.meetingTime || null,
      malaSenapoti: namhatta.malaSenapoti || null,
      mahaChakraSenapoti: namhatta.mahaChakraSenapoti || null,
      chakraSenapoti: namhatta.chakraSenapoti || null,
      upaChakraSenapoti: namhatta.upaChakraSenapoti || null,
      secretary: namhatta.secretary || null,
      districtSupervisorId: namhatta.districtSupervisorId,
      status: namhatta.status || "PENDING_APPROVAL",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.namhattas.push(newNamhatta);
    return newNamhatta;
  }

  async updateNamhatta(id: number, namhatta: Partial<InsertNamhatta>): Promise<Namhatta> {
    const index = this.namhattas.findIndex(n => n.id === id);
    if (index === -1) throw new Error('Namhatta not found');
    
    this.namhattas[index] = { ...this.namhattas[index], ...namhatta, updatedAt: new Date() };
    return this.namhattas[index];
  }

  async approveNamhatta(id: number): Promise<void> {
    await this.updateNamhatta(id, { status: "APPROVED" });
  }

  async rejectNamhatta(id: number, reason?: string): Promise<void> {
    await this.updateNamhatta(id, { status: "REJECTED" });
  }

  async getNamhattaUpdates(id: number): Promise<NamhattaUpdate[]> {
    return this.namhattaUpdates.filter(u => u.namhattaId === id);
  }

  async getNamhattaDevoteeStatusCount(id: number): Promise<Record<string, number>> {
    const devotees = this.devotees.filter(d => d.namhattaId === id);
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

  async getNamhattaStatusHistory(id: number, page = 1, size = 10): Promise<{ data: StatusHistory[], total: number }> {
    const devotees = this.devotees.filter(d => d.namhattaId === id);
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
  async getShraddhakutirs(): Promise<Shraddhakutir[]> {
    return [...this.shraddhakutirs];
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

  // Updates
  async createNamhattaUpdate(update: InsertNamhattaUpdate): Promise<NamhattaUpdate> {
    const newUpdate: NamhattaUpdate = {
      id: this.nextId++,
      namhattaId: update.namhattaId,
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
    this.namhattaUpdates.push(newUpdate);
    return newUpdate;
  }

  async getAllUpdates(): Promise<Array<NamhattaUpdate & { namhattaName: string }>> {
    return this.namhattaUpdates.map(update => {
      const namhatta = this.namhattas.find(n => n.id === update.namhattaId);
      return {
        ...update,
        namhattaName: namhatta?.name || 'Unknown'
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
    totalNamhattas: number;
    recentUpdates: Array<{
      namhattaId: number;
      namhattaName: string;
      programType: string;
      date: string;
      attendance: number;
    }>;
  }> {
    const recentUpdates = this.namhattaUpdates
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 5)
      .map(update => {
        const namhatta = this.namhattas.find(n => n.id === update.namhattaId);
        return {
          namhattaId: update.namhattaId,
          namhattaName: namhatta?.name || 'Unknown',
          programType: update.programType,
          date: update.date,
          attendance: update.attendance
        };
      });

    return {
      totalDevotees: this.devotees.length,
      totalNamhattas: this.namhattas.length,
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

  async searchPincodes(query?: string, page = 1, size = 10): Promise<{ data: string[], hasMore: boolean }> {
    const allPincodes = ["700001", "700002", "700003", "734001", "734002"];
    let filteredPincodes = allPincodes;
    
    if (query) {
      filteredPincodes = allPincodes.filter(p => p.includes(query));
    }
    
    const offset = (page - 1) * size;
    const data = filteredPincodes.slice(offset, offset + size);
    const hasMore = offset + size < filteredPincodes.length;
    
    return { data, hasMore };
  }

  async getAddressByPincode(pincode: string): Promise<{ state: string; district: string; villages: string[] } | null> {
    // Basic mapping for migration
    const addressMap: Record<string, { state: string; district: string; villages: string[] }> = {
      "700001": { state: "West Bengal", district: "Kolkata", villages: ["Kolkata City"] },
      "700002": { state: "West Bengal", district: "Kolkata", villages: ["Salt Lake"] },
      "734001": { state: "West Bengal", district: "Nadia", villages: ["Mayapur"] }
    };
    
    return addressMap[pincode] || null;
  }

  // Map data methods - Basic implementation for migration
  async getNamhattaCountsByCountry(): Promise<Array<{ country: string; count: number }>> {
    return [{ country: "India", count: this.namhattas.length }];
  }

  async getNamhattaCountsByState(country?: string): Promise<Array<{ state: string; country: string; count: number }>> {
    return [
      { state: "West Bengal", country: "India", count: Math.floor(this.namhattas.length * 0.6) },
      { state: "Odisha", country: "India", count: Math.floor(this.namhattas.length * 0.4) }
    ];
  }

  async getNamhattaCountsByDistrict(state?: string): Promise<Array<{ district: string; state: string; country: string; count: number }>> {
    if (state === "West Bengal") {
      return [
        { district: "Nadia", state: "West Bengal", country: "India", count: Math.floor(this.namhattas.length * 0.3) },
        { district: "Kolkata", state: "West Bengal", country: "India", count: Math.floor(this.namhattas.length * 0.3) }
      ];
    }
    return [{ district: "Sample District", state: state || "Sample State", country: "India", count: this.namhattas.length }];
  }

  async getNamhattaCountsBySubDistrict(district?: string): Promise<Array<{ subDistrict: string; district: string; state: string; country: string; count: number }>> {
    return [{ subDistrict: "Sample Sub-District", district: district || "Sample District", state: "Sample State", country: "India", count: this.namhattas.length }];
  }

  async getNamhattaCountsByVillage(subDistrict?: string): Promise<Array<{ village: string; subDistrict: string; district: string; state: string; country: string; count: number }>> {
    return [{ village: "Sample Village", subDistrict: subDistrict || "Sample Sub-District", district: "Sample District", state: "Sample State", country: "India", count: this.namhattas.length }];
  }

  // District Supervisor methods
  async getDistrictSupervisors(district: string): Promise<Leader[]> {
    return this.leaders.filter(leader => 
      leader.role === 'DISTRICT_SUPERVISOR' && 
      leader.location?.district === district
    );
  }

  async validateDistrictSupervisor(supervisorId: number, district: string): Promise<boolean> {
    const supervisor = this.leaders.find(leader => 
      leader.id === supervisorId && 
      leader.role === 'DISTRICT_SUPERVISOR' && 
      leader.location?.district === district
    );
    return !!supervisor;
  }

  async getUserAddressDefaults(userId: number): Promise<{
    country?: string;
    state?: string;
    district?: string;
    readonly: string[];
  }> {
    // This would normally fetch user data from database
    // For now, return empty defaults since we don't have user-location mapping in MemStorage
    return { readonly: [] };
  }
}

// Export the interface and storage instance
export { IStorage };
export const storage = new MemStorage();