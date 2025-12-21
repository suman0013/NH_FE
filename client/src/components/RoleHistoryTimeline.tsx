import { Card } from "@/components/ui/card";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Trophy, ArrowRight } from "lucide-react";

interface RoleHistoryTimelineProps {
  devoteeId: number;
  devoteeName: string;
}

interface RoleTransition {
  id: number;
  date: string;
  previousRole: string | null;
  newRole: string | null;
  reason: string;
  replacedBy?: string;
}

const getRoleIcon = (role: string | null) => {
  if (!role) return null;
  if (role?.includes("MALA")) return <Trophy className="w-4 h-4" />;
  if (role?.includes("MAHA_CHAKRA")) return <Trophy className="w-4 h-4" />;
  return <ArrowRight className="w-4 h-4" />;
};

const getRoleColor = (role: string | null): BadgeProps["variant"] => {
  if (!role) return "secondary";
  if (role === "MALA_SENAPOTI") return "default";
  if (role === "MAHA_CHAKRA_SENAPOTI") return "secondary";
  if (role === "CHAKRA_SENAPOTI") return "outline";
  return "secondary";
};

export default function RoleHistoryTimeline({ devoteeId, devoteeName }: RoleHistoryTimelineProps) {
  const { data: roleHistory, isLoading } = useQuery({
    queryKey: [`/api/roles/history/${devoteeId}`],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!roleHistory || (Array.isArray(roleHistory) && roleHistory.length === 0)) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No role history available
      </Card>
    );
  }

  const historyArray = Array.isArray(roleHistory) ? roleHistory : [];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Role Transition History</h3>
      <div className="relative space-y-4">
        {historyArray.map((transition: RoleTransition, index: number) => (
          <div key={transition.id} className="relative">
            {/* Timeline connector */}
            {index < historyArray.length - 1 && (
              <div className="absolute left-3 top-10 w-0.5 h-8 bg-border" />
            )}

            <Card className="p-4 ml-8 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getRoleIcon(transition.newRole)}
                    <p className="text-sm text-muted-foreground" data-testid="text-role-date">
                      {new Date(transition.date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {transition.previousRole ? (
                      <>
                        <Badge variant={getRoleColor(transition.previousRole)} data-testid={`badge-previous-role-${transition.id}`}>
                          {transition.previousRole}
                        </Badge>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : null}
                    {transition.newRole ? (
                      <Badge variant={getRoleColor(transition.newRole)} data-testid={`badge-new-role-${transition.id}`}>
                        {transition.newRole}
                      </Badge>
                    ) : (
                      <Badge variant="outline" data-testid={`badge-removed-${transition.id}`}>
                        Removed from Leadership
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm" data-testid="text-reason">
                    <span className="text-muted-foreground">Reason:</span>{" "}
                    <span className="font-medium">{transition.reason}</span>
                  </p>

                  {transition.replacedBy && (
                    <p className="text-sm mt-2 text-muted-foreground" data-testid="text-replaced-by">
                      Replaced by: <span className="font-medium">{transition.replacedBy}</span>
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
