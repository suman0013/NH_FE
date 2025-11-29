import { Link, useLocation } from "wouter";
import { Home, Users, Map, MoreHorizontal, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Layout },
  { href: "/namahattas", label: "Namahattas", icon: Home },
  { href: "/devotees", label: "Devotees", icon: Users },
  { href: "/map", label: "Map", icon: Map },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export default function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 glass-card border-0 border-t border-white/20 dark:border-slate-700/50 lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center py-3 text-xs font-medium transition-colors duration-200 w-full",
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                {item.label}
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
