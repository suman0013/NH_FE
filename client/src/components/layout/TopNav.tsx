import { Link, useLocation } from "wouter";
import { Home, Users, Layers, MapPin, MoreHorizontal, BarChart3, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Dash", icon: Home },
  { href: "/namahattas", label: "Namahattas", shortLabel: "Nam", icon: Home },
  { href: "/devotees", label: "Devotees", shortLabel: "Dev", icon: Users },
  { href: "/map", label: "Map View", shortLabel: "Map", icon: MapPin },
  { href: "/reports", label: "Reports", shortLabel: "Rep", icon: BarChart3 },
  { href: "/statuses", label: "Statuses", shortLabel: "Stat", icon: Layers },
];

const adminNavigationItems = [
  { href: "/more", label: "More", shortLabel: "More", icon: MoreHorizontal },
];

const officeNavigationItems = [
  { href: "/admin/user-management", label: "Users", shortLabel: "Users", icon: UserPlus },
];

export default function TopNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Combine regular and role-specific navigation items based on user role
  const allNavigationItems = [
    ...navigationItems,
    ...((user?.role === 'OFFICE' || user?.role === 'ADMIN') ? officeNavigationItems : []),
    ...(user?.role === 'ADMIN' ? adminNavigationItems : [])
  ];

  return (
    <nav className="flex justify-center px-1 overflow-hidden">
      <div className="flex items-center space-x-1 justify-center min-w-0">
        {allNavigationItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/dashboard" && location.startsWith(item.href));
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
              >
                {/* Background shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <Icon className="w-4 h-4 mr-2 flex-shrink-0 relative z-10" />
                <span className="hidden md:inline text-sm relative z-10">{item.label}</span>
                <span className="md:hidden text-xs relative z-10">{item.shortLabel}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}