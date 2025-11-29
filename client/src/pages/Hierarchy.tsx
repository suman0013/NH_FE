import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, MapPin, Crown, UserCheck, Users, Shield, TreePine, Network, Zap, Circle, ArrowRight, ArrowDown, Search, UserCog, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import iskconLogo from "@assets/iskcon_logo_1757665218141.png";
import namahattaLogo from "@assets/namhatta_logo_1757673165218.png";
import prabhupadaImage from "@assets/PRAVUPADA_1757698417419.jpg";
import RoleManagementModal from "@/components/RoleManagementModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Leader {
  id: number;
  name: string;
  role: string;
  namahattaName?: string;
}

interface HierarchyData {
  founder: Leader[];
  gbc: Leader[];
  regionalDirectors: Leader[];
  coRegionalDirectors: Leader[];
  malaSenapotis?: Leader[];
  mahaChakraSenapotis?: Leader[];
  chakraSenapotis?: Leader[];
  upaChakraSenapotis?: Leader[];
}

export default function Hierarchy() {
  const [isDistrictSupervisorsOpen, setIsDistrictSupervisorsOpen] = useState(false);
  const [isAdditionalLeadersOpen, setIsAdditionalLeadersOpen] = useState(false);
  const [currentDistrictPage, setCurrentDistrictPage] = useState(0);
  const [districtSearchTerm, setDistrictSearchTerm] = useState("");
  const DISTRICTS_PER_PAGE = 12;
  
  // State for hierarchical navigation
  const [selectedDistrictSupervisor, setSelectedDistrictSupervisor] = useState<number | null>(null);
  const [selectedMalaSenapoti, setSelectedMalaSenapoti] = useState<number | null>(null);
  const [selectedMahaChakraSenapoti, setSelectedMahaChakraSenapoti] = useState<number | null>(null);
  const [selectedChakraSenapoti, setSelectedChakraSenapoti] = useState<number | null>(null);
  const [selectedDevoteeForRoleManagement, setSelectedDevoteeForRoleManagement] = useState<any>(null);
  const [showRoleManagementModal, setShowRoleManagementModal] = useState(false);
  const { user } = useAuth();
  
  const { data: hierarchy, isLoading, error } = useQuery<HierarchyData>({
    queryKey: ["/api/hierarchy"],
  });

  const { data: districtSupervisors, isLoading: isLoadingDistrictSupervisors } = useQuery({
    queryKey: ["/api/district-supervisors/all"],
  });

  // Dynamic queries for hierarchical data based on selections
  const { data: malaSenapotis } = useQuery({
    queryKey: ["/api/senapoti/MALA_SENAPOTI", selectedDistrictSupervisor],
    queryFn: async () => {
      if (!selectedDistrictSupervisor) return [];
      const response = await fetch(`/api/senapoti/MALA_SENAPOTI/${selectedDistrictSupervisor}`);
      if (!response.ok) throw new Error('Failed to fetch Mala Senapotis');
      return response.json();
    },
    enabled: !!selectedDistrictSupervisor,
  });

  const { data: mahaChakraSenapotis } = useQuery({
    queryKey: ["/api/senapoti/MAHA_CHAKRA_SENAPOTI", selectedMalaSenapoti],
    queryFn: async () => {
      if (!selectedMalaSenapoti) return [];
      const response = await fetch(`/api/senapoti/MAHA_CHAKRA_SENAPOTI/${selectedMalaSenapoti}`);
      if (!response.ok) throw new Error('Failed to fetch Maha Chakra Senapotis');
      return response.json();
    },
    enabled: !!selectedMalaSenapoti,
  });

  const { data: chakraSenapotis } = useQuery({
    queryKey: ["/api/senapoti/CHAKRA_SENAPOTI", selectedMahaChakraSenapoti],
    queryFn: async () => {
      if (!selectedMahaChakraSenapoti) return [];
      const response = await fetch(`/api/senapoti/CHAKRA_SENAPOTI/${selectedMahaChakraSenapoti}`);
      if (!response.ok) throw new Error('Failed to fetch Chakra Senapotis');
      return response.json();
    },
    enabled: !!selectedMahaChakraSenapoti,
  });

  const { data: upaChakraSenapotis } = useQuery({
    queryKey: ["/api/senapoti/UPA_CHAKRA_SENAPOTI", selectedChakraSenapoti],
    queryFn: async () => {
      if (!selectedChakraSenapoti) return [];
      const response = await fetch(`/api/senapoti/UPA_CHAKRA_SENAPOTI/${selectedChakraSenapoti}`);
      if (!response.ok) throw new Error('Failed to fetch Upa Chakra Senapotis');
      return response.json();
    },
    enabled: !!selectedChakraSenapoti,
  });

  // Handler functions for clicking on each level - now toggle on/off
  const handleDistrictSupervisorClick = (supervisorId: number) => {
    if (selectedDistrictSupervisor === supervisorId) {
      // If already selected, close it
      setSelectedDistrictSupervisor(null);
    } else {
      // Select new one and reset lower levels
      setSelectedDistrictSupervisor(supervisorId);
    }
    // Reset lower levels when changing district supervisor
    setSelectedMalaSenapoti(null);
    setSelectedMahaChakraSenapoti(null);
    setSelectedChakraSenapoti(null);
  };

  const handleMalaSenapotiClick = (malaSenapotiId: number) => {
    if (selectedMalaSenapoti === malaSenapotiId) {
      // If already selected, close it
      setSelectedMalaSenapoti(null);
    } else {
      // Select new one
      setSelectedMalaSenapoti(malaSenapotiId);
    }
    // Reset lower levels when changing mala senapoti
    setSelectedMahaChakraSenapoti(null);
    setSelectedChakraSenapoti(null);
  };

  const handleMahaChakraSenapotiClick = (mahaChakraSenapotiId: number) => {
    if (selectedMahaChakraSenapoti === mahaChakraSenapotiId) {
      // If already selected, close it
      setSelectedMahaChakraSenapoti(null);
    } else {
      // Select new one
      setSelectedMahaChakraSenapoti(mahaChakraSenapotiId);
    }
    // Reset lower levels when changing maha chakra senapoti
    setSelectedChakraSenapoti(null);
  };

  const handleChakraSenapotiClick = (chakraSenapotiId: number) => {
    if (selectedChakraSenapoti === chakraSenapotiId) {
      // If already selected, close it
      setSelectedChakraSenapoti(null);
    } else {
      // Select new one
      setSelectedChakraSenapoti(chakraSenapotiId);
    }
  };

  // Helper functions for role management
  const handleRoleManagement = (devotee: any) => {
    const districtCode = getDevoteeDistrict(devotee);
    setSelectedDevoteeForRoleManagement({ ...devotee, districtCode });
    setShowRoleManagementModal(true);
  };

  const canManageRoles = user?.role === 'ADMIN' || user?.role === 'DISTRICT_SUPERVISOR';

  const getDevoteeDistrict = (devotee: any): string => {
    // Try to get district from devotee's address or use user's district as fallback
    if (devotee?.presentAddress?.district) return devotee.presentAddress.district;
    if (devotee?.permanentAddress?.district) return devotee.permanentAddress.district;
    if (user?.districts && user.districts.length > 0) {
      const district = user.districts[0];
      return typeof district === 'string' ? district : (district.code || district.name || 'UNKNOWN');
    }
    return 'UNKNOWN';
  };

  if (isLoading || isLoadingDistrictSupervisors) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100 to-slate-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-black dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
          <p className="text-lg text-slate-700 dark:text-slate-300">Loading Leadership Hierarchy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100 to-slate-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-black dark:text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 dark:text-red-400">Error loading hierarchy data</p>
        </div>
      </div>
    );
  }

  if (!hierarchy) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100 to-slate-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-black dark:text-white overflow-x-auto">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-purple-700 dark:text-purple-300" data-testid="text-header">
            Leadership Hierarchy Tree
          </h1>
          <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-300" data-testid="text-organization">
            International Society for Krishna Consciousness
          </p>
        </div>

        {/* Tree Container */}
        <div className="relative min-w-[800px] mx-auto">

          {/* Level 1: Founder Acharya - Root of the tree */}
          <div className="flex justify-center mb-8">
            {hierarchy.founder && hierarchy.founder.map((founder) => (
              <motion.div
                key={founder.id}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <Card className="bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300 dark:border-orange-500/30 shadow-2xl w-80" data-testid="card-founder-acharya">
                  <CardContent className="p-6">
                    <div className="text-center text-white">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                          <img 
                            src={iskconLogo} 
                            alt="ISKCON Logo" 
                            className="w-12 h-12 object-contain filter brightness-0 invert"
                            data-testid="img-founder-logo"
                          />
                        </div>
                        <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg ring-4 ring-white/30">
                          <img 
                            src={prabhupadaImage} 
                            alt="Srila Prabhupada" 
                            className="w-16 h-16 object-cover"
                            data-testid="img-founder-prabhupada"
                          />
                        </div>
                      </div>
                      <h2 className="text-xl font-bold mb-2" data-testid="text-founder-title">
                        ISKCON Founder Acharya
                      </h2>
                      <p className="text-lg font-semibold" data-testid="text-founder-name">
                        {founder.name}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                {/* Connecting line down */}
                <div className="absolute top-full left-1/2 w-px h-12 bg-gradient-to-b from-orange-400 to-purple-400 transform -translate-x-1/2"></div>
              </motion.div>
            ))}
          </div>

          {/* Level 2: GBC, Regional Directors, Co-Regional Directors - First branches */}
          <div className="relative mb-12">
            {/* Horizontal connecting line */}
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400"></div>
            {/* Vertical connecting lines */}
            <div className="absolute top-0 left-1/4 w-px h-4 bg-purple-400 transform -translate-x-1/2"></div>
            <div className="absolute top-0 left-1/2 w-px h-4 bg-blue-400 transform -translate-x-1/2"></div>
            <div className="absolute top-0 right-1/4 w-px h-4 bg-teal-400 transform translate-x-1/2"></div>
            
            <div className="grid grid-cols-3 gap-8 pt-4">
              {/* GBC Card */}
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300 dark:border-purple-500/30 shadow-xl" data-testid="card-gbc">
                  <CardContent className="p-6">
                    <div className="text-center text-white">
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <img 
                          src={iskconLogo} 
                          alt="ISKCON Logo" 
                          className="w-10 h-10 object-contain filter brightness-0 invert"
                          data-testid="img-gbc-logo"
                        />
                      </div>
                      <h3 className="text-lg font-bold mb-2" data-testid="text-gbc-title">
                        GBC & Namahatta Minister
                      </h3>
                      <div className="space-y-1">
                        {hierarchy.gbc && hierarchy.gbc.map((gbcMember, index) => (
                          <div key={gbcMember.id}>
                            <p className="text-sm font-semibold" data-testid={`text-gbc-name-${index}`}>
                              {gbcMember.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Regional Director Card */}
              <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300 dark:border-blue-500/30 shadow-xl" data-testid="card-regional-director">
                  <CardContent className="p-6">
                    <div className="text-center text-white">
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <img 
                          src={iskconLogo} 
                          alt="ISKCON Logo" 
                          className="w-10 h-10 object-contain filter brightness-0 invert"
                          data-testid="img-regional-director-logo"
                        />
                      </div>
                      <h3 className="text-lg font-bold mb-2" data-testid="text-regional-director-title">
                        Regional Director
                      </h3>
                      <div className="space-y-1">
                        {hierarchy.regionalDirectors && hierarchy.regionalDirectors.map((director, index) => (
                          <div key={director.id}>
                            <p className="text-sm font-semibold" data-testid={`text-regional-director-name-${index}`}>
                              {director.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Co-Regional Director Card */}
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="bg-gradient-to-br from-teal-400 to-teal-600 border-teal-300 dark:border-teal-500/30 shadow-xl" data-testid="card-co-regional-director">
                  <CardContent className="p-6">
                    <div className="text-center text-white">
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <img 
                          src={iskconLogo} 
                          alt="ISKCON Logo" 
                          className="w-10 h-10 object-contain filter brightness-0 invert"
                          data-testid="img-co-regional-director-logo"
                        />
                      </div>
                      <h3 className="text-lg font-bold mb-2" data-testid="text-co-regional-director-title">
                        Co-Regional Director
                      </h3>
                      <div className="space-y-1">
                        {hierarchy.coRegionalDirectors && hierarchy.coRegionalDirectors.map((coDirector, index) => (
                          <div key={coDirector.id}>
                            <p className="text-sm font-semibold" data-testid={`text-co-regional-director-name-${index}`}>
                              {coDirector.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

        {/* Additional Leadership Roles - Collapsible */}
        {((hierarchy.malaSenapotis && hierarchy.malaSenapotis.length > 0) ||
          (hierarchy.mahaChakraSenapotis && hierarchy.mahaChakraSenapotis.length > 0) ||
          (hierarchy.chakraSenapotis && hierarchy.chakraSenapotis.length > 0) ||
          (hierarchy.upaChakraSenapotis && hierarchy.upaChakraSenapotis.length > 0)) && (
          <Collapsible open={isAdditionalLeadersOpen} onOpenChange={setIsAdditionalLeadersOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-4 h-auto bg-white/70 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-600/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-black dark:text-white rounded-lg shadow-lg"
                data-testid="button-additional-leaders-toggle"
              >
                <div className="flex items-center">
                  <Users className="mr-3 h-5 w-5 text-slate-600 dark:text-slate-300" />
                  <span className="text-lg font-semibold">Additional Leadership Roles</span>
                </div>
                {isAdditionalLeadersOpen ? (
                  <ChevronDown className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Mala Senapotis */}
                {hierarchy.malaSenapotis && hierarchy.malaSenapotis.length > 0 && (
                  <Card className="bg-white/80 dark:bg-slate-800/50 border-red-300 dark:border-red-500/30 shadow-lg" data-testid="card-mala-senapotis">
                    <CardContent className="p-4">
                      <div className="text-center space-y-3">
                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                          <Crown className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="text-sm font-bold text-red-700 dark:text-red-300">Mala Senapotis</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {hierarchy.malaSenapotis.map((leader) => (
                            <div key={leader.id} className="text-xs relative group">
                              <div className="flex items-center justify-between p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                                <div className="flex-1">
                                  <p className="font-medium text-red-800 dark:text-red-200">{leader.name}</p>
                                  {leader.namahattaName && (
                                    <p className="text-red-600 dark:text-red-400 truncate" title={leader.namahattaName}>
                                      {leader.namahattaName}
                                    </p>
                                  )}
                                </div>
                                {canManageRoles && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-role-menu-${leader.id}`}
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleRoleManagement(leader)}>
                                        <UserCog className="mr-2 h-3 w-3" />
                                        Manage Role
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Maha Chakra Senapotis */}
                {hierarchy.mahaChakraSenapotis && hierarchy.mahaChakraSenapotis.length > 0 && (
                  <Card className="bg-white/80 dark:bg-slate-800/50 border-indigo-300 dark:border-indigo-500/30 shadow-lg" data-testid="card-maha-chakra-senapotis">
                    <CardContent className="p-4">
                      <div className="text-center space-y-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center mx-auto">
                          <UserCheck className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Maha Chakra Senapotis</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {hierarchy.mahaChakraSenapotis.map((leader) => (
                            <div key={leader.id} className="text-xs">
                              <p className="font-medium text-indigo-800 dark:text-indigo-200">{leader.name}</p>
                              {leader.namahattaName && (
                                <p className="text-indigo-600 dark:text-indigo-400 truncate" title={leader.namahattaName}>
                                  {leader.namahattaName}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Chakra Senapotis */}
                {hierarchy.chakraSenapotis && hierarchy.chakraSenapotis.length > 0 && (
                  <Card className="bg-white/80 dark:bg-slate-800/50 border-green-300 dark:border-green-500/30 shadow-lg" data-testid="card-chakra-senapotis">
                    <CardContent className="p-4">
                      <div className="text-center space-y-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="text-sm font-bold text-green-700 dark:text-green-300">Chakra Senapotis</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {hierarchy.chakraSenapotis.map((leader) => (
                            <div key={leader.id} className="text-xs">
                              <p className="font-medium text-green-800 dark:text-green-200">{leader.name}</p>
                              {leader.namahattaName && (
                                <p className="text-green-600 dark:text-green-400 truncate" title={leader.namahattaName}>
                                  {leader.namahattaName}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Upa Chakra Senapotis */}
                {hierarchy.upaChakraSenapotis && hierarchy.upaChakraSenapotis.length > 0 && (
                  <Card className="bg-white/80 dark:bg-slate-800/50 border-yellow-300 dark:border-yellow-500/30 shadow-lg" data-testid="card-upa-chakra-senapotis">
                    <CardContent className="p-4">
                      <div className="text-center space-y-3">
                        <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-300">Upa Chakra Senapotis</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {hierarchy.upaChakraSenapotis.map((leader) => (
                            <div key={leader.id} className="text-xs">
                              <p className="font-medium text-yellow-800 dark:text-yellow-200">{leader.name}</p>
                              {leader.namahattaName && (
                                <p className="text-yellow-600 dark:text-yellow-400 truncate" title={leader.namahattaName}>
                                  {leader.namahattaName}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* District Supervisors Tree - Simple Collapsible Structure */}
        {(districtSupervisors as any[]) && (districtSupervisors as any[]).length > 0 && (
          <div className="mt-8">
            <Collapsible open={isDistrictSupervisorsOpen} onOpenChange={setIsDistrictSupervisorsOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-4 h-auto bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-black dark:text-white rounded-lg"
                  data-testid="button-district-supervisors-toggle"
                >
                  <div className="flex items-center gap-3">
                    <TreePine className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <span className="text-lg font-semibold">District Supervisors Tree</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">({(districtSupervisors as any[])?.length || 0})</span>
                  </div>
                  {isDistrictSupervisorsOpen ? (
                    <ChevronDown className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="border-l-2 border-slate-200 dark:border-slate-700 ml-4 pl-4 space-y-2">
                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search supervisors..."
                        value={districtSearchTerm}
                        onChange={(e) => setDistrictSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid="input-district-search"
                      />
                    </div>
                  </div>
                  
                  {isLoadingDistrictSupervisors ? (
                    <div className="flex items-center gap-2 py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">Loading district supervisors...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {(districtSupervisors as any[])
                        .filter((s: any) => 
                          s.fullName.toLowerCase().includes(districtSearchTerm.toLowerCase())
                        )
                        .map((supervisor: any) => (
                          <div key={supervisor.id}>
                            <div 
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                selectedDistrictSupervisor === supervisor.id ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : ''
                              }`}
                              onClick={() => handleDistrictSupervisorClick(supervisor.id)}
                              data-testid={`card-district-supervisor-${supervisor.id}`}
                            >
                              {selectedDistrictSupervisor === supervisor.id ? (
                                <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              )}
                              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <span className="text-sm font-medium truncate">{supervisor.fullName}</span>
                              {supervisor.districts && supervisor.districts.length > 0 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">({supervisor.districts.join(", ")})</span>
                              )}
                            </div>
                            
                            {/* Mala Senapotis for selected District Supervisor */}
                            {selectedDistrictSupervisor === supervisor.id && (
                              <div className="ml-6 mt-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4 space-y-1">
                                {!malaSenapotis ? (
                                  <div className="flex items-center gap-2 py-2">
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-pink-600 border-t-transparent"></div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Loading mala senapotis...</span>
                                  </div>
                                ) : malaSenapotis.length === 0 ? (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">No mala senapotis found</span>
                                ) : (
                                  malaSenapotis.map((mala: any) => (
                                    <div key={mala.id}>
                                      <div 
                                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                          selectedMalaSenapoti === mala.id ? 'bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800' : ''
                                        }`}
                                        onClick={() => handleMalaSenapotiClick(mala.id)}
                                        data-testid={`card-mala-senapoti-${mala.id}`}
                                      >
                                        {selectedMalaSenapoti === mala.id ? (
                                          <ChevronDown className="h-4 w-4 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                                        )}
                                        <Crown className="h-4 w-4 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                                        <span className="text-sm font-medium truncate">{mala.legalName}{mala.name ? ` :: ${mala.name}` : ''}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Mala</span>
                                      </div>
                                      
                                      {/* Maha Chakra Senapotis for selected Mala Senapoti */}
                                      {selectedMalaSenapoti === mala.id && (
                                        <div className="ml-6 mt-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4 space-y-1">
                                          {!mahaChakraSenapotis ? (
                                            <div className="flex items-center gap-2 py-2">
                                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                                              <span className="text-xs text-slate-500 dark:text-slate-400">Loading maha chakra senapotis...</span>
                                            </div>
                                          ) : mahaChakraSenapotis.length === 0 ? (
                                            <span className="text-xs text-slate-500 dark:text-slate-400">No maha chakra senapotis found</span>
                                          ) : (
                                            mahaChakraSenapotis.map((mahaChakra: any) => (
                                              <div key={mahaChakra.id}>
                                                <div 
                                                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                                    selectedMahaChakraSenapoti === mahaChakra.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' : ''
                                                  }`}
                                                  onClick={() => handleMahaChakraSenapotiClick(mahaChakra.id)}
                                                  data-testid={`card-maha-chakra-senapoti-${mahaChakra.id}`}
                                                >
                                                  {selectedMahaChakraSenapoti === mahaChakra.id ? (
                                                    <ChevronDown className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                                  ) : (
                                                    <ChevronRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                                  )}
                                                  <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                                  <span className="text-sm font-medium truncate">{mahaChakra.legalName}{mahaChakra.name ? ` :: ${mahaChakra.name}` : ''}</span>
                                                  <span className="text-xs text-slate-500 dark:text-slate-400">Maha Chakra</span>
                                                </div>
                                                
                                                {/* Chakra Senapotis for selected Maha Chakra Senapoti */}
                                                {selectedMahaChakraSenapoti === mahaChakra.id && (
                                                  <div className="ml-6 mt-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4 space-y-1">
                                                    {!chakraSenapotis ? (
                                                      <div className="flex items-center gap-2 py-2">
                                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-600 border-t-transparent"></div>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">Loading chakra senapotis...</span>
                                                      </div>
                                                    ) : chakraSenapotis.length === 0 ? (
                                                      <span className="text-xs text-slate-500 dark:text-slate-400">No chakra senapotis found</span>
                                                    ) : (
                                                      chakraSenapotis.map((chakra: any) => (
                                                        <div key={chakra.id}>
                                                          <div 
                                                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                                              selectedChakraSenapoti === chakra.id ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : ''
                                                            }`}
                                                            onClick={() => handleChakraSenapotiClick(chakra.id)}
                                                            data-testid={`card-chakra-senapoti-${chakra.id}`}
                                                          >
                                                            {selectedChakraSenapoti === chakra.id ? (
                                                              <ChevronDown className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                            ) : (
                                                              <ChevronRight className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                            )}
                                                            <Users className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                            <span className="text-sm font-medium truncate">{chakra.legalName}{chakra.name ? ` :: ${chakra.name}` : ''}</span>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">Chakra</span>
                                                          </div>
                                                          
                                                          {/* Upa Chakra Senapotis for selected Chakra Senapoti */}
                                                          {selectedChakraSenapoti === chakra.id && (
                                                            <div className="ml-6 mt-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4 space-y-1">
                                                              {!upaChakraSenapotis ? (
                                                                <div className="flex items-center gap-2 py-2">
                                                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-600 border-t-transparent"></div>
                                                                  <span className="text-xs text-slate-500 dark:text-slate-400">Loading upa chakra senapotis...</span>
                                                                </div>
                                                              ) : upaChakraSenapotis.length === 0 ? (
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">No upa chakra senapotis found</span>
                                                              ) : (
                                                                upaChakraSenapotis.map((upaChakra: any) => (
                                                                  <div key={upaChakra.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                                                                    <Circle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                                                    <span className="text-sm font-medium truncate">{upaChakra.legalName}{upaChakra.name ? ` :: ${upaChakra.name}` : ''}</span>
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400">Upa Chakra</span>
                                                                  </div>
                                                                ))
                                                              )}
                                                            </div>
                                                          )}
                                                        </div>
                                                      ))
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
        
        </div>
      </div>

      {/* Role Management Modal */}
      {showRoleManagementModal && selectedDevoteeForRoleManagement && (
        <RoleManagementModal
          isOpen={showRoleManagementModal}
          onClose={() => setShowRoleManagementModal(false)}
          devotee={selectedDevoteeForRoleManagement}
          districtCode={selectedDevoteeForRoleManagement.districtCode}
        />
      )}
    </div>
  );
}