import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SearchInput } from "@/components/ui/search-input";
import { ActiveFilters } from "@/components/ui/filter-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdvancedPagination } from "@/components/ui/advanced-pagination";
import { 
  Users, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  GraduationCap,
  Briefcase,
  Heart,
  User,
  Crown,
  Grid3X3,
  List
} from "lucide-react";
import { Link } from "wouter";
import DevoteeForm from "@/components/forms/DevoteeForm";
import type { Devotee } from "@/lib/types";

export default function Devotees() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingDevotee, setEditingDevotee] = useState<Devotee | undefined>();
  const [filters, setFilters] = useState({
    country: "",
    state: "",
    district: "",
    statusId: "",
  });
  
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = sessionStorage.getItem('devotees-view-mode');
    return (saved as 'grid' | 'list') || 'grid';
  });

  const { data: devotees, isLoading } = useQuery({
    queryKey: ["/api/devotees", page, pageSize, searchTerm, filters, sortBy, sortOrder],
    queryFn: () => api.getDevotees(page, pageSize, { 
      ...filters, 
      search: searchTerm, 
      sortBy, 
      sortOrder 
    }),
  });

  const { data: statuses } = useQuery({
    queryKey: ["/api/statuses"],
    queryFn: () => api.getStatuses(),
  });

  const { data: countries } = useQuery({
    queryKey: ["/api/countries"],
    queryFn: () => api.getCountries(),
  });

  const { data: states } = useQuery({
    queryKey: ["/api/states", filters.country],
    queryFn: () => api.getStates(filters.country),
    enabled: !!filters.country,
  });

  const { data: districts } = useQuery({
    queryKey: ["/api/districts", filters.state],
    queryFn: () => api.getDistricts(filters.state),
    enabled: !!filters.state,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset dependent filters
      ...(key === "country" && { state: "", district: "" }),
      ...(key === "state" && { district: "" }),
    }));
    setPage(1);
  };

  if (isLoading) {
    return <DevoteesSkeleton />;
  }

  return (
    <div className="space-y-1 sm:space-y-2">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Devotees Management</h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage devotee profiles and spiritual progress
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card relative z-40">
        <CardContent className="p-1.5 sm:p-2 space-y-1">
          {/* Search Bar */}
          <SearchInput
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            placeholder="Search devotees by name, email, phone, location, education, occupation..."
            debounceMs={500}
          />

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 relative">
            <SearchableSelect
              value={filters.country || "All Countries"}
              onValueChange={(value) => handleFilterChange("country", value === "All Countries" ? "" : value)}
              options={["All Countries", ...(countries || [])]}
              placeholder="All Countries"
              className="glass border-0"
            />

            <SearchableSelect
              value={filters.state || "All States"}
              onValueChange={(value) => handleFilterChange("state", value === "All States" ? "" : value)}
              options={["All States", ...(states || [])]}
              placeholder="All States"
              disabled={!filters.country}
              className="glass border-0"
            />

            <SearchableSelect
              value={filters.district || "All Districts"}
              onValueChange={(value) => handleFilterChange("district", value === "All Districts" ? "" : value)}
              options={["All Districts", ...(districts || [])]}
              placeholder="All Districts"
              disabled={!filters.state}
              className="glass border-0"
            />

            <SearchableSelect
              value={(() => {
                if (!filters.statusId) return "All Statuses";
                const status = statuses?.find(s => s.id.toString() === filters.statusId);
                return status ? status.name : "All Statuses";
              })()}
              onValueChange={(value) => {
                if (value === "All Statuses") {
                  handleFilterChange("statusId", "");
                } else {
                  const status = statuses?.find(s => s.name === value);
                  handleFilterChange("statusId", status ? status.id.toString() : "");
                }
              }}
              options={["All Statuses", ...(statuses?.map(status => status.name) || [])]}
              placeholder="All Statuses"
              className="glass border-0"
            />
          </div>
          
          {/* Active Filters */}
          <ActiveFilters
            filters={filters}
            searchTerm={searchTerm}
            onRemoveFilter={(key) => handleFilterChange(key, "")}
            onClearAll={() => {
              setFilters({ country: "", state: "", district: "", statusId: "" });
              setSearchTerm("");
              setPage(1);
            }}
            onClearSearch={() => {
              setSearchTerm("");
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* Sorting Controls */}
      <Card className="glass-card">
        <CardContent className="p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-32 text-xs sm:text-sm glass border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="updatedAt">Updated Date</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="glass border-0 text-xs sm:text-sm"
              >
                {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {devotees?.total || 0} devotees found
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 sm:p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setViewMode('grid');
                    sessionStorage.setItem('devotees-view-mode', 'grid');
                  }}
                  className="h-7 sm:h-8 px-2 sm:px-3"
                  data-testid="button-grid-view"
                >
                  <Grid3X3 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setViewMode('list');
                    sessionStorage.setItem('devotees-view-mode', 'list');
                  }}
                  className="h-7 sm:h-8 px-2 sm:px-3"
                  data-testid="button-list-view"
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devotees Grid/List */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 relative z-10"
        : "grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 relative z-10"
      }>
        {devotees?.data?.map((devotee: any) => (
          <DevoteeCard 
            key={devotee.id} 
            devotee={devotee} 
            statuses={statuses || []}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Empty State */}
      {devotees?.data?.length === 0 && (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No devotees found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || Object.values(filters).some(Boolean)
                ? "Try adjusting your search criteria or filters."
                : "Devotees can be added from the Namahatta page."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {devotees && devotees.total > 0 && (
        <AdvancedPagination
          currentPage={page}
          totalPages={Math.ceil(devotees.total / pageSize)}
          pageSize={pageSize}
          totalItems={devotees.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          showingFrom={Math.min(((page - 1) * pageSize) + 1, devotees.total)}
          showingTo={Math.min(page * pageSize, devotees.total)}
        />
      )}

      {/* Edit Form Modal */}
      {editingDevotee && (
        <DevoteeForm
          devotee={editingDevotee}
          onClose={() => {
            setEditingDevotee(undefined);
          }}
          onSuccess={() => {
            setEditingDevotee(undefined);
          }}
        />
      )}
    </div>
  );
}

function DevoteeCard({ devotee, statuses, viewMode = 'grid' }: { devotee: Devotee; statuses: any[]; viewMode?: 'grid' | 'list' }) {
  const getStatusName = (statusId?: number) => {
    // Use the devotionalStatusName from the API response if available
    if (devotee.devotionalStatusName) {
      return devotee.devotionalStatusName;
    }
    // Fallback to lookup if devotionalStatusName is not available
    if (!statusId) return "Unknown";
    const status = statuses.find(s => s.id === statusId);
    return status?.name || "Unknown";
  };

  const getStatusColor = (statusId?: number) => {
    if (!statusId) return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300";
    
    const statusName = getStatusName(statusId).toLowerCase();
    if (statusName.includes("bhakta")) return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
    if (statusName.includes("initiated")) return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300";
    if (statusName.includes("brahmachari")) return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
    return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300";
  };

  if (viewMode === 'list') {
    // List View - Minimal Details
    return (
      <Link href={`/devotees/${devotee.id}`} data-testid={`link-devotee-${devotee.id}`}>
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
    <div className="h-[200px]">
      <Link href={`/devotees/${devotee.id}`} data-testid={`link-devotee-${devotee.id}`}>
        <Card className="glass-card card-hover-effect group h-full cursor-pointer">
          <CardContent className="p-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-600 text-white">
                  {(devotee.legalName || devotee.name || "").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  {devotee.legalName}
                </h3>
                {devotee.initiatedName && (
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center">
                    <Crown className="mr-2 h-4 w-4" />
                    {devotee.initiatedName}
                  </p>
                )}
                {devotee.occupation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <Briefcase className="mr-2 h-4 w-4" />
                    {devotee.occupation}
                  </p>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className="mb-2">
              <Badge className={getStatusColor(devotee.devotionalStatusId)}>
                {getStatusName(devotee.devotionalStatusId)}
              </Badge>
            </div>

            {/* Details */}
            <div className="space-y-1 flex-grow">
              {devotee.permanentAddress && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="mr-2 h-3 w-3" />
                  <span>
                    {[
                      devotee.permanentAddress.village,
                      devotee.permanentAddress.district,
                      devotee.permanentAddress.state
                    ].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}

              {devotee.education && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <GraduationCap className="mr-2 h-3 w-3" />
                  <span>{devotee.education}</span>
                </div>
              )}

              {devotee.maritalStatus && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Users className="mr-2 h-3 w-3" />
                  <span>{devotee.maritalStatus}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function DevoteesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <Card className="glass-card">
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
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
