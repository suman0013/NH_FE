import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, MapPin, Users, Home, BarChart3, RefreshCw, Loader2, TrendingUp, Building2, Globe } from "lucide-react";

// Helper function to get card background color based on counts
// Standardized coloring:
// - Lightest red: No namhatta AND no devotee
// - Lightest blue: Has namhatta but no devotee
// - Lightest yellow: Has devotee but no namhatta
// - Lightest green: Has both namhatta and devotee
function getCardBackground(namhattaCount: number, devoteeCount: number): string {
  const hasNamhatta = namhattaCount > 0;
  const hasDevotee = devoteeCount > 0;

  if (!hasNamhatta && !hasDevotee) {
    // Lightest red - No namhatta AND no devotee
    return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
  }
  if (hasNamhatta && !hasDevotee) {
    // Lightest blue - Has namhatta but no devotee
    return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
  }
  if (!hasNamhatta && hasDevotee) {
    // Lightest yellow - Has devotee but no namhatta
    return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  }
  // Lightest green - Has both namhatta and devotee
  return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
}
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";

interface StateData {
  name: string;
  country: string;
  namhattaCount: number;
  devoteeCount: number;
}

interface DistrictData {
  name: string;
  state: string;
  namhattaCount: number;
  devoteeCount: number;
}

interface SubDistrictData {
  name: string;
  district: string;
  namhattaCount: number;
  devoteeCount: number;
}

interface VillageData {
  name: string;
  subDistrict: string;
  namhattaCount: number;
  devoteeCount: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [openStates, setOpenStates] = useState<Set<string>>(new Set());
  const [openDistricts, setOpenDistricts] = useState<Set<string>>(new Set());
  const [openSubDistricts, setOpenSubDistricts] = useState<Set<string>>(new Set());

