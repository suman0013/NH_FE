import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Search, Filter, TrendingUp, Users, Home } from "lucide-react";
import NamahattaUpdateCard from "@/components/NamahattaUpdateCard";

export default function Updates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgramType, setSelectedProgramType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Get all updates from all namahattas - optimized single API call
  const { data: allUpdates, isLoading } = useQuery({
    queryKey: ["/api/updates/all"],
    queryFn: () => api.getAllUpdates(),
  });

  const programTypes = [
    "Weekly Satsang Program",
    "Bhagavad Gita Study Circle", 
    "Harinama Sankirtana",
    "Festival Celebration",
    "Bhagavatam Class",
    "Kirtan Session",
    "Prasadam Distribution",
    "Community Service",
    "Youth Program",
    "Ladies Program"
  ];

  // Filter and sort updates
  const filteredUpdates = allUpdates?.filter((update: any) => {
    const matchesSearch = update.programType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         update.namahattaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (update.specialAttraction && update.specialAttraction.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedProgramType === "all" || update.programType === selectedProgramType;
    
    return matchesSearch && matchesType;
  }).sort((a: any, b: any) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "oldest":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "attendance":
        return b.attendance - a.attendance;
      default:
        return 0;
    }
  });

  if (isLoading) {
    return <UpdatesSkeleton />;
  }

  return (
    <div className="space-y-1">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-1 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Updates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Latest activities and programs from all Namahattas
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{filteredUpdates?.length || 0} Updates</span>
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-stretch">
        <Card className="glass-card h-32">
          <CardContent className="p-2 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap leading-tight">Total Updates</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-none">
                  {allUpdates?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-4">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card h-32">
          <CardContent className="p-2 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap leading-tight">Total Attendance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-none">
                  {allUpdates?.reduce((sum: number, update: any) => sum + update.attendance, 0) || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-4">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card h-32">
          <CardContent className="p-2 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap leading-tight">Active Namahattas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-none">
                  {allUpdates ? new Set(allUpdates.map((update: any) => update.namahattaId)).size : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-4">
                <Home className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="glass-card">
        <CardContent className="p-2 space-y-1">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search updates by program type, namahatta, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass border-0"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Program Type</label>
              <Select value={selectedProgramType} onValueChange={setSelectedProgramType}>
                <SelectTrigger className="glass border-0">
                  <SelectValue placeholder="All Program Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Program Types</SelectItem>
                  {programTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="glass border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="attendance">Highest Attendance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedProgramType("all");
                  setSortBy("newest");
                }}
                className="glass w-full"
              >
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Updates Grid */}
      {filteredUpdates && filteredUpdates.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {filteredUpdates.map((update: any) => (
            <NamahattaUpdateCard
              key={`${update.namahattaId}-${update.id}`}
              update={update}
              showNamahattaName={true}
              namahattaName={update.namahattaName}
            />
          ))}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No updates found</p>
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {searchTerm || selectedProgramType !== "all"
                ? "Try adjusting your search criteria"
                : "No updates have been posted yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UpdatesSkeleton() {
  return (
    <div className="space-y-1">
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-2">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardContent className="p-2 space-y-1">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-2">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}