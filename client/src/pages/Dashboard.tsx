import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Home, 
  Calendar, 
  AlertTriangle, 
  Crown, 
  UserCheck, 
  Download, 
  Plus,
  TrendingUp,
  ArrowRight,
  Zap,
  UserPlus,
  CalendarPlus,
  BarChart3,
  Music,
  BookOpen,
  Sparkles,
  Heart,
  Star,
  Gift,
  Utensils,
  MapPin
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  // Function to get appropriate icon and colors based on program type
  const getProgramIcon = (programType: string) => {
    const type = programType.toLowerCase();
    
    if (type.includes('satsang') || type.includes('weekly')) {
      return { icon: Heart, gradient: 'from-red-400 to-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' };
    } else if (type.includes('kirtan') || type.includes('music')) {
      return { icon: Music, gradient: 'from-orange-400 to-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20' };
    } else if (type.includes('book') || type.includes('gita') || type.includes('bhagavat')) {
      return { icon: BookOpen, gradient: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' };
    } else if (type.includes('festival') || type.includes('celebration')) {
      return { icon: Star, gradient: 'from-yellow-400 to-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' };
    } else if (type.includes('prasadam') || type.includes('distribution')) {
      return { icon: Utensils, gradient: 'from-green-400 to-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' };
    } else if (type.includes('youth') || type.includes('ladies')) {
      return { icon: UserPlus, gradient: 'from-purple-400 to-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20' };
    } else if (type.includes('service') || type.includes('community')) {
      return { icon: Gift, gradient: 'from-pink-400 to-pink-600', bgColor: 'bg-pink-50 dark:bg-pink-900/20' };
    } else if (type.includes('rath') || type.includes('yatra')) {
      return { icon: Sparkles, gradient: 'from-indigo-400 to-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' };
    } else {
      return { icon: Home, gradient: 'from-emerald-400 to-teal-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' };
    }
  };
  
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  const { data: statusDistribution, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/status-distribution"],
  });

  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery({
    queryKey: ["/api/hierarchy"],
  });

  if (dashboardLoading || hierarchyLoading || statusLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome to your spiritual organization management center</p>
        </div>

      </div>

      {/* Leadership Hierarchy Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle 
            className="flex items-center cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
            onClick={() => setLocation("/hierarchy")}
          >
            <Crown className="mr-3 h-5 w-5 text-indigo-500" />
            Leadership Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-3">
              {/* Founder Acharya */}
              {(hierarchy as any)?.founder?.map((founder: any) => (
                <div key={founder.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                    <Crown className="h-5 w-5 text-white float-animation" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">{founder.name}</h3>
                    <p className="text-xs text-amber-700 dark:text-amber-300">ISKCON Founder Acharya</p>
                  </div>
                </div>
              ))}
              
              {/* GBC */}
              {(hierarchy as any)?.gbc?.map((leader: any) => (
                <div key={leader.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <Crown className="h-5 w-5 text-white float-animation" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">{leader.name}</h3>
                    <p className="text-xs text-purple-700 dark:text-purple-300">GBC - Governing Body Commissioner</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {/* Regional Directors */}
              {(hierarchy as any)?.regionalDirectors?.map((director: any) => (
                <div key={director.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium text-sm text-gray-900 dark:text-white">{director.name}</h5>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Regional Director</p>
                  </div>
                </div>
              ))}

              {/* Co-Regional Directors */}
              {(hierarchy as any)?.coRegionalDirectors?.map((coDirector: any) => (
                <div key={coDirector.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium text-sm text-gray-900 dark:text-white">{coDirector.name}</h5>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Co-Regional Director</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className="flex-1">
          <StatsCard
            title="Total Devotees"
            value={(dashboard as any)?.totalDevotees || 0}
            icon={Users}
            gradient="from-blue-400 to-blue-600"
            onClick={() => setLocation("/devotees")}
          />
        </div>
        <div className="flex-1">
          <StatsCard
            title="Total Namhattas"
            value={(dashboard as any)?.totalNamhattas || 0}
            icon={Home}
            gradient="from-emerald-400 to-emerald-600"
            onClick={() => setLocation("/namhattas")}
          />
        </div>
      </div>



      {/* Recent Activity & Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Namhatta Updates */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Home className="mr-3 h-5 w-5 text-emerald-500" />
                Recent Updates
              </CardTitle>
              <Button 
                variant="link" 
                className="text-emerald-600 dark:text-emerald-400"
                onClick={() => setLocation("/updates")}
              >
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {(dashboard as any)?.recentUpdates?.map((update: any, index: number) => {
                const eventDate = new Date(update.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                eventDate.setHours(0, 0, 0, 0);
                
                const getEventStatus = () => {
                  if (eventDate.getTime() === today.getTime()) {
                    return { label: "Today", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
                  } else if (eventDate > today) {
                    return { label: "Future Event", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
                  } else {
                    return { label: "Past Event", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" };
                  }
                };
                
                const status = getEventStatus();
                const programIconInfo = getProgramIcon(update.programType);
                const IconComponent = programIconInfo.icon;
                
                return (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-xl glass hover:bg-white/80 dark:hover:bg-slate-600/50 transition-all duration-200 group cursor-pointer">
                    <div className={`w-10 h-10 bg-gradient-to-br ${programIconInfo.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                        {update.namhattaName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {update.programType}
                      </p>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {update.date}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Users className="mr-1 h-3 w-3" />
                          {update.attendance} attendees
                        </span>
                      </div>
                    </div>
                    <Badge className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Devotional Status Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-3 h-5 w-5 text-purple-500" />
                Status Distribution
              </CardTitle>
              <Button 
                variant="link" 
                className="text-purple-600 dark:text-purple-400"
                onClick={() => setLocation("/statuses")}
              >
                Manage Statuses
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {statusDistribution && statusDistribution.length > 0 ? (
                statusDistribution.map((status, index) => {
                  const colors = [
                    "from-blue-400 to-blue-600",
                    "from-emerald-400 to-emerald-600",
                    "from-purple-400 to-purple-600",
                    "from-orange-400 to-orange-600",
                    "from-pink-400 to-pink-600",
                    "from-indigo-400 to-indigo-600",
                    "from-cyan-400 to-cyan-600"
                  ];
                  const color = colors[index % colors.length];
                  return (
                    <StatusProgressBar 
                      key={status.statusName}
                      label={status.statusName} 
                      count={status.count} 
                      percentage={status.percentage} 
                      color={color} 
                    />
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No status data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon: Icon, 
  gradient, 
  positive = false, 
  urgent = false,
  onClick
}: {
  title: string;
  value: number;
  change?: string;
  changeLabel?: string;
  icon: any;
  gradient: string;
  positive?: boolean;
  urgent?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card className={`glass-card relative overflow-hidden group ${onClick ? 'cursor-pointer hover-lift' : ''}`} onClick={onClick}>
      {/* Gradient Background Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      
      {/* Floating Background Shapes */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
      
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
              <p className="text-2xl font-bold gradient-text">
                {value.toLocaleString()}
              </p>
            </div>
            {change && changeLabel && (
              <div className="flex items-center mt-2">
                <span className={`flex items-center text-sm font-medium px-2 py-1 rounded-full ${
                  positive 
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                    : urgent 
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" 
                      : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                }`}>
                  {positive ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <AlertTriangle className="mr-1 h-3 w-3" />
                  )}
                  {change}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 relative overflow-hidden`}>
            {/* Icon background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
            <Icon className="h-6 w-6 text-white relative z-10 drop-shadow-sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusProgressBar({ label, count, percentage, color }: { label: string; count: number; percentage: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{count} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon: Icon, gradient, iconGradient, onClick }: {
  title: string;
  description: string;
  icon: any;
  gradient: string;
  iconGradient: string;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={`group p-4 bg-gradient-to-br ${gradient} rounded-xl border border-gray-200/50 dark:border-gray-700/50 h-auto flex-col space-y-3 hover-lift hover:shadow-lg`}
      onClick={onClick}
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${iconGradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="text-center">
        <h3 className="font-medium text-gray-900 dark:text-white text-sm">{title}</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </Button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
