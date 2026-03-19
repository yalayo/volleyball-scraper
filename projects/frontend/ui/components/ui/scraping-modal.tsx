import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play } from "lucide-react";

interface ScrapingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ScrapingModal({ open, onOpenChange, onSuccess }: ScrapingModalProps) {
  const [url, setUrl] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [category, setCategory] = useState("");
  const [extractTeams, setExtractTeams] = useState(true);
  const [extractSeries, setExtractSeries] = useState(true);
  const [extractSams, setExtractSams] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setUrl("");
    setLeagueName("");
    setCategory("");
    setExtractTeams(true);
    setExtractSeries(true);
    setExtractSams(true);
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url || !leagueName || !category) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, leagueName, category }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as any).message || "Failed to start scraping operation.");
      }

      setSuccess(true);
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to start scraping operation.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); onOpenChange(isOpen); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Scraping Operation</DialogTitle>
          <DialogDescription>
            Set up automated data extraction from volleyball league websites to collect team information, player rosters, and match data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
            <Select value={category} onValueChange={setCategory}>
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
                  onCheckedChange={(checked) => setExtractTeams(checked === true)}
                />
                <label htmlFor="teams" className="text-sm">
                  Team Information (Names, IDs, Homepages, Logos)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="series"
                  checked={extractSeries}
                  onCheckedChange={(checked) => setExtractSeries(checked === true)}
                />
                <label htmlFor="series" className="text-sm">
                  Series IDs (LeaguePresenter.matchSeriesId)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sams"
                  checked={extractSams}
                  onCheckedChange={(checked) => setExtractSams(checked === true)}
                />
                <label htmlFor="sams" className="text-sm">
                  Player Rosters (from team detail pages)
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{isPending ? "Starting..." : "Start Scraping"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
