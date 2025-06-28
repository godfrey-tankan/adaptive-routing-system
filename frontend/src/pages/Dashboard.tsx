
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MapSection } from "@/components/MapSection";
import { RouteControlPanel } from "@/components/RouteControlPanel";

const Dashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
            <div className="flex-1 order-2 lg:order-1">
              <MapSection />
            </div>
            <div className="w-full lg:w-96 order-1 lg:order-2">
              <RouteControlPanel />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
