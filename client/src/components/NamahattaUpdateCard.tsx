import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  Music, 
  BookOpen, 
  Utensils, 
  Sparkles, 
  ExternalLink,
  Image,
  Facebook,
  Youtube
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import UpdateDetailModal from "./UpdateDetailModal";

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

interface NamahattaUpdateCardProps {
  update: NamahattaUpdate;
  showNamahattaName?: boolean;
  namahattaName?: string;
}

export default function NamahattaUpdateCard({ 
  update, 
  showNamahattaName = false, 
  namahattaName 
}: NamahattaUpdateCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const activities = [
    { key: 'nagarKirtan', label: 'Nagar Kirtan', icon: Music, color: 'text-orange-500' },
    { key: 'bookDistribution', label: 'Book Distribution', icon: BookOpen, color: 'text-blue-500' },
    { key: 'chanting', label: 'Chanting', icon: Music, color: 'text-purple-500' },
    { key: 'arati', label: 'Arati', icon: Sparkles, color: 'text-yellow-500' },
    { key: 'bhagwatPath', label: 'Bhagwat Path', icon: BookOpen, color: 'text-green-500' }
  ];

  const activeActivities = activities.filter(activity => 
    update[activity.key as keyof NamahattaUpdate] === true
  );

  const handleCardClick = () => {
    setShowDetailModal(true);
  };

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
    <div className="min-h-[280px]">
      <Card className="glass-card hover-lift h-full cursor-pointer" onClick={handleCardClick}>
        <div className="flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {update.programType}
                </h3>
                {showNamahattaName && namahattaName && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{namahattaName}</p>
                )}
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="mr-1 h-4 w-4" />
                  {format(new Date(update.date), "PPP")}
                </div>
              </div>
              <Badge variant={eventStatus.variant} className={eventStatus.className}>
                {eventStatus.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-grow">
            <div className="space-y-3">
              {/* Attendance and Distribution */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {update.attendance}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Attendees</p>
                  </div>
                </div>
                
                {update.prasadDistribution && (
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                    <Utensils className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {update.prasadDistribution}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Prasadam</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Activities */}
              {activeActivities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Activities</p>
                  <div className="flex flex-wrap gap-2">
                    {activeActivities.slice(0, 3).map((activity) => {
                      const Icon = activity.icon;
                      return (
                        <Badge 
                          key={activity.key} 
                          variant="outline" 
                          className="flex items-center space-x-1"
                        >
                          <Icon className={`h-3 w-3 ${activity.color}`} />
                          <span className="text-xs">{activity.label}</span>
                        </Badge>
                      );
                    })}
                    {activeActivities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{activeActivities.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Special Attraction */}
              {update.specialAttraction && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Special Attraction</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    "{update.specialAttraction}"
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
      
      {/* Update Detail Modal */}
      <UpdateDetailModal
        update={update}
        namahattaName={namahattaName}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}