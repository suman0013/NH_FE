import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, MapPin, Users, Calendar, Clock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Namahatta } from "@/lib/types";

// Registration form schema
const registrationSchema = z.object({
  registrationNo: z.string().min(4, "Registration number must be at least 4 characters"),
  registrationDate: z.string().min(1, "Registration date is required"),
});

type RegistrationData = z.infer<typeof registrationSchema>;

interface NamahattaApprovalCardProps {
  namahatta: Namahatta;
}

export default function NamahattaApprovalCard({ namahatta }: NamahattaApprovalCardProps) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [registrationCheckError, setRegistrationCheckError] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Only ADMIN and OFFICE users can approve/reject
  const canApprove = user?.role === 'ADMIN' || user?.role === 'OFFICE';

  // Registration form
  const form = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registrationNo: "",
      registrationDate: "",
    },
  });

  // Check registration number uniqueness after 3 characters
  const checkRegistrationUnique = async (regNo: string) => {
    if (regNo.length < 3) {
      setRegistrationCheckError("");
      return;
    }
    
    try {
      const response = await fetch(`/api/namahattas/check-registration/${regNo}`);
      const { exists } = await response.json();
      
      if (exists) {
        setRegistrationCheckError("This registration number already exists");
        return false;
      } else {
        setRegistrationCheckError("");
        return true;
      }
    } catch (error) {
      console.error("Error checking registration:", error);
      setRegistrationCheckError("Error checking registration number");
      return false;
    }
  };

  // Handle registration number change with unique check
  const handleRegistrationNoChange = (value: string) => {
    form.setValue("registrationNo", value);
    if (value.length >= 3) {
      checkRegistrationUnique(value);
    } else {
      setRegistrationCheckError("");
    }
  };

  const approveMutation = useMutation({
    mutationFn: (data: RegistrationData) => apiRequest(
      "POST",
      `/api/namahattas/${namahatta.id}/approve`,
      {
        registrationNo: data.registrationNo,
        registrationDate: data.registrationDate,
      }
    ),
    onSuccess: () => {
      toast({
        title: "Namahatta Approved",
        description: `${namahatta.name} has been successfully approved with registration details.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/namahattas"] });
      setShowApprovalDialog(false);
      form.reset();
      setRegistrationCheckError("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve namahatta. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => apiRequest(
      "POST",
      `/api/namahattas/${namahatta.id}/reject`,
      { reason }
    ),
    onSuccess: () => {
      toast({
        title: "Namahatta Rejected",
        description: `${namahatta.name} has been rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/namahattas"] });
      setShowRejectionDialog(false);
      setRejectionReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject namahatta. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-full text-xs font-medium">Approved</Badge>;
      case "PENDING_APPROVAL":
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-1 rounded-full text-xs font-medium">Pending</Badge>;
      case "REJECTED":
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{namahatta.name}</CardTitle>
            {getStatusBadge(namahatta.status)}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Code: {namahatta.code}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location */}
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="text-sm">
              <p>{namahatta.address?.village}, {namahatta.address?.district}</p>
              <p className="text-gray-600 dark:text-gray-400">
                {namahatta.address?.state}, {namahatta.address?.country}
              </p>
            </div>
          </div>

          {/* Meeting Schedule */}
          {(namahatta.meetingDay || namahatta.meetingTime) && (
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {namahatta.meetingDay} {namahatta.meetingTime && `at ${namahatta.meetingTime}`}
              </span>
            </div>
          )}

          {/* Leadership */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Leadership</span>
            </div>
            <div className="ml-6 space-y-1 text-xs">
              {namahatta.malaSenapoti && (
                <p><span className="font-medium">Mala Senapoti:</span> {namahatta.malaSenapoti}</p>
              )}
              {namahatta.mahaChakraSenapoti && (
                <p><span className="font-medium">Maha Chakra Senapoti:</span> {namahatta.mahaChakraSenapoti}</p>
              )}
              {namahatta.chakraSenapoti && (
                <p><span className="font-medium">Chakra Senapoti:</span> {namahatta.chakraSenapoti}</p>
              )}
              {namahatta.secretary && (
                <p><span className="font-medium">Secretary:</span> {namahatta.secretary}</p>
              )}
            </div>
          </div>

          {/* Registration Information */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Applied: {new Date(namahatta.createdAt).toLocaleDateString()}</span>
            </div>
            
            {/* Official Registration Details (shown only if approved and has registration details) */}
            {namahatta.status === "APPROVED" && namahatta.registrationNo && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">Official Registration</span>
                  </div>
                  <div className="ml-6 space-y-1 text-xs">
                    <p><span className="font-medium">Registration No:</span> <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">{namahatta.registrationNo}</span></p>
                    {namahatta.registrationDate && (
                      <p><span className="font-medium">Registration Date:</span> {new Date(namahatta.registrationDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Only show for ADMIN and OFFICE users */}
          {namahatta.status === "PENDING_APPROVAL" && canApprove && (
            <div className="flex space-x-2 pt-4">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowApprovalDialog(true)}
                disabled={approveMutation.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={() => setShowRejectionDialog(true)}
                disabled={rejectMutation.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Registration Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Namahatta - Registration Details</DialogTitle>
            <DialogDescription>
              Please provide official registration details to approve "{namahatta.name}". This will activate the namahatta and allow it to operate officially.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
              if (registrationCheckError) {
                toast({
                  title: "Validation Error",
                  description: "Please fix the registration number error before submitting.",
                  variant: "destructive",
                });
                return;
              }
              approveMutation.mutate(data);
            })}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="registrationNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter registration number"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleRegistrationNoChange(e.target.value);
                          }}
                          className={registrationCheckError ? "border-red-500" : ""}
                          data-testid="input-registration-number"
                        />
                      </FormControl>
                      <FormMessage />
                      {registrationCheckError && (
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {registrationCheckError}
                        </p>
                      )}
                      {field.value.length >= 3 && !registrationCheckError && (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Registration number is available
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registrationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-registration-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowApprovalDialog(false);
                    form.reset();
                    setRegistrationCheckError("");
                  }}
                  data-testid="button-cancel-approval"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={approveMutation.isPending || !!registrationCheckError}
                  data-testid="button-confirm-approval"
                >
                  {approveMutation.isPending ? "Approving..." : "Approve Namahatta"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Namahatta</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{namahatta.name}". This will help the applicant understand what needs to be improved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a detailed reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => rejectMutation.mutate(rejectionReason)}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}