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
import { Plus, Trash2, Save, X, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddressSection from "@/components/ui/AddressSection";
import type { Devotee, Address } from "@/lib/types";

// Leadership role hierarchy for automatic setup
const LEADERSHIP_HIERARCHY = {
  MALA_SENAPOTI: { level: 1, reportsTo: null },
  MAHA_CHAKRA_SENAPOTI: { level: 2, reportsTo: 'MALA_SENAPOTI' },
  CHAKRA_SENAPOTI: { level: 3, reportsTo: 'MAHA_CHAKRA_SENAPOTI' },
  UPA_CHAKRA_SENAPOTI: { level: 4, reportsTo: 'CHAKRA_SENAPOTI' },
} as const;

interface EnhancedDevoteeFormProps {
  devotee?: Devotee;
  onClose: () => void;
  onSuccess?: (devotee: Devotee) => void;
  namahattaId?: number;
  // Enhanced props for role assignment
  preAssignedRole?: keyof typeof LEADERSHIP_HIERARCHY | 'SECRETARY' | 'PRESIDENT' | 'ACCOUNTANT';
  reportingToDevoteeId?: number;
  districtInfo?: {
    country?: string;
    state?: string;
    district?: string;
  };
  isModal?: boolean;
  modalTitle?: string;
}

interface FormData {
  legalName: string;
  name: string; // Initiated/spiritual name
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
  // Leadership fields
  leadershipRole?: string;
  reportingToDevoteeId?: number;
  hasSystemAccess?: boolean;
}

export default function EnhancedDevoteeForm({ 
  devotee, 
  onClose, 
  onSuccess, 
  namahattaId,
  preAssignedRole,
  reportingToDevoteeId,
  districtInfo,
  isModal = false,
  modalTitle = "Create New Devotee"
}: EnhancedDevoteeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!devotee;

  const { register, handleSubmit, watch, setValue, formState: { errors }, setError, clearErrors } = useForm<FormData>({
    defaultValues: {
      legalName: devotee?.legalName || "",
      name: devotee?.name || "",
      dob: devotee?.dob || "",
      email: devotee?.email || "",
      phone: devotee?.phone || "",
      fatherName: devotee?.fatherName || "",
      motherName: devotee?.motherName || "",
      husbandName: devotee?.husbandName || "",
      gender: devotee?.gender || "",
      bloodGroup: devotee?.bloodGroup || "",
      maritalStatus: devotee?.maritalStatus || "",
      presentAddress: devotee?.presentAddress || districtInfo || {},
      permanentAddress: devotee?.permanentAddress || districtInfo || {},
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
      additionalComments: devotee?.additionalComments || "",
      // Leadership role pre-assignment
      leadershipRole: preAssignedRole || devotee?.leadershipRole || undefined,
      reportingToDevoteeId: reportingToDevoteeId || devotee?.reportingToDevoteeId || undefined,
      hasSystemAccess: devotee?.hasSystemAccess || false
    }
  });

  const [presentAddress, setPresentAddress] = useState<Address>(devotee?.presentAddress || districtInfo || {});
  const [permanentAddress, setPermanentAddress] = useState<Address>(devotee?.permanentAddress || districtInfo || {});
  const [devotionalCourses, setDevotionalCourses] = useState(devotee?.devotionalCourses || []);
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);
  const [showShraddhakutirForm, setShowShraddhakutirForm] = useState(false);
  const [newShraddhakutir, setNewShraddhakutir] = useState({
    name: ""
  });

  // Pre-fill district information for Mala Senapoti
  useEffect(() => {
    if (preAssignedRole === 'MALA_SENAPOTI' && districtInfo) {
      // Only update if the current addresses don't already have the district info
      const needsUpdate = !presentAddress.country || !presentAddress.state || !presentAddress.district;
      if (needsUpdate) {
        const newPresentAddress = { ...presentAddress, ...districtInfo };
        const newPermanentAddress = { ...permanentAddress, ...districtInfo };
        setPresentAddress(newPresentAddress);
        setPermanentAddress(newPermanentAddress);
        setValue("presentAddress", newPresentAddress);
        setValue("permanentAddress", newPermanentAddress);
      }
    }
  }, [preAssignedRole, districtInfo, setValue]);

  // Data queries
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
    enabled: !!permanentAddress.district,
  });

  // Enhanced creation mutation with role assignment
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Devotee>) => {
      // Only assign leadership role if it's a valid Senapoti role
      const validLeadershipRoles = ['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'];
      const isValidLeadershipRole = preAssignedRole && validLeadershipRoles.includes(preAssignedRole);
      
      const devoteeData = {
        ...data,
        leadershipRole: isValidLeadershipRole ? preAssignedRole as any : null,
        reportingToDevoteeId: reportingToDevoteeId,
        hasSystemAccess: data.hasSystemAccess || false,
        appointedDate: new Date().toISOString().split('T')[0],
        // appointedBy will be set by the backend based on the current user
      };

      if (namahattaId) {
        return api.createDevoteeForNamahatta(devoteeData, namahattaId);
      }
      return api.createDevotee(devoteeData);
    },
    onSuccess: (devotee) => {
      queryClient.invalidateQueries({ queryKey: ["/api/devotees"] });
      if (namahattaId) {
        queryClient.invalidateQueries({ queryKey: ["/api/namahattas", namahattaId.toString(), "devotees"] });
      }
      
      toast({
        title: "Success",
        description: `${preAssignedRole ? preAssignedRole.replace(/_/g, ' ') + ' ' : ''}Devotee created successfully`,
        duration: 3000,
      });
      
      onSuccess?.(devotee);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create devotee",
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
        duration: 3000,
      });
      onSuccess?.(devotee!);
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update devotee",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const createShraddhakutirMutation = useMutation({
    mutationFn: (data: any) => api.createShraddhakutir(data),
    onSuccess: (newShraddhakutir) => {
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

  const handleCreateShraddhakutir = () => {
    if (!newShraddhakutir.name) {
      toast({
        title: "Error",
        description: "Please enter a name for the Shraddhakutir",
        variant: "destructive",
      });
      return;
    }

    const permanentDistrict = permanentAddress.district;
    if (!permanentDistrict) {
      toast({
        title: "Error",
        description: "Please select permanent address district first",
        variant: "destructive",
      });
      return;
    }

    const shraddhakutirData = {
      name: newShraddhakutir.name,
      districtCode: permanentDistrict
    };
    
    createShraddhakutirMutation.mutate(shraddhakutirData);
  };

  const validateAddresses = () => {
    const errors: Record<string, string> = {};
    
    if (!presentAddress.country) errors.presentCountry = "Country is required";
    if (!presentAddress.state) errors.presentState = "State is required";
    if (!presentAddress.district) errors.presentDistrict = "District is required";
    
    if (!permanentAddress.country) errors.permanentCountry = "Country is required";
    if (!permanentAddress.state) errors.permanentState = "State is required";
    if (!permanentAddress.district) errors.permanentDistrict = "District is required";

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (data: FormData) => {
    setShowValidation(true);
    
    // Clear previous errors
    clearErrors();
    
    // Validate required fields
    let hasErrors = false;
    
    if (!data.legalName?.trim()) {
      setError("legalName", { type: "required", message: "Legal name is required" });
      hasErrors = true;
    }
    
    if (!data.dob) {
      setError("dob", { type: "required", message: "Date of Birth is required" });
      hasErrors = true;
    }
    
    if (!data.gender) {
      setError("gender", { type: "required", message: "Gender is required" });
      hasErrors = true;
    }
    
    if (!data.devotionalStatusId) {
      setError("devotionalStatusId", { type: "required", message: "Devotional Status is required" });
      hasErrors = true;
    }

    if (!validateAddresses()) {
      hasErrors = true;
    }
    
    if (hasErrors) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const devoteeData = {
      ...data,
      gender: data.gender as "MALE" | "FEMALE" | "OTHER" | undefined,
      maritalStatus: data.maritalStatus as "MARRIED" | "UNMARRIED" | "WIDOWED" | undefined,
      leadershipRole: data.leadershipRole as "MALA_SENAPOTI" | "MAHA_CHAKRA_SENAPOTI" | "CHAKRA_SENAPOTI" | "UPA_CHAKRA_SENAPOTI" | undefined,
      presentAddress,
      permanentAddress,
      devotionalCourses,
      namahattaId: namahattaId || undefined
    };

    if (isEditing) {
      updateMutation.mutate(devoteeData);
    } else {
      createMutation.mutate(devoteeData);
    }
  };

  const handleAddressChange = (field: keyof Address, value: string, isPresent: boolean) => {
    if (isPresent) {
      const newAddress = { ...presentAddress, [field]: value };
      setPresentAddress(newAddress);
      setValue("presentAddress", newAddress);
      
      if (sameAsPresentAddress) {
        setPermanentAddress(newAddress);
        setValue("permanentAddress", newAddress);
      }
    } else {
      const newAddress = { ...permanentAddress, [field]: value };
      setPermanentAddress(newAddress);
      setValue("permanentAddress", newAddress);
    }
    
    if (showValidation) {
      validateAddresses();
    }
  };

  const handleBatchAddressChange = (addressFields: Partial<Address>, isPresent: boolean) => {
    if (isPresent) {
      const newAddress = { ...presentAddress, ...addressFields };
      setPresentAddress(newAddress);
      setValue("presentAddress", newAddress);
      
      if (sameAsPresentAddress) {
        setPermanentAddress(newAddress);
        setValue("permanentAddress", newAddress);
      }
    } else {
      const newAddress = { ...permanentAddress, ...addressFields };
      setPermanentAddress(newAddress);
      setValue("permanentAddress", newAddress);
    }
    
    if (showValidation) {
      validateAddresses();
    }
  };

  const addDevotionalCourse = () => {
    setDevotionalCourses([...devotionalCourses, { name: "", date: "", institute: "" }]);
  };

  const removeDevotionalCourse = (index: number) => {
    setDevotionalCourses(devotionalCourses.filter((_, i) => i !== index));
  };

  const updateDevotionalCourse = (index: number, field: string, value: string) => {
    const updated = [...devotionalCourses];
    updated[index] = { ...updated[index], [field]: value };
    setDevotionalCourses(updated);
  };

  const FormContent = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-testid="form-devotee">
      {/* Role Assignment Display */}
      {preAssignedRole && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Creating {preAssignedRole.replace(/_/g, ' ')} for Namahatta
              </span>
            </div>
            {reportingToDevoteeId && (
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">
                Will report to the designated superior in the hierarchy
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="legalName">Legal Name *</Label>
              <Input
                id="legalName"
                data-testid="input-legal-name"
                {...register("legalName", { required: "Legal name is required" })}
                className={errors.legalName ? "border-red-500" : ""}
              />
              {errors.legalName && (
                <span className="text-red-500 text-sm">{errors.legalName.message}</span>
              )}
            </div>


            <div>
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                data-testid="input-dob"
                type="date"
                {...register("dob", { required: "Date of Birth is required" })}
                className={errors.dob ? "border-red-500" : ""}
              />
              {errors.dob && (
                <span className="text-red-500 text-sm">{errors.dob.message}</span>
              )}
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
                <SelectTrigger data-testid="select-gender" className={errors.gender ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <span className="text-red-500 text-sm">{errors.gender.message}</span>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                {...register("email")}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                data-testid="input-phone"
                {...register("phone")}
              />
            </div>
            
            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select value={watch("bloodGroup")} onValueChange={(value) => setValue("bloodGroup", value)}>
                <SelectTrigger data-testid="select-blood-group">
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
        </CardContent>
      </Card>

      {/* Family Information */}
      <Card>
        <CardHeader>
          <CardTitle>Family Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fatherName">Father's Name</Label>
              <Input
                id="fatherName"
                data-testid="input-father-name"
                {...register("fatherName")}
                placeholder="Enter father's name"
              />
            </div>

            <div>
              <Label htmlFor="motherName">Mother's Name</Label>
              <Input
                id="motherName"
                data-testid="input-mother-name"
                {...register("motherName")}
                placeholder="Enter mother's name"
              />
            </div>

            <div>
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select value={watch("maritalStatus")} onValueChange={(value) => setValue("maritalStatus", value)}>
                <SelectTrigger data-testid="select-marital-status">
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
              <Label htmlFor="husbandName">Husband's Name (if applicable)</Label>
              <Input
                id="husbandName"
                data-testid="input-husband-name"
                {...register("husbandName")}
                placeholder="Enter husband's name (if applicable)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="education">Education</Label>
              <Input
                id="education"
                data-testid="input-education"
                {...register("education")}
                placeholder="Enter education details"
              />
            </div>

            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                data-testid="input-occupation"
                {...register("occupation")}
                placeholder="Enter occupation"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="additionalComments">Additional Comments</Label>
              <textarea
                id="additionalComments"
                data-testid="textarea-additional-comments"
                {...register("additionalComments")}
                placeholder="Enter any additional comments or notes"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-[80px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Present Address */}
          <div>
            <h4 className="font-medium mb-4">Present Address</h4>
            <AddressSection
              title="Present Address"
              address={presentAddress}
              onAddressChange={(field, value) => handleAddressChange(field, value, true)}
              onBatchAddressChange={(addressFields) => handleBatchAddressChange(addressFields, true)}
              required={true}
              showValidation={showValidation}
            />
          </div>

          <Separator />

          {/* Permanent Address */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Permanent Address</h4>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  data-testid="checkbox-same-address"
                  checked={sameAsPresentAddress}
                  onChange={(e) => {
                    setSameAsPresentAddress(e.target.checked);
                    if (e.target.checked) {
                      setPermanentAddress(presentAddress);
                      setValue("permanentAddress", presentAddress);
                    }
                  }}
                />
                Same as present address
              </label>
            </div>
            <AddressSection
              title="Permanent Address"
              address={permanentAddress}
              onAddressChange={(field, value) => handleAddressChange(field, value, false)}
              onBatchAddressChange={(addressFields) => handleBatchAddressChange(addressFields, false)}
              required={true}
              showValidation={showValidation}
              disabled={sameAsPresentAddress}
            />
          </div>
        </CardContent>
      </Card>

      {/* Devotional Courses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Devotional Courses
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDevotionalCourse}
              data-testid="button-add-course"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {devotionalCourses.length === 0 ? (
            <p className="text-gray-500 text-sm">No courses added yet. Click "Add Course" to get started.</p>
          ) : (
            devotionalCourses.map((course, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">Course {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDevotionalCourse(index)}
                    data-testid={`button-remove-course-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`course-name-${index}`}>Course Name</Label>
                    <Input
                      id={`course-name-${index}`}
                      value={course.name}
                      onChange={(e) => updateDevotionalCourse(index, 'name', e.target.value)}
                      placeholder="Enter course name"
                      data-testid={`input-course-name-${index}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`course-date-${index}`}>Date</Label>
                    <Input
                      id={`course-date-${index}`}
                      type="date"
                      value={course.date}
                      onChange={(e) => updateDevotionalCourse(index, 'date', e.target.value)}
                      data-testid={`input-course-date-${index}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`course-institute-${index}`}>Institute</Label>
                    <Input
                      id={`course-institute-${index}`}
                      value={course.institute}
                      onChange={(e) => updateDevotionalCourse(index, 'institute', e.target.value)}
                      placeholder="Enter institute name"
                      data-testid={`input-course-institute-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Spiritual Information */}
      <Card>
        <CardHeader>
          <CardTitle>Spiritual Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="devotionalStatusId">Devotional Status *</Label>
              <Select 
                value={watch("devotionalStatusId")?.toString() || ""} 
                onValueChange={(value) => {
                  setValue("devotionalStatusId", value && value !== "none" ? parseInt(value) : undefined);
                  clearErrors("devotionalStatusId");
                }}
              >
                <SelectTrigger data-testid="select-devotional-status" className={errors.devotionalStatusId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {statuses?.map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.devotionalStatusId && (
                <span className="text-red-500 text-sm">{errors.devotionalStatusId.message}</span>
              )}
            </div>

            <div>
              <Label htmlFor="initiatedName">Initiated Name</Label>
              <Input
                id="initiatedName"
                data-testid="input-initiated-name"
                {...register("initiatedName")}
                placeholder="Enter initiated name"
              />
            </div>

            <div>
              <Label htmlFor="harinamInitiationGurudevId">Harinama Initiation Gurudev</Label>
              <Select 
                value={watch("harinamInitiationGurudevId")?.toString() || ""} 
                onValueChange={(value) => setValue("harinamInitiationGurudevId", value && value !== "none" ? parseInt(value) : undefined)}
              >
                <SelectTrigger data-testid="select-harinama-gurudev">
                  <SelectValue placeholder="Select Harinama Gurudev" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {gurudevs?.map((gurudev) => (
                    <SelectItem key={gurudev.id} value={gurudev.id.toString()}>
                      {gurudev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="harinamDate">Harinama Date</Label>
              <Input
                id="harinamDate"
                data-testid="input-harinama-date"
                type="date"
                {...register("harinamDate")}
              />
            </div>

            <div>
              <Label htmlFor="pancharatrikInitiationGurudevId">Pancharatrik Initiation Gurudev</Label>
              <Select 
                value={watch("pancharatrikInitiationGurudevId")?.toString() || ""} 
                onValueChange={(value) => setValue("pancharatrikInitiationGurudevId", value && value !== "none" ? parseInt(value) : undefined)}
              >
                <SelectTrigger data-testid="select-pancharatrik-gurudev">
                  <SelectValue placeholder="Select Pancharatrik Gurudev" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {gurudevs?.map((gurudev) => (
                    <SelectItem key={gurudev.id} value={gurudev.id.toString()}>
                      {gurudev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pancharatrikDate">Pancharatrik Date</Label>
              <Input
                id="pancharatrikDate"
                data-testid="input-pancharatrik-date"
                type="date"
                {...register("pancharatrikDate")}
              />
            </div>

            <div>
              <Label htmlFor="shraddhakutirId">Shraddhakutir</Label>
              <div className="flex gap-2">
                <Select 
                  value={watch("shraddhakutirId")?.toString() || ""} 
                  onValueChange={(value) => setValue("shraddhakutirId", value && value !== "none" ? parseInt(value) : undefined)}
                >
                  <SelectTrigger data-testid="select-shraddhakutir" className="flex-1">
                    <SelectValue placeholder="Select Shraddhakutir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {shraddhakutirs?.map((shraddhakutir) => (
                      <SelectItem key={shraddhakutir.id} value={shraddhakutir.id.toString()}>
                        {shraddhakutir.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {permanentAddress.district ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShraddhakutirForm(true)}
                    className="shrink-0"
                    title="Add new Shraddhakutir"
                    data-testid="button-create-shraddhakutir"
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
                    data-testid="button-create-shraddhakutir-disabled"
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
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          data-testid="button-cancel"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-save"
        >
          <Save className="h-4 w-4 mr-2" />
          {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );

  if (isModal) {
    return (
      <>
        <Dialog open={true} onOpenChange={onClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
              {preAssignedRole && (
                <DialogDescription>
                  Creating a new devotee for the {preAssignedRole.replace('_', ' ')} role
                </DialogDescription>
              )}
            </DialogHeader>
            <FormContent />
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
                  data-testid="input-new-shraddhakutir-name"
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
                  data-testid="button-cancel-new-shraddhakutir"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateShraddhakutir}
                  disabled={createShraddhakutirMutation.isPending}
                  data-testid="button-save-new-shraddhakutir"
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

  return (
    <>
      <FormContent />
      
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
                data-testid="input-new-shraddhakutir-name"
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
                data-testid="button-cancel-new-shraddhakutir"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateShraddhakutir}
                disabled={createShraddhakutirMutation.isPending}
                data-testid="button-save-new-shraddhakutir"
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