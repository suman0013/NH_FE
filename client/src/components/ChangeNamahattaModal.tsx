import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import type { Devotee, Namahatta } from "@/lib/types";

interface ChangeNamahattaModalProps {
  isOpen: boolean;
  onClose: () => void;
  devotee: Devotee;
  currentNamahattaName?: string;
}

export default function ChangeNamahattaModal({
  isOpen,
  onClose,
  devotee,
  currentNamahattaName,
}: ChangeNamahattaModalProps) {
  const { toast } = useToast();
  const [selectedNamahattaId, setSelectedNamahattaId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all namahattas
  const { data: namahattasData, isLoading: isLoadingNamahattas } = useQuery({
    queryKey: ["/api/namahattas"],
    queryFn: () => api.getNamahattas(1, 1000, { status: "APPROVED" }),
    enabled: isOpen,
  });

  // Update validation when inputs change
  useEffect(() => {
    setIsValid(
      selectedNamahattaId !== null && 
      selectedNamahattaId !== devotee.namahattaId && 
      reason.trim().length > 0
    );
  }, [selectedNamahattaId, reason, devotee.namahattaId]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedNamahattaId(null);
      setReason("");
      setIsValid(false);
    }
  }, [isOpen]);

  // Filter namahattas based on search term
  const filteredNamahattas = namahattasData?.data.filter(namahatta => 
    namahatta.id !== devotee.namahattaId && // Exclude current namahatta
    (namahatta.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     namahatta.code.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const updateDevoteeMutation = useMutation({
    mutationFn: async () => {
      const selectedNamahatta = namahattasData?.data.find(n => n.id === selectedNamahattaId);
      const currentTimestamp = new Date().toISOString();
      const assignmentNote = `\n\n--- Namahatta Assignment Change (${currentTimestamp}) ---\nFrom: ${currentNamahattaName || 'Unknown'} (ID: ${devotee.namahattaId || 'None'})\nTo: ${selectedNamahatta?.name} (ID: ${selectedNamahattaId})\nReason: ${reason.trim()}\n`;
      
      const updatedAdditionalComments = (devotee.additionalComments || "") + assignmentNote;
      
      return api.updateDevotee(devotee.id, {
        namahattaId: selectedNamahattaId!,
        additionalComments: updatedAdditionalComments,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Namahatta assignment changed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devotees", devotee.id.toString()] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to change namahatta assignment",
        variant: "destructive",
      });
      console.error("Failed to update devotee:", error);
    },
  });

  const handleSubmit = () => {
    if (isValid) {
      updateDevoteeMutation.mutate();
    }
  };

  const selectedNamahatta = namahattasData?.data.find(n => n.id === selectedNamahattaId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change Namahatta Assignment</DialogTitle>
          <DialogDescription>
            Change the namahatta assignment for {devotee.legalName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Assignment */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Current Assignment
            </Label>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {currentNamahattaName || "No namahatta assigned"}
            </p>
          </div>

          {/* Search and Select Namahatta */}
          <div className="space-y-2">
            <Label htmlFor="namahatta-select">Search and Select New Namahatta *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <Select 
                value={selectedNamahattaId?.toString() || ""} 
                onValueChange={(value) => setSelectedNamahattaId(parseInt(value))}
              >
                <SelectTrigger data-testid="select-namahatta" className="pl-10">
                  <SelectValue placeholder="Search and select a namahatta..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="sticky top-0 bg-white dark:bg-gray-950 border-b p-2 z-10">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Type to search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-8"
                        data-testid="input-namahatta-search"
                      />
                    </div>
                  </div>
                  {isLoadingNamahattas ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : filteredNamahattas.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchTerm ? "No namahattas match your search" : "No namahattas found"}
                    </div>
                  ) : (
                    filteredNamahattas.map((namahatta) => (
                      <SelectItem key={namahatta.id} value={namahatta.id.toString()}>
                        {namahatta.name} ({namahatta.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected Namahatta Preview */}
          {selectedNamahatta && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Label className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Selected Namahatta
              </Label>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {selectedNamahatta.name} ({selectedNamahatta.code})
              </p>
              {selectedNamahatta.meetingDay && selectedNamahatta.meetingTime && (
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Meetings: {selectedNamahatta.meetingDay} at {selectedNamahatta.meetingTime}
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for this assignment change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              data-testid="textarea-reason"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateDevoteeMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || updateDevoteeMutation.isPending}
              data-testid="button-save"
            >
              {updateDevoteeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Namahatta"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}