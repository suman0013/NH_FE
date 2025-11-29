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
import { AdvancedPagination } from "@/components/ui/advanced-pagination";
import { Users, Calendar, Search, Plus, MapPin, User, Grid3X3, List } from "lucide-react";
import { Link } from "wouter";
import NamahattaForm from "@/components/forms/NamahattaForm";
import type { Namahatta } from "@/lib/types";
import namahattaLogo from "@assets/namhatta_logo_1757673165218.png";

export default function Namahattas() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingNamahatta, setEditingNamahatta] = useState<Namahatta | undefined>();
  const [filters, setFilters] = useState({
    country: "",
    state: "",
    district: "",
    subDistrict: "",
    village: "",
    postalCode: "",
    status: "",
  });
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = sessionStorage.getItem('namahattas-view-mode');
    return (saved as 'grid' | 'list') || 'grid';
  });

  const { data: namahattas, isLoading } = useQuery({
    queryKey: ["/api/namahattas", page, pageSize, searchTerm, filters, sortBy, sortOrder],
    queryFn: () => api.getNamahattas(page, pageSize, { ...filters, search: searchTerm, sortBy, sortOrder }),
  });

  const handleCreateNamahatta = () => {
    setEditingNamahatta(undefined);
    setShowForm(true);
  };

  const handleEditNamahatta = (namahatta: Namahatta) => {
    setEditingNamahatta(namahatta);
    setShowForm(true);
  };

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

  const { data: subDistricts } = useQuery({
    queryKey: ["/api/sub-districts", filters.district],
    queryFn: () => api.getSubDistricts(filters.district),
    enabled: !!filters.district,
  });

  const { data: villages } = useQuery({
    queryKey: ["/api/villages", filters.subDistrict],
    queryFn: () => api.getVillages(filters.subDistrict),
    enabled: !!filters.subDistrict,
  });

  const { data: pincodes } = useQuery({
    queryKey: ["/api/pincodes", filters.village, filters.district, filters.subDistrict],
    queryFn: () => api.getPincodes(filters.village, filters.district, filters.subDistrict),
    enabled: !!filters.subDistrict,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset dependent filters
      ...(key === "country" && { state: "", district: "", subDistrict: "", village: "", postalCode: "" }),
      ...(key === "state" && { district: "", subDistrict: "", village: "", postalCode: "" }),
      ...(key === "district" && { subDistrict: "", village: "", postalCode: "" }),
      ...(key === "subDistrict" && { village: "", postalCode: "" }),
      ...(key === "village" && { postalCode: "" }),
    }));
    setPage(1);
  };

  if (isLoading) {
    return <NamahattasSkeleton />;
  }

  return (
    <div className="space-y-1 sm:space-y-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Namahattas Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Manage and monitor all Namahatta centers</p>
        </div>
        <Button className="gradient-button text-xs sm:text-sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Create New Namahatta
        </Button>
      </div>

      {/* Search and Filters Section */}
      <Card className="glass-card relative z-50">
        <CardContent className="p-1.5 sm:p-2 space-y-1">
          {/* Search Bar */}
          <SearchInput
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            placeholder="Search namahattas by name, code, location, or leaders..."
            debounceMs={500}
          />

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-1.5 sm:gap-3 lg:gap-4">
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
              value={filters.subDistrict || "All Sub-Districts"}
              onValueChange={(value) => handleFilterChange("subDistrict", value === "All Sub-Districts" ? "" : value)}
              options={["All Sub-Districts", ...(subDistricts || [])]}
              placeholder="All Sub-Districts"
              disabled={!filters.district}
              className="glass border-0"
            />

            <SearchableSelect
              value={filters.village || "All Villages"}
              onValueChange={(value) => handleFilterChange("village", value === "All Villages" ? "" : value)}
              options={["All Villages", ...(villages || [])]}
              placeholder="All Villages"
              disabled={!filters.subDistrict}
              className="glass border-0"
            />

            <SearchableSelect
              value={filters.postalCode || "All Postal Codes"}
              onValueChange={(value) => handleFilterChange("postalCode", value === "All Postal Codes" ? "" : value)}
              options={["All Postal Codes", ...(pincodes || [])]}
              placeholder="All Postal Codes"
              disabled={!filters.subDistrict}
              className="glass border-0"
            />

            <SearchableSelect
              value={filters.status || "All Statuses"}
              onValueChange={(value) => handleFilterChange("status", value === "All Statuses" ? "" : value)}
              options={["All Statuses", "APPROVED", "PENDING_APPROVAL"]}
              placeholder="Filter by Status"
              className="glass border-0"
            />
          </div>
          
          {/* Active Filters */}
          <ActiveFilters
            filters={filters}
            searchTerm={searchTerm}
            onRemoveFilter={(key) => handleFilterChange(key, "")}
            onClearAll={() => {
              setFilters({ country: "", state: "", district: "", subDistrict: "", village: "", postalCode: "", status: "" });
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {namahattas?.total ? `Showing ${namahattas.total} namahattas` : 'No namahattas found'}
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 sm:p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setViewMode('grid');
                    sessionStorage.setItem('namahattas-view-mode', 'grid');
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
                    sessionStorage.setItem('namahattas-view-mode', 'list');
                  }}
                  className="h-7 sm:h-8 px-2 sm:px-3"
                  data-testid="button-list-view"
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <Select value={sortBy} onValueChange={(value) => {
                setSortBy(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm glass border-0">
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
                onClick={() => {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  setPage(1);
                }}
                className="glass border-0 px-2 sm:px-3"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Namahattas Grid/List */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 relative z-10"
        : "grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 relative z-10"
      }>
        {namahattas?.data?.map((namahatta) => (
          <NamahattaCard key={namahatta.id} namahatta={namahatta} viewMode={viewMode} />
        ))}
      </div>

      {/* Pagination */}
      {namahattas && namahattas.total > 0 && (
        <AdvancedPagination
          currentPage={page}
          totalPages={Math.ceil(namahattas.total / pageSize)}
          pageSize={pageSize}
          totalItems={namahattas.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          showingFrom={Math.min(((page - 1) * pageSize) + 1, namahattas.total)}
          showingTo={Math.min(page * pageSize, namahattas.total)}
        />
      )}

      {/* Form Modal */}
      <NamahattaForm
        isOpen={showForm || !!editingNamahatta}
        namahatta={editingNamahatta}
        onClose={() => {
          setShowForm(false);
          setEditingNamahatta(undefined);
        }}
        onSuccess={() => {
          setShowForm(false);
          setEditingNamahatta(undefined);
        }}
      />
    </div>
  );
}

function NamahattaCard({ namahatta, viewMode = 'grid' }: { namahatta: Namahatta; viewMode?: 'grid' | 'list' }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-full text-xs font-medium">Approved</Badge>;
      case "PENDING_APPROVAL":
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-1 rounded-full text-xs font-medium">Pending</Badge>;
      case "REJECTED":
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">{status}</Badge>;
    }
  };


  if (viewMode === 'list') {
    // List View - Minimal Details
    return (
      <Link href={`/namahattas/${namahatta.id}`} data-testid={`link-namahatta-${namahatta.id}`}>
        <Card className="glass-card hover-lift group cursor-pointer">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <img 
                src={namahattaLogo} 
                alt="Namahatta Logo" 
                className="h-16 w-16 object-contain flex-shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 truncate">
                      {namahatta.name}
                    </h3>
                    {namahatta.address && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        <MapPin className="inline h-3 w-3 mr-1" />
                        {namahatta.address.district || namahatta.address.state}
                      </p>
                    )}
                  </div>
                  
                  {getStatusBadge(namahatta.status)}
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
    <div className="h-[220px]">
      <Link href={`/namahattas/${namahatta.id}`} data-testid={`link-namahatta-${namahatta.id}`}>
        <Card className="glass-card hover-lift group cursor-pointer h-full">
          <CardContent className="p-2 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <img 
                src={namahattaLogo} 
                alt="Namahatta Logo" 
                className="h-20 w-20 object-contain"
              />
              {getStatusBadge(namahatta.status)}
            </div>
            
            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
              {namahatta.name}
            </h3>
            
            <div className="flex-grow">
              {namahatta.address && (
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                  <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="line-clamp-2">
                    {[
                      namahatta.address.village,
                      namahatta.address.district,
                      namahatta.address.state
                    ].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center">
                  <Users className="mr-2 h-3 w-3" />
                  <span>{namahatta.devoteeCount || 0} devotees</span>
                </div>
                {namahatta.secretary && (
                  <div className="flex items-center">
                    <User className="mr-2 h-3 w-3" />
                    <span>Secretary: {namahatta.secretary}</span>
                  </div>
                )}
                {(namahatta.meetingDay || namahatta.meetingTime) && (
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-3 w-3" />
                    <span>
                      {namahatta.meetingDay && namahatta.meetingTime 
                        ? `${namahatta.meetingDay} at ${namahatta.meetingTime}`
                        : namahatta.meetingDay || namahatta.meetingTime}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function NamahattasSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Search and Filters Skeleton */}
      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Namahattas Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
