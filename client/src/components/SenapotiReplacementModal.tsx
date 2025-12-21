import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SenapotiReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSenapotiId: number;
  currentSenapotiName: string;
  roleLevel: string;
  district: string;
}

export default function SenapotiReplacementModal({
  isOpen,
  onClose,
  currentSenapotiId,
  currentSenapotiName,
  roleLevel,
  district,
}: SenapotiReplacementModalProps) {
  const { toast } = useToast();
  const [selectedReplacementId, setSelectedReplacementId] = useState<number | null>(null);

  // Fetch eligible replacement devotees
  const { data: eligibleReplacements = [], isLoading: isLoadingReplacements } = useQuery({
    queryKey: [`/api/roles/eligible-replacements/${currentSenapotiId}`],
    enabled: isOpen,
  });

  // Mutation for executing replacement
  const replacementMutation = useMutation({
    mutationFn: async (replacementDevoteeId: number) => {
      return apiRequest("POST", "/api/roles/replace", {
        senapotiBeingReplacedId: currentSenapotiId,
        newSenapotiId: replacementDevoteeId,
        replacementReason: "REPLACEMENT",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${currentSenapotiName} has been replaced successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/senapoti"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to replace senapoti",
        variant: "destructive",
      });
    },
  });

  const handleReplace = async () => {
    if (!selectedReplacementId) {
      toast({
        title: "Error",
        description: "Please select a devotee to assign as replacement",
        variant: "destructive",
      });
      return;
    }
    replacementMutation.mutate(selectedReplacementId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Replacement for {currentSenapotiName}</DialogTitle>
          <DialogDescription>
            Select an eligible devotee to replace {currentSenapotiName} as {roleLevel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Senapoti Info */}
          <Card className="p-4 bg-muted">
            <p className="text-sm text-muted-foreground">Current {roleLevel}:</p>
            <p className="font-semibold">{currentSenapotiName}</p>
            <Badge className="mt-2">{roleLevel}</Badge>
          </Card>

          {/* Available Replacements */}
          <div>
            <p className="text-sm font-semibold mb-3">Available Devotees ({district})</p>
            {isLoadingReplacements ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (Array.isArray(eligibleReplacements) && eligibleReplacements.length > 0) ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(eligibleReplacements as any[]).map((devotee: any) => (
                  <Card
                    key={devotee.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedReplacementId === devotee.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedReplacementId(devotee.id)}
                    data-testid={`card-replacement-devotee-${devotee.id}`}
                  >
                    <p className="font-medium">{devotee.name}</p>
                    <p className="text-sm text-muted-foreground">{devotee.namahattaName}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center text-muted-foreground">
                No eligible devotees available in this district
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleReplace}
              disabled={!selectedReplacementId || replacementMutation.isPending}
              data-testid="button-assign-replacement"
            >
              {replacementMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                `Assign as ${roleLevel}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
