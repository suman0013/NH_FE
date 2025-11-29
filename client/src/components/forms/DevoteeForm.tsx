import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddressSection from "@/components/ui/AddressSection";
import type { Devotee, Address } from "@/lib/types";

interface DevoteeFormProps {
  devotee?: Devotee;
  onClose: () => void;
  onSuccess?: () => void;
  namahattaId?: number;
}

interface FormData {
  legalName: string;
  dob: string;
  email: string;
  phone: string;
  fatherName: string;
  motherName: string;
  husbandName: string;
  gender: string;
  bloodGroup: string;
  maritalStatus: string;
  presentAddress: Address;
  permanentAddress: Address;
  devotionalStatusId: number | undefined;
  harinamInitiationGurudevId: number | undefined;
  pancharatrikInitiationGurudevId: number | undefined;
  initiatedName: string;
  harinamDate: string;
  pancharatrikDate: string;
  education: string;
  occupation: string;
  devotionalCourses: Array<{
    name: string;
    date: string;
    institute: string;
  }>;
  additionalComments: string;
  shraddhakutirId: number | undefined;
}

export default function DevoteeForm({ devotee, onClose, onSuccess, namahattaId }: DevoteeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!devotee;

  const { register, handleSubmit, watch, setValue, formState: { errors }, setError, clearErrors } = useForm<FormData>({
    defaultValues: {
      legalName: devotee?.legalName || "",
      dob: devotee?.dob || "",
      email: devotee?.email || "",
      phone: devotee?.phone || "",
      fatherName: devotee?.fatherName || "",
      motherName: devotee?.motherName || "",
      husbandName: devotee?.husbandName || "",
      gender: devotee?.gender || "",
      bloodGroup: devotee?.bloodGroup || "",
      maritalStatus: devotee?.maritalStatus || "",
      presentAddress: devotee?.presentAddress || {},
      permanentAddress: devotee?.permanentAddress || {},
      devotionalStatusId: devotee?.devotionalStatusId,
      harinamInitiationGurudevId: devotee?.harinamInitiationGurudevId,
      pancharatrikInitiationGurudevId: devotee?.pancharatrikInitiationGurudevId,
      initiatedName: devotee?.initiatedName || "",
      harinamDate: devotee?.harinamDate || "",
      pancharatrikDate: devotee?.pancharatrikDate || "",
      shraddhakutirId: devotee?.shraddhakutirId,
      education: devotee?.education || "",
      occupation: devotee?.occupation || "",
      devotionalCourses: devotee?.devotionalCourses || [],
      additionalComments: devotee?.additionalComments || ""
    }
  });

  const [presentAddress, setPresentAddress] = useState<Address>(devotee?.presentAddress || {});
  const [permanentAddress, setPermanentAddress] = useState<Address>(devotee?.permanentAddress || {});
  const [devotionalCourses, setDevotionalCourses] = useState(devotee?.devotionalCourses || []);
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);
  const [showShraddhakutirForm, setShowShraddhakutirForm] = useState(false);
  const [newShraddhakutir, setNewShraddhakutir] = useState({
    name: ""
  });




  // Other data queries
  const { data: statuses } = useQuery({
    queryKey: ["/api/statuses"],
    queryFn: () => api.getStatuses(),
  });

  const { data: gurudevs } = useQuery({
    queryKey: ["/api/gurudevs"],
    queryFn: () => api.getGurudevs(),
  });

  const { data: shraddhakutirs } = useQuery({
    queryKey: ["/api/shraddhakutirs", permanentAddress.district],
    queryFn: () => api.getShraddhakutirs(permanentAddress.district),
    enabled: !!permanentAddress.district, // Only fetch when district is available
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<Devotee>) => {
      if (namahattaId) {
        return api.createDevoteeForNamahatta(data, namahattaId);
      }
      return api.createDevotee(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devotees"] });
      // If adding to a specific namahatta, also invalidate that namahatta's devotees
      if (namahattaId) {
        queryClient.invalidateQueries({ queryKey: ["/api/namahattas", namahattaId.toString(), "devotees"] });
      }
      toast({
        title: "Success",
        description: "Devotee created successfully",
        duration: 3000,
      });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create devotee",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Devotee>) => api.updateDevotee(devotee!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devotees"] });
      queryClient.invalidateQueries({ queryKey: [`/api/devotees/${devotee!.id}`] });
      toast({
        title: "Success",
        description: "Devotee updated successfully",
      });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update devotee",
        variant: "destructive",
      });
    },
  });

  const createShraddhakutirMutation = useMutation({
    mutationFn: (data: any) => api.createShraddhakutir(data),
    onSuccess: (newShraddhakutir) => {
      // Invalidate all shraddhakutir queries (including the specific district one)
      queryClient.invalidateQueries({ queryKey: ["/api/shraddhakutirs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shraddhakutirs", permanentAddress.district] });
      setValue("shraddhakutirId", newShraddhakutir.id);
      setShowShraddhakutirForm(false);
      setNewShraddhakutir({ name: "" });
      toast({
        title: "Success",
        description: "Shraddhakutir created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create Shraddhakutir",
        variant: "destructive",
      });
    },
  });

  // Handle address changes
  const handlePresentAddressChange = (field: keyof Address, value: string) => {
    const newAddress = { ...presentAddress, [field]: value };
    
    // Reset dependent fields only for manual changes, not pincode auto-population
    if (field === "country") {
      newAddress.state = "";
      newAddress.district = "";
      newAddress.subDistrict = "";
      newAddress.village = "";
    } else if (field === "state" && presentAddress.postalCode === "") {
      // Only reset if no pincode is set (manual state change)
      newAddress.district = "";
      newAddress.subDistrict = "";
      newAddress.village = "";
    } else if (field === "district" && presentAddress.postalCode === "") {
      // Only reset if no pincode is set (manual district change)
      newAddress.subDistrict = "";
      newAddress.village = "";
    } else if (field === "subDistrict") {
      newAddress.village = "";
    }
    
    console.log("Address change:", field, "->", value, "New address:", newAddress);
    setPresentAddress(newAddress);
    setValue("presentAddress", newAddress);
    
    if (sameAsPresentAddress) {
      setPermanentAddress(newAddress);
      setValue("permanentAddress", newAddress);
    }
  };

  // Handle batch address changes (for pincode auto-population)
  const handlePresentBatchAddressChange = (newAddressFields: Partial<Address>) => {
    const newAddress = { ...presentAddress, ...newAddressFields };
    console.log("Batch address change:", newAddressFields, "New address:", newAddress);
    setPresentAddress(newAddress);
    setValue("presentAddress", newAddress);
    
    if (sameAsPresentAddress) {
      setPermanentAddress(newAddress);
      setValue("permanentAddress", newAddress);
    }
  };

  const handleCreateShraddhakutir = () => {
    if (!newShraddhakutir.name) {
      toast({
        title: "Error",
        description: "Please enter a name for the Shraddhakutir",
        variant: "destructive",
      });
      return;
    }

    // Get the district from permanent address
    const permanentDistrict = permanentAddress.district;
    if (!permanentDistrict) {
      toast({
        title: "Error",
        description: "Please select permanent address district first",
        variant: "destructive",
      });
      return;
    }

    // Create shraddhakutir data with district code
    const shraddhakutirData = {
      name: newShraddhakutir.name,
      districtCode: permanentDistrict
    };
    
    createShraddhakutirMutation.mutate(shraddhakutirData);
  };

  const handlePermanentAddressChange = (field: keyof Address, value: string) => {
    const newAddress = { ...permanentAddress, [field]: value };
    
    // Reset dependent fields only for manual changes, not pincode auto-population
    if (field === "country") {
      newAddress.state = "";
      newAddress.district = "";
      newAddress.subDistrict = "";
      newAddress.village = "";
    } else if (field === "state" && permanentAddress.postalCode === "") {
      // Only reset if no pincode is set (manual state change)
      newAddress.district = "";
      newAddress.subDistrict = "";
      newAddress.village = "";
    } else if (field === "district" && permanentAddress.postalCode === "") {
      // Only reset if no pincode is set (manual district change)
      newAddress.subDistrict = "";
      newAddress.village = "";
    } else if (field === "subDistrict") {
      newAddress.village = "";
    }
    
    setPermanentAddress(newAddress);
    setValue("permanentAddress", newAddress);
  };

  // Handle batch address changes for permanent address
  const handlePermanentBatchAddressChange = (newAddressFields: Partial<Address>) => {
    const newAddress = { ...permanentAddress, ...newAddressFields };
    console.log("Permanent batch address change:", newAddressFields, "New address:", newAddress);
    setPermanentAddress(newAddress);
    setValue("permanentAddress", newAddress);
  };

  // Handle same as present address toggle
  useEffect(() => {
    if (sameAsPresentAddress) {
      setPermanentAddress(presentAddress);
      setValue("permanentAddress", presentAddress);
    }
  }, [sameAsPresentAddress, presentAddress, setValue]);

  // Handle devotional courses
  const addDevotionalCourse = () => {
    const newCourses = [...devotionalCourses, { name: "", date: "", institute: "" }];
    setDevotionalCourses(newCourses);
    setValue("devotionalCourses", newCourses);
  };

  const removeDevotionalCourse = (index: number) => {
    const newCourses = devotionalCourses.filter((_, i) => i !== index);
    setDevotionalCourses(newCourses);
    setValue("devotionalCourses", newCourses);
  };

  const updateDevotionalCourse = (index: number, field: string, value: string) => {
    const newCourses = [...devotionalCourses];
    newCourses[index] = { ...newCourses[index], [field]: value };
    setDevotionalCourses(newCourses);
    setValue("devotionalCourses", newCourses);
  };

  const onSubmit = (data: FormData) => {
    // Clear previous errors
    clearErrors();
    setAddressErrors({});
    
    // Simple validation - check required fields
    const errors: string[] = [];
    const newAddressErrors: Record<string, string> = {};
    
    // Check basic required fields
    if (!data.legalName?.trim()) {
      setError("legalName", { type: "required", message: "Legal Name is required" });
      errors.push("Legal Name");
    }
    
    if (!data.dob) {
      setError("dob", { type: "required", message: "Date of Birth is required" });
      errors.push("Date of Birth");
    }
    
    if (!data.gender) {
      setError("gender", { type: "required", message: "Gender is required" });
      errors.push("Gender");
    }
    
    if (!data.devotionalStatusId) {
      setError("devotionalStatusId", { type: "required", message: "Devotional Status is required" });
      errors.push("Devotional Status");
    }
    
    if (!data.dob) {
      setError("dob", { type: "required", message: "Date of Birth is required" });
      errors.push("Date of Birth");
    }
    
    if (!data.gender) {
      setError("gender", { type: "required", message: "Gender is required" });
      errors.push("Gender");
    }
    
    // Check present address
    if (!presentAddress.country) {
      newAddressErrors["presentAddress.country"] = "Country is required";
      errors.push("Present Address Country");
    }
    if (!presentAddress.state) {
      newAddressErrors["presentAddress.state"] = "State is required";
      errors.push("Present Address State");
    }
    if (!presentAddress.district) {
      newAddressErrors["presentAddress.district"] = "District is required";
      errors.push("Present Address District");
    }
    if (!presentAddress.subDistrict) {
      newAddressErrors["presentAddress.subDistrict"] = "Sub-District is required";
      errors.push("Present Address Sub-District");
    }
    if (!presentAddress.village) {
      newAddressErrors["presentAddress.village"] = "Village is required";
      errors.push("Present Address Village");
    }
    if (!presentAddress.postalCode) {
      newAddressErrors["presentAddress.postalCode"] = "Postal Code is required";
      errors.push("Present Address Postal Code");
    }
    
    // Check permanent address (if not same as present)
    if (!sameAsPresentAddress) {
      if (!permanentAddress.country) {
        newAddressErrors["permanentAddress.country"] = "Country is required";
        errors.push("Permanent Address Country");
      }
      if (!permanentAddress.state) {
        newAddressErrors["permanentAddress.state"] = "State is required";
        errors.push("Permanent Address State");
      }
      if (!permanentAddress.district) {
        newAddressErrors["permanentAddress.district"] = "District is required";
        errors.push("Permanent Address District");
      }
      if (!permanentAddress.subDistrict) {
        newAddressErrors["permanentAddress.subDistrict"] = "Sub-District is required";
        errors.push("Permanent Address Sub-District");
      }
      if (!permanentAddress.village) {
        newAddressErrors["permanentAddress.village"] = "Village is required";
        errors.push("Permanent Address Village");
      }
      if (!permanentAddress.postalCode) {
        newAddressErrors["permanentAddress.postalCode"] = "Postal Code is required";
        errors.push("Permanent Address Postal Code");
      }
    }
    
    // If there are errors, show them and stop
    if (errors.length > 0) {
      setShowValidation(true);
      setAddressErrors(newAddressErrors);
      toast({
        title: `Please fill in ${errors.length} required fields`,
        description: `Missing: ${errors.join(", ")}`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const submitData: Partial<Devotee> = {
      legalName: data.legalName,
      dob: data.dob,
      email: data.email,
      phone: data.phone,
      fatherName: data.fatherName,
      motherName: data.motherName,
      husbandName: data.husbandName,
      bloodGroup: data.bloodGroup,
      presentAddress,
      permanentAddress: sameAsPresentAddress ? presentAddress : permanentAddress,
      devotionalCourses,
      devotionalStatusId: data.devotionalStatusId,
      harinamInitiationGurudevId: data.harinamInitiationGurudevId,
      pancharatrikInitiationGurudevId: data.pancharatrikInitiationGurudevId,
      initiatedName: data.initiatedName,
      harinamDate: data.harinamDate,
      pancharatrikDate: data.pancharatrikDate,
      shraddhakutirId: data.shraddhakutirId,
      gender: data.gender as "MALE" | "FEMALE" | "OTHER" | undefined,
      maritalStatus: data.maritalStatus as "MARRIED" | "UNMARRIED" | "WIDOWED" | undefined,
      education: data.education,
      occupation: data.occupation,
      additionalComments: data.additionalComments,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Devotee" : "Add New Devotee"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update devotee information" : "Fill in the details to register a new devotee"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="form-section-header">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="legalName">Legal Name *</Label>
                  <Input
                    {...register("legalName")}
                    placeholder="Enter legal name"
                  />
                  {errors.legalName && (
                    <p className="text-sm text-red-500 mt-1">{errors.legalName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input 
                    type="date" 
                    {...register("dob")} 
                  />
                  {errors.dob && (
                    <p className="text-sm text-red-500 mt-1">{errors.dob.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input type="email" {...register("email")} placeholder="Enter email address" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input {...register("phone")} placeholder="Enter phone number" />
                </div>
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={watch("gender")} 
                    onValueChange={(value) => {
                      setValue("gender", value);
                      clearErrors("gender");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-red-500 mt-1">{errors.gender.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select value={watch("bloodGroup")} onValueChange={(value) => setValue("bloodGroup", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Family Information */}
            <div className="space-y-3">
              <h3 className="form-section-header">Family Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="fatherName">Father's Name</Label>
                  <Input {...register("fatherName")} placeholder="Enter father's name" />
                </div>
                <div>
                  <Label htmlFor="motherName">Mother's Name</Label>
                  <Input {...register("motherName")} placeholder="Enter mother's name" />
                </div>
                <div>
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select value={watch("maritalStatus")} onValueChange={(value) => setValue("maritalStatus", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNMARRIED">Unmarried</SelectItem>
                      <SelectItem value="MARRIED">Married</SelectItem>
                      <SelectItem value="WIDOWED">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="husbandName">Husband's Name</Label>
                  <Input {...register("husbandName")} placeholder="Enter husband's name (if applicable)" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="space-y-3">
              <h3 className="form-section-header">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="education">Education</Label>
                  <Input {...register("education")} placeholder="Enter education details" />
                </div>
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input {...register("occupation")} placeholder="Enter occupation" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="additionalComments">Additional Comments</Label>
                  <textarea
                    {...register("additionalComments")}
                    placeholder="Enter any additional comments or notes"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Present Address */}
            <AddressSection
              title="Present Address"
              address={presentAddress}
              onAddressChange={handlePresentAddressChange}
              onBatchAddressChange={handlePresentBatchAddressChange}
              required={true}
              showValidation={showValidation}
            />

            <Separator />

            {/* Permanent Address */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="sameAsPresent"
                  checked={sameAsPresentAddress}
                  onChange={(e) => setSameAsPresentAddress(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="sameAsPresent" className="text-sm">
                  Same as present address
                </Label>
              </div>
              {!sameAsPresentAddress && (
                <AddressSection
                  title="Permanent Address"
                  address={permanentAddress}
                  onAddressChange={handlePermanentAddressChange}
                  onBatchAddressChange={handlePermanentBatchAddressChange}
                  required={true}
                  showValidation={showValidation}
                />
              )}
            </div>

            <Separator />

            {/* Spiritual Information */}
            <div className="space-y-3">
              <h3 className="form-section-header">Spiritual Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="devotionalStatusId">Devotional Status *</Label>
                  <Select
                    value={watch("devotionalStatusId")?.toString() || ""}
                    onValueChange={(value) => {
                      setValue("devotionalStatusId", value ? parseInt(value) : undefined);
                      clearErrors("devotionalStatusId");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select devotional status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses?.map((status) => (
                        <SelectItem key={status.id} value={status.id.toString()}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.devotionalStatusId && (
                    <p className="text-sm text-red-500 mt-1">{errors.devotionalStatusId.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="harinamInitiationGurudev">Harinam Initiation Gurudev</Label>
                  <SearchableSelect
                    options={(gurudevs || []).map((g) => `${g.title || ''} ${g.name}`.trim())}
                    value={
                      gurudevs?.find(g => g.id === watch("harinamInitiationGurudevId"))
                        ? `${gurudevs.find(g => g.id === watch("harinamInitiationGurudevId"))?.title || ''} ${gurudevs.find(g => g.id === watch("harinamInitiationGurudevId"))?.name}`.trim()
                        : ""
                    }
                    onValueChange={(value) => {
                      const selectedGurudev = gurudevs?.find(g => `${g.title || ''} ${g.name}`.trim() === value);
                      setValue("harinamInitiationGurudevId", selectedGurudev?.id);
                    }}
                    placeholder="Select harinam initiation gurudev"
                  />
                </div>
                <div>
                  <Label htmlFor="harinamDate">Harinama Initiation Date</Label>
                  <Input type="date" {...register("harinamDate")} />
                </div>
                <div>
                  <Label htmlFor="initiatedName">Initiated Name</Label>
                  <Input {...register("initiatedName")} placeholder="Enter initiated name" />
                </div>
                <div>
                  <Label htmlFor="pancharatrikInitiationGurudev">Pancharatrik Initiation Gurudev</Label>
                  <SearchableSelect
                    options={(gurudevs || []).map((g) => `${g.title || ''} ${g.name}`.trim())}
                    value={
                      gurudevs?.find(g => g.id === watch("pancharatrikInitiationGurudevId"))
                        ? `${gurudevs.find(g => g.id === watch("pancharatrikInitiationGurudevId"))?.title || ''} ${gurudevs.find(g => g.id === watch("pancharatrikInitiationGurudevId"))?.name}`.trim()
                        : ""
                    }
                    onValueChange={(value) => {
                      const selectedGurudev = gurudevs?.find(g => `${g.title || ''} ${g.name}`.trim() === value);
                      setValue("pancharatrikInitiationGurudevId", selectedGurudev?.id);
                    }}
                    placeholder="Select pancharatrik initiation gurudev"
                  />
                </div>
                <div>
                  <Label htmlFor="pancharatrikDate">Pancharatrik Initiation Date</Label>
                  <Input type="date" {...register("pancharatrikDate")} />
                </div>
                <div>
                  <Label htmlFor="shraddhakutirId">Shraddhakutir</Label>
                  <div className="flex gap-2">
                    <SearchableSelect
                      options={(shraddhakutirs || []).map((sk) => `${sk.name} - ${sk.id}`)}
                      value={
                        shraddhakutirs?.find(sk => sk.id === watch("shraddhakutirId"))
                          ? `${shraddhakutirs.find(sk => sk.id === watch("shraddhakutirId"))!.name} - ${shraddhakutirs.find(sk => sk.id === watch("shraddhakutirId"))!.id}`
                          : ""
                      }
                      onValueChange={(value: string) => {
                        const selectedShraddhakutir = shraddhakutirs?.find(sk => `${sk.name} - ${sk.id}` === value);
                        setValue("shraddhakutirId", selectedShraddhakutir?.id);
                      }}
                      placeholder="Search Shraddhakutir..."
                      className="flex-1"
                      disabled={!permanentAddress.district}
                    />
                    {permanentAddress.district ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowShraddhakutirForm(true)}
                        className="shrink-0"
                        title="Add new Shraddhakutir"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        className="shrink-0"
                        title="Please fill permanent address district first"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {!permanentAddress.district && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Fill permanent address district to add new Shraddhakutir
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Devotional Courses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="form-section-header">Devotional Courses</h3>
                <Button type="button" variant="outline" size="sm" onClick={addDevotionalCourse}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </div>
              {devotionalCourses.map((course, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor={`course-name-${index}`}>Course Name</Label>
                    <Input
                      value={course.name}
                      onChange={(e) => updateDevotionalCourse(index, "name", e.target.value)}
                      placeholder="Enter course name"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`course-date-${index}`}>Date</Label>
                    <Input
                      type="date"
                      value={course.date}
                      onChange={(e) => updateDevotionalCourse(index, "date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`course-institute-${index}`}>Institute</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={course.institute}
                        onChange={(e) => updateDevotionalCourse(index, "institute", e.target.value)}
                        placeholder="Enter institute name"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeDevotionalCourse(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : (isEditing ? "Update Devotee" : "Create Devotee")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add New Shraddhakutir Dialog */}
      <Dialog open={showShraddhakutirForm} onOpenChange={setShowShraddhakutirForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Shraddhakutir</DialogTitle>
            <DialogDescription>
              Create a new Shraddhakutir to assign to this devotee. The region will be automatically set based on the permanent address district.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shraddhakutir-name">Name *</Label>
              <Input
                id="shraddhakutir-name"
                value={newShraddhakutir.name}
                onChange={(e) => setNewShraddhakutir({ ...newShraddhakutir, name: e.target.value })}
                placeholder="Enter Shraddhakutir name"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              District: <strong>{permanentAddress.district}</strong>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowShraddhakutirForm(false);
                  setNewShraddhakutir({ name: "" });
                }}
                disabled={createShraddhakutirMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateShraddhakutir}
                disabled={createShraddhakutirMutation.isPending}
              >
                {createShraddhakutirMutation.isPending ? "Creating..." : "Create Shraddhakutir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}