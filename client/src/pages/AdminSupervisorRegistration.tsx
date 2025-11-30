import { useState, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Loader2, UserPlus, Users, Shield, Key, Lock, Unlock, 
  Building2, MapPin, Search, Eye, EyeOff, ChevronDown, ChevronLeft,
  Clock, Mail, Phone, User as UserIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";

const registrationSchema = z.object({
  username: z.string()
    .min(5, "Username must be at least 5 characters")
    .max(30, "Username must be less than 30 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
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

const senapotiRegistrationSchema = z.object({
  username: z.string()
    .min(5, "Username must be at least 5 characters")
    .max(30, "Username must be less than 30 characters"),
  password: z.string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type RegistrationForm = z.infer<typeof registrationSchema>;
type SenapotiRegistrationForm = z.infer<typeof senapotiRegistrationSchema>;

interface District {
  code: string;
  name: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  lastLogin?: string | null;
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
}

type UserType = 'OFFICE' | 'DISTRICT_SUPERVISOR' | 'SENAPOTI';

const USER_TYPE_CONFIG: Record<UserType, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  'OFFICE': {
    label: 'Office Staff',
    description: 'Administrative staff with full system access',
    icon: <Building2 className="h-5 w-5" />,
    color: 'from-blue-500 to-indigo-600'
  },
  'DISTRICT_SUPERVISOR': {
    label: 'District Supervisor',
    description: 'Supervisors managing namahattas in their districts',
    icon: <MapPin className="h-5 w-5" />,
    color: 'from-green-500 to-emerald-600'
  },
  'SENAPOTI': {
    label: 'Senapoti',
    description: 'Spiritual leaders with leadership roles',
    icon: <Users className="h-5 w-5" />,
    color: 'from-purple-500 to-pink-600'
  }
};

const ROLE_LABELS: Record<string, string> = {
  'ADMIN': 'Admin',
  'OFFICE': 'Office Staff',
  'DISTRICT_SUPERVISOR': 'District Supervisor',
  'MALA_SENAPOTI': 'Mala Senapoti',
  'MAHA_CHAKRA_SENAPOTI': 'Maha Senapoti',
  'CHAKRA_SENAPOTI': 'Chakra Senapoti',
  'UPA_CHAKRA_SENAPOTI': 'Upachakra Senapoti'
};

// Debounce hook for async validation
function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  });
  
  return debouncedValue;
}

export default function AdminSupervisorRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registerUserType, setRegisterUserType] = useState<UserType | null>(null);
  const [selectedSenapoti, setSelectedSenapoti] = useState<Senapati | null>(null);
  const [selectedSenapotiType, setSelectedSenapotiType] = useState<string>("");
  const [senapotiSearchQuery, setSenapotiSearchQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // Debounce timers for username validation
  const usernameCheckTimerRef = useRef<NodeJS.Timeout>();
  const senapotiUsernameCheckTimerRef = useRef<NodeJS.Timeout>();
  
  // Async username validator with debouncing
  const validateUsernameUnique = useCallback(async (username: string) => {
    if (username.length < 5) return true; // Skip validation if too short
    
    try {
      const res = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const result = await res.json();
      return result.available ? true : "Username already taken";
    } catch {
      return true; // Allow on error
    }
  }, []);

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      districts: []
    },
    mode: "onBlur"
  });

  const senapotiForm = useForm<SenapotiRegistrationForm>({
    resolver: zodResolver(senapotiRegistrationSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: ""
    },
    mode: "onBlur"
  });

  const { data: districts = [], isLoading: loadingDistricts } = useQuery({
    queryKey: ["/api/admin/available-districts"]
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"]
  });

  const { data: senapotisWithoutLogin = [], isLoading: loadingSenapotis } = useQuery<Senapati[]>({
    queryKey: ["/api/admin/senapatis-without-login"]
  });

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users
      .filter((user: User) => user.role !== 'ADMIN')
      .filter((user: User) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          user.fullName?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query) ||
          user.role?.toLowerCase().includes(query)
        );
      });
  }, [users, searchQuery]);

  const filteredSenapotis = useMemo(() => {
    if (!Array.isArray(senapotisWithoutLogin)) return [];
    return senapotisWithoutLogin.filter((senapoti: Senapati) => {
      // Filter by selected type first
      if (selectedSenapotiType && senapoti.leadershipRole !== selectedSenapotiType) {
        return false;
      }
      // Then filter by search query
      if (!senapotiSearchQuery) return true;
      const query = senapotiSearchQuery.toLowerCase();
      return (
        senapoti.legalName?.toLowerCase().includes(query) ||
        senapoti.name?.toLowerCase().includes(query) ||
        senapoti.email?.toLowerCase().includes(query) ||
        senapoti.phone?.toLowerCase().includes(query) ||
        senapoti.leadershipRole?.toLowerCase().includes(query)
      );
    });
  }, [senapotisWithoutLogin, senapotiSearchQuery, selectedSenapotiType]);

  const registerOfficeMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const res = await apiRequest("POST", "/api/admin/register-office", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Office user created successfully." });
      form.reset();
      setShowRegisterDialog(false);
      setRegisterUserType(null);
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
      toast({ title: "Success", description: "District supervisor created successfully." });
      form.reset();
      setShowRegisterDialog(false);
      setRegisterUserType(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Registration Failed", description: error.message || "Failed to create user", variant: "destructive" });
    }
  });

  const registerSenapotiMutation = useMutation({
    mutationFn: async (data: { devoteeId: number; username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/senapati-user", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Senapoti login created successfully." });
      senapotiForm.reset();
      setSelectedSenapoti(null);
      setShowRegisterDialog(false);
      setRegisterUserType(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/senapatis-without-login"] });
    },
    onError: (error: any) => {
      toast({ title: "Registration Failed", description: error.message || "Failed to create senapoti login", variant: "destructive" });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}`, { password });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password changed successfully." });
      setShowPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword("");
      setConfirmNewPassword("");
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
      toast({ title: "Success", description: "User login disabled successfully." });
      setShowUserDialog(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
      toast({ title: "Success", description: "User login enabled successfully." });
      setShowUserDialog(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Reactivation Failed", description: error.message || "Failed to enable login", variant: "destructive" });
    }
  });

  const onSubmit = (data: RegistrationForm) => {
    if (registerUserType === 'OFFICE') {
      registerOfficeMutation.mutate(data);
    } else if (registerUserType === 'DISTRICT_SUPERVISOR') {
      registerSupervisorMutation.mutate(data);
    }
  };

  const onSenapotiSubmit = (data: SenapotiRegistrationForm) => {
    if (selectedSenapoti) {
      registerSenapotiMutation.mutate({
        devoteeId: selectedSenapoti.id,
        username: data.username,
        password: data.password
      });
    }
  };

  const handleChangePassword = () => {
    if (!selectedUser) return;
    if (newPassword.length < 10) {
      toast({ title: "Error", description: "Password must be at least 10 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ userId: selectedUser.id, password: newPassword });
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleOpenPasswordDialog = () => {
    setShowUserDialog(false);
    setShowPasswordDialog(true);
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OFFICE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'DISTRICT_SUPERVISOR': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      default: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
    }
  };

  const formatLastLogin = (lastLogin?: string | null) => {
    if (!lastLogin) return "Never";
    try {
      const date = new Date(lastLogin);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Never";
    }
  };

  if (loadingDistricts || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text" data-testid="text-page-title">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <Button
          onClick={() => setShowRegisterDialog(true)}
          data-testid="button-register-new-user"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Register New User
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users
                <Badge variant="outline" className="ml-2">{filteredUsers.length}</Badge>
              </CardTitle>
              <CardDescription>Click on a user to manage their account</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      data-testid={`row-user-${user.id}`}
                      className="group"
                    >
                      <TableCell className="font-mono text-sm">{user.id}</TableCell>
                      <TableCell 
                        className="cursor-pointer hover:bg-accent/30"
                        onClick={() => handleUserClick(user)}
                      >
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRoleBadgeColor(user.role)} no-default-hover-elevate no-default-active-elevate`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="default" className="bg-green-600 no-default-hover-elevate no-default-active-elevate">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">{user.phone || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastLogin(user.lastLogin)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPasswordDialog(true);
                              setNewPassword("");
                              setConfirmNewPassword("");
                            }}
                            data-testid={`button-change-password-${user.id}`}
                            title="Change Password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          {user.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                deactivateMutation.mutate(user.id);
                              }}
                              disabled={deactivateMutation.isPending}
                              data-testid={`button-disable-login-${user.id}`}
                              title="Disable Login"
                              className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950"
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                reactivateMutation.mutate(user.id);
                              }}
                              disabled={reactivateMutation.isPending}
                              data-testid={`button-enable-login-${user.id}`}
                              title="Enable Login"
                              className="text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950"
                            >
                              <Unlock className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Action Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              User Actions
            </DialogTitle>
            <DialogDescription>
              Manage account for {selectedUser?.fullName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-accent/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Username:</span>
                  <span className="font-medium">@{selectedUser.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedUser.email}</span>
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Last login: {formatLastLogin(selectedUser.lastLogin)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getRoleBadgeColor(selectedUser.role)} no-default-hover-elevate no-default-active-elevate`}>
                    {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                  </Badge>
                  {selectedUser.isActive ? (
                    <Badge variant="default" className="bg-green-600 no-default-hover-elevate no-default-active-elevate">Enabled</Badge>
                  ) : (
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">Disabled</Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenPasswordDialog}
                  className="w-full justify-start"
                  data-testid="button-change-password"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                
                {selectedUser.isActive ? (
                  <Button
                    variant="destructive"
                    onClick={() => deactivateMutation.mutate(selectedUser.id)}
                    disabled={deactivateMutation.isPending}
                    className="w-full justify-start"
                    data-testid="button-disable-login"
                  >
                    {deactivateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Disable Login
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => reactivateMutation.mutate(selectedUser.id)}
                    disabled={reactivateMutation.isPending}
                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                    data-testid="button-enable-login"
                  >
                    {reactivateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unlock className="h-4 w-4 mr-2" />
                    )}
                    Enable Login
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.fullName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  data-testid="input-confirm-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              data-testid="button-submit-password"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register New User Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={(open) => {
        setShowRegisterDialog(open);
        if (!open) {
          setRegisterUserType(null);
          setSelectedSenapoti(null);
          setSenapotiSearchQuery("");
          form.reset();
          senapotiForm.reset();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Register New User
            </DialogTitle>
            <DialogDescription>
              {!registerUserType 
                ? "Select the type of user you want to register"
                : registerUserType === 'SENAPOTI' && !selectedSenapoti
                  ? "Select a senapoti to create login for"
                  : `Fill in the details to create a new ${USER_TYPE_CONFIG[registerUserType].label} account`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Select User Type */}
          {!registerUserType && (
            <div className="grid grid-cols-1 gap-3">
              {(['OFFICE', 'DISTRICT_SUPERVISOR', 'SENAPOTI'] as UserType[])
                .filter((type) => {
                  // Office users can only register district supervisors and senapotis
                  if (user?.role === 'OFFICE' && type === 'OFFICE') {
                    return false;
                  }
                  return true;
                })
                .map((type) => {
                const config = USER_TYPE_CONFIG[type];
                return (
                  <Card 
                    key={type}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setRegisterUserType(type)}
                    data-testid={`card-select-${type.toLowerCase()}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${config.color} rounded-lg flex items-center justify-center text-white`}>
                          {config.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{config.label}</h4>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        </div>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Step 2a: Select Senapoti Type & Senapoti (for SENAPOTI type) */}
          {registerUserType === 'SENAPOTI' && !selectedSenapoti && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setRegisterUserType(null)}
                className="mb-2 px-2"
                title="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="space-y-3 border rounded-lg p-4 bg-accent/20">
                <h4 className="font-medium">Select Senapoti Type</h4>
                <div className="space-y-2">
                  {["MALA_SENAPOTI", "MAHA_CHAKRA_SENAPOTI", "CHAKRA_SENAPOTI", "UPA_CHAKRA_SENAPOTI"].map((type) => (
                    <label key={type} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="senapoti-type"
                        value={type}
                        checked={selectedSenapotiType === type}
                        onChange={(e) => setSelectedSenapotiType(e.target.value)}
                        data-testid={`radio-senapoti-type-${type}`}
                      />
                      <span className="text-sm">{ROLE_LABELS[type] || type}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search senapotis..."
                  value={senapotiSearchQuery}
                  onChange={(e) => setSenapotiSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-senapotis"
                />
              </div>

              <ScrollArea className="h-[300px] rounded-md border">
                {loadingSenapotis ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredSenapotis.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No senapotis without login found
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {filteredSenapotis.map((senapoti) => (
                      <Card
                        key={senapoti.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setSelectedSenapoti(senapoti)}
                        data-testid={`card-senapoti-${senapoti.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{senapoti.legalName}</p>
                              <p className="text-sm text-muted-foreground">
                                {ROLE_LABELS[senapoti.leadershipRole] || senapoti.leadershipRole}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {senapoti.email || senapoti.phone || "No contact info"}
                              </p>
                            </div>
                            <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Step 2b: Senapoti Registration Form */}
          {registerUserType === 'SENAPOTI' && selectedSenapoti && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedSenapoti(null)}
                className="mb-2 px-2"
                title="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="bg-accent/30 rounded-lg p-4 space-y-1">
                <p className="font-medium">{selectedSenapoti.legalName}</p>
                <p className="text-sm text-muted-foreground">
                  {ROLE_LABELS[selectedSenapoti.leadershipRole] || selectedSenapoti.leadershipRole}
                </p>
                {selectedSenapoti.email && (
                  <p className="text-xs text-muted-foreground">{selectedSenapoti.email}</p>
                )}
              </div>

              <Form {...senapotiForm}>
                <form onSubmit={senapotiForm.handleSubmit(onSenapotiSubmit)} className="space-y-4">
                  <FormField
                    control={senapotiForm.control}
                    name="username"
                    rules={{
                      validate: async (value) => {
                        if (!value || value.length < 5) return true;
                        try {
                          const res = await fetch('/api/auth/check-username', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: value })
                          });
                          const result = await res.json();
                          return result.available || "Username already taken";
                        } catch {
                          return true;
                        }
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="username" 
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              setTimeout(() => senapotiForm.trigger("username"), 100);
                            }}
                            data-testid="input-senapoti-username" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={senapotiForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Enter password" 
                              {...field} 
                              data-testid="input-senapoti-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={senapotiForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="Confirm password" 
                              {...field}
                              data-testid="input-senapoti-confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowRegisterDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={registerSenapotiMutation.isPending}
                      data-testid="button-create-senapoti-login"
                    >
                      {registerSenapotiMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Login
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}

          {/* Step 2c: Office/Supervisor Registration Form */}
          {(registerUserType === 'OFFICE' || registerUserType === 'DISTRICT_SUPERVISOR') && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setRegisterUserType(null)}
                className="mb-2"
              >
                Back
              </Button>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    rules={{
                      validate: async (value) => {
                        if (!value || value.length < 5) return true;
                        try {
                          const res = await fetch('/api/auth/check-username', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: value })
                          });
                          const result = await res.json();
                          return result.available || "Username already taken";
                        } catch {
                          return true;
                        }
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="username" 
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              setTimeout(() => form.trigger("username"), 100);
                            }}
                            data-testid="input-username" 
                          />
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
                          <Input type="email" placeholder="email@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} data-testid="input-phone" />
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
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Enter password" 
                              {...field} 
                              data-testid="input-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
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
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="Confirm password" 
                              {...field}
                              data-testid="input-confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {registerUserType === 'DISTRICT_SUPERVISOR' && Array.isArray(districts) && districts.length > 0 && (
                    <FormField
                      control={form.control}
                      name="districts"
                      render={() => (
                        <FormItem>
                          <FormLabel>Assigned Districts</FormLabel>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                            {(districts as District[]).map((district) => (
                              <FormField
                                key={district.code}
                                control={form.control}
                                name="districts"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(district.code)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([...current, district.code]);
                                          } else {
                                            field.onChange(current.filter((d: string) => d !== district.code));
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <span className="text-sm">{district.name}</span>
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
                    <Button type="button" variant="outline" onClick={() => setShowRegisterDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={registerOfficeMutation.isPending || registerSupervisorMutation.isPending}
                      data-testid="button-create-user"
                    >
                      {(registerOfficeMutation.isPending || registerSupervisorMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create User
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