  // Query to fetch all states
  const { data: statesData, isLoading: statesLoading, error: statesError, refetch: refetchStates, isFetching: statesFetching } = useQuery<StateData[]>({
    queryKey: ["/api/reports/states"],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const handleRefresh = async () => {
    // Invalidate all cached data and refetch states
    await queryClient.invalidateQueries({ queryKey: ["/api/reports/states"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/reports/districts"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/reports/sub-districts"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/reports/villages"] });
    refetchStates();
  };

  const toggleState = (stateName: string) => {
    const newOpenStates = new Set(openStates);
    if (newOpenStates.has(stateName)) {
      newOpenStates.delete(stateName);
    } else {
      newOpenStates.add(stateName);
    }
    setOpenStates(newOpenStates);
  };

  const toggleDistrict = (districtKey: string) => {
    const newOpenDistricts = new Set(openDistricts);
    if (newOpenDistricts.has(districtKey)) {
      newOpenDistricts.delete(districtKey);
    } else {
      newOpenDistricts.add(districtKey);
    }
    setOpenDistricts(newOpenDistricts);
  };

  const toggleSubDistrict = (subDistrictKey: string) => {
    const newOpenSubDistricts = new Set(openSubDistricts);
    if (newOpenSubDistricts.has(subDistrictKey)) {
      newOpenSubDistricts.delete(subDistrictKey);
    } else {
      newOpenSubDistricts.add(subDistrictKey);
    }
    setOpenSubDistricts(newOpenSubDistricts);
  };

  if (statesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-indigo-900 text-slate-900 dark:text-white" data-testid="reports-loading">
        <div className="container mx-auto p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 dark:border-purple-400 mx-auto mb-3"></div>
                <p className="text-slate-600 dark:text-purple-200">Loading Reports...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (statesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-indigo-900 text-slate-900 dark:text-white" data-testid="reports-error">
        <div className="container mx-auto p-4">
          <div className="text-center py-12">
            <div className="text-red-500 dark:text-red-400 mb-4">
              <BarChart3 className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-red-600 dark:text-red-300 mb-2">Error Loading Reports</h2>
            <p className="text-red-500 dark:text-red-200 mb-4">Failed to load data. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalNamhattas = statesData?.reduce((sum, state) => sum + state.namhattaCount, 0) || 0;
  const totalDevotees = statesData?.reduce((sum, state) => sum + state.devoteeCount, 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-indigo-900 text-slate-900 dark:text-white" data-testid="reports-page">
      <div className="container mx-auto p-4">
        <div className="space-y-4">
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Namhatta Preaching Report</h1>
                <p className="text-slate-600 dark:text-purple-200 text-sm">
                  Geographic breakdown • {statesData?.length || 0} states • {totalNamhattas} centers • {totalDevotees} devotees
                  {user?.role === 'DISTRICT_SUPERVISOR' && <span className="ml-2 text-orange-600 dark:text-orange-300">🔒 District-filtered</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Compact States List */}
          <div className="space-y-2">
            {statesData?.map((state) => {
              const stateKey = `${state.name}_${state.country}`;
              const isStateOpen = openStates.has(stateKey);
              
              return (
                <StateCard 
                  key={stateKey}
                  state={state}
                  isOpen={isStateOpen}
                  onToggle={() => toggleState(stateKey)}
                  openDistricts={openDistricts}
                  onToggleDistrict={toggleDistrict}
                  openSubDistricts={openSubDistricts}
                  onToggleSubDistrict={toggleSubDistrict}
                />
              );
            })}
          </div>

          {(!statesData || statesData.length === 0) && (
            <div className="text-center py-8">
              <MapPin className="h-16 w-16 text-slate-400 dark:text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-purple-200 mb-2">No Data Available</h3>
              <p className="text-slate-600 dark:text-purple-300 text-sm">No geographic data found for your access level.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// State Card Component with lazy loading for districts
function StateCard({ 
  state, 
  isOpen, 
  onToggle, 
  openDistricts, 
  onToggleDistrict,
  openSubDistricts,
  onToggleSubDistrict 
}: {
  state: StateData;
  isOpen: boolean;
  onToggle: () => void;
  openDistricts: Set<string>;
  onToggleDistrict: (key: string) => void;
  openSubDistricts: Set<string>;
  onToggleSubDistrict: (key: string) => void;
}) {
  // Only fetch districts when state is opened
  const { data: districtsData, isLoading: districtsLoading } = useQuery<DistrictData[]>({
    queryKey: [`/api/reports/districts/${encodeURIComponent(state.name)}`],
    enabled: isOpen, // Only fetch when state is expanded
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const cardBg = getCardBackground(state.namhattaCount, state.devoteeCount);
  
  return (
    <div className={`border-l-4 border-purple-500 ${cardBg} backdrop-blur-sm rounded-r-lg hover:bg-purple-50 dark:hover:bg-slate-800/70 transition-all`}>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-purple-100/50 dark:hover:bg-slate-700/50 transition-colors" data-testid={`state-header-${state.name.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="flex items-center gap-3">
              <div className="text-purple-600 dark:text-purple-400">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
              <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-slate-900 dark:text-white font-semibold text-lg">{state.name}</span>
              <span className="text-slate-600 dark:text-purple-300 text-base">({state.country})</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Building2 className="h-3 w-3" />
                <span className="text-base font-medium">{state.namhattaCount}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Users className="h-3 w-3" />
                <span className="text-base font-medium">{state.devoteeCount}</span>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="pl-6 pb-1">
            {districtsLoading ? (
              <div className="flex items-center gap-2 py-2 text-slate-600 dark:text-purple-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : districtsData?.length === 0 ? (
              <div className="text-slate-500 dark:text-purple-400 text-sm py-1">No districts found</div>
            ) : (
              <div className="space-y-0.5">
                {districtsData?.map((district) => (
                  <DistrictCard 
                    key={`${district.name}_${district.state}`}
                    district={district}
                    isOpen={openDistricts.has(`${district.name}_${district.state}`)}
                    onToggle={() => onToggleDistrict(`${district.name}_${district.state}`)}
                    openSubDistricts={openSubDistricts}
                    onToggleSubDistrict={onToggleSubDistrict}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// District Card Component with lazy loading for sub-districts  
function DistrictCard({ 
  district, 
  isOpen, 
  onToggle,
  openSubDistricts,
  onToggleSubDistrict 
}: {
  district: DistrictData;
  isOpen: boolean;
  onToggle: () => void;
  openSubDistricts: Set<string>;
  onToggleSubDistrict: (key: string) => void;
}) {
  // Only fetch sub-districts when district is opened
  const { data: subDistrictsData, isLoading: subDistrictsLoading } = useQuery<SubDistrictData[]>({
    queryKey: [`/api/reports/sub-districts/${encodeURIComponent(district.state)}/${encodeURIComponent(district.name)}`],
    enabled: isOpen, // Only fetch when district is expanded
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const cardBg = getCardBackground(district.namhattaCount, district.devoteeCount);
  
  return (
    <div className={`border-l-2 border-green-400 ml-4 my-1 ${cardBg} rounded-r`}>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between py-1.5 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded-r transition-colors" data-testid={`district-header-${district.name.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="flex items-center gap-2">
              <div className="text-green-500 dark:text-green-400">
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </div>
              <MapPin className="h-3 w-3 text-green-500 dark:text-green-400" />
              <span className="text-slate-800 dark:text-white text-base font-medium">{district.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Building2 className="h-3 w-3" />
                <span className="text-sm">{district.namhattaCount}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Users className="h-3 w-3" />
                <span className="text-sm">{district.devoteeCount}</span>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="ml-4 py-0.5">
            {subDistrictsLoading ? (
              <div className="flex items-center gap-2 py-1 text-slate-600 dark:text-purple-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : subDistrictsData?.length === 0 ? (
              <div className="text-slate-500 dark:text-purple-400 text-xs py-0.5">No sub-districts found</div>
            ) : (
              <div className="space-y-0.5">
                {subDistrictsData?.map((subDistrict) => (
                  <SubDistrictCard 
                    key={`${subDistrict.name}_${subDistrict.district}`}
                    subDistrict={subDistrict}
                    isOpen={openSubDistricts.has(`${subDistrict.name}_${subDistrict.district}`)}
                    onToggle={() => onToggleSubDistrict(`${subDistrict.name}_${subDistrict.district}`)}
                    districtState={district.state}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Sub-District Card Component with lazy loading for villages
function SubDistrictCard({ 
  subDistrict, 
  isOpen, 
  onToggle,
  districtState 
}: {
  subDistrict: SubDistrictData;
  isOpen: boolean;
  onToggle: () => void;
  districtState: string;
}) {
  // Only fetch villages when sub-district is opened
  const { data: villagesData, isLoading: villagesLoading } = useQuery<VillageData[]>({
    queryKey: [`/api/reports/villages/${encodeURIComponent(districtState)}/${encodeURIComponent(subDistrict.district)}/${encodeURIComponent(subDistrict.name)}`],
    enabled: isOpen, // Only fetch when sub-district is expanded
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const cardBg = getCardBackground(subDistrict.namhattaCount, subDistrict.devoteeCount);
  
  return (
    <div className={`border-l-2 border-orange-400 ml-4 my-0.5 ${cardBg} rounded-r`}>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between py-1 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded-r transition-colors" data-testid={`subdistrict-header-${subDistrict.name.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="flex items-center gap-2">
              <div className="text-orange-500 dark:text-orange-400">
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </div>
              <Building2 className="h-3 w-3 text-orange-500 dark:text-orange-400" />
              <span className="text-slate-800 dark:text-white text-base">{subDistrict.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Home className="h-3 w-3" />
                <span className="text-sm">{subDistrict.namhattaCount}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Users className="h-3 w-3" />
                <span className="text-sm">{subDistrict.devoteeCount}</span>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="ml-4 py-0.5">
            {villagesLoading ? (
              <div className="flex items-center gap-2 py-1 text-slate-600 dark:text-purple-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : villagesData?.length === 0 ? (
              <div className="text-slate-500 dark:text-purple-400 text-xs py-0.5">No villages found</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mt-2">
                {villagesData?.map((village) => (
                  <div key={`${village.name}_${village.subDistrict}`} 
                       className={`${getCardBackground(village.namhattaCount, village.devoteeCount)} border rounded-lg p-2 hover:shadow-sm hover:border-yellow-300 dark:hover:border-yellow-600 transition-all`}
                       data-testid={`village-item-${village.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0"></div>
                      <Home className="h-3 w-3 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-white text-sm font-medium truncate" title={village.name}>{village.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Building2 className="h-2 w-2" />
                        <span className="text-sm">{village.namhattaCount}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Users className="h-2 w-2" />
                        <span className="text-sm">{village.devoteeCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}