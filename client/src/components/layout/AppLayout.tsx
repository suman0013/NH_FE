import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import TopNav from "./TopNav";
import { cn } from "@/lib/utils";
import namhattaLogo from "@assets/namhatta_logo_1757674329685.png";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900"></div>
      
      {/* Static Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/15 to-cyan-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-purple-400/30 to-pink-600/30 rounded-full blur-2xl"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent dark:from-slate-900/50 dark:to-transparent"></div>
      </div>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-72">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="flex flex-col min-h-screen relative z-10">
        {/* Combined Header and Navigation */}
        <div className="glass-card border-0 border-b border-white/20 dark:border-slate-700/50">
          <div className="flex items-center justify-between px-2 sm:px-4 lg:px-6 py-1.5 lg:py-2">
            {/* Mobile Menu Button and Logo */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-xl glass"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-2">
                <div className="w-7 sm:w-8 lg:w-10 h-7 sm:h-8 lg:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300 relative overflow-hidden">
                  {/* Inner glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg lg:rounded-xl"></div>
                  <img 
                    src={namhattaLogo} 
                    alt="Namhatta Logo" 
                    className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8 object-contain relative z-10 drop-shadow-sm"
                  />
                </div>
                <div className="block">
                  <h1 className="text-sm sm:text-base lg:text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300">Namhatta</h1>
                  <p className="text-xs font-medium bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Management System</p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation - Centered */}
            <div className="hidden lg:flex flex-1 justify-center overflow-hidden">
              <TopNav />
            </div>

            {/* Theme Toggle */}
            <Header onMenuClick={() => setSidebarOpen(true)} />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 lg:py-3">
            <div className="backdrop-blur-sm bg-white/30 dark:bg-slate-900/30 rounded-3xl p-1 shadow-2xl border border-white/20 dark:border-slate-700/50">
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-3 lg:p-4 shadow-inner">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>


    </div>
  );
}
