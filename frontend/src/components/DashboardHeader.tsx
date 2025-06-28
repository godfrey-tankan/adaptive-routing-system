
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Settings } from "lucide-react";

export const DashboardHeader = () => {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4">
      <div className="flex items-center space-x-4">
        <SidebarTrigger className="w-8 h-8" />
        <div>
          <h1 className="text-xl font-montserrat font-bold text-foreground">
            Route Planner
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan your journey across Zimbabwe
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
