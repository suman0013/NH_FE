import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { api } from "@/services/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft,
  Edit,
  MapPin,
  Heart,
  GraduationCap,
  Briefcase,
  User,
  Users,
  Calendar,
  TrendingUp,
  Book,
  Award,
  Phone,
  Mail,
  Zap,
  Home,
  Activity,
  Building,
  RefreshCw
} from "lucide-react";
import type { Devotee } from "@/lib/types";
import DevoteeForm from "@/components/forms/DevoteeForm";
import ChangeNamhattaModal from "@/components/ChangeNamhattaModal";
import RoleManagementModal from "@/components/RoleManagementModal";
import { Shield, UserCog, History } from "lucide-react";



export default function DevoteeDetail() {
  const { id } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [showEditForm, setShowEditForm] = useState(false);
  const [statusComment, setStatusComment] = useState("");
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [backUrl, setBackUrl] = useState("/devotees");
  const [showChangeNamhattaModal, setShowChangeNamhattaModal] = useState(false);
  const [showRoleManagementModal, setShowRoleManagementModal] = useState(false);

  // Check if we came from a Namhatta page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromNamhatta = urlParams.get('from');
    if (fromNamhatta) {
      setBackUrl(`/namhattas/${fromNamhatta}`);
    }
  }, []);

  const { data: devotee, isLoading } = useQuery({
    queryKey: ["/api/devotees", id],
    queryFn: () => api.getDevotee(parseInt(id!)),
    enabled: !!id,
  });

  const { data: statuses } = useQuery({
    queryKey: ["/api/statuses"],
    queryFn: () => api.getStatuses(),
  });

  const { data: statusHistory } = useQuery({
    queryKey: ["/api/devotees", id, "status-history"],
    queryFn: () => api.getDevoteeStatusHistory(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch current namhatta data if devotee has one
  const { data: currentNamhatta } = useQuery({
    queryKey: ["/api/namhattas", devotee?.namhattaId],
    queryFn: () => api.getNamhatta(devotee!.namhattaId!),
    enabled: !!devotee?.namhattaId,
  });

  // Fetch role change history for devotee
  const { data: roleChangeHistory } = useQuery({
    queryKey: ["/api/senapoti/role-history", id],
    queryFn: () => api.getRoleChangeHistory(parseInt(id!)),
    enabled: !!id && !!devotee?.leadershipRole,
  });

  // Get devotee's district for role management - MUST use namhatta's district, not personal address
  const getDevoteeDistrict = (): string => {
    // First priority: Use the namhatta's district (where they serve spiritually)
    if (currentNamhatta?.address?.district) {
      return currentNamhatta.address.district;
    }
    
    // Fallback: If no namhatta, try personal address (rare case)
    if (devotee?.presentAddress?.district) return devotee.presentAddress.district;
    if (devotee?.permanentAddress?.district) return devotee.permanentAddress.district;
    
    // Last resort: Use current user's district if they're a district supervisor
    if (user?.districts && user.districts.length > 0) {
      const district = user.districts[0];
      return typeof district === 'string' ? district : district.code || district.name || 'UNKNOWN';
    }
    
    return 'UNKNOWN';
  };

  const devoteeDistrict = getDevoteeDistrict();

  const { data: shraddhakutirs } = useQuery({
    queryKey: ["/api/shraddhakutirs"],
    queryFn: () => api.getShraddhakutirs(),
  });

  const upgradeStatusMutation = useMutation({
    mutationFn: ({ newStatusId, notes }: { newStatusId: number; notes?: string }) => 
      api.upgradeDevoteeStatus(parseInt(id!), newStatusId, notes),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Devotional status upgraded successfully",
      });
      setStatusComment(""); // Clear the comment after successful update
      queryClient.invalidateQueries({ queryKey: ["/api/devotees", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/devotees", id, "status-history"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upgrade status",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <DevoteeDetailSkeleton />;
  }

  if (!devotee) {
    return (
      <div className="p-6">
        <Card className="glass-card">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Devotee not found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The requested devotee could not be found.
            </p>
            <Link href={backUrl}>
              <Button>Back</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusName = (statusId?: number) => {
    // If no status ID provided, use current devotee's status name from API
    if (!statusId) {
      if (devotee?.devotionalStatusName) {
        return devotee.devotionalStatusName;
      }
      return "Unknown";
    }
    
    // Try lookup from statuses list
    const status = statuses?.find(s => s.id === statusId);
    if (status?.name) {
      return status.name;
    }
    
    // Fallback: if this is the devotee's current status ID and we have the name, use it
    if (statusId === devotee?.devotionalStatusId && devotee?.devotionalStatusName) {
      return devotee.devotionalStatusName;
    }
    
    return "Unknown";
  };

  // Helper to get status name from history entry (handles both ID and name storage)
  const getHistoryStatusName = (newStatusValue: string) => {
    if (!newStatusValue) return "Unknown";
    
    // Try to parse as number (if stored as ID)
    const statusId = parseInt(newStatusValue, 10);
    if (!isNaN(statusId)) {
      const status = statuses?.find(s => s.id === statusId);
      if (status?.name) {
        return status.name;
      }
      // If ID matches current devotee's status, use that name
      if (statusId === devotee?.devotionalStatusId && devotee?.devotionalStatusName) {
        return devotee.devotionalStatusName;
      }
    }
    
    // If not a valid number, it might be stored as the status name directly
    // Check if it matches any known status name
    const statusByName = statuses?.find(s => s.name === newStatusValue);
    if (statusByName) {
      return statusByName.name;
    }
    
    // If it looks like a status name (non-numeric string), return it directly
    if (isNaN(statusId) && newStatusValue.length > 0) {
      return newStatusValue;
    }
    
    return "Unknown";
  };

  const getStatusColor = (statusId?: number) => {
    if (!statusId) return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300";
    
    const statusName = getStatusName(statusId).toLowerCase();
    if (statusName.includes("bhakta")) return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
    if (statusName.includes("initiated")) return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300";
    if (statusName.includes("brahmachari")) return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
    return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300";
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={backUrl}>
            <Button variant="outline" size="icon" className="glass">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-600 text-white text-xl">
                {devotee.legalName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{devotee.legalName}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <Badge className={getStatusColor(devotee.devotionalStatusId)}>
                  {getStatusName(devotee.devotionalStatusId)}
                </Badge>
                {devotee.occupation && (
                  <span className="text-gray-600 dark:text-gray-400 flex items-center">
                    <Briefcase className="mr-1 h-4 w-4" />
                    {devotee.occupation}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {/* Role Management Button - For ADMIN and DISTRICT_SUPERVISOR (both with and without existing roles) */}
          {(user?.role === 'ADMIN' || user?.role === 'DISTRICT_SUPERVISOR') && (
            <Button 
              variant="outline" 
              className="glass" 
              onClick={() => setShowRoleManagementModal(true)}
              data-testid="button-role-management"
            >
              <Shield className="mr-2 h-4 w-4" />
              {devotee.leadershipRole ? 'Manage Role' : 'Assign Role'}
            </Button>
          )}
          
          {/* Edit Profile Button */}
          <Button variant="outline" className="glass" onClick={() => setShowEditForm(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="status">Status Management</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-1">
            {/* Basic Information */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-base">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-2">
                    <User className="h-3 w-3 text-white" />
                  </div>
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center mb-1">
                      <User className="h-3 w-3 text-blue-600 dark:text-blue-400 mr-1" />
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Legal Name</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.legalName}</p>
                  </div>
                  {devotee.dob && (
                    <div className="p-2 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center mb-1">
                        <Calendar className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Date of Birth</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {new Date(devotee.dob).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {devotee.email && (
                    <div className="p-2 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center mb-1">
                        <Mail className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Email</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.email}</p>
                    </div>
                  )}
                  {devotee.phone && (
                    <div className="p-2 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center mb-1">
                        <Phone className="h-3 w-3 text-orange-600 dark:text-orange-400 mr-1" />
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Phone</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.phone}</p>
                    </div>
                  )}
                  {devotee.gender && (
                    <div className="p-2 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                      <div className="flex items-center mb-1">
                        <Users className="h-3 w-3 text-pink-600 dark:text-pink-400 mr-1" />
                        <p className="text-xs font-medium text-pink-600 dark:text-pink-400">Gender</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.gender}</p>
                    </div>
                  )}
                  {devotee.bloodGroup && (
                    <div className="p-2 bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center mb-1">
                        <Zap className="h-3 w-3 text-red-600 dark:text-red-400 mr-1" />
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">Blood Group</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.bloodGroup}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Namhatta Assignment */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-2">
                      <Building className="h-3 w-3 text-white" />
                    </div>
                    Namhatta Assignment
                  </div>
                  {/* Change Namhatta button - only for admin/office */}
                  {(user?.role === 'ADMIN' || user?.role === 'OFFICE') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChangeNamhattaModal(true)}
                      className="text-xs"
                      data-testid="button-change-namhatta"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Change Namhatta
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {devotee.namhattaId && currentNamhatta ? (
                  <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center mb-2">
                      <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-2" />
                      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Current Namhatta</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-base">
                      {currentNamhatta.name}
                    </p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      Code: {currentNamhatta.code}
                    </p>
                    {currentNamhatta.meetingDay && currentNamhatta.meetingTime && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        Meetings: {currentNamhatta.meetingDay} at {currentNamhatta.meetingTime}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center mb-1">
                      <Building className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Namhatta Assignment</p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      No namhatta assigned
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leadership Role Assignment - Show only when devotee has no leadership role */}
            {(user?.role === 'ADMIN' || user?.role === 'DISTRICT_SUPERVISOR') && !devotee.leadershipRole && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-2">
                        <Shield className="h-3 w-3 text-white" />
                      </div>
                      Leadership Role Assignment
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRoleManagementModal(true)}
                      className="text-xs"
                      data-testid="button-assign-senapoti-role"
                    >
                      <UserCog className="h-3 w-3 mr-1" />
                      Assign Senapoti Role
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="p-3 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center mb-2">
                      <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-2" />
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Current Leadership Role</p>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                      No leadership role assigned
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Click "Assign Senapoti Role" to assign this devotee to a leadership position in the organizational hierarchy.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Leadership Role - Show only when devotee has a leadership role */}
            {devotee.leadershipRole && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-2">
                        <Shield className="h-3 w-3 text-white" />
                      </div>
                      Leadership Role
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'DISTRICT_SUPERVISOR') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRoleManagementModal(true)}
                        className="text-xs"
                        data-testid="button-manage-leadership-role"
                      >
                        <UserCog className="h-3 w-3 mr-1" />
                        Manage Role
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center mb-2">
                      <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Current Role</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-base">
                      {devotee.leadershipRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    {devotee.reportingToDevoteeId && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Reports to: Devotee ID {devotee.reportingToDevoteeId}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Family Information */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-base">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-2">
                    <Users className="h-3 w-3 text-white" />
                  </div>
                  Family Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {devotee.fatherName && (
                    <div className="p-2 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center mb-1">
                        <User className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Father's Name</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.fatherName}</p>
                    </div>
                  )}
                  {devotee.motherName && (
                    <div className="p-2 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                      <div className="flex items-center mb-1">
                        <Heart className="h-3 w-3 text-pink-600 dark:text-pink-400 mr-1" />
                        <p className="text-xs font-medium text-pink-600 dark:text-pink-400">Mother's Name</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.motherName}</p>
                    </div>
                  )}
                  {devotee.maritalStatus && (
                    <div className="p-2 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center mb-1">
                        <Users className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Marital Status</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.maritalStatus}</p>
                    </div>
                  )}
                  {devotee.husbandName && (
                    <div className="p-2 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center mb-1">
                        <User className="h-3 w-3 text-indigo-600 dark:text-indigo-400 mr-1" />
                        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Husband's Name</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.husbandName}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-base">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center mr-2">
                    <GraduationCap className="h-3 w-3 text-white" />
                  </div>
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {devotee.education && (
                    <div className="p-2 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center mb-1">
                        <GraduationCap className="h-3 w-3 text-orange-600 dark:text-orange-400 mr-1" />
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Education</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.education}</p>
                    </div>
                  )}
                  {devotee.occupation && (
                    <div className="p-2 bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      <div className="flex items-center mb-1">
                        <Briefcase className="h-3 w-3 text-cyan-600 dark:text-cyan-400 mr-1" />
                        <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Occupation</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.occupation}</p>
                    </div>
                  )}
                </div>
                {devotee.additionalComments && (
                  <div className="mt-2 p-2 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center mb-1">
                      <Book className="h-3 w-3 text-gray-600 dark:text-gray-400 mr-1" />
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Additional Comments</p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{devotee.additionalComments}</p>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Present Address */}
            {devotee.presentAddress && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-base">
                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-2">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    Present Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {devotee.presentAddress.country && (
                      <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center mb-1">
                          <Home className="h-3 w-3 text-blue-600 dark:text-blue-400 mr-1" />
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Country</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.presentAddress.country}</p>
                      </div>
                    )}
                    {devotee.presentAddress.state && (
                      <div className="p-2 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center mb-1">
                          <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">State</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.presentAddress.state}</p>
                      </div>
                    )}
                    {devotee.presentAddress.district && (
                      <div className="p-2 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center mb-1">
                          <Activity className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">District</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.presentAddress.district}</p>
                      </div>
                    )}
                    {devotee.presentAddress.subDistrict && (
                      <div className="p-2 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center mb-1">
                          <TrendingUp className="h-3 w-3 text-orange-600 dark:text-orange-400 mr-1" />
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Sub-District</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.presentAddress.subDistrict}</p>
                      </div>
                    )}
                    {devotee.presentAddress.village && (
                      <div className="p-2 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                        <div className="flex items-center mb-1">
                          <Home className="h-3 w-3 text-pink-600 dark:text-pink-400 mr-1" />
                          <p className="text-xs font-medium text-pink-600 dark:text-pink-400">Village</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.presentAddress.village}</p>
                      </div>
                    )}
                    {devotee.presentAddress.postalCode && (
                      <div className="p-2 bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                        <div className="flex items-center mb-1">
                          <MapPin className="h-3 w-3 text-cyan-600 dark:text-cyan-400 mr-1" />
                          <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Postal Code</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.presentAddress.postalCode}</p>
                      </div>
                    )}
                    {devotee.presentAddress.landmark && (
                      <div className="md:col-span-2 lg:col-span-3 p-2 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center mb-1">
                          <MapPin className="h-3 w-3 text-gray-600 dark:text-gray-400 mr-1" />
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Landmark</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.presentAddress.landmark}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Permanent Address */}
            {devotee.permanentAddress && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-base">
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-2">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    Permanent Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {devotee.permanentAddress.country && (
                      <div className="p-2 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center mb-1">
                          <Home className="h-3 w-3 text-indigo-600 dark:text-indigo-400 mr-1" />
                          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Country</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.permanentAddress.country}</p>
                      </div>
                    )}
                    {devotee.permanentAddress.state && (
                      <div className="p-2 bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                        <div className="flex items-center mb-1">
                          <MapPin className="h-3 w-3 text-teal-600 dark:text-teal-400 mr-1" />
                          <p className="text-xs font-medium text-teal-600 dark:text-teal-400">State</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.permanentAddress.state}</p>
                      </div>
                    )}
                    {devotee.permanentAddress.district && (
                      <div className="p-2 bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                        <div className="flex items-center mb-1">
                          <Activity className="h-3 w-3 text-violet-600 dark:text-violet-400 mr-1" />
                          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">District</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.permanentAddress.district}</p>
                      </div>
                    )}
                    {devotee.permanentAddress.subDistrict && (
                      <div className="p-2 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center mb-1">
                          <TrendingUp className="h-3 w-3 text-amber-600 dark:text-amber-400 mr-1" />
                          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Sub-District</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.permanentAddress.subDistrict}</p>
                      </div>
                    )}
                    {devotee.permanentAddress.village && (
                      <div className="p-2 bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
                        <div className="flex items-center mb-1">
                          <Home className="h-3 w-3 text-rose-600 dark:text-rose-400 mr-1" />
                          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Village</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.permanentAddress.village}</p>
                      </div>
                    )}
                    {devotee.permanentAddress.postalCode && (
                      <div className="p-2 bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-900/20 dark:to-blue-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
                        <div className="flex items-center mb-1">
                          <MapPin className="h-3 w-3 text-sky-600 dark:text-sky-400 mr-1" />
                          <p className="text-xs font-medium text-sky-600 dark:text-sky-400">Postal Code</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.permanentAddress.postalCode}</p>
                      </div>
                    )}
                    {devotee.permanentAddress.landmark && (
                      <div className="md:col-span-2 lg:col-span-3 p-2 bg-gradient-to-br from-stone-50 to-gray-100 dark:from-stone-900/20 dark:to-gray-900/20 rounded-lg border border-stone-200 dark:border-stone-800">
                        <div className="flex items-center mb-1">
                          <MapPin className="h-3 w-3 text-stone-600 dark:text-stone-400 mr-1" />
                          <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Landmark</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.permanentAddress.landmark}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Spiritual Information */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-base">
                <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center mr-2">
                  <Heart className="h-3 w-3 text-white" />
                </div>
                Spiritual Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center mb-1">
                    <Award className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Devotional Status</p>
                  </div>
                  <Badge className={getStatusColor(devotee.devotionalStatusId)}>
                    {getStatusName(devotee.devotionalStatusId)}
                  </Badge>
                </div>
                {devotee.harinamInitiationGurudev && (
                  <div className="p-2 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center mb-1">
                      <User className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Harinam Initiation Gurudev</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.harinamInitiationGurudev}</p>
                  </div>
                )}
                {devotee.harinamDate && (
                  <div className="p-2 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center mb-1">
                      <Calendar className="h-3 w-3 text-orange-600 dark:text-orange-400 mr-1" />
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Harinama Initiation Date</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {new Date(devotee.harinamDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {devotee.initiatedName && (
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center mb-1">
                      <User className="h-3 w-3 text-blue-600 dark:text-blue-400 mr-1" />
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Initiated Name</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.initiatedName}</p>
                  </div>
                )}
                {devotee.pancharatrikInitiationGurudev && (
                  <div className="p-2 bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                    <div className="flex items-center mb-1">
                      <User className="h-3 w-3 text-teal-600 dark:text-teal-400 mr-1" />
                      <p className="text-xs font-medium text-teal-600 dark:text-teal-400">Pancharatrik Initiation Gurudev</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{devotee.pancharatrikInitiationGurudev}</p>
                  </div>
                )}
                {devotee.pancharatrikDate && (
                  <div className="p-2 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                    <div className="flex items-center mb-1">
                      <Calendar className="h-3 w-3 text-pink-600 dark:text-pink-400 mr-1" />
                      <p className="text-xs font-medium text-pink-600 dark:text-pink-400">Pancharatrik Initiation Date</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {new Date(devotee.pancharatrikDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {devotee.shraddhakutirId && (
                  <div className="p-2 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900/20 dark:to-gray-900/20 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center mb-1">
                      <Building className="h-3 w-3 text-slate-600 dark:text-slate-400 mr-1" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Shraddhakutir</p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {shraddhakutirs?.find(sk => sk.id === devotee.shraddhakutirId)?.name 
                        ? `${shraddhakutirs.find(sk => sk.id === devotee.shraddhakutirId)!.name} - ${devotee.shraddhakutirId}`
                        : "Loading..."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Devotional Courses */}
          {devotee.devotionalCourses && devotee.devotionalCourses.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-base">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-2">
                    <Book className="h-3 w-3 text-white" />
                  </div>
                  Devotional Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  {devotee.devotionalCourses.map((course, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center mb-1">
                          <Book className="h-3 w-3 text-blue-600 dark:text-blue-400 mr-1" />
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Course Name</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{course.name}</p>
                      </div>
                      {course.date && (
                        <div className="p-2 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center mb-1">
                            <Calendar className="h-3 w-3 text-green-600 dark:text-green-400 mr-1" />
                            <p className="text-xs font-medium text-green-600 dark:text-green-400">Date</p>
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {new Date(course.date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div className="p-2 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center mb-1">
                          <Building className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Institute</p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{course.institute}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Status */}
            <Card className="glass-card min-h-96 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"></div>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center text-base">
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-2">
                    <TrendingUp className="h-3 w-3 text-white" />
                  </div>
                  Current Devotional Status
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                {/* Current Status Display */}
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center mb-1">
                        <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-1" />
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Current Status</p>
                      </div>
                      <p className="text-xl font-bold gradient-text">
                        {getStatusName(devotee.devotionalStatusId)}
                      </p>
                    </div>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                      Active
                    </Badge>
                  </div>
                </div>
                
                {/* Upgrade Status Section */}
                <div className="space-y-3">
                  <div className="flex items-center mb-2">
                    <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-2" />
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Upgrade Status</p>
                  </div>
                  <div className="space-y-3">
                    <Select
                      onValueChange={(value) => {
                        setSelectedStatusId(parseInt(value));
                      }}
                      disabled={upgradeStatusMutation.isPending}
                    >
                      <SelectTrigger className="glass border-0 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses?.filter(status => status.id !== devotee.devotionalStatusId).map((status) => (
                          <SelectItem key={status.id} value={status.id.toString()}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div>
                      <Label htmlFor="statusComment" className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center mb-2">
                        <Book className="h-3 w-3 mr-1" />
                        Comment (Optional)
                      </Label>
                      <Textarea
                        id="statusComment"
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="Add a comment about this status change..."
                        className="glass border-0 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (selectedStatusId) {
                          upgradeStatusMutation.mutate({ 
                            newStatusId: selectedStatusId, 
                            notes: statusComment.trim() || undefined 
                          });
                          setSelectedStatusId(null);
                          setStatusComment("");
                        }
                      }}
                      disabled={!selectedStatusId || upgradeStatusMutation.isPending}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg transition-all duration-200"
                    >
                      {upgradeStatusMutation.isPending ? "Updating Status..." : "Change Status"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status History */}
            {/* Role Change History - Show if user has leadership role */}
            {devotee.leadershipRole && (
              <Card className="glass-card min-h-64 relative overflow-hidden mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center text-base">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-2">
                      <Shield className="h-3 w-3 text-white" />
                    </div>
                    Role Change History
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {!roleChangeHistory || roleChangeHistory.length === 0 ? (
                      <div className="text-center py-6">
                        <UserCog className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 dark:text-gray-400 font-medium">
                          No role changes recorded yet.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          Role changes will appear here when they occur.
                        </p>
                      </div>
                    ) : (
                      roleChangeHistory.map((entry: any, index: number) => (
                        <div key={entry.id} className="relative">
                          <div className="flex items-start space-x-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all duration-200">
                            <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mt-1 shadow-sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                {entry.previousRole ? `Changed from ${entry.previousRole.replace(/_/g, ' ')} to ` : 'Appointed as '}
                                {entry.newRole ? entry.newRole.replace(/_/g, ' ') : 'No Role'}
                              </p>
                              <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mb-1">
                                <History className="h-3 w-3 mr-1" />
                                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Recently'}
                              </div>
                              {entry.reason && (
                                <div className="mt-2 p-2 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                    "{entry.reason}"
                                  </p>
                                </div>
                              )}
                              {entry.subordinatesTransferred > 0 && (
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {entry.subordinatesTransferred} subordinates transferred
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          {index < (roleChangeHistory.length - 1) && (
                            <div className="absolute left-7 top-14 w-px h-4 bg-gradient-to-b from-blue-300 to-indigo-300 dark:from-blue-700 dark:to-indigo-700" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status History */}
            <Card className="glass-card min-h-96 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5"></div>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center text-base">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-2">
                    <Calendar className="h-3 w-3 text-white" />
                  </div>
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {statusHistory?.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium">
                        No status changes recorded yet.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Status changes will appear here when they occur.
                      </p>
                    </div>
                  ) : (
                    statusHistory?.map((entry: any, index: number) => (
                      <div key={entry.id} className="relative">
                        <div className="flex items-start space-x-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all duration-200">
                          <div className="w-3 h-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mt-1 shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                              Changed to {getHistoryStatusName(entry.newStatus)}
                            </p>
                            <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              {entry.updatedAt && entry.updatedAt !== 'CURRENT_TIMESTAMP' ? new Date(entry.updatedAt).toLocaleDateString() : 'Recently'}
                            </div>
                            {entry.reason && (
                              <div className="mt-2 p-2 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                  "{entry.reason}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Timeline connector */}
                        {index < (statusHistory?.length - 1) && (
                          <div className="absolute left-7 top-14 w-px h-4 bg-gradient-to-b from-emerald-300 to-teal-300 dark:from-emerald-700 dark:to-teal-700" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>




      </Tabs>

      {/* Edit Form Modal */}
      {showEditForm && devotee && (
        <DevoteeForm
          devotee={devotee}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            // Refresh the devotee data
            queryClient.invalidateQueries({ queryKey: ["/api/devotees", id] });
          }}
        />
      )}

      {/* Change Namhatta Modal */}
      {showChangeNamhattaModal && devotee && (
        <ChangeNamhattaModal
          isOpen={showChangeNamhattaModal}
          onClose={() => setShowChangeNamhattaModal(false)}
          devotee={devotee}
          currentNamhattaName={currentNamhatta?.name}
        />
      )}

      {/* Role Management Modal */}
      {showRoleManagementModal && devotee && (
        <RoleManagementModal
          isOpen={showRoleManagementModal}
          onClose={() => setShowRoleManagementModal(false)}
          devotee={devotee}
          districtCode={devoteeDistrict}
        />
      )}
    </div>
  );
}

function DevoteeDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
