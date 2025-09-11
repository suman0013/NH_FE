import { apiRequest } from "@/lib/queryClient";
import type { 
  DashboardSummary, 
  HierarchyResponse, 
  PaginatedResponse, 
  Devotee, 
  Namhatta, 
  DevotionalStatus,
  Shraddhakutir,
  Leader,
  Gurudev
} from "@/lib/types";

export const api = {
  // Dashboard
  getDashboard: async (): Promise<DashboardSummary> => {
    const res = await apiRequest("GET", "/api/dashboard");
    return res.json();
  },

  getStatusDistribution: async (): Promise<Array<{statusName: string; count: number; percentage: number}>> => {
    const res = await apiRequest("GET", "/api/status-distribution");
    return res.json();
  },

  // Hierarchy
  getHierarchy: async (): Promise<HierarchyResponse> => {
    const res = await apiRequest("GET", "/api/hierarchy");
    return res.json();
  },

  getLeadersByLevel: async (level: string): Promise<Leader[]> => {
    const res = await apiRequest("GET", `/api/hierarchy/${level}`);
    return res.json();
  },

  // Geography
  getCountries: async (): Promise<string[]> => {
    const res = await apiRequest("GET", "/api/countries");
    return res.json();
  },

  getStates: async (country: string): Promise<string[]> => {
    const res = await apiRequest("GET", `/api/states?country=${encodeURIComponent(country)}`);
    return res.json();
  },

  getDistricts: async (state: string): Promise<string[]> => {
    const res = await apiRequest("GET", `/api/districts?state=${encodeURIComponent(state)}`);
    return res.json();
  },

  getSubDistricts: async (district?: string, pincode?: string): Promise<string[]> => {
    let url = "/api/sub-districts";
    const params = new URLSearchParams();
    if (district) params.append("district", district);
    if (pincode) params.append("pincode", pincode);
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await apiRequest("GET", url);
    return res.json();
  },

  getVillages: async (subDistrict?: string, pincode?: string): Promise<string[]> => {
    let url = "/api/villages";
    const params = new URLSearchParams();
    if (subDistrict) params.append("subDistrict", subDistrict);
    if (pincode) params.append("pincode", pincode);
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await apiRequest("GET", url);
    return res.json();
  },

  getPincodes: async (village?: string, district?: string, subDistrict?: string): Promise<string[]> => {
    let url = "/api/pincodes";
    const params = new URLSearchParams();
    if (village) params.append("village", village);
    if (district) params.append("district", district);
    if (subDistrict) params.append("subDistrict", subDistrict);
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await apiRequest("GET", url);
    return res.json();
  },

  searchPincodes: async (country: string, searchTerm: string = "", page: number = 1, limit: number = 25): Promise<{
    pincodes: string[];
    total: number;
    hasMore: boolean;
  }> => {
    const params = new URLSearchParams({
      country: country,
      search: searchTerm,
      page: page.toString(),
      limit: limit.toString()
    });
    
    const res = await apiRequest("GET", `/api/pincodes/search?${params.toString()}`);
    return res.json();
  },

  getAddressByPincode: async (pincode: string): Promise<{
    country: string;
    state: string;
    district: string;
    subDistricts: string[];
    villages: string[];
  } | null> => {
    const res = await apiRequest("GET", `/api/address-by-pincode?pincode=${encodeURIComponent(pincode)}`);
    return res.json();
  },

  // Devotees
  getDevotees: async (page = 1, size = 10, filters?: any): Promise<PaginatedResponse<Devotee>> => {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (filters) {
      Object.keys(filters).forEach(key => {
        // Only add non-empty string values to avoid sending empty parameters
        if (filters[key] && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
    }
    const res = await apiRequest("GET", `/api/devotees?${params}`);
    return res.json();
  },

  getDevotee: async (id: number): Promise<Devotee> => {
    const res = await apiRequest("GET", `/api/devotees/${id}`);
    return res.json();
  },

  createDevotee: async (devotee: Partial<Devotee>): Promise<Devotee> => {
    const res = await apiRequest("POST", "/api/devotees", devotee);
    return res.json();
  },

  createDevoteeForNamhatta: async (devotee: Partial<Devotee>, namhattaId: number): Promise<Devotee> => {
    const res = await apiRequest("POST", `/api/devotees/${namhattaId}`, devotee);
    return res.json();
  },

  updateDevotee: async (id: number, devotee: Partial<Devotee>): Promise<Devotee> => {
    const res = await apiRequest("PUT", `/api/devotees/${id}`, devotee);
    return res.json();
  },

  assignLeadershipRole: async (devoteeId: number, assignment: {
    leadershipRole: string;
    reportingToDevoteeId?: number;
    hasSystemAccess: boolean;
  }): Promise<Devotee> => {
    const res = await apiRequest("POST", `/api/devotees/${devoteeId}/assign-role`, assignment);
    return res.json();
  },

  upgradeDevoteeStatus: async (id: number, newStatusId: number, notes?: string): Promise<void> => {
    await apiRequest("POST", `/api/devotees/${id}/upgrade-status`, { newStatusId, notes });
  },

  getDevoteeStatusHistory: async (id: number) => {
    const res = await apiRequest("GET", `/api/devotees/${id}/status-history`);
    return res.json();
  },

  // Namhattas
  getNamhattas: async (page = 1, size = 10, filters?: any): Promise<PaginatedResponse<Namhatta>> => {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (filters) {
      Object.keys(filters).forEach(key => {
        // Only add non-empty string values to avoid sending empty parameters
        if (filters[key] && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
    }
    const res = await apiRequest("GET", `/api/namhattas?${params}`);
    return res.json();
  },

  getNamhatta: async (id: number): Promise<Namhatta> => {
    const res = await apiRequest("GET", `/api/namhattas/${id}`);
    return res.json();
  },

  checkNamhattaCodeExists: async (code: string): Promise<{ exists: boolean }> => {
    const res = await apiRequest("GET", `/api/namhattas/check-code/${encodeURIComponent(code)}`);
    return res.json();
  },

  createNamhatta: async (namhatta: Partial<Namhatta>): Promise<Namhatta> => {
    const res = await apiRequest("POST", "/api/namhattas", namhatta);
    return res.json();
  },

  updateNamhatta: async (id: number, namhatta: Partial<Namhatta>): Promise<Namhatta> => {
    const res = await apiRequest("PUT", `/api/namhattas/${id}`, namhatta);
    return res.json();
  },

  approveNamhatta: async (id: number): Promise<void> => {
    await apiRequest("POST", `/api/namhattas/${id}/approve`);
  },

  getNamhattaUpdates: async (id: number) => {
    const res = await apiRequest("GET", `/api/namhattas/${id}/updates`);
    return res.json();
  },

  getNamhattaDevotees: async (id: number, page = 1, size = 10, statusId?: number) => {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (statusId) params.append('statusId', statusId.toString());
    const res = await apiRequest("GET", `/api/namhattas/${id}/devotees?${params}`);
    return res.json();
  },

  getNamhattaDevoteeStatusCount: async (id: number) => {
    const res = await apiRequest("GET", `/api/namhattas/${id}/devotee-status-count`);
    return res.json();
  },

  // Statuses
  getStatuses: async (): Promise<DevotionalStatus[]> => {
    const res = await apiRequest("GET", "/api/statuses");
    return res.json();
  },

  createStatus: async (name: string): Promise<DevotionalStatus> => {
    const res = await apiRequest("POST", "/api/statuses", { name });
    return res.json();
  },

  renameStatus: async (id: number, newName: string): Promise<void> => {
    await apiRequest("POST", `/api/statuses/${id}/rename`, { newName });
  },

  // Gurudevs
  getGurudevs: async (): Promise<Gurudev[]> => {
    const res = await apiRequest("GET", "/api/gurudevs");
    return res.json();
  },

  createGurudev: async (gurudev: Partial<Gurudev>): Promise<Gurudev> => {
    const res = await apiRequest("POST", "/api/gurudevs", gurudev);
    return res.json();
  },

  // Shraddhakutirs
  getShraddhakutirs: async (district?: string): Promise<Shraddhakutir[]> => {
    let url = "/api/shraddhakutirs";
    if (district) {
      url += `?district=${encodeURIComponent(district)}`;
    }
    const res = await apiRequest("GET", url);
    return res.json();
  },

  createShraddhakutir: async (shraddhakutir: Partial<Shraddhakutir>): Promise<Shraddhakutir> => {
    const res = await apiRequest("POST", "/api/shraddhakutirs", shraddhakutir);
    return res.json();
  },

  // Updates
  createNamhattaUpdate: async (update: any) => {
    const res = await apiRequest("POST", "/api/updates", update);
    return res.json();
  },

  getAllUpdates: async () => {
    const res = await apiRequest("GET", "/api/updates/all");
    return res.json();
  },

  // Health & About
  getHealth: async () => {
    const res = await apiRequest("GET", "/api/health");
    return res.json();
  },

  getAbout: async () => {
    const res = await apiRequest("GET", "/api/about");
    return res.json();
  },

  // District Supervisors
  getDistrictSupervisors: async (district: string): Promise<Leader[]> => {
    const res = await apiRequest("GET", `/api/district-supervisors?district=${encodeURIComponent(district)}`);
    return res.json();
  },

  // User Address Defaults
  getUserAddressDefaults: async (): Promise<{
    country?: string;
    state?: string;
    district?: string;
    readonly: string[];
  }> => {
    const res = await apiRequest("GET", "/api/user/address-defaults");
    return res.json();
  }
};
