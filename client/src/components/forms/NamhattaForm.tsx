import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Namhatta, Address, Devotee } from "@/lib/types";
import AddressSection from "@/components/ui/AddressSection";
import { SearchableSelect } from "@/components/ui/searchable-select";
import EnhancedDevoteeForm from "./EnhancedDevoteeForm";
import { AlertCircle, CheckCircle, Users, MapPin, Lock, Plus } from "lucide-react";

// Step definition for the workflow
const steps = [
  "Basic Info",
  "Address", 
  "District Supervisor",
  "Senapoti Hierarchy",
  "Other Positions"
];

// Interface for creating devotee modal state
interface CreateDevoteeModal {
  isOpen: boolean;
  role: 'MALA_SENAPOTI' | 'MAHA_CHAKRA_SENAPOTI' | 'CHAKRA_SENAPOTI' | 'UPA_CHAKRA_SENAPOTI' | 'SECRETARY' | 'PRESIDENT' | 'ACCOUNTANT';
  reportingToDevoteeId?: number;
}

interface NamhattaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  namhatta?: Namhatta;
}

// Form data interface matching the new FK structure
interface FormData {
  name: string;
  code: string;
  meetingDay?: string;
  meetingTime?: string;
  malaSenapotiId?: number | null;
  mahaChakraSenapotiId?: number | null;
  chakraSenapotiId?: number | null;
  upaChakraSenapotiId?: number | null;
  secretaryId?: number | null;
  presidentId?: number | null;
  accountantId?: number | null;
  districtSupervisorId: number | null;
}

