import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Trophy, 
  Users, 
  Bot, 
  FileText, 
  Settings,
  Play,
  Clock
} from "lucide-react";

interface SidebarProps {
  onStartScraping: () => void;
}

export default function Sidebar({ onStartScraping }: SidebarProps) {
  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">VolleyData</h1>
            <p className="text-sm text-gray-500">Scraper Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex-1">
        <div className="px-3">
          <div className="space-y-1">
            <Button
              variant="default"
              className="w-full justify-start"
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-3" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
              size="sm"
            >
              <Trophy className="w-4 h-4 mr-3" />
              Leagues
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
              size="sm"
            >
              <Users className="w-4 h-4 mr-3" />
              Teams
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
              size="sm"
            >
              <Bot className="w-4 h-4 mr-3" />
              Scraper
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
              size="sm"
            >
              <FileText className="w-4 h-4 mr-3" />
              Logs
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
              size="sm"
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </Button>
          </div>
        </div>
      </nav>

      {/* Scraping Controls */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          onClick={onStartScraping}
          className="w-full flex items-center justify-center space-x-2"
        >
          <Play className="w-4 h-4" />
          <span>Start Scraping</span>
        </Button>
        <div className="mt-2 text-xs text-gray-500 text-center flex items-center justify-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Last run: 2 hours ago</span>
        </div>
      </div>
    </div>
  );
}
