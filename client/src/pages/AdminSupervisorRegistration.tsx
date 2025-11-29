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
import { Loader2, UserPlus, Users, Shield, Edit, Trash2, MapPin } from "lucide-react";
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

// Registration form schema
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
  districts: z.array(z.string()).min(1, "At least one district must be selected")
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
}

export default function AdminSupervisorRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

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

  // Fetch available districts
  const { data: districts = [], isLoading: loadingDistricts } = useQuery({
    queryKey: ["/api/admin/available-districts"]
  });

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"]
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const res = await apiRequest("POST", "/api/admin/register-supervisor", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success!",
        description: `User ${data.supervisor.fullName} has been created successfully.`
      });
      form.reset();
      setShowRegistrationForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: RegistrationForm) => {
    registerMutation.mutate(data);
  };

  const districtSupervisors = Array.isArray(users) ? users.filter((user: User) => user.role === 'DISTRICT_SUPERVISOR') : [];
  
  // Group supervisors by district
  const groupedByDistrict = React.useMemo(() => {
    const groups: Record<string, { district: District | null; supervisors: User[] }> = {};
    
    districtSupervisors.forEach((user: User) => {
      user.districts?.forEach((districtCode: string) => {
        const district = Array.isArray(districts) ? districts.find((d: District) => d.code === districtCode) : null;
        // Include even if district not found, showing the code
        if (!groups[districtCode]) {
          groups[districtCode] = { 
            district: district || { code: districtCode, name: districtCode }, 
            supervisors: [] 
          };
        }
        groups[districtCode].supervisors.push(user);
      });
    });
    
    return Object.values(groups).sort((a, b) => {
      const aName = a.district?.name || a.district?.code || '';
      const bName = b.district?.name || b.district?.code || '';
      return aName.localeCompare(bName);
    });
  }, [districtSupervisors, districts]);
  
  // Edit supervisor mutation
  const editMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userData.id}`, userData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "User updated successfully."
      });
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user",
        variant: "destructive"
      });
    }
  });
  
  // Delete supervisor mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "User deactivated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Deactivation Failed",
        description: error.message || "Failed to deactivate user",
        variant: "destructive"
      });
    }
  });

  if (loadingDistricts || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Register User</h1>
          <p className="text-muted-foreground mt-1">
            Register and manage all senapatis and district supervisors
          </p>
        </div>
        <Button
          onClick={() => setShowRegistrationForm(!showRegistrationForm)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {showRegistrationForm ? "Cancel" : "Register New User"}
        </Button>
      </div>

      {/* Registration Form */}
      {showRegistrationForm && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Register New User
            </CardTitle>
            <CardDescription>
              Create a new senapati or supervisor account with assigned districts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="supervisor_username" {...field} />
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
                          <Input placeholder="Full Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="supervisor@namhatta.org" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Password" {...field} />
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
                          <Input type="password" placeholder="Confirm Password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="districts"
                  render={() => (
                    <FormItem>
                      <FormLabel>Assigned Districts</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-4 border rounded-md">
                        {Array.isArray(districts) && districts.map((district: District) => (
                          <FormField
                            key={district.code}
                            control={form.control}
                            name="districts"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(district.code)}
                                    onCheckedChange={(checked) => {
                                      const updatedValue = checked
                                        ? [...(field.value || []), district.code]
                                        : (field.value || []).filter(value => value !== district.code);
                                      field.onChange(updatedValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
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

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRegistrationForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Register User
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* District-Grouped Users */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Users by District ({districtSupervisors.length} total)
          </CardTitle>
          <CardDescription>
            Senapatis and supervisors organized by their assigned districts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedByDistrict.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No users registered yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedByDistrict.map(({ district, supervisors }) => (
                <Card key={district?.code} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-lg">{district?.name || district?.code}</h3>
                    <Badge variant="outline" className="text-xs">
                      {supervisors.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {supervisors.map((user: User) => (
                      <div
                        key={user.id}
                        className="p-2 bg-accent/30 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{user.fullName}</h4>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to deactivate {user.fullName}? They will no longer be able to access the system, but their data will be preserved.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      disabled={deleteMutation.isPending}
                                    >
                                      {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                      Deactivate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                            {!user.isActive && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          
                          {user.districts && user.districts.length > 1 && (
                            <p className="text-xs text-muted-foreground">
                              +{user.districts.length - 1} more district{user.districts.length - 1 !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit User Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <Card className="w-full max-w-sm mx-4 p-4 bg-background border shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Edit User</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingUser(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const password = formData.get('password') as string;
                const updateData: any = {
                  id: editingUser.id,
                  fullName: formData.get('fullName') as string,
                  email: formData.get('email') as string,
                };
                
                // Only include password if it's provided
                if (password && password.trim()) {
                  updateData.password = password;
                }
                
                editMutation.mutate(updateData);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  name="fullName"
                  defaultValue={editingUser.fullName}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editingUser.email}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">New Password (optional)</label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={editMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {editMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      
      {editingUser && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}