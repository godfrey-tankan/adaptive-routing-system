// src/components/AppSidebar.tsx (No major changes, just confirmation)
import { Map, Route, Star, Settings, Bell, LogOut } from "lucide-react"; // Added LogOut icon
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

const navigationItems = [
  { title: "Route Planner", url: "/dashboard", icon: Map },
  { title: "Saved Routes", url: "/dashboard/saved", icon: Star },
  { title: "Simulation Mode", url: "/dashboard/simulation", icon: Route },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, logout } = useAuth(); // Ensure logout is available

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard" || currentPath === "/dashboard/";
    }
    return currentPath.startsWith(path);
  };

  console.log("AppSidebar: Rendering. Current path:", currentPath); // Debug

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible>
      <SidebarContent className="bg-white border-r">
        {/* Logo */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Map className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="font-montserrat font-bold text-lg text-foreground">
                Smart Adaptive Routing
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`h-12 ${isActive(item.url)
                      ? "bg-primary/10 text-primary border-r-2 border-primary"
                      : "hover:bg-muted/50"
                      }`}
                  >
                    <NavLink to={item.url} className="flex items-center">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="ml-3 font-medium">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Profile and Logout */}
        {user && ( // Only show if user is logged in
          <div className={`mt-auto p-4 border-t ${collapsed ? "text-center" : ""}`}>
            <div className={`flex items-center ${collapsed ? "justify-center" : "space-x-3"}`}>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-white">
                  {user.avatarFallback}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              )}
              {!collapsed && (
                <Bell className="w-4 h-4 text-muted-foreground cursor-pointer" />
              )}
            </div>
            {/* Logout button */}
            <button
              onClick={logout} // Use the logout function from AuthContext
              className={`mt-3 w-full text-sm text-red-500 hover:text-red-600 ${collapsed ? "text-center" : "text-left"}`}
            >
              {collapsed ? (
                <LogOut className="w-5 h-5 mx-auto" />
              ) : (
                "Log Out"
              )}
            </button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}