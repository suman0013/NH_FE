import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Info, 
  Code, 
  Heart, 
  Users, 
  Globe, 
  Shield,
  Zap,
  Book,
  Mail,
  ExternalLink,
  Github,
  Star
} from "lucide-react";

export default function About() {
  const { data: aboutData, isLoading } = useQuery({
    queryKey: ["/api/about"],
    queryFn: () => api.getAbout(),
  });

  if (isLoading) {
    return <AboutSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">About Namahatta Management System</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Learn more about the application, its features, and the team behind it
          </p>
        </div>
      </div>

      {/* Application Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5 text-indigo-500" />
            Application Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">ॐ</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {aboutData?.name || "Namahatta Management System"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {aboutData?.description || "OpenAPI spec for Namahatta web and mobile-compatible system"}
              </p>
              <div className="flex items-center mt-2">
                <Badge className="status-badge-active mr-2">
                  Version {aboutData?.version || "1.0.0"}
                </Badge>
                <Badge variant="secondary">
                  Production Ready
                </Badge>
              </div>
            </div>
          </div>
          
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            The Namahatta Management System is a comprehensive platform designed to manage spiritual centers, 
            track devotee progress, and organize religious activities. Built with modern web technologies, 
            it provides a seamless experience for administrators, leaders, and devotees alike.
          </p>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="Devotee Management"
          description="Comprehensive profiles, status tracking, and spiritual progress monitoring"
          icon={Users}
          gradient="from-blue-400 to-blue-600"
        />
        
        <FeatureCard
          title="Namahatta Centers"
          description="Manage spiritual centers, locations, and organizational hierarchy"
          icon={Globe}
          gradient="from-emerald-400 to-emerald-600"
        />
        
        <FeatureCard
          title="Hierarchy System"
          description="Organizational structure from GBC to local senapotis"
          icon={Shield}
          gradient="from-purple-400 to-purple-600"
        />
        
        <FeatureCard
          title="Status Management"
          description="Track devotional advancement and spiritual milestones"
          icon={Star}
          gradient="from-orange-400 to-orange-600"
        />
        
        <FeatureCard
          title="Real-time Updates"
          description="Live program updates, attendance tracking, and notifications"
          icon={Zap}
          gradient="from-pink-400 to-pink-600"
        />
        
        <FeatureCard
          title="Mobile Ready"
          description="Responsive design optimized for all devices and screen sizes"
          icon={Code}
          gradient="from-cyan-400 to-cyan-600"
        />
      </div>

      {/* Technical Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="mr-2 h-5 w-5 text-indigo-500" />
              Technical Stack
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Frontend</p>
                <p className="font-medium text-gray-900 dark:text-white">React + TypeScript</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Styling</p>
                <p className="font-medium text-gray-900 dark:text-white">Tailwind CSS</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">State Management</p>
                <p className="font-medium text-gray-900 dark:text-white">TanStack Query</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">UI Components</p>
                <p className="font-medium text-gray-900 dark:text-white">Shadcn/UI</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Routing</p>
                <p className="font-medium text-gray-900 dark:text-white">Wouter</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Build Tool</p>
                <p className="font-medium text-gray-900 dark:text-white">Vite</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="mr-2 h-5 w-5 text-red-500" />
              Acknowledgments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              This application is built with love and dedication to serve the spiritual community. 
              We thank all the devotees, leaders, and contributors who have made this project possible.
            </p>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Special Thanks To:</p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>• His Holiness Jayapataka Swami</li>
                <li>• All GBC members and Regional Directors</li>
                <li>• Local Namahatta leaders and senapotis</li>
                <li>• The entire devotee community</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact and Support */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-indigo-500" />
            Support & Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Get Help</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full glass justify-start">
                  <Book className="mr-2 h-4 w-4" />
                  Documentation
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                
                <Button variant="outline" className="w-full glass justify-start">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                
                <Button variant="outline" className="w-full glass justify-start">
                  <Github className="mr-2 h-4 w-4" />
                  Report Issue
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">System Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Application Version:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {aboutData?.version || "1.0.0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Build Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Environment:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {import.meta.env.NODE_ENV || "development"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">License:</span>
                  <span className="font-medium text-gray-900 dark:text-white">MIT</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon: Icon,
  gradient,
}: {
  title: string;
  description: string;
  icon: any;
  gradient: string;
}) {
  return (
    <Card className="glass-card hover-lift group">
      <CardContent className="p-6">
        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function AboutSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <Card className="glass-card">
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="glass-card">
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
