import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play } from "lucide-react";

interface ScrapingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ScrapingModal({ open, onOpenChange }: ScrapingModalProps) {
  const [url, setUrl] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [category, setCategory] = useState("");
  const [extractTeams, setExtractTeams] = useState(true);
  const [extractSeries, setExtractSeries] = useState(true);
  const [extractSams, setExtractSams] = useState(true);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scrapeMutation = useMutation({
    mutationFn: async (data: { url: string; leagueName: string; category: string }) => {
      return await apiRequest("POST", "/api/scrape", data);
    },
    onSuccess: () => {
      toast({
        title: "Scraping Started",
        description: "The scraping operation has been started successfully.",
      });
      onOpenChange(false);
      resetForm();
      // Refresh data after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
        queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
        queryClient.invalidateQueries({ queryKey: ["/api/scrape-logs"] });
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Scraping Failed",
        description: error.message || "Failed to start scraping operation.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url || !leagueName || !category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    scrapeMutation.mutate({ url, leagueName, category });
  };

  const resetForm = () => {
    setUrl("");
    setLeagueName("");
    setCategory("");
    setExtractTeams(true);
    setExtractSeries(true);
    setExtractSams(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Scraping Operation</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="url">Target URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://ergebnisdienst.volleyball.nrw/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="leagueName">League Name</Label>
            <Input
              id="leagueName"
              placeholder="e.g., Landesliga 3 Männer"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oberligen Männer">Oberligen Männer</SelectItem>
                <SelectItem value="Oberligen Frauen">Oberligen Frauen</SelectItem>
                <SelectItem value="Verbandsligen Männer">Verbandsligen Männer</SelectItem>
                <SelectItem value="Verbandsligen Frauen">Verbandsligen Frauen</SelectItem>
                <SelectItem value="Landesligen Männer">Landesligen Männer</SelectItem>
                <SelectItem value="Landesligen Frauen">Landesligen Frauen</SelectItem>
                <SelectItem value="Bezirksligen Männer">Bezirksligen Männer</SelectItem>
                <SelectItem value="Bezirksligen Frauen">Bezirksligen Frauen</SelectItem>
                <SelectItem value="Bezirksklassen Männer">Bezirksklassen Männer</SelectItem>
                <SelectItem value="Bezirksklassen Frauen">Bezirksklassen Frauen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-base font-medium">Data to Extract</Label>
            <div className="space-y-3 mt-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="teams"
                  checked={extractTeams}
                  onCheckedChange={setExtractTeams}
                />
                <label htmlFor="teams" className="text-sm">
                  Team IDs (LeaguePresenter.teamListView.teamId)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="series"
                  checked={extractSeries}
                  onCheckedChange={setExtractSeries}
                />
                <label htmlFor="series" className="text-sm">
                  Series IDs (LeaguePresenter.matchSeriesId)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sams"
                  checked={extractSams}
                  onCheckedChange={setExtractSams}
                />
                <label htmlFor="sams" className="text-sm">
                  SAMS IDs (samsCmsComponent_*)
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={scrapeMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{scrapeMutation.isPending ? "Starting..." : "Start Scraping"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
