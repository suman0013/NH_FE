import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { 
  Crown, 
  UserCheck, 
  Users,
  MapPin,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

export default function Hierarchy() {
  const [isDistrictSupervisorsOpen, setIsDistrictSupervisorsOpen] = useState(false);
  
  const { data: hierarchy, isLoading } = useQuery({
    queryKey: ["/api/hierarchy"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Leadership Hierarchy</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Organizational structure and leadership roles</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold gradient-text">Leadership Hierarchy</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Organizational structure and leadership roles</p>
      </div>

      {/* Hierarchy Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {/* Founder Acharya */}
        {(hierarchy as any)?.founder && (hierarchy as any).founder.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Crown className="mr-2 h-4 w-4 text-amber-500" />
                Founder Acharya
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {(hierarchy as any).founder.map((founder: any) => (
                  <div key={founder.id} className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                      <Crown className="h-3 w-3 text-white float-animation" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-xs text-gray-900 dark:text-white truncate">{founder.name}</h3>
                      <p className="text-xs text-amber-700 dark:text-amber-300">ISKCON Founder Acharya</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* GBC */}
        {(hierarchy as any)?.gbc && (hierarchy as any).gbc.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Crown className="mr-2 h-4 w-4 text-purple-500" />
                Governing Body Commissioner
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {(hierarchy as any).gbc.map((leader: any) => (
                  <div key={leader.id} className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <Crown className="h-3 w-3 text-white float-animation" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-xs text-gray-900 dark:text-white truncate">{leader.name}</h3>
                      <p className="text-xs text-purple-700 dark:text-purple-300">GBC</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Regional Directors */}
        {(hierarchy as any)?.regionalDirectors && (hierarchy as any).regionalDirectors.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <UserCheck className="mr-2 h-4 w-4 text-blue-500" />
                Regional Directors
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {(hierarchy as any).regionalDirectors.map((director: any) => (
                  <div key={director.id} className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                      <UserCheck className="h-3 w-3 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-xs text-gray-900 dark:text-white truncate">{director.name}</h3>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Regional Director</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Co-Regional Directors */}
        {(hierarchy as any)?.coRegionalDirectors && (hierarchy as any).coRegionalDirectors.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Users className="mr-2 h-4 w-4 text-emerald-500" />
                Co-Regional Directors
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {(hierarchy as any).coRegionalDirectors.map((coDirector: any) => (
                  <div key={coDirector.id} className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                      <Users className="h-3 w-3 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-xs text-gray-900 dark:text-white truncate">{coDirector.name}</h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">Co-Regional Director</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Horizontal Line Separator */}
      <div className="my-8">
        <hr className="border-t border-gray-200 dark:border-gray-700 opacity-50" />
      </div>

      {/* District Supervisors Section - Collapsible */}
      {(hierarchy as any)?.districtSupervisors && (hierarchy as any).districtSupervisors.length > 0 && (
        <Collapsible open={isDistrictSupervisorsOpen} onOpenChange={setIsDistrictSupervisorsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto glass-card hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
              <div className="flex items-center">
                <MapPin className="mr-3 h-5 w-5 text-orange-500" />
                <span className="text-lg font-semibold">District Supervisors</span>
                <span className="ml-2 text-sm text-gray-500">({(hierarchy as any).districtSupervisors.length})</span>
              </div>
              {isDistrictSupervisorsOpen ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {(hierarchy as any).districtSupervisors.map((supervisor: any) => (
                <Card key={supervisor.id} className="glass-card">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                        <MapPin className="h-3 w-3 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-xs text-gray-900 dark:text-white truncate">{supervisor.name}</h3>
                        <p className="text-xs text-orange-700 dark:text-orange-300">District Supervisor</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}


    </div>
  );
}