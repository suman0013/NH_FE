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
import type { Namahatta, Address, Devotee } from "@/lib/types";
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

interface NamahattaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  namahatta?: Namahatta;
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

export default function NamahattaForm({
  isOpen,
  onClose,
  onSuccess,
  namahatta,
}: NamahattaFormProps) {
  const isEditing = !!namahatta;
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
        districtSupervisorId: z.number().nullable(),
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

  // Dynamic queries for senapoti types based on hierarchy
  const { data: malaSenapotis = [], isLoading: malaSenapotisLoading } = useQuery({
    queryKey: ["/api/senapoti/MALA_SENAPOTI", selectedDistrictSupervisor],
    enabled: !!selectedDistrictSupervisor,
    queryFn: async () => {
      const response = await fetch(`/api/senapoti/MALA_SENAPOTI/${selectedDistrictSupervisor}`);
      if (!response.ok) throw new Error('Failed to fetch Mala Senapotis');
      return response.json();
    }
  });

  const selectedMalaSenapoti = watch('malaSenapotiId');
  const { data: mahaChakraSenapotis = [], isLoading: mahaChakraSenapotisLoading } = useQuery({
    queryKey: ["/api/senapoti/MAHA_CHAKRA_SENAPOTI", selectedMalaSenapoti],
    enabled: !!selectedMalaSenapoti,
    queryFn: async () => {
      const response = await fetch(`/api/senapoti/MAHA_CHAKRA_SENAPOTI/${selectedMalaSenapoti}`);
      if (!response.ok) throw new Error('Failed to fetch Maha Chakra Senapotis');
      return response.json();
    }
  });

  const selectedMahaChakraSenapoti = watch('mahaChakraSenapotiId');
  const { data: chakraSenapotis = [], isLoading: chakraSenapotisLoading } = useQuery({
    queryKey: ["/api/senapoti/CHAKRA_SENAPOTI", selectedMahaChakraSenapoti],
    enabled: !!selectedMahaChakraSenapoti,
    queryFn: async () => {
      const response = await fetch(`/api/senapoti/CHAKRA_SENAPOTI/${selectedMahaChakraSenapoti}`);
      if (!response.ok) throw new Error('Failed to fetch Chakra Senapotis');
      return response.json();
    }
  });

  const selectedChakraSenapoti = watch('chakraSenapotiId');
  const { data: upaChakraSenapotis = [], isLoading: upaChakraSenapotisLoading } = useQuery({
    queryKey: ["/api/senapoti/UPA_CHAKRA_SENAPOTI", selectedChakraSenapoti],
    enabled: !!selectedChakraSenapoti,
    queryFn: async () => {
      const response = await fetch(`/api/senapoti/UPA_CHAKRA_SENAPOTI/${selectedChakraSenapoti}`);
      if (!response.ok) throw new Error('Failed to fetch Upa Chakra Senapotis');
      return response.json();
    }
  });

  // Query available devotees for officer positions (Secretary, President, Accountant)
  // Only call this API when user reaches step 4 (Other Leadership Positions) or when editing
  const { data: availableOfficerDevotees = [], isLoading: availableOfficersLoading } = useQuery({
    queryKey: ["/api/devotees/available-officers"],
    queryFn: async () => {
      const response = await fetch('/api/devotees/available-officers');
      if (!response.ok) throw new Error('Failed to fetch available officers');
      return response.json();
    },
    enabled: isEditing || currentStep === 4 // Only call when in editing mode or on step 4 (Other Positions)
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
        const supervisorId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
        setSelectedDistrictSupervisor(supervisorId);
        setValue("districtSupervisorId", supervisorId, { shouldValidate: true });
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
        const response = await fetch(`/api/namahattas/check-code/${encodeURIComponent(currentCode.toUpperCase())}`);
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
    // or if we're editing an existing namahatta or if no district is selected
    if (user?.role === 'DISTRICT_SUPERVISOR' || isEditing || !address.district || !districtSupervisors.length) {
      return;
    }

    // If there's only one district supervisor, auto-select them
    if (districtSupervisors.length === 1) {
      const supervisor = districtSupervisors[0];
      const supervisorId = typeof supervisor.id === 'string' ? parseInt(supervisor.id) : supervisor.id;
      setSelectedDistrictSupervisor(supervisorId);
      setValue("districtSupervisorId", supervisorId, { shouldValidate: true });
    } else if (districtSupervisors.length > 1) {
      // If there are multiple, try to find the default supervisor, otherwise select the first one
      const defaultSupervisor = districtSupervisors.find(s => s.isDefault) || districtSupervisors[0];
      const supervisorId = typeof defaultSupervisor.id === 'string' ? parseInt(defaultSupervisor.id) : defaultSupervisor.id;
      setSelectedDistrictSupervisor(supervisorId);
      setValue("districtSupervisorId", supervisorId, { shouldValidate: true });
    }
  }, [districtSupervisors, address.district, user?.role, isEditing, setValue]);

  // Clear senapoti hierarchy when district supervisor changes
  useEffect(() => {
    if (!isEditing && selectedDistrictSupervisor) {
      // Clear all senapoti selections when district supervisor changes
      setValue('malaSenapotiId', null);
      setValue('mahaChakraSenapotiId', null);
      setValue('chakraSenapotiId', null);
      setValue('upaChakraSenapotiId', null);
    }
  }, [selectedDistrictSupervisor, isEditing, setValue]);

  // Initialize form with existing namahatta data
  useEffect(() => {
    if (namahatta && isEditing) {
      reset({
        name: namahatta.name || "",
        code: namahatta.code || "",
        meetingDay: namahatta.meetingDay || "",
        meetingTime: namahatta.meetingTime || "",
        malaSenapotiId: namahatta.malaSenapotiId || null,
        mahaChakraSenapotiId: namahatta.mahaChakraSenapotiId || null,
        chakraSenapotiId: namahatta.chakraSenapotiId || null,
        upaChakraSenapotiId: namahatta.upaChakraSenapotiId || null,
        secretaryId: namahatta.secretaryId || null,
        presidentId: namahatta.presidentId || null,
        accountantId: namahatta.accountantId || null,
        districtSupervisorId: namahatta.districtSupervisorId || null,
      });

      // For existing namahattas, try to load address information if available
      // This prevents data loss when editing existing namahattas
      if (namahatta.address) {
        setAddress({
          country: namahatta.address.country || "",
          state: namahatta.address.state || "",
          district: namahatta.address.district || "",
          subDistrict: namahatta.address.subDistrict || "",
          village: namahatta.address.village || "",
          postalCode: namahatta.address.postalCode || "",
        });
      }

      if (namahatta.districtSupervisorId) {
        setSelectedDistrictSupervisor(namahatta.districtSupervisorId);
      }
    }
  }, [namahatta, isEditing, reset]);

  // Handle address changes
  const handleAddressChange = (field: keyof Address, value: string) => {
    console.log("Namahatta address change:", field, "->", value, "New address:", { ...address, [field]: value });
    setAddress(prev => ({ ...prev, [field]: value }));
    
    // Reset district supervisor selection when district changes
    if (field === 'district' && user?.role !== 'DISTRICT_SUPERVISOR') {
      setSelectedDistrictSupervisor(null);
      setValue("districtSupervisorId", null);
      // Clear all senapoti selections when district changes
      setValue('malaSenapotiId', null);
      setValue('mahaChakraSenapotiId', null);
      setValue('chakraSenapotiId', null);
      setValue('upaChakraSenapotiId', null);
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
    // Refresh appropriate devotee lists based on role
    const devoteeRole = createDevoteeModal.role;
    
    // Invalidate ALL senapoti queries to ensure fresh data from all levels
    queryClient.invalidateQueries({ queryKey: ["/api/senapoti/MALA_SENAPOTI"] });
    queryClient.invalidateQueries({ queryKey: ["/api/senapoti/MAHA_CHAKRA_SENAPOTI"] });
    queryClient.invalidateQueries({ queryKey: ["/api/senapoti/CHAKRA_SENAPOTI"] });
    queryClient.invalidateQueries({ queryKey: ["/api/senapoti/UPA_CHAKRA_SENAPOTI"] });
    
    // Invalidate available officers list so dropdown updates with newly created devotee
    queryClient.invalidateQueries({ queryKey: ["/api/devotees/available-officers"] });
    
    // Auto-assign the newly created devotee to the appropriate role
    const fieldMap: Record<typeof devoteeRole, keyof FormData> = {
      'MALA_SENAPOTI': 'malaSenapotiId',
      'MAHA_CHAKRA_SENAPOTI': 'mahaChakraSenapotiId', 
      'CHAKRA_SENAPOTI': 'chakraSenapotiId',
      'UPA_CHAKRA_SENAPOTI': 'upaChakraSenapotiId',
      'SECRETARY': 'secretaryId',
      'PRESIDENT': 'presidentId',
      'ACCOUNTANT': 'accountantId'
    };

    const fieldName = fieldMap[devoteeRole];
    if (fieldName) {
      // Add a small delay to ensure cache invalidation is processed before setting value
      setTimeout(() => {
        setValue(fieldName, newDevotee.id, { shouldValidate: true });
      }, 100);
    }

    toast({
      title: "Success",
      description: `${devoteeRole.replace('_', ' ').toLowerCase()} created and assigned successfully`,
    });

    closeCreateDevoteeModal();
  };

  // Helper function to get devotees based on specific role using dynamic data
  // For officer positions, filter out already selected officers to prevent duplicate assignments
  const getDevoteesByRole = (specificRole: string, excludeCurrentField?: string) => {
    switch (specificRole) {
      case 'MALA_SENAPOTI':
        return malaSenapotis;
      case 'MAHA_CHAKRA_SENAPOTI':
        return mahaChakraSenapotis;
      case 'CHAKRA_SENAPOTI':
        return chakraSenapotis;
      case 'UPA_CHAKRA_SENAPOTI':
        return upaChakraSenapotis;
      default:
        // For other leadership roles (Secretary, President, Accountant)
        let devotees = [...availableOfficerDevotees];
        
        // In editing mode, merge currently selected officers into the list
        // This ensures that currently assigned officers appear in the dropdown even if they're not "available"
        if (isEditing && namahatta) {
          const currentOfficers = [
            namahatta.secretaryId && { field: 'secretaryId', devotee: { id: namahatta.secretaryId, legalName: namahatta.secretary || 'Unknown', initiatedName: '' }},
            namahatta.presidentId && { field: 'presidentId', devotee: { id: namahatta.presidentId, legalName: namahatta.president || 'Unknown', initiatedName: '' }},
            namahatta.accountantId && { field: 'accountantId', devotee: { id: namahatta.accountantId, legalName: namahatta.accountant || 'Unknown', initiatedName: '' }}
          ].filter(Boolean);
          
          // Add missing current officers to the list
          currentOfficers.forEach(officer => {
            if (officer && !devotees.find(d => d.id === officer.devotee.id)) {
              devotees.push(officer.devotee);
            }
          });
        }
        
        // Filter out devotees that are already selected in other officer positions
        const currentSecretaryId = watch('secretaryId');
        const currentPresidentId = watch('presidentId');
        const currentAccountantId = watch('accountantId');
        
        const selectedOfficerIds = new Set();
        if (excludeCurrentField !== 'secretaryId' && currentSecretaryId) selectedOfficerIds.add(currentSecretaryId);
        if (excludeCurrentField !== 'presidentId' && currentPresidentId) selectedOfficerIds.add(currentPresidentId);
        if (excludeCurrentField !== 'accountantId' && currentAccountantId) selectedOfficerIds.add(currentAccountantId);
        
        return devotees.filter((devotee: any) => 
          !selectedOfficerIds.has(devotee.id)
        );
    }
  };

  // Helper function to check if devotees are loading for a specific role
  const isRoleLoading = (specificRole: string) => {
    switch (specificRole) {
      case 'MALA_SENAPOTI':
        return malaSenapotisLoading;
      case 'MAHA_CHAKRA_SENAPOTI':
        return mahaChakraSenapotisLoading;
      case 'CHAKRA_SENAPOTI':
        return chakraSenapotisLoading;
      case 'UPA_CHAKRA_SENAPOTI':
        return upaChakraSenapotisLoading;
      default:
        return availableOfficersLoading;
    }
  };

  // Helper function to check if a senapoti role should be disabled based on hierarchy
  const isRoleDisabled = (specificRole: string) => {
    // Mala Senapoti is always enabled
    if (specificRole === 'MALA_SENAPOTI') return false;
    
    // Get currently selected values
    const malaSelected = watch('malaSenapotiId');
    const mahaSelected = watch('mahaChakraSenapotiId');
    const chakraSelected = watch('chakraSenapotiId');
    
    // Each level requires the previous level to be selected
    switch (specificRole) {
      case 'MAHA_CHAKRA_SENAPOTI':
        return !malaSelected; // Disabled if Mala Senapoti not selected
      case 'CHAKRA_SENAPOTI':
        return !mahaSelected; // Disabled if Maha Chakra Senapoti not selected
      case 'UPA_CHAKRA_SENAPOTI':
        return !chakraSelected; // Disabled if Chakra Senapoti not selected
      default:
        return false;
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
    const devotee = malaSenapotis.find((d: any) => d.id === devoteeId);
    if (devotee?.presentAddress && address.district) {
      const devoteeDistrict = devotee.presentAddress.district;
      if (devoteeDistrict !== address.district) {
        const proceed = window.confirm(
          `District Mismatch: This Mala Senapoti is from ${devoteeDistrict} district, but the Namahatta is in ${address.district} district. Are you sure you want to assign them?`
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
      return apiRequest("POST", "/api/namahattas", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/namahattas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Namahatta created successfully",
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create namahatta",
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
      return apiRequest("PUT", `/api/namahattas/${namahatta!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/namahattas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Namahatta updated successfully",
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update namahatta",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Form submission started with data:", data);
    console.log("Address:", address);
    console.log("Selected district supervisor:", selectedDistrictSupervisor);
    console.log("Form errors:", errors);

    // Validate address completion
    if (!address.country || !address.state || !address.district) {
      console.log("Address validation failed");
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
      console.log("District supervisor validation failed");
      toast({
        title: "Validation Error",
        description: "Please select a District Supervisor",
        variant: "destructive",
      });
      return;
    }

    // Validate required Secretary selection  
    if (!data.secretaryId) {
      console.log("Secretary validation failed");
      toast({
        title: "Validation Error",
        description: "Please select a Secretary - this role is required",
        variant: "destructive",
      });
      return;
    }

    console.log("All validations passed, submitting...");
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
    const filteredDevotees = getDevoteesByRole(role, fieldName.toString());

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex gap-2">
          <Select
            value={currentValue?.toString() || ""}
            onValueChange={(value) => {
              // Validate district match for Mala Senapoti BEFORE setting value
              if (role === 'MALA_SENAPOTI' && value && value !== "none") {
                if (!validateMalaSenapotiDistrict(parseInt(value))) {
                  return; // Don't set the value if validation fails
                }
              }
              
              const numericValue = value && value !== "none" ? parseInt(value) : null;
              setValue(fieldName, numericValue, { shouldValidate: true });
              
              // Cascade clearing: Clear dependent senapoti selections when parent changes
              if (role === 'MALA_SENAPOTI') {
                setValue('mahaChakraSenapotiId', null);
                setValue('chakraSenapotiId', null);
                setValue('upaChakraSenapotiId', null);
              } else if (role === 'MAHA_CHAKRA_SENAPOTI') {
                setValue('chakraSenapotiId', null);
                setValue('upaChakraSenapotiId', null);
              } else if (role === 'CHAKRA_SENAPOTI') {
                setValue('upaChakraSenapotiId', null);
              }
            }}
            disabled={isRoleLoading(role) || isRoleDisabled(role)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={isRoleLoading(role) ? "Loading..." : `Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {filteredDevotees.map((devotee: any) => (
                <SelectItem key={devotee.id} value={devotee.id.toString()}>
                  {devotee.initiatedName ? `${devotee.legalName}::${devotee.initiatedName}` : devotee.legalName}
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
            disabled={isRoleDisabled(role)}
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
          <DialogTitle>{isEditing ? "Edit Namahatta" : "Add New Namahatta"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update Namahatta information" : "Create a new Namahatta center following the step-by-step workflow"}
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
                  <Label htmlFor="name">Namahatta Name *</Label>
                  <Input
                    {...register("name", { required: "Name is required" })}
                    placeholder="Enter namahatta name"
                    data-testid="input-name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="code">Namahatta Code *</Label>
                  <div className="relative">
                    <Input
                      {...register("code", { 
                        required: "Code is required",
                        setValueAs: (value) => value?.toUpperCase()?.trim() || ""
                      })}
                      placeholder="Enter namahatta code"
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
                title="Namahatta Address"
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
                    setValue("districtSupervisorId", supervisorId, { shouldValidate: true });
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
                  onClick={() => {
                    console.log("Create Namahatta button clicked!");
                    console.log("Form errors:", errors);
                    console.log("Form values:", watch());
                    console.log("Address:", address);
                    console.log("District supervisor:", selectedDistrictSupervisor);
                  }}
                >
                  {isLoading ? "Creating..." : "Create Namahatta"}
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
                  {isLoading ? "Updating..." : "Update Namahatta"}
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