import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, User, Activity, X, Zap } from "lucide-react";
import { format } from "date-fns";

interface StatusHistoryViewProps {
  devoteeId: number;
  onClose: () => void;
}

export default function StatusHistoryView({ devoteeId, onClose }: StatusHistoryViewProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: [`/api/devotees/${devoteeId}/status-history`],
    queryFn: () => api.getDevoteeStatusHistory(devoteeId),
  });

  const { data: statuses } = useQuery({
    queryKey: ["/api/statuses"],
    queryFn: () => api.getStatuses(),
  });

  const getStatusName = (statusId?: number) => {
    if (!statusId || !statuses) return "Unknown";
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            <span>Status History</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry: any, index: number) => (
                <Card key={entry.id} className="glass-card border-l-4 border-l-indigo-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(entry.changeDate), "PPP")}</span>
                      </div>
                      <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30">
                        Change #{history.length - index}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {entry.fromStatusId && (
                            <>
                              <Badge className={getStatusColor(entry.fromStatusId)}>
                                {getStatusName(entry.fromStatusId)}
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </>
                          )}
                          <Badge className={getStatusColor(entry.toStatusId)}>
                            {getStatusName(entry.toStatusId)}
                          </Badge>
                        </div>
                        
                        {entry.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Status Changes
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This devotee hasn't had any status changes yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}