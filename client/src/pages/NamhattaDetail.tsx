import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { api } from "@/services/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import NamhattaForm from "@/components/forms/NamhattaForm";
import NamhattaUpdateForm from "@/components/forms/NamhattaUpdateForm";
import DevoteeForm from "@/components/forms/DevoteeForm";
import NamhattaUpdateCard from "@/components/NamhattaUpdateCard";
import { 
  Home, 
  Users, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  Edit, 
  ArrowLeft,
  UserPlus,
  Activity,
  TrendingUp,
  Clock,
  Image as ImageIcon,
  Facebook,
  Youtube,
  Crown,
  Plus,
  User,
  GraduationCap,
  Briefcase,
  X,
  AlertCircle,
  Grid3X3,
  List
} from "lucide-react";
import type { Namhatta, Devotee } from "@/lib/types";

export default function NamhattaDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditForm, setShowEditForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showDevoteeForm, setShowDevoteeForm] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = sessionStorage.getItem('namhatta-devotees-view-mode');
    return (saved as 'grid' | 'list') || 'grid';
  });
  
  // Only ADMIN and OFFICE users can approve/reject
  const canApprove = user?.role === 'ADMIN' || user?.role === 'OFFICE';

  const { data: namhatta, isLoading } = useQuery({
    queryKey: ["/api/namhattas", id],
    queryFn: () => api.getNamhatta(parseInt(id!)),
    enabled: !!id,
  });

  const { data: devotees } = useQuery({
    queryKey: ["/api/namhattas", id, "devotees"],
    queryFn: () => api.getNamhattaDevotees(parseInt(id!), 1, 10),
    enabled: !!id,
  });

  const { data: updates } = useQuery({
    queryKey: ["/api/namhattas", id, "updates"],
    queryFn: () => api.getNamhattaUpdates(parseInt(id!)),
    enabled: !!id,
  });

  const { data: statusCounts } = useQuery({
    queryKey: ["/api/namhattas", id, "status-count"],
    queryFn: () => api.getNamhattaDevoteeStatusCount(parseInt(id!)),
    enabled: !!id,
  });

  const { data: statuses } = useQuery({
    queryKey: ["/api/statuses"],
    queryFn: () => api.getStatuses(),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/namhattas/${id}/approve`),
    onSuccess: () => {
      toast({
        title: "Namhatta Approved",
        description: "Namhatta has been successfully approved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/namhattas", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/namhattas"] });
      setShowApprovalDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve namhatta. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => apiRequest("POST", `/api/namhattas/${id}/reject`, { reason }),
    onSuccess: () => {
      toast({
        title: "Namhatta Rejected",
        description: "Namhatta has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/namhattas", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/namhattas"] });
      setShowRejectionDialog(false);
      setRejectionReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject namhatta. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <NamhattaDetailSkeleton />;
  }

  if (!namhatta) {
    return (
      <div className="p-6">
        <Card className="glass-card">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Namhatta not found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The requested Namhatta could not be found.
            </p>
            <Link href="/namhattas">
              <Button>Back to Namhattas</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "approved":
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-full text-xs font-medium">Approved</Badge>;
      case "PENDING_APPROVAL":
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-1 rounded-full text-xs font-medium">Pending</Badge>;
      case "REJECTED":
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium">Rejected</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">Inactive</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/namhattas">
            <Button variant="outline" size="icon" className="glass">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{namhatta.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              {getStatusBadge(namhatta.status)}
              {namhatta.address && (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <MapPin className="mr-1 h-4 w-4" />
                  <span>
                    {[
                      namhatta.address.village,
                      namhatta.address.district,
                      namhatta.address.state
                    ].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {/* Approval buttons - only show for ADMIN and OFFICE users */}
          {(namhatta.status === "PENDING_APPROVAL" || namhatta.status === "pending") && canApprove && (
            <>
              <Button
                onClick={() => setShowApprovalDialog(true)}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectionDialog(true)}
                disabled={rejectMutation.isPending}
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          
          <Button variant="outline" className="glass" onClick={() => setShowEditForm(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Details
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devotees">Devotees</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass-card card-hover-effect glow-effect">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-white float-animation" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Devotees</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {devotees?.total || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>



            <Card className="glass-card card-hover-effect">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <Home className="h-6 w-6 text-white float-animation" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Meeting Schedule</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {namhatta.meetingDay ? `${namhatta.meetingDay} ${namhatta.meetingTime || ''}` : "Not scheduled"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leadership Roles */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-base">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-2">
                  <Crown className="h-3 w-3 text-white" />
                </div>
                Leadership Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {namhatta.malaSenapoti && (
                  <div className="p-2 bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center mb-1">
                      <Crown className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                      <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Mala Senapoti</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.malaSenapoti}</p>
                  </div>
                )}
                {namhatta.mahaChakraSenapoti && (
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center mb-1">
                      <Users className="h-3 w-3 text-blue-600 dark:text-blue-400 mr-1" />
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Maha Chakra Senapoti</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.mahaChakraSenapoti}</p>
                  </div>
                )}
                {namhatta.chakraSenapoti && (
                  <div className="p-2 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center mb-1">
                      <Activity className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Chakra Senapoti</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.chakraSenapoti}</p>
                  </div>
                )}
                {namhatta.upaChakraSenapoti && (
                  <div className="p-2 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center mb-1">
                      <TrendingUp className="h-3 w-3 text-orange-600 dark:text-orange-400 mr-1" />
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Upa Chakra Senapoti</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.upaChakraSenapoti}</p>
                  </div>
                )}
                {namhatta.secretary && (
                  <div className="p-2 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                    <div className="flex items-center mb-1">
                      <User className="h-3 w-3 text-pink-600 dark:text-pink-400 mr-1" />
                      <p className="text-xs font-medium text-pink-600 dark:text-pink-400">Secretary</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.secretary}</p>
                  </div>
                )}
                {!namhatta.malaSenapoti && !namhatta.mahaChakraSenapoti && !namhatta.chakraSenapoti && !namhatta.upaChakraSenapoti && !namhatta.secretary && (
                  <div className="col-span-2 text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Leadership Assigned</h3>
                    <p className="text-gray-500 dark:text-gray-400">Leadership roles have not been assigned to this Namhatta yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Details */}
          {namhatta.address && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-base">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-2">
                    <MapPin className="h-3 w-3 text-white" />
                  </div>
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {namhatta.address.country && (
                    <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center mb-1">
                        <Home className="h-3 w-3 text-blue-600 dark:text-blue-400 mr-1" />
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Country</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.address.country}</p>
                    </div>
                  )}
                  {namhatta.address.state && (
                    <div className="p-2 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center mb-1">
                        <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">State</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.address.state}</p>
                    </div>
                  )}
                  {namhatta.address.district && (
                    <div className="p-2 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center mb-1">
                        <Activity className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400">District</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.address.district}</p>
                    </div>
                  )}
                  {namhatta.address.subDistrict && (
                    <div className="p-2 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center mb-1">
                        <TrendingUp className="h-3 w-3 text-orange-600 dark:text-orange-400 mr-1" />
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Sub-District</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.address.subDistrict}</p>
                    </div>
                  )}
                  {namhatta.address.village && (
                    <div className="p-2 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                      <div className="flex items-center mb-1">
                        <Home className="h-3 w-3 text-pink-600 dark:text-pink-400 mr-1" />
                        <p className="text-xs font-medium text-pink-600 dark:text-pink-400">Village</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.address.village}</p>
                    </div>
                  )}
                  {namhatta.address.postalCode && (
                    <div className="p-2 bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      <div className="flex items-center mb-1">
                        <MapPin className="h-3 w-3 text-cyan-600 dark:text-cyan-400 mr-1" />
                        <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Pincode</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.address.postalCode}</p>
                    </div>
                  )}
                  {namhatta.address.landmark && (
                    <div className="md:col-span-2 lg:col-span-3 p-2 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                      <div className="flex items-center mb-1">
                        <MapPin className="h-3 w-3 text-gray-600 dark:text-gray-400 mr-1" />
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Landmark</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{namhatta.address.landmark}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="devotees" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Devotees</h3>
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100/10 dark:bg-gray-800/10 rounded-lg p-1 border border-gray-200/20 dark:border-gray-700/30">
                <button
                  onClick={() => {
                    setViewMode('grid');
                    sessionStorage.setItem('namhatta-devotees-view-mode', 'grid');
                  }}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white/20 dark:bg-white/10 text-gray-900 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  data-testid="button-grid-view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    sessionStorage.setItem('namhatta-devotees-view-mode', 'list');
                  }}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white/20 dark:bg-white/10 text-gray-900 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  data-testid="button-list-view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              
              <Button className="gradient-button" onClick={() => setShowDevoteeForm(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Devotee
              </Button>
            </div>
          </div>

          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "grid grid-cols-1 md:grid-cols-2 gap-3"
          }>
            {devotees?.data?.map((devotee) => (
              <DevoteeCard key={devotee.id} devotee={devotee} statuses={statuses} namhattaId={namhatta.id} viewMode={viewMode} />
            ))}
          </div>

          {devotees?.data?.length === 0 && (
            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No devotees found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">This Namhatta doesn't have any devotees yet.</p>
                <Button className="gradient-button" onClick={() => setShowDevoteeForm(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add First Devotee
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Updates</h2>
            <Button className="gradient-button" onClick={() => setShowUpdateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Post Update
            </Button>
          </div>
          
          {updates && updates.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {updates.map((update: any) => (
                <NamhattaUpdateCard 
                  key={update.id} 
                  update={update}
                  showNamhattaName={false}
                />
              ))}
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No updates yet</p>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                  Start sharing updates about programs and activities at this Namhatta.
                </p>
                <Button className="gradient-button" onClick={() => setShowUpdateForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Post First Update
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics & Insights</h3>
          
          {/* Status Distribution */}
          {statusCounts && Object.keys(statusCounts).length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Devotional Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {Object.entries(statusCounts).map(([status, count], index) => {
                    const totalDevotees = devotees?.total || 1;
                    const percentage = Math.round((Number(count) / totalDevotees) * 100);
                    
                    // Define colors for different statuses
                    const colors = [
                      "from-blue-400 to-blue-600",
                      "from-emerald-400 to-emerald-600", 
                      "from-purple-400 to-purple-600",
                      "from-orange-400 to-orange-600",
                      "from-pink-400 to-pink-600",
                      "from-indigo-400 to-indigo-600",
                      "from-cyan-400 to-cyan-600"
                    ];
                    const colorClass = colors[index % colors.length];
                    
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{status}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 bg-gradient-to-r ${colorClass} rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Form Modal */}
      {showEditForm && (
        <NamhattaForm
          namhatta={namhatta}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            queryClient.invalidateQueries({ queryKey: ["/api/namhattas", id] });
          }}
        />
      )}

      {/* Update Form Modal */}
      {namhatta && (
        <NamhattaUpdateForm
          namhattaId={namhatta.id}
          isOpen={showUpdateForm}
          onClose={() => setShowUpdateForm(false)}
        />
      )}

      {/* Devotee Form Modal */}
      {showDevoteeForm && (
        <DevoteeForm
          onClose={() => setShowDevoteeForm(false)}
          onSuccess={() => {
            setShowDevoteeForm(false);
            queryClient.invalidateQueries({ queryKey: ["/api/namhattas", id, "devotees"] });
          }}
          namhattaId={parseInt(id!)}
        />
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this Namhatta? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Namhatta</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this Namhatta registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Reason for Rejection</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionDialog(false);
                setRejectionReason("");
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => rejectMutation.mutate(rejectionReason)}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              variant="destructive"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DevoteeCard({ devotee, statuses, namhattaId, viewMode = 'grid' }: { devotee: Devotee; statuses?: any[]; namhattaId: number; viewMode?: 'grid' | 'list' }) {
  const getStatusName = (statusId?: number) => {
    // Use the devotionalStatusName from the API response if available
    if (devotee.devotionalStatusName) {
      return devotee.devotionalStatusName;
    }
    // Fallback to lookup if devotionalStatusName is not available
    if (!statusId || !statuses) return "Unknown";
    const status = statuses.find(s => s.id === statusId);
    return status?.name || "Unknown";
  };

  const getStatusColor = (statusId?: number) => {
    if (!statusId) return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300";
    
    const statusName = getStatusName(statusId).toLowerCase();
    if (statusName.includes("shraddhavan")) return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
    if (statusName.includes("diksha")) return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300";
    if (statusName.includes("guru")) return "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300";
    if (statusName.includes("sevak")) return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300";
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
  };

  if (viewMode === 'list') {
    // List View - Minimal Details with Initiated Name
    return (
      <Link href={`/devotees/${devotee.id}?from=${namhattaId}`} data-testid={`link-devotee-${devotee.id}`}>
        <Card className="glass-card card-hover-effect group cursor-pointer">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-600 text-white text-sm">
                  {(devotee.legalName || devotee.name || "").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 truncate">
                      {devotee.legalName}
                    </h3>
                    {devotee.initiatedName && (
                      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                        <Crown className="inline h-3 w-3 mr-1" />
                        {devotee.initiatedName}
                      </p>
                    )}
                  </div>
                  
                  <Badge className={`${getStatusColor(devotee.devotionalStatusId)} ml-2 text-xs`}>
                    {getStatusName(devotee.devotionalStatusId)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Grid View (default)
  return (
    <div className="h-[160px]">
      <Link href={`/devotees/${devotee.id}?from=${namhattaId}`} data-testid={`link-devotee-${devotee.id}`}>
        <Card className="glass-card card-hover-effect group h-full cursor-pointer">
          <CardContent className="p-3 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-600 text-white text-xs">
                  {(devotee.legalName || devotee.name || "").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 flex items-center truncate">
                  <User className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{devotee.legalName}</span>
                </h3>
                {devotee.initiatedName && (
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center truncate">
                    <Crown className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{devotee.initiatedName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className="mb-2">
              <Badge className={`text-xs ${getStatusColor(devotee.devotionalStatusId)}`}>
                {getStatusName(devotee.devotionalStatusId)}
              </Badge>
            </div>

            {/* Details */}
            <div className="space-y-1 flex-grow text-xs">
              {devotee.maritalStatus && (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Users className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{devotee.maritalStatus}</span>
                </div>
              )}
              {devotee.occupation && (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Briefcase className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{devotee.occupation}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function UpdateCard({ update }: { update: any }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{update.programType}</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                {new Date(update.date).toLocaleDateString()}
              </span>
              <span className="flex items-center">
                <Users className="mr-1 h-3 w-3" />
                {update.attendance} attendees
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {update.hasKirtan && <Badge variant="secondary">Kirtan</Badge>}
            {update.hasPrasadam && <Badge variant="secondary">Prasadam</Badge>}
            {update.hasClass && <Badge variant="secondary">Class</Badge>}
          </div>
        </div>
        
        {update.specialAttraction && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{update.specialAttraction}</p>
        )}
        
        <div className="flex items-center space-x-4">
          {update.imageUrls?.length > 0 && (
            <Button variant="outline" size="sm" className="glass">
              <ImageIcon className="mr-1 h-3 w-3" />
              {update.imageUrls.length} Photos
            </Button>
          )}
          {update.facebookLink && (
            <Button variant="outline" size="sm" className="glass">
              <Facebook className="mr-1 h-3 w-3" />
              Facebook
            </Button>
          )}
          {update.youtubeLink && (
            <Button variant="outline" size="sm" className="glass">
              <Youtube className="mr-1 h-3 w-3" />
              YouTube
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NamhattaDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex space-x-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="glass-card">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
