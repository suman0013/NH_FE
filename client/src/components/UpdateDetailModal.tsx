import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  Music, 
  BookOpen, 
  Utensils, 
  Sparkles, 
  MapPin,
  Facebook,
  Youtube,
  ExternalLink,
  X
} from "lucide-react";
import { format } from "date-fns";

interface NamahattaUpdate {
  id: number;
  namahattaId: number;
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
  createdAt: string;
}

interface UpdateDetailModalProps {
  update: NamahattaUpdate;
  namahattaName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateDetailModal({ 
  update, 
  namahattaName, 
  isOpen, 
  onClose 
}: UpdateDetailModalProps) {
  const activities = [
    { key: 'nagarKirtan', label: 'Nagar Kirtan', icon: Music, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
    { key: 'bookDistribution', label: 'Book Distribution', icon: BookOpen, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'chanting', label: 'Chanting', icon: Music, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
    { key: 'arati', label: 'Arati', icon: Sparkles, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { key: 'bhagwatPath', label: 'Bhagwat Path', icon: BookOpen, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' }
  ];

  const activeActivities = activities.filter(activity => 
    update[activity.key as keyof NamahattaUpdate] === true
  );

  // Determine event status based on date
  const getEventStatus = () => {
    const eventDate = new Date(update.date);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (eventStart < todayStart) {
      return { label: "Past Event", variant: "secondary" as const, className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
    } else if (eventStart.getTime() === todayStart.getTime()) {
      return { label: "Today", variant: "default" as const, className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
    } else {
      return { label: "Future Event", variant: "outline" as const, className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" };
    }
  };

  const eventStatus = getEventStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {update.programType}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Detailed information about the {update.programType} program update
              </DialogDescription>
              {namahattaName && (
                <div className="flex items-center mt-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="mr-1 h-4 w-4" />
                  <span>{namahattaName}</span>
                </div>
              )}
            </div>
            <Badge variant={eventStatus.variant} className={eventStatus.className}>
              {eventStatus.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date and Basic Info */}
          <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              <span>{format(new Date(update.date), "PPPP")}</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {update.attendance}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Attendees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {update.prasadDistribution && (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <Utensils className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {update.prasadDistribution}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Prasadam Distributed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Activities */}
          {activeActivities.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div 
                      key={activity.key}
                      className={`flex items-center space-x-3 p-3 rounded-lg ${activity.bgColor}`}
                    >
                      <Icon className={`h-5 w-5 ${activity.color}`} />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {activity.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Attraction */}
          {update.specialAttraction && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Special Attraction</h3>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <p className="text-gray-700 dark:text-gray-300 italic">
                    "{update.specialAttraction}"
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Links */}
          {(update.facebookLink || update.youtubeLink) && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Related Links</h3>
              <div className="flex flex-wrap gap-3">
                {update.facebookLink && (
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => window.open(update.facebookLink, '_blank')}
                  >
                    <Facebook className="h-4 w-4" />
                    <span>Facebook</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                {update.youtubeLink && (
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => window.open(update.youtubeLink, '_blank')}
                  >
                    <Youtube className="h-4 w-4" />
                    <span>YouTube</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Images */}
          {update.imageUrls && update.imageUrls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {update.imageUrls.map((url, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img 
                      src={url} 
                      alt={`Update photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}