export default function NamhattaForm({
  isOpen,
  onClose,
  onSuccess,
  namhatta,
}: NamhattaFormProps) {
  const isEditing = !!namhatta;
  const { toast } = useToast();
  
  // Step management for new creation workflow
  const [currentStep, setCurrentStep] = useState(0);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, "Name is required"),
        code: z.string().min(1, "Code is required"),
        meetingDay: z.string().optional(),
        meetingTime: z.string().optional(),
        malaSenapotiId: z.number().nullable().optional(),
        mahaChakraSenapotiId: z.number().nullable().optional(),
        chakraSenapotiId: z.number().nullable().optional(),
        upaChakraSenapotiId: z.number().nullable().optional(),
        secretaryId: z.number().nullable().optional(),
        presidentId: z.number().nullable().optional(),
        accountantId: z.number().nullable().optional(),
        districtSupervisorId: z.number().nullable().optional(),
      })
    ),
    defaultValues: {
      name: "",
      code: "",
      meetingDay: "",
      meetingTime: "",
      malaSenapotiId: null,
      mahaChakraSenapotiId: null,
      chakraSenapotiId: null,
      upaChakraSenapotiId: null,
      secretaryId: null,
      presidentId: null,
      accountantId: null,
      districtSupervisorId: null,
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form;

  // States
  const [address, setAddress] = useState<Address>({
    country: "",
    state: "",
    district: "",
    subDistrict: "",
    village: "",
    postalCode: "",
  });

  const [showAddressValidation, setShowAddressValidation] = useState(false);
  const [selectedDistrictSupervisor, setSelectedDistrictSupervisor] = useState<number | null>(null);
  const [createDevoteeModal, setCreateDevoteeModal] = useState<CreateDevoteeModal>({
    isOpen: false,
    role: 'SECRETARY'
  });

  // Code validation state
  const [codeValidation, setCodeValidation] = useState<{
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isValid: null,
    message: ""
  });

  // Current code being watched for validation
  const currentCode = watch("code");

  // Address defaults for role-based auto-filling
  const [addressDefaults, setAddressDefaults] = useState<{
    country?: string;
    state?: string; 
    district?: string;
    readonly: string[];
  }>({
    readonly: []
  });

  // Query current user info
  const { data: user } = useQuery({
    queryKey: ["/api/auth/verify"],
    staleTime: 5 * 60 * 1000,
  }) as { data: { id: number; username: string; role: 'ADMIN' | 'OFFICE' | 'DISTRICT_SUPERVISOR'; districts: string[] } | undefined };

  // Query user's address defaults if they're a District Supervisor
  const { data: userAddressDefaults } = useQuery({
    queryKey: ["/api/user/address-defaults"],
    enabled: user?.role === 'DISTRICT_SUPERVISOR'
  }) as { data: { country?: string; state?: string; district?: string; readonly: string[] } | undefined };

  // Query devotees for leadership role selection
  const { data: devotees = [], isLoading: devoteesLoading } = useQuery({
    queryKey: ["/api/devotees"],
    select: (data: any) => data?.data || []
  });

  // Query district supervisors based on selected district
  const { data: districtSupervisors = [], isLoading: supervisorsLoading } = useQuery({
    queryKey: ["/api/district-supervisors", address.district],
    enabled: !!address.district && user?.role !== 'DISTRICT_SUPERVISOR',
    queryFn: async () => {
      const params = new URLSearchParams({ district: address.district || "" });
      const response = await fetch(`/api/district-supervisors?${params}`);
      if (!response.ok) throw new Error('Failed to fetch district supervisors');
      return response.json() as Promise<Array<{ id: number; username: string; fullName?: string; email: string; isDefault: boolean }>>;
    }
  });


  // Effect for user defaults
  useEffect(() => {
    if (user?.role === 'DISTRICT_SUPERVISOR' && userAddressDefaults) {
      const defaults = {
        country: userAddressDefaults.country,
        state: userAddressDefaults.state,
        district: userAddressDefaults.district,
        readonly: ['country', 'state', 'district']
      };
      
      setAddressDefaults(defaults);
      setAddress(prev => ({
        ...prev,
        country: userAddressDefaults.country || "",
        state: userAddressDefaults.state || "",
        district: userAddressDefaults.district || ""
      }));

      // Auto-assign district supervisor (the current user)
      if (user.id) {
        setSelectedDistrictSupervisor(user.id);
        setValue("districtSupervisorId", user.id);
      }
    }
  }, [user, userAddressDefaults, setValue]);

  // Effect for code validation
  useEffect(() => {
    if (!currentCode || currentCode.length < 2 || isEditing) {
      setCodeValidation({ isChecking: false, isValid: null, message: "" });
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCodeValidation({ isChecking: true, isValid: null, message: "Checking availability..." });
      
      try {
        const response = await fetch(`/api/namhattas/check-code/${encodeURIComponent(currentCode.toUpperCase())}`);
        if (!response.ok) throw new Error('Failed to check code availability');
        const data = await response.json() as { exists: boolean };
        if (!data.exists) {
          setCodeValidation({
            isChecking: false,
            isValid: true,
            message: "Code is available"
          });
        } else {
          setCodeValidation({
            isChecking: false,
            isValid: false,
            message: "Code is already taken"
          });
        }
      } catch (error) {
        setCodeValidation({
          isChecking: false,
          isValid: false,
          message: "Error checking code availability"
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentCode, isEditing]);

  // Effect for district supervisor auto-selection
  useEffect(() => {
    // Skip auto-selection if user is a district supervisor (they're already auto-assigned)
    // or if we're editing an existing namhatta or if no district is selected
    if (user?.role === 'DISTRICT_SUPERVISOR' || isEditing || !address.district || !districtSupervisors.length) {
      return;
    }

    // If there's only one district supervisor, auto-select them
    if (districtSupervisors.length === 1) {
      const supervisor = districtSupervisors[0];
      setSelectedDistrictSupervisor(supervisor.id);
      setValue("districtSupervisorId", supervisor.id);
    } else if (districtSupervisors.length > 1) {
      // If there are multiple, try to find the default supervisor, otherwise select the first one
      const defaultSupervisor = districtSupervisors.find(s => s.isDefault) || districtSupervisors[0];
      setSelectedDistrictSupervisor(defaultSupervisor.id);
      setValue("districtSupervisorId", defaultSupervisor.id);
    }
  }, [districtSupervisors, address.district, user?.role, isEditing, setValue]);

  // Initialize form with existing namhatta data
  useEffect(() => {
    if (namhatta && isEditing) {
      reset({
        name: namhatta.name || "",
        code: namhatta.code || "",
        meetingDay: namhatta.meetingDay || "",
        meetingTime: namhatta.meetingTime || "",
        malaSenapotiId: namhatta.malaSenapotiId || null,
        mahaChakraSenapotiId: namhatta.mahaChakraSenapotiId || null,
        chakraSenapotiId: namhatta.chakraSenapotiId || null,
        upaChakraSenapotiId: namhatta.upaChakraSenapotiId || null,
        secretaryId: namhatta.secretaryId || null,
        presidentId: namhatta.presidentId || null,
        accountantId: namhatta.accountantId || null,
        districtSupervisorId: namhatta.districtSupervisorId || null,
      });

      // For existing namhattas, try to load address information if available
      // This prevents data loss when editing existing namhattas
      if (namhatta.address) {
        setAddress({
          country: namhatta.address.country || "",
          state: namhatta.address.state || "",
          district: namhatta.address.district || "",
          subDistrict: namhatta.address.subDistrict || "",
          village: namhatta.address.village || "",
          postalCode: namhatta.address.postalCode || "",
        });
      }

      if (namhatta.districtSupervisorId) {
        setSelectedDistrictSupervisor(namhatta.districtSupervisorId);
      }
    }
  }, [namhatta, isEditing, reset]);

  // Handle address changes
  const handleAddressChange = (field: keyof Address, value: string) => {
    console.log("Namhatta address change:", field, "->", value, "New address:", { ...address, [field]: value });
    setAddress(prev => ({ ...prev, [field]: value }));
    
    // Reset district supervisor selection when district changes
    if (field === 'district' && user?.role !== 'DISTRICT_SUPERVISOR') {
      setSelectedDistrictSupervisor(null);
      setValue("districtSupervisorId", null);
    }
  };

  const handleBatchAddressChange = (newAddressFields: Partial<Address>) => {
    setAddress(prev => ({ ...prev, ...newAddressFields }));
  };

  // Enhanced devotee modal management
  const openCreateDevoteeModal = (role: CreateDevoteeModal['role'], reportingToDevoteeId?: number) => {
    setCreateDevoteeModal({
      isOpen: true,
      role,
      reportingToDevoteeId
    });
  };

  const closeCreateDevoteeModal = () => {
    setCreateDevoteeModal({
      isOpen: false,
      role: 'SECRETARY'
    });
  };

  const handleDevoteeCreated = (newDevotee: Devotee) => {
    // Refresh devotees list
    queryClient.invalidateQueries({ queryKey: ["/api/devotees"] });
    
    // Auto-assign the newly created devotee to the appropriate role
    const role = createDevoteeModal.role;
    const fieldMap: Record<typeof role, keyof FormData> = {
      'MALA_SENAPOTI': 'malaSenapotiId',
      'MAHA_CHAKRA_SENAPOTI': 'mahaChakraSenapotiId', 
      'CHAKRA_SENAPOTI': 'chakraSenapotiId',
      'UPA_CHAKRA_SENAPOTI': 'upaChakraSenapotiId',
      'SECRETARY': 'secretaryId',
      'PRESIDENT': 'presidentId',
      'ACCOUNTANT': 'accountantId'
    };

    const fieldName = fieldMap[role];
    if (fieldName) {
      setValue(fieldName, newDevotee.id);
    }

    toast({
      title: "Success",
      description: `${role.replace('_', ' ').toLowerCase()} created and assigned successfully`,
    });

    closeCreateDevoteeModal();
  };

  // Helper function to get filtered devotees based on specific role and hierarchy
  const getFilteredDevotees = (specificRole: string) => {
    if (['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'].includes(specificRole)) {
      // For senapoti roles, implement hierarchical filtering
      const baseFilter = devotees.filter((devotee: Devotee) => 
        devotee.leadershipRole === specificRole
      );

      switch (specificRole) {
        case 'MALA_SENAPOTI':
          // Show Mala Senapotis that report to the selected district supervisor
          if (!selectedDistrictSupervisor) return [];
          return baseFilter.filter((devotee: Devotee) => 
            devotee.reportingToDevoteeId === selectedDistrictSupervisor
          );

        case 'MAHA_CHAKRA_SENAPOTI':
          // Show Maha Chakra Senapotis that report to the selected Mala Senapoti
          const selectedMalaSenapoti = watch('malaSenapotiId');
          if (!selectedMalaSenapoti) return [];
          return baseFilter.filter((devotee: Devotee) => 
            devotee.reportingToDevoteeId === selectedMalaSenapoti
          );

        case 'CHAKRA_SENAPOTI':
          // Show Chakra Senapotis that report to the selected Maha Chakra Senapoti
          const selectedMahaChakraSenapoti = watch('mahaChakraSenapotiId');
          if (!selectedMahaChakraSenapoti) return [];
          return baseFilter.filter((devotee: Devotee) => 
            devotee.reportingToDevoteeId === selectedMahaChakraSenapoti
          );

        case 'UPA_CHAKRA_SENAPOTI':
          // Show Upa Chakra Senapotis that report to the selected Chakra Senapoti
          const selectedChakraSenapoti = watch('chakraSenapotiId');
          if (!selectedChakraSenapoti) return [];
          return baseFilter.filter((devotee: Devotee) => 
            devotee.reportingToDevoteeId === selectedChakraSenapoti
          );

        default:
          return baseFilter;
      }
    } else {
      // For other leadership roles (Secretary, President, Accountant)
      // Show devotees who have no leadership role OR who don't have senapoti roles
      return devotees.filter((devotee: Devotee) => 
        !devotee.leadershipRole || 
        devotee.leadershipRole === null ||
        !['MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'].includes(devotee.leadershipRole)
      );
    }
  };

  // Helper function to set up hierarchy relationships
  const getHierarchySetup = (role: CreateDevoteeModal['role']) => {
    const hierarchyMap = {
      'MALA_SENAPOTI': { reportingToDevoteeId: selectedDistrictSupervisor },
      'MAHA_CHAKRA_SENAPOTI': { reportingToDevoteeId: watch('malaSenapotiId') },
      'CHAKRA_SENAPOTI': { reportingToDevoteeId: watch('mahaChakraSenapotiId') },
      'UPA_CHAKRA_SENAPOTI': { reportingToDevoteeId: watch('chakraSenapotiId') },
      'SECRETARY': { reportingToDevoteeId: selectedDistrictSupervisor },
      'PRESIDENT': { reportingToDevoteeId: selectedDistrictSupervisor },
      'ACCOUNTANT': { reportingToDevoteeId: selectedDistrictSupervisor }
    };

    return hierarchyMap[role] || {};
  };

  // Validate Mala Senapoti district match with confirmation
  const validateMalaSenapotiDistrict = (devoteeId: number) => {
    const devotee = devotees.find((d: any) => d.id === devoteeId);
    if (devotee?.presentAddress && address.district) {
      const devoteeDistrict = devotee.presentAddress.district;
      if (devoteeDistrict !== address.district) {
        const proceed = window.confirm(
          `District Mismatch: This Mala Senapoti is from ${devoteeDistrict} district, but the Namhatta is in ${address.district} district. Are you sure you want to assign them?`
        );
        if (!proceed) {
          setValue('malaSenapotiId', null);
          return false;
        }
      }
    }
    return true;
  };

  // Mutations for create/update
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        address,
      };
      return apiRequest("/api/namhattas", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/namhattas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Namhatta created successfully",
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create namhatta",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        address,
      };
      return apiRequest(`/api/namhattas/${namhatta!.id}`, "PUT", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/namhattas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Namhatta updated successfully",
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update namhatta",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Validate address completion
    if (!address.country || !address.state || !address.district) {
      setShowAddressValidation(true);
      toast({
        title: "Validation Error",
        description: "Please complete the address information",
        variant: "destructive",
      });
      return;
    }

    // Validate district supervisor selection
    if (!selectedDistrictSupervisor || !data.districtSupervisorId) {
      toast({
        title: "Validation Error",
        description: "Please select a District Supervisor",
        variant: "destructive",
      });
      return;
    }

    // Validate required Secretary selection  
    if (!data.secretaryId) {
      toast({
        title: "Validation Error",
        description: "Please select a Secretary - this role is required",
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            index === currentStep ? 'bg-blue-500 text-white' : 
            index < currentStep ? 'bg-green-500 text-white' : 
            'bg-gray-200 text-gray-600'
          }`}>
            {index + 1}
          </div>
          <span className={`ml-2 text-sm ${
            index === currentStep ? 'text-blue-600 font-medium' : 
            index < currentStep ? 'text-green-600' : 
            'text-gray-500'
          }`}>
            {step}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-4 ${
              index < currentStep ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  // Helper function to determine if Next button should be disabled
  const isNextButtonDisabled = () => {
    const currentName = watch("name");
    const currentCode = watch("code");
    
    switch (currentStep) {
      case 0: // Basic Information step
        // Required fields: name and code
        if (!currentName || !currentCode) {
          return true;
        }
        // Code validation must be complete and valid
        if (codeValidation.isChecking || codeValidation.isValid === false) {
          return true;
        }
        return false;
      
      case 1: // Address step
        // All address fields are required except landmark
        const hasPostal = !!(address.postalCode && address.postalCode.trim());
        return !address.country || !hasPostal || !address.state || 
               !address.district || !address.subDistrict || !address.village;
      
      case 2: // District Supervisor step
        return !selectedDistrictSupervisor;
      
      default:
        return false;
    }
  };

  // Helper to render leadership role select with "Create New" button
  const renderRoleSelect = (
    role: CreateDevoteeModal['role'], 
    fieldName: keyof FormData,
    label: string,
    required: boolean = false
  ) => {
    const currentValue = watch(fieldName);
    const filteredDevotees = getFilteredDevotees(role);

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex gap-2">
          <Select
            value={currentValue?.toString() || ""}
            onValueChange={(value) => {
              setValue(fieldName, value && value !== "none" ? parseInt(value) : null);
              // Validate district match for Mala Senapoti
              if (role === 'MALA_SENAPOTI' && value && value !== "none") {
                if (!validateMalaSenapotiDistrict(parseInt(value))) {
                  return; // Don't set the value if validation fails
                }
              }
            }}
            disabled={devoteesLoading}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={devoteesLoading ? "Loading..." : `Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {filteredDevotees.map((devotee: any) => (
                <SelectItem key={devotee.id} value={devotee.id.toString()}>
                  {devotee.name || devotee.legalName} ({devotee.legalName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => openCreateDevoteeModal(role, getHierarchySetup(role).reportingToDevoteeId || undefined)}
            className="flex items-center gap-1 whitespace-nowrap"
            data-testid={`button-create-${role.toLowerCase()}`}
          >
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Namhatta" : "Add New Namhatta"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update Namhatta information" : "Create a new Namhatta center following the step-by-step workflow"}
          </DialogDescription>
        </DialogHeader>
        
        {!isEditing && renderStepIndicator()}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 0: Basic Information */}
          {(isEditing || currentStep === 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Namhatta Name *</Label>
                  <Input
                    {...register("name", { required: "Name is required" })}
                    placeholder="Enter namhatta name"
                    data-testid="input-name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="code">Namhatta Code *</Label>
                  <div className="relative">
                    <Input
                      {...register("code", { 
                        required: "Code is required",
                        setValueAs: (value) => value?.toUpperCase()?.trim() || ""
                      })}
                      placeholder="Enter namhatta code"
                      style={{ textTransform: 'uppercase' }}
                      className={`${
                        !isEditing && codeValidation.isValid === false 
                          ? "border-red-500 focus:border-red-500" 
                          : !isEditing && codeValidation.isValid === true 
                          ? "border-green-500 focus:border-green-500" 
                          : ""
                      }`}
                      data-testid="input-code"
                    />
                    {!isEditing && currentCode && currentCode.length >= 2 && (
                      <div className="absolute right-3 top-3">
                        {codeValidation.isChecking ? (
                          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                        ) : codeValidation.isValid === false ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : codeValidation.isValid === true ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {errors.code && (
                    <p className="text-sm text-red-500 mt-1">{errors.code.message}</p>
                  )}
                  {!isEditing && codeValidation.message && (
                    <p className={`text-sm mt-1 ${
                      codeValidation.isValid === false 
                        ? "text-red-500" 
                        : codeValidation.isValid === true 
                        ? "text-green-500" 
                        : "text-gray-500"
                    }`}>
                      {codeValidation.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="meetingDay">Meeting Day</Label>
                  <Select
                    value={watch("meetingDay")}
                    onValueChange={(value) => setValue("meetingDay", value)}
                  >
                    <SelectTrigger data-testid="select-meeting-day">
                      <SelectValue placeholder="Select meeting day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monday">Monday</SelectItem>
                      <SelectItem value="Tuesday">Tuesday</SelectItem>
                      <SelectItem value="Wednesday">Wednesday</SelectItem>
                      <SelectItem value="Thursday">Thursday</SelectItem>
                      <SelectItem value="Friday">Friday</SelectItem>
                      <SelectItem value="Saturday">Saturday</SelectItem>
                      <SelectItem value="Sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="meetingTime">Meeting Time</Label>
                  <Input
                    {...register("meetingTime")}
                    type="time"
                    placeholder="Select meeting time"
                    data-testid="input-meeting-time"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Address */}
          {(isEditing || currentStep === 1) && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Address Information</h3>
              </div>
              <AddressSection
                title="Namhatta Address"
                address={address}
                onAddressChange={handleAddressChange}
                onBatchAddressChange={handleBatchAddressChange}
                required={true}
                showValidation={showAddressValidation}
                disabled={false}
              />
            </div>
          )}

          {/* Step 2: District Supervisor */}
          {(isEditing || currentStep === 2) && address.district && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">District Supervisor</h3>
              </div>
              <div>
                <Label htmlFor="districtSupervisorId">District Supervisor *</Label>
                <Select
                  value={selectedDistrictSupervisor ? selectedDistrictSupervisor.toString() : ""}
                  onValueChange={(value) => {
                    const supervisorId = parseInt(value);
                    setSelectedDistrictSupervisor(supervisorId);
                    setValue("districtSupervisorId", supervisorId);
                  }}
                  disabled={supervisorsLoading || (user?.role === 'DISTRICT_SUPERVISOR')}
                >
                  <SelectTrigger data-testid="select-district-supervisor">
                    <SelectValue placeholder={
                      supervisorsLoading ? "Loading supervisors..." : 
                      user?.role === 'DISTRICT_SUPERVISOR' ? "Auto-assigned (You)" :
                      "Select District Supervisor"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {districtSupervisors.map((supervisor: any) => (
                      <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                        {supervisor.fullName || supervisor.username || `Leader ${supervisor.id}`}
                        {supervisor.id === user?.id && " (You)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {user?.role === 'DISTRICT_SUPERVISOR' && (
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    You are automatically assigned as the District Supervisor for your district
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Senapotis (Hierarchy Roles) */}
          {(isEditing || currentStep === 3) && selectedDistrictSupervisor && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Senapoti Hierarchy</h3>
                <p className="text-sm text-gray-600 ml-2">(Optional - create from top to bottom)</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderRoleSelect('MALA_SENAPOTI', 'malaSenapotiId', 'Mala Senapoti')}
                {renderRoleSelect('MAHA_CHAKRA_SENAPOTI', 'mahaChakraSenapotiId', 'Maha Chakra Senapoti')}
                {renderRoleSelect('CHAKRA_SENAPOTI', 'chakraSenapotiId', 'Chakra Senapoti')}
                {renderRoleSelect('UPA_CHAKRA_SENAPOTI', 'upaChakraSenapotiId', 'Upa Chakra Senapoti')}
              </div>
            </div>
          )}

          {/* Step 4: Other Leadership Positions */}
          {(isEditing || currentStep === 4) && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Other Leadership Positions</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderRoleSelect('SECRETARY', 'secretaryId', 'Secretary', true)}
                {renderRoleSelect('PRESIDENT', 'presidentId', 'President')}
                {renderRoleSelect('ACCOUNTANT', 'accountantId', 'Accountant')}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {!isEditing && (
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                data-testid="button-previous"
              >
                Previous
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  disabled={isNextButtonDisabled()}
                  onClick={() => {
                    // Additional validation checks (these should now be redundant due to disabled state)
                    if (currentStep === 0 && (!watch("name") || !watch("code"))) {
                      toast({
                        title: "Validation Error",
                        description: "Please fill in the required fields before proceeding",
                        variant: "destructive",
                      });
                      return;
                    }
                    if (currentStep === 1 && !address.district) {
                      toast({
                        title: "Validation Error", 
                        description: "Please complete the address information before proceeding",
                        variant: "destructive",
                      });
                      return;
                    }
                    if (currentStep === 2 && !selectedDistrictSupervisor) {
                      toast({
                        title: "Validation Error",
                        description: "Please select a District Supervisor before proceeding", 
                        variant: "destructive",
                      });
                      return;
                    }
                    setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
                  }}
                  data-testid="button-next"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Creating..." : "Create Namhatta"}
                </Button>
              )}
            </div>
          )}

          {/* Submit button for editing mode */}
          {isEditing && (
            <div className="flex justify-end pt-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Updating..." : "Update Namhatta"}
                </Button>
              </div>
            </div>
          )}
        </form>

        {/* Enhanced Devotee Form Modal */}
        {createDevoteeModal.isOpen && (
          <EnhancedDevoteeForm
            onClose={closeCreateDevoteeModal}
            onSuccess={handleDevoteeCreated}
            preAssignedRole={createDevoteeModal.role}
            reportingToDevoteeId={createDevoteeModal.reportingToDevoteeId}
            districtInfo={address.district ? {
              country: address.country,
              state: address.state, 
              district: address.district
            } : undefined}
            isModal={true}
            modalTitle={`Create New ${createDevoteeModal.role.replace('_', ' ')}`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}