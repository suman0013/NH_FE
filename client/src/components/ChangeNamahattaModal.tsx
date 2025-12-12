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
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SearchInput } from "@/components/ui/search-input";
import { Loader2, MapPin } from "lucide-react";
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
  
  // Location filters - India is always selected but hidden from UI
  const [filters, setFilters] = useState({
    country: "India",
    state: "",
    district: "",
    subDistrict: "",
    village: "",
    postalCode: "",
  });

  // Fetch location data for cascading filters
  const { data: states } = useQuery({
    queryKey: ["/api/states", filters.country],
    queryFn: () => api.getStates(filters.country),
    enabled: isOpen && !!filters.country,
  });

  const { data: districts } = useQuery({
    queryKey: ["/api/districts", filters.state],
    queryFn: () => api.getDistricts(filters.state),
    enabled: isOpen && !!filters.state,
  });

  const { data: subDistricts } = useQuery({
    queryKey: ["/api/sub-districts", filters.district],
    queryFn: () => api.getSubDistricts(filters.district),
    enabled: isOpen && !!filters.district,
  });

  const { data: villages } = useQuery({
    queryKey: ["/api/villages", filters.subDistrict],
    queryFn: () => api.getVillages(filters.subDistrict),
    enabled: isOpen && !!filters.subDistrict,
  });

  const { data: pincodes } = useQuery({
    queryKey: ["/api/pincodes", filters.village, filters.district, filters.subDistrict],
    queryFn: () => api.getPincodes(filters.village, filters.district, filters.subDistrict),
    enabled: isOpen && !!filters.subDistrict,
  });

  // Fetch namahattas with server-side filtering
  const { data: namahattasData, isLoading: isLoadingNamahattas } = useQuery({
    queryKey: ["/api/namahattas/search", searchTerm, filters],
    queryFn: () => api.getNamahattas(1, 50, { 
      status: "APPROVED,PENDING_APPROVAL",
      search: searchTerm,
      country: filters.country,
      state: filters.state,
      district: filters.district,
      subDistrict: filters.subDistrict,
      village: filters.village,
      postalCode: filters.postalCode,
    }),
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
      setFilters({
        country: "India",
        state: "",
        district: "",
        subDistrict: "",
        village: "",
        postalCode: "",
      });
    }
  }, [isOpen]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset dependent filters
      ...(key === "state" && { district: "", subDistrict: "", village: "", postalCode: "" }),
      ...(key === "district" && { subDistrict: "", village: "", postalCode: "" }),
      ...(key === "subDistrict" && { village: "", postalCode: "" }),
      ...(key === "village" && { postalCode: "" }),
    }));
    // Clear selection when filters change
    setSelectedNamahattaId(null);
  };

  // Filter out current namahatta from results (ensure type match with Number conversion)
  const filteredNamahattas = namahattasData?.data.filter(namahatta => 
    Number(namahatta.id) !== Number(devotee.namahattaId)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <DialogTitle>Change Namahatta Assignment</DialogTitle>
            <DialogDescription>
              Change the namahatta assignment for {devotee.legalName}
            </DialogDescription>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-muted-foreground">Current:</span>
            <p className="text-sm font-semibold">{currentNamahattaName || "None"}</p>
          </div>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* Location Filters - Country hidden, India is always selected */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              Filter by Location
            </Label>
            <div className="grid grid-cols-5 gap-2">
              <SearchableSelect
                value={filters.state || "All States"}
                onValueChange={(value) => handleFilterChange("state", value === "All States" ? "" : value)}
                options={["All States", ...(states || [])]}
                placeholder="State"
                className="text-sm"
                data-testid="select-state"
              />

              <SearchableSelect
                value={filters.district || "All Districts"}
                onValueChange={(value) => handleFilterChange("district", value === "All Districts" ? "" : value)}
                options={["All Districts", ...(districts || [])]}
                placeholder="District"
                disabled={!filters.state}
                className="text-sm"
                data-testid="select-district"
              />

              <SearchableSelect
                value={filters.subDistrict || "All Sub-Districts"}
                onValueChange={(value) => handleFilterChange("subDistrict", value === "All Sub-Districts" ? "" : value)}
                options={["All Sub-Districts", ...(subDistricts || [])]}
                placeholder="Sub-District"
                disabled={!filters.district}
                className="text-sm"
                data-testid="select-sub-district"
              />

              <SearchableSelect
                value={filters.village || "All Villages"}
                onValueChange={(value) => handleFilterChange("village", value === "All Villages" ? "" : value)}
                options={["All Villages", ...(villages || [])]}
                placeholder="Village"
                disabled={!filters.subDistrict}
                className="text-sm"
                data-testid="select-village"
              />

              <SearchableSelect
                value={filters.postalCode || "All Postal Codes"}
                onValueChange={(value) => handleFilterChange("postalCode", value === "All Postal Codes" ? "" : value)}
                options={["All Postal Codes", ...(pincodes || [])]}
                placeholder="Postal Code"
                disabled={!filters.subDistrict}
                className="text-sm"
                data-testid="select-postal-code"
              />
            </div>
          </div>

          {/* Search and Select Namahatta */}
          <div className="space-y-2">
            <Label htmlFor="namahatta-select" className="text-sm">Search and Select New Namahatta *</Label>
            
            {/* Search Input */}
            <SearchInput
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setSelectedNamahattaId(null);
              }}
              placeholder="Search by name, code, or leaders..."
              debounceMs={300}
              data-testid="input-namahatta-search"
            />

            {/* Namahatta Results - Increased height */}
            <div className="border rounded-lg max-h-72 overflow-y-auto">
              {isLoadingNamahattas ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Loading namahattas...</span>
                </div>
              ) : filteredNamahattas.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm || Object.values(filters).some(v => v) 
                    ? "No namahattas match your search or filters" 
                    : "No namahattas found"}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNamahattas.map((namahatta) => (
                    <div
                      key={namahatta.id}
                      onClick={() => setSelectedNamahattaId(namahatta.id)}
                      className={`p-2.5 cursor-pointer transition-colors hover-elevate ${
                        selectedNamahattaId === namahatta.id
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : ""
                      }`}
                      data-testid={`namahatta-option-${namahatta.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {namahatta.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Code: {namahatta.code}
                          </p>
                          {(namahatta.address?.village || namahatta.address?.district) && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {[namahatta.address?.village, namahatta.address?.district, namahatta.address?.state].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        {selectedNamahattaId === namahatta.id && (
                          <div className="text-primary text-xs font-medium">Selected</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {namahattasData && namahattasData.total > 50 && (
              <p className="text-xs text-gray-500 text-center">
                Showing top 50 results. Use filters to narrow down your search.
              </p>
            )}
          </div>

          {/* Selected Namahatta Preview */}
          {selectedNamahatta && (
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Selected: </span>
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {selectedNamahatta.name} ({selectedNamahatta.code})
                  </span>
                </div>
                {selectedNamahatta.meetingDay && selectedNamahatta.meetingTime && (
                  <span className="text-xs text-blue-700 dark:text-blue-300">
                    {selectedNamahatta.meetingDay} at {selectedNamahatta.meetingTime}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Reason - Single line with label */}
          <div className="flex items-center gap-3">
            <Label htmlFor="reason" className="text-sm whitespace-nowrap">Reason *</Label>
            <Input
              id="reason"
              placeholder="Provide a reason for this assignment change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="input-reason"
              className="flex-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
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
