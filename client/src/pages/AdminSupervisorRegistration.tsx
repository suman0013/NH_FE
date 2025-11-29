import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, UserPlus, Users, Shield, Edit, Trash2, Key, Power, PowerOff, ChevronDown, ChevronRight, Building2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
  districts: z.array(z.string()).optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface District {
  code: string;
  name: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  districts: string[];
  devoteeId?: number;
}

interface Senapati {
  id: number;
  legalName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  leadershipRole: string;
  hasSystemAccess: boolean;
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    isActive: boolean;
  } | null;
}

type UserType = 'OFFICE' | 'DISTRICT_SUPERVISOR' | 'MALA_SENAPOTI' | 'MAHA_CHAKRA_SENAPOTI' | 'CHAKRA_SENAPOTI' | 'UPA_CHAKRA_SENAPOTI';

const USER_TYPE_CONFIG: Record<UserType, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  'OFFICE': {
    label: 'Office Staff',
    description: 'Administrative staff with system access',
    icon: <Building2 className="h-5 w-5" />,
    color: 'from-blue-500 to-indigo-600'
  },
  'DISTRICT_SUPERVISOR': {
    label: 'District Supervisor',
    description: 'Supervisors managing namahattas in their districts',
    icon: <MapPin className="h-5 w-5" />,
    color: 'from-green-500 to-emerald-600'
  },
  'MALA_SENAPOTI': {
    label: 'Mala Senapoti',
    description: 'Spiritual leaders managing mala programs',
    icon: <Users className="h-5 w-5" />,
    color: 'from-purple-500 to-pink-600'
  },
  'MAHA_CHAKRA_SENAPOTI': {
    label: 'Maha Senapoti',
    description: 'Senior senapatis managing chakra senapotis',
    icon: <Users className="h-5 w-5" />,
    color: 'from-amber-500 to-orange-600'
  },
  'CHAKRA_SENAPOTI': {
    label: 'Chakra Senapoti',
    description: 'Senapatis managing upachakra senapotis',
    icon: <Users className="h-5 w-5" />,
    color: 'from-teal-500 to-cyan-600'
  },
  'UPA_CHAKRA_SENAPOTI': {
    label: 'Upachakra Senapoti',
    description: 'Local senapatis supporting namahatta activities',
    icon: <Users className="h-5 w-5" />,
    color: 'from-rose-500 to-red-600'
  }
};

