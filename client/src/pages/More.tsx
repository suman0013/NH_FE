import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  Users, 
  MapPin, 
  CheckCircle, 
  Heart, 
  BarChart3, 
  Info,
  Activity,
  Crown,
  Layout,
  Home,
  Monitor,
  UserPlus,
  Shield
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function More() {
  const { user } = useAuth();
  
  // Restrict access to admin users only
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert className="glass-card border-red-200 dark:border-red-800">
            <Shield className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-center">
              <div className="space-y-2">
                <p className="font-semibold text-red-800 dark:text-red-200">Access Restricted</p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  This page is only accessible to administrators. Please contact your system administrator for access.
                </p>
                <div className="pt-2">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      Return to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  const menuItems = [
    // Core Application Pages
    {
      title: "Dashboard",
      description: "Overview of statistics and recent activities",
      icon: Layout,
      href: "/dashboard",
      color: "from-blue-500 to-indigo-600",
      category: "Core"
    },
    {
      title: "Namhattas",
      description: "Manage spiritual centers and their details",
      icon: Home,
      href: "/namhattas",
      color: "from-green-500 to-emerald-600",
      category: "Core"
    },
    {
      title: "Devotees",
      description: "Manage devotee profiles and information",
      icon: Users,
      href: "/devotees",
      color: "from-purple-500 to-pink-600",
      category: "Core"
    },
    {
      title: "Map View",
      description: "Geographic distribution of namhattas",
      icon: MapPin,
      href: "/map",
      color: "from-teal-500 to-cyan-600",
      category: "Core"
    },
    
    // Management & Administration
    {
      title: "Leadership Hierarchy",
      description: "View organizational structure and roles",
      icon: Crown,
      href: "/hierarchy",
      color: "from-amber-500 to-orange-600",
      category: "Management"
    },
    {
      title: "Approvals",
      description: "Review pending namhatta applications",
      icon: CheckCircle,
      href: "/approvals",
      color: "from-red-500 to-rose-600",
      category: "Management"
    },
    {
      title: "Status Management",
      description: "Manage devotional status categories",
      icon: BarChart3,
      href: "/statuses",
      color: "from-cyan-500 to-blue-600",
      category: "Management"
    },
    {
      title: "Shraddhakutirs",
      description: "View and manage regional spiritual centers",
      icon: Heart,
      href: "/shraddhakutirs",
      color: "from-pink-500 to-purple-600",
      category: "Management"
    },
    {
      title: "Register User",
      description: "Register new senapatis and manage users",
      icon: UserPlus,
      href: "/admin/register-user",
      color: "from-emerald-500 to-green-600",
      category: "Management"
    },
    
    // Activities & Information
    {
      title: "Updates",
      description: "Recent namhatta program updates and events",
      icon: Activity,
      href: "/updates",
      color: "from-orange-500 to-red-600",
      category: "Activities"
    },
    {
      title: "System Health",
      description: "Check application status and performance metrics",
      icon: Monitor,
      href: "/health",
      color: "from-gray-500 to-slate-600",
      category: "System"
    },
    {
      title: "About",
      description: "Application information and credits",
      icon: Info,
      href: "/about",
      color: "from-indigo-500 to-blue-600",
      category: "System"
    }
  ];

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          More Options
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Navigate to all available pages and features in the Namhatta Management System
        </p>
      </div>

      {/* Render grouped categories */}
      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
            {category === "Core" ? "Core Application Pages" : 
             category === "Management" ? "Management & Administration" :
             category === "Activities" ? "Activities & Information" :
             category === "System" ? "System & Information" : category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="glass-card hover-lift group cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full glass">
                Dashboard
              </Button>
            </Link>
            <Link href="/namhattas">
              <Button variant="outline" className="w-full glass">
                All Namhattas
              </Button>
            </Link>
            <Link href="/devotees">
              <Button variant="outline" className="w-full glass">
                All Devotees
              </Button>
            </Link>
            <Link href="/map">
              <Button variant="outline" className="w-full glass">
                Map View
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}