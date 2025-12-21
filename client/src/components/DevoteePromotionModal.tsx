import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DevoteePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  devoteeId: number;
  devoteeName: string;
  district: string;
}

const ROLE_LEVELS = [
  { value: "UPA_CHAKRA_SENAPOTI", label: "Upa Chakra Senapoti" },
  { value: "CHAKRA_SENAPOTI", label: "Chakra Senapoti" },
  { value: "MAHA_CHAKRA_SENAPOTI", label: "Maha Chakra Senapoti" },
  { value: "MALA_SENAPOTI", label: "Mala Senapoti" },
];

export default function DevoteePromotionModal({
  isOpen,
  onClose,
  devoteeId,
  devoteeName,
  district,
}: DevoteePromotionModalProps) {
  const { toast } = useToast();
  const [selectedRoleLevel, setSelectedRoleLevel] = useState<string>("");
  const [selectedSenapotiId, setSelectedSenapotiId] = useState<number | null>(null);

  // Fetch senapotis for selected level
  const { data: senapotisAtLevel = [], isLoading: isLoadingSenapotis } = useQuery({
    queryKey: [`/api/roles/senapotis-by-level/${district}/${selectedRoleLevel}`],
    enabled: isOpen && !!selectedRoleLevel,
  });

  // Mutation for executing promotion
  const promotionMutation = useMutation({
    mutationFn: async (senapotiBeingReplacedId: number) => {
      return apiRequest("POST", "/api/roles/replace", {
        devoteeBeingPromotedId: devoteeId,
        senapotiBeingReplacedId: senapotiBeingReplacedId,
        replacementReason: "PROMOTION",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${devoteeName} has been promoted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/senapoti"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to promote devotee",
        variant: "destructive",
      });
    },
  });

  const handlePromote = async () => {
    if (!selectedSenapotiId) {
      toast({
        title: "Error",
        description: "Please select a senapoti to replace",
        variant: "destructive",
      });
      return;
    }
    promotionMutation.mutate(selectedSenapotiId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Promote {devoteeName}</DialogTitle>
          <DialogDescription>
            Select a role level and senapoti to replace for promotion
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Devotee Info */}
          <Card className="p-4 bg-muted">
            <p className="text-sm text-muted-foreground">Devotee to Promote:</p>
            <p className="font-semibold">{devoteeName}</p>
            <Badge className="mt-2">{district}</Badge>
          </Card>

          {/* Step 1: Select Role Level */}
          <div>
            <p className="text-sm font-semibold mb-3">Step 1: Select Role Level</p>
            <Select value={selectedRoleLevel} onValueChange={setSelectedRoleLevel}>
              <SelectTrigger data-testid="select-role-level">
                <SelectValue placeholder="Choose a role level" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value} data-testid={`option-${level.value}`}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Select Senapoti to Replace */}
          {selectedRoleLevel && (
            <div>
              <p className="text-sm font-semibold mb-3">Step 2: Select Senapoti to Replace</p>
              {isLoadingSenapotis ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (Array.isArray(senapotisAtLevel) && senapotisAtLevel.length > 0) ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(senapotisAtLevel as any[]).map((senapoti: any) => (
                    <Card
                      key={senapoti.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedSenapotiId === senapoti.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedSenapotiId(senapoti.id)}
                      data-testid={`card-senapoti-${senapoti.id}`}
                    >
                      <p className="font-medium">{senapoti.name}</p>
                      <p className="text-sm text-muted-foreground">{senapoti.namahattaName}</p>
                      <p className="text-xs mt-1">Subordinates: {senapoti.subordinateCount || 0}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-4 text-center text-muted-foreground">
                  No senapotis available at this level in {district}
                </Card>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handlePromote}
              disabled={!selectedSenapotiId || promotionMutation.isPending}
              data-testid="button-promote"
            >
              {promotionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                "Confirm Promotion"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