export default function AdminSupervisorRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'OFFICE': true,
    'DISTRICT_SUPERVISOR': true,
    'MALA_SENAPOTI': false,
    'MAHA_CHAKRA_SENAPOTI': false,
    'CHAKRA_SENAPOTI': false,
    'UPA_CHAKRA_SENAPOTI': false
  });
  const [showRegistrationForm, setShowRegistrationForm] = useState<UserType | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changePasswordUser, setChangePasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      districts: []
    }
  });

  const { data: districts = [], isLoading: loadingDistricts } = useQuery({
    queryKey: ["/api/admin/available-districts"]
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"]
  });

  const { data: senapatis = [], isLoading: loadingSenapatis } = useQuery<Senapati[]>({
    queryKey: ["/api/admin/senapatis"]
  });

  const registerOfficeMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const res = await apiRequest("POST", "/api/admin/register-office", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Office user created successfully." });
      form.reset();
      setShowRegistrationForm(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Registration Failed", description: error.message || "Failed to create user", variant: "destructive" });
    }
  });

  const registerSupervisorMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const res = await apiRequest("POST", "/api/admin/register-supervisor", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "District supervisor created successfully." });
      form.reset();
      setShowRegistrationForm(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Registration Failed", description: error.message || "Failed to create user", variant: "destructive" });
    }
  });

  const editMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userData.id}`, userData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "User updated successfully." });
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Failed to update user", variant: "destructive" });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}`, { password });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Password changed successfully." });
      setChangePasswordUser(null);
      setNewPassword("");
      setConfirmNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/senapatis"] });
    },
    onError: (error: any) => {
      toast({ title: "Password Change Failed", description: error.message || "Failed to change password", variant: "destructive" });
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "User login disabled successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/senapatis"] });
    },
    onError: (error: any) => {
      toast({ title: "Deactivation Failed", description: error.message || "Failed to disable login", variant: "destructive" });
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/reactivate`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "User login enabled successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/senapatis"] });
    },
    onError: (error: any) => {
      toast({ title: "Reactivation Failed", description: error.message || "Failed to enable login", variant: "destructive" });
    }
  });

  const onSubmit = (data: RegistrationForm) => {
    if (showRegistrationForm === 'OFFICE') {
      registerOfficeMutation.mutate(data);
    } else if (showRegistrationForm === 'DISTRICT_SUPERVISOR') {
      registerSupervisorMutation.mutate(data);
    }
  };

  const toggleSection = (type: string) => {
    setExpandedSections(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const officeUsers = Array.isArray(users) ? users.filter((user: User) => user.role === 'OFFICE') : [];
  const districtSupervisors = Array.isArray(users) ? users.filter((user: User) => user.role === 'DISTRICT_SUPERVISOR' && !user.devoteeId) : [];

  const getSenapatisByRole = (role: string) => {
    return Array.isArray(senapatis) ? senapatis.filter((s: Senapati) => s.leadershipRole === role) : [];
  };

  if (loadingDistricts || loadingUsers || loadingSenapatis) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const renderUserCard = (user: User) => (
    <div
      key={user.id}
      data-testid={`user-card-${user.id}`}
      className="p-3 bg-accent/30 rounded-md hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{user.fullName}</h4>
            {!user.isActive && (
              <Badge variant="secondary" className="text-xs">Inactive</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          {user.districts && user.districts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Districts: {user.districts.join(", ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingUser(user)}
            data-testid={`button-edit-user-${user.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChangePasswordUser(user)}
            data-testid={`button-change-password-${user.id}`}
          >
            <Key className="h-4 w-4" />
          </Button>
          {user.isActive ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  data-testid={`button-disable-user-${user.id}`}
                >
                  <PowerOff className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disable Login</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to disable login for {user.fullName}? They will no longer be able to access the system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deactivateMutation.mutate(user.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disable Login
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-green-600 hover:text-green-600"
              onClick={() => reactivateMutation.mutate(user.id)}
              data-testid={`button-enable-user-${user.id}`}
            >
              <Power className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderSenapatiCard = (senapati: Senapati) => (
    <div
      key={senapati.id}
      data-testid={`senapati-card-${senapati.id}`}
      className="p-3 bg-accent/30 rounded-md hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{senapati.legalName}</h4>
            {senapati.user ? (
              senapati.user.isActive ? (
                <Badge variant="default" className="text-xs bg-green-600">Has Login</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Login Disabled</Badge>
              )
            ) : (
              <Badge variant="outline" className="text-xs">No Login</Badge>
            )}
          </div>
          {senapati.user && (
            <p className="text-xs text-muted-foreground truncate">@{senapati.user.username}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">{senapati.email || senapati.phone || "No contact info"}</p>
        </div>
        {senapati.user && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChangePasswordUser({
                id: senapati.user!.id,
                username: senapati.user!.username,
                fullName: senapati.user!.fullName,
                email: senapati.user!.email,
                role: 'DISTRICT_SUPERVISOR',
                isActive: senapati.user!.isActive,
                districts: []
              })}
              data-testid={`button-change-password-senapati-${senapati.id}`}
            >
              <Key className="h-4 w-4" />
            </Button>
            {senapati.user.isActive ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-disable-senapati-${senapati.id}`}
                  >
                    <PowerOff className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disable Login</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to disable login for {senapati.legalName}?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deactivateMutation.mutate(senapati.user!.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Disable Login
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="text-green-600 hover:text-green-600"
                onClick={() => reactivateMutation.mutate(senapati.user!.id)}
                data-testid={`button-enable-senapati-${senapati.id}`}
              >
                <Power className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderUserTypeSection = (type: UserType) => {
    const config = USER_TYPE_CONFIG[type];
    const isExpanded = expandedSections[type];
    
    let users: User[] | Senapati[] = [];
    let isSenapatiType = false;
    
    if (type === 'OFFICE') {
      users = officeUsers;
    } else if (type === 'DISTRICT_SUPERVISOR') {
      users = districtSupervisors;
    } else {
      users = getSenapatisByRole(type);
      isSenapatiType = true;
    }

    const canAddUser = type === 'OFFICE' || type === 'DISTRICT_SUPERVISOR';

    return (
      <Card key={type} className="glass-card" data-testid={`section-${type.toLowerCase()}`}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleSection(type)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${config.color} rounded-lg flex items-center justify-center text-white`}>
                    {config.icon}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {config.label}
                      <Badge variant="outline" className="ml-2">{users.length}</Badge>
                    </CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canAddUser && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRegistrationForm(type);
                      }}
                      data-testid={`button-add-${type.toLowerCase()}`}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  )}
                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No {config.label.toLowerCase()} registered yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {isSenapatiType
                    ? (users as Senapati[]).map(senapati => renderSenapatiCard(senapati))
                    : (users as User[]).map(user => renderUserCard(user))
                  }
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text" data-testid="text-page-title">Register User</h1>
          <p className="text-muted-foreground mt-1">
            Register and manage all senapatis and supervisors
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {(['OFFICE', 'DISTRICT_SUPERVISOR', 'MALA_SENAPOTI', 'MAHA_CHAKRA_SENAPOTI', 'CHAKRA_SENAPOTI', 'UPA_CHAKRA_SENAPOTI'] as UserType[]).map(type => 
          renderUserTypeSection(type)
        )}
      </div>

      {/* Registration Dialog */}
      <Dialog open={showRegistrationForm !== null} onOpenChange={() => setShowRegistrationForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {showRegistrationForm === 'OFFICE' ? 'Register Office Staff' : 'Register District Supervisor'}
            </DialogTitle>
            <DialogDescription>
              {showRegistrationForm === 'OFFICE'
                ? 'Create a new office staff account with system access'
                : 'Create a new district supervisor account with assigned districts'
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} data-testid="input-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} data-testid="input-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@namahatta.org" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm Password" {...field} data-testid="input-confirm-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showRegistrationForm === 'DISTRICT_SUPERVISOR' && (
                <FormField
                  control={form.control}
                  name="districts"
                  render={() => (
                    <FormItem>
                      <FormLabel>Assigned Districts</FormLabel>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 border rounded-md">
                        {Array.isArray(districts) && districts.map((district: District) => (
                          <FormField
                            key={district.code}
                            control={form.control}
                            name="districts"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(district.code)}
                                    onCheckedChange={(checked) => {
                                      const updatedValue = checked
                                        ? [...(field.value || []), district.code]
                                        : (field.value || []).filter(value => value !== district.code);
                                      field.onChange(updatedValue);
                                    }}
                                    data-testid={`checkbox-district-${district.code}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-normal cursor-pointer">
                                  {district.name}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRegistrationForm(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={registerOfficeMutation.isPending || registerSupervisorMutation.isPending}
                  data-testid="button-submit-registration"
                >
                  {(registerOfficeMutation.isPending || registerSupervisorMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Register
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                editMutation.mutate({
                  id: editingUser.id,
                  fullName: formData.get('fullName') as string,
                  email: formData.get('email') as string,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  name="fullName"
                  defaultValue={editingUser.fullName}
                  className="mt-1"
                  data-testid="input-edit-fullname"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editingUser.email}
                  className="mt-1"
                  data-testid="input-edit-email"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editMutation.isPending} data-testid="button-save-edit">
                  {editMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordUser !== null} onOpenChange={() => {
        setChangePasswordUser(null);
        setNewPassword("");
        setConfirmNewPassword("");
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {changePasswordUser?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                placeholder="Enter new password"
                data-testid="input-new-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="mt-1"
                placeholder="Confirm new password"
                data-testid="input-confirm-new-password"
              />
            </div>
            {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
              <p className="text-sm text-destructive">Passwords don't match</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setChangePasswordUser(null);
              setNewPassword("");
              setConfirmNewPassword("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newPassword && newPassword === confirmNewPassword && changePasswordUser) {
                  changePasswordMutation.mutate({ userId: changePasswordUser.id, password: newPassword });
                }
              }}
              disabled={!newPassword || newPassword !== confirmNewPassword || changePasswordMutation.isPending}
              data-testid="button-save-password"
            >
              {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
