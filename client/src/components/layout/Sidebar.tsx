import { Link, useLocation } from "wouter";
import { X, Home, Users, Layers, MapPin, LogOut, MoreHorizontal, BarChart3, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import namahattaLogo from "@assets/namhatta_logo_1757690747029.png";

interface SidebarProps {
  onClose?: () => void;
}

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, active: true },
  { href: "/namahattas", label: "Namahattas", icon: Home },
  { href: "/devotees", label: "Devotees", icon: Users },
  { href: "/map", label: "Map View", icon: MapPin },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/statuses", label: "Statuses", icon: Layers },
];

const officeNavigationItems = [
  { href: "/admin/user-management", label: "Users", icon: UserPlus },
];

const adminNavigationItems = [
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // Call logout from auth context
      logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of the system.",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging you out.",
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "Guest User";
    return user.username;
  };

  const getUserRoleDisplay = () => {
    if (!user) return "Guest";
    switch (user.role) {
      case 'ADMIN':
        return 'System Administrator';
      case 'OFFICE':
        return 'Office Staff';
      case 'DISTRICT_SUPERVISOR':
        return 'District Supervisor';
      default:
        return 'User';
    }
  };

  const getUserInitials = () => {
    if (!user) return "GU";
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 glass-card border-0 border-r border-white/20 dark:border-slate-700/50">
      {/* Logo Section */}
      <div className="flex items-center h-20 flex-shrink-0 px-6 border-b border-white/20 dark:border-slate-700/50">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="mr-2 lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center space-x-3">
          <img 
            src={namahattaLogo} 
            alt="Namahatta Logo" 
            className="w-10 h-10 object-contain drop-shadow-lg"
            loading="eager"
            decoding="async"
          />
          <div>
            <h1 className="text-xl font-bold gradient-text">Namahatta</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 relative whitespace-nowrap group overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50 shadow-lg scale-105"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-white/60 hover:to-white/40 dark:hover:from-slate-800/60 dark:hover:to-slate-700/40 hover:text-gray-900 dark:hover:text-white hover:scale-105 hover:shadow-md"
                )}
                onClick={onClose}
              >
                {/* Background shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <Icon className="mr-3 h-5 w-5 flex-shrink-0 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </div>
            </Link>
          );
        })}

        {/* Management Section (Office & Admin) */}
        {(user?.role === 'OFFICE' || user?.role === 'ADMIN') && (
          <>
            <div className="my-4 px-3">
              <hr className="border-white/20 dark:border-slate-700/50" />
            </div>
            {officeNavigationItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 relative whitespace-nowrap group overflow-hidden",
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50 shadow-lg scale-105"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-white/60 hover:to-white/40 dark:hover:from-slate-800/60 dark:hover:to-slate-700/40 hover:text-gray-900 dark:hover:text-white hover:scale-105 hover:shadow-md"
                    )}
                    onClick={onClose}
                  >
                    {/* Background shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0 relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}

        {/* Admin Section */}
        {user?.role === 'ADMIN' && (
          <>
            <div className="my-4 px-3">
              <hr className="border-white/20 dark:border-slate-700/50" />
            </div>
            {adminNavigationItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 relative whitespace-nowrap group overflow-hidden",
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50 shadow-lg scale-105"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-white/60 hover:to-white/40 dark:hover:from-slate-800/60 dark:hover:to-slate-700/40 hover:text-gray-900 dark:hover:text-white hover:scale-105 hover:shadow-md"
                    )}
                    onClick={onClose}
                  >
                    {/* Background shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0 relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="flex-shrink-0 p-3 border-t border-white/20 dark:border-slate-700/50">
        <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/50 dark:bg-slate-700/50">
          <Avatar className="flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-semibold">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {getUserDisplayName()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {getUserRoleDisplay()}
            </p>
            
            {/* Show districts for District Supervisors */}
            {user?.role === 'DISTRICT_SUPERVISOR' && user?.districts && user.districts.length > 0 && (
              <div className="pt-2 border-t border-white/20 dark:border-slate-700/50">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Assigned Districts:
                </p>
                <div className="space-y-1">
                  {user.districts.slice(0, 2).map((district, index) => (
                    <div key={index} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded truncate">
                      {typeof district === 'string' ? district : district.name}
                    </div>
                  ))}
                  {user.districts.length > 2 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      +{user.districts.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
