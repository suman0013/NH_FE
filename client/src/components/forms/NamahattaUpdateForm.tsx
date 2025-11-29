import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "@/services/api";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Image, Link, Music, Utensils, BookOpen, Sparkles, Upload, X } from "lucide-react";

interface NamahattaUpdateFormProps {
  namahattaId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface UpdateFormData {
  programType: string;
  date: string;
  attendance: number;
  prasadDistribution?: number;
  nagarKirtan: boolean;
  bookDistribution: boolean;
  chanting: boolean;
  arati: boolean;
  bhagwatPath: boolean;
  specialAttraction?: string;
  facebookLink?: string;
  youtubeLink?: string;
  imageUrls?: string[];
}

const programTypes = [
  "Weekly Satsang Program",
  "Bhagavad Gita Study Circle",
  "Harinama Sankirtana",
  "Festival Celebration",
  "Bhagavatam Class",
  "Kirtan Session",
  "Prasadam Distribution",
  "Community Service",
  "Youth Program",
  "Ladies Program"
];

export default function NamahattaUpdateForm({ namahattaId, isOpen, onClose }: NamahattaUpdateFormProps) {
  const { toast } = useToast();
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UpdateFormData>({
    defaultValues: {
      programType: "",
      date: new Date().toISOString().split('T')[0],
      attendance: 0,
      prasadDistribution: 0,
      nagarKirtan: false,
      bookDistribution: false,
      chanting: false,
      arati: false,
      bhagwatPath: false,
      specialAttraction: "",
      facebookLink: "",
      youtubeLink: ""
    }
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (data: UpdateFormData) => {
      // Convert uploaded images to base64 or upload to a service
      const imageUrls: string[] = [];
      
      for (const file of uploadedImages) {
        // For demo purposes, we'll create object URLs
        // In production, you'd upload to a cloud service like AWS S3, Cloudinary, etc.
        const objectUrl = URL.createObjectURL(file);
        imageUrls.push(objectUrl);
      }
      
      // Convert fields to proper types to match database schema
      const processedData = {
        ...data,
        // Convert numeric fields from strings to numbers
        attendance: parseInt(data.attendance.toString()) || 0,
        prasadDistribution: data.prasadDistribution ? parseInt(data.prasadDistribution.toString()) || 0 : undefined,
        // Convert boolean activity fields to integers (0 or 1)
        nagarKirtan: data.nagarKirtan ? 1 : 0,
        bookDistribution: data.bookDistribution ? 1 : 0,
        chanting: data.chanting ? 1 : 0,
        arati: data.arati ? 1 : 0,
        bhagwatPath: data.bhagwatPath ? 1 : 0,
      };
      
      return api.createNamahattaUpdate({
        namahattaId: Number(namahattaId),
        ...processedData,
        imageUrls
      });
    },
    onSuccess: () => {
      // Invalidate queries with the correct query key format used in NamahattaDetail page
      queryClient.invalidateQueries({ queryKey: ["/api/namahattas", namahattaId.toString(), "updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      // Also invalidate the general updates list
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      // Invalidate map data queries to refresh counts if needed
      queryClient.invalidateQueries({ queryKey: ["/api/map/countries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/map/states"] });
      queryClient.invalidateQueries({ queryKey: ["/api/map/districts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/map/sub-districts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/map/villages"] });
      toast({
        title: "Success",
        description: "Update posted successfully",
      });
      reset();
      setUploadedImages([]);
      setImagePreviews([]);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post update",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateFormData) => {
    createUpdateMutation.mutate(data);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file types
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Some files were skipped. Only images under 5MB are allowed.",
        variant: "destructive",
      });
    }
    
    // Update uploaded images
    setUploadedImages(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);
    
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-indigo-500" />
            Post Namahatta Update
          </DialogTitle>
          <DialogDescription>
            Share details about your program including attendance, activities, and photos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Program Type */}
          <div className="space-y-2">
            <Label htmlFor="programType">Program Type</Label>
            <Select onValueChange={(value) => setValue("programType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select program type" />
              </SelectTrigger>
              <SelectContent>
                {programTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.programType && (
              <p className="text-sm text-red-500">Program type is required</p>
            )}
          </div>

          {/* Date and Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                type="date"
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance">Attendance</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  min="0"
                  {...register("attendance", { 
                    required: "Attendance is required",
                    min: { value: 0, message: "Attendance must be positive" }
                  })}
                  className="pl-10"
                  placeholder="Number of attendees"
                />
              </div>
              {errors.attendance && (
                <p className="text-sm text-red-500">{errors.attendance.message}</p>
              )}
            </div>
          </div>

          {/* Prasadam Distribution */}
          <div className="space-y-2">
            <Label htmlFor="prasadDistribution">Prasadam Distribution (optional)</Label>
            <div className="relative">
              <Utensils className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                min="0"
                {...register("prasadDistribution")}
                className="pl-10"
                placeholder="Number of prasadam distributed"
              />
            </div>
          </div>

          {/* Program Activities */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Program Activities</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center space-x-2">
                  <Music className="h-4 w-4 text-orange-500" />
                  <span>Nagar Kirtan</span>
                </div>
                <Switch 
                  onCheckedChange={(checked) => setValue("nagarKirtan", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  <span>Book Distribution</span>
                </div>
                <Switch 
                  onCheckedChange={(checked) => setValue("bookDistribution", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center space-x-2">
                  <Music className="h-4 w-4 text-purple-500" />
                  <span>Chanting</span>
                </div>
                <Switch 
                  onCheckedChange={(checked) => setValue("chanting", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span>Arati</span>
                </div>
                <Switch 
                  onCheckedChange={(checked) => setValue("arati", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 md:col-span-2">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-green-500" />
                  <span>Bhagwat Path</span>
                </div>
                <Switch 
                  onCheckedChange={(checked) => setValue("bhagwatPath", checked)}
                />
              </div>
            </div>
          </div>

          {/* Special Attraction */}
          <div className="space-y-2">
            <Label htmlFor="specialAttraction">Special Attraction (optional)</Label>
            <Textarea
              {...register("specialAttraction")}
              className=""
              placeholder="Describe any special highlights or attractions..."
              rows={3}
            />
          </div>

          {/* Social Media Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebookLink">Facebook Link (optional)</Label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="url"
                  {...register("facebookLink")}
                  className="pl-10"
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtubeLink">YouTube Link (optional)</Label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="url"
                  {...register("youtubeLink")}
                  className="pl-10"
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Images (optional)</Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="image-upload"
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <label htmlFor="image-upload" className="cursor-pointer flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Images
                  </label>
                </Button>
              </div>
            </div>
            
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {uploadedImages.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="gradient-button"
              disabled={createUpdateMutation.isPending}
            >
              {createUpdateMutation.isPending ? "Posting..." : "Post Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}