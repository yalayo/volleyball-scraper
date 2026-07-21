import React from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Trophy,
  Users,
  Bot,
  FileText,
  Play,
  Gamepad2,
  Volleyball,
  LogOut
} from "lucide-react";

interface SidebarProps {
  onStartScraping: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
  onOpenTracker?: () => void;
}

const tabItems = [
  { tab: "dashboard", label: "Dashboard", Icon: BarChart3 },
  { tab: "leagues",   label: "Leagues",   Icon: Trophy },
  { tab: "teams",     label: "Teams",     Icon: Users },
  { tab: "players",   label: "Players",   Icon: Users },
  { tab: "games",     label: "Games",     Icon: Bot },
];

const linkItems = [
  { href: "/games",           label: "Games Database",     Icon: Gamepad2 },
  { href: "/highlights",      label: "Team Highlights",    Icon: Trophy },
  { href: "/player-register", label: "Player Registration", Icon: Users },
];

// Collapses to an icon-only rail below lg so the content area keeps its space
// on small screens; expands to the full labelled sidebar on large screens.
export default function Sidebar({ onStartScraping, activeTab, onTabChange, onOpenTracker, onLogout }: SidebarProps) {
  const itemClasses = (active: boolean) =>
    `w-full justify-center lg:justify-start ${active ? "" : "text-gray-700 hover:bg-gray-100"}`;

  return (
    <div className="w-14 lg:w-64 shrink-0 bg-white shadow-lg border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-2 lg:p-6 border-b border-gray-200">
        <div className="flex items-center justify-center lg:justify-start lg:space-x-3">
          <div className="w-10 h-10 shrink-0 bg-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-gray-900">VolleyData</h1>
            <p className="text-sm text-gray-500">Scraper Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 lg:mt-6 flex-1">
        <div className="px-1.5 lg:px-3">
          <div className="space-y-1">
            {tabItems.map(({ tab, label, Icon }) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                className={itemClasses(activeTab === tab)}
                size="sm"
                title={label}
                onClick={() => onTabChange(tab)}
              >
                <Icon className="w-4 h-4 shrink-0 lg:mr-3" />
                <span className="hidden lg:inline">{label}</span>
              </Button>
            ))}
            {onOpenTracker && (
              <Button
                variant="ghost"
                className={itemClasses(false)}
                size="sm"
                title="Live Tracker"
                onClick={() => onOpenTracker()}
              >
                <Volleyball className="w-4 h-4 shrink-0 lg:mr-3" />
                <span className="hidden lg:inline">Live Tracker</span>
              </Button>
            )}
            {linkItems.map(({ href, label, Icon }) => (
              <a key={href} href={href} className="block w-full">
                <Button
                  variant="ghost"
                  className={itemClasses(false)}
                  size="sm"
                  title={label}
                >
                  <Icon className="w-4 h-4 shrink-0 lg:mr-3" />
                  <span className="hidden lg:inline">{label}</span>
                </Button>
              </a>
            ))}
            <Button
              variant={activeTab === "logs" ? "default" : "ghost"}
              className={itemClasses(activeTab === "logs")}
              size="sm"
              title="Logs"
              onClick={() => onTabChange("logs")}
            >
              <FileText className="w-4 h-4 shrink-0 lg:mr-3" />
              <span className="hidden lg:inline">Logs</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Scraping Controls */}
      <div className="p-1.5 lg:p-4 border-t border-gray-200 space-y-1.5">
        <Button
          onClick={onStartScraping}
          title="Start Scraping"
          className="w-full flex items-center justify-center lg:space-x-2"
        >
          <Play className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">Start Scraping</span>
        </Button>
        {onLogout && (
          <Button
            variant="ghost"
            onClick={onLogout}
            title="Logout"
            className="w-full flex items-center justify-center lg:space-x-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">Logout</span>
          </Button>
        )}
      </div>
    </div>
  );
}
