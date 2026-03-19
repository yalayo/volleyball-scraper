import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Play } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  url: z.string().url("Must be a valid URL"),
  leagueName: z.string().min(1, "League name is required"),
  category: z.string().min(1, "Category is required"),
});

type FormValues = z.infer<typeof schema>;

interface ScrapingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken?: string;
  apiBaseUrl?: string;
  onSuccess?: () => void;
}

export default function ScrapingModal({ open, onOpenChange, authToken, apiBaseUrl, onSuccess }: ScrapingModalProps) {
  const [error, setError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", leagueName: "", category: "" },
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setError("");
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: FormValues) => {
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const baseUrl = apiBaseUrl ?? "";
      const response = await fetch(`${baseUrl}/api/scrape`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as any).message || "Failed to start scraping operation.");
      }

      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to start scraping operation.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Scraping Operation</DialogTitle>
          <DialogDescription>
            Set up automated data extraction from volleyball league websites.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://ergebnisdienst.volleyball.nrw/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leagueName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>League Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Landesliga 3 Männer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="flex items-center space-x-2">
                <Play className="w-4 h-4" />
                <span>{form.formState.isSubmitting ? "Starting..." : "Start Scraping"}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
