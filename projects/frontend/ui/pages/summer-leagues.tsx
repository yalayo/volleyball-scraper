import React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, MapPin, Calendar, Trophy } from "lucide-react";

const createSummerLeagueSchema = z.object({
  name: z.string().min(1, "League name is required"),
  description: z.string().optional(),
  season: z.string().min(1, "Season is required"),
  maxTeams: z.number().min(4, "At least 4 teams required").max(32, "Maximum 32 teams"),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const applyToLeagueSchema = z.object({
  teamName: z.string().min(1, "Team name is required"),
  contactEmail: z.string().email("Valid email required"),
  contactPhone: z.string().optional(),
});

type CreateSummerLeagueForm = z.infer<typeof createSummerLeagueSchema>;
type ApplyToLeagueForm = z.infer<typeof applyToLeagueSchema>;

export default function SummerLeagues() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user/player account from session storage or context
  const playerAccount = JSON.parse(sessionStorage.getItem('playerAccount') || '{}');

  const { data: summerLeagues, isLoading } = useQuery({
    queryKey: ['/api/summer-leagues'],
    retry: false,
  });

  const { data: myApplications } = useQuery({
    queryKey: [`/api/summer-applications?captainId=${playerAccount?.id}`],
    enabled: !!playerAccount?.id,
    retry: false,
  });

  const createLeagueMutation = useMutation({
    mutationFn: async (data: CreateSummerLeagueForm) => {
      const response = await fetch('/api/summer-leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          creatorId: playerAccount.id,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Summer league created successfully!",
      });
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/summer-leagues'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create summer league",
        variant: "destructive",
      });
    },
  });

  const applyToLeagueMutation = useMutation({
    mutationFn: async (data: ApplyToLeagueForm) => {
      const response = await fetch('/api/summer-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          summerLeagueId: selectedLeagueId,
          captainId: playerAccount.id,
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Application submitted successfully!",
      });
      setApplyDialogOpen(false);
      setSelectedLeagueId(null);
      queryClient.invalidateQueries({ queryKey: [`/api/summer-applications?captainId=${playerAccount?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<CreateSummerLeagueForm>({
    resolver: zodResolver(createSummerLeagueSchema),
    defaultValues: {
      name: "",
      description: "",
      season: "2024-Summer",
      maxTeams: 16,
      location: "",
      startDate: "",
      endDate: "",
    },
  });

  const applyForm = useForm<ApplyToLeagueForm>({
    resolver: zodResolver(applyToLeagueSchema),
    defaultValues: {
      teamName: "",
      contactEmail: playerAccount?.email || "",
      contactPhone: "",
    },
  });

  const handleCreateLeague = (data: CreateSummerLeagueForm) => {
    createLeagueMutation.mutate(data);
  };

  const handleApplyToLeague = (data: ApplyToLeagueForm) => {
    applyToLeagueMutation.mutate(data);
  };

  const openApplyDialog = (leagueId: number) => {
    setSelectedLeagueId(leagueId);
    setApplyDialogOpen(true);
  };

  const hasAppliedToLeague = (leagueId: number) => {
    return myApplications?.some((app: any) => app.summerLeagueId === leagueId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Summer Leagues</h1>
            <p className="text-gray-600 mt-2">Join or create summer volleyball leagues</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create League
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Summer League</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateLeague)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>League Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Summer Championship 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="League description..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="season"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Season</FormLabel>
                          <FormControl>
                            <Input placeholder="2024-Summer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="maxTeams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Teams</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={createForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="City or venue..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLeagueMutation.isPending}>
                      {createLeagueMutation.isPending ? "Creating..." : "Create League"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {summerLeagues?.map((league: any) => (
            <Card key={league.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  {league.name}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {league.season}
                  </span>
                  {league.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {league.location}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {league.description && (
                  <p className="text-gray-600 mb-4">{league.description}</p>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    Max {league.maxTeams} teams
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    league.registrationOpen 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {league.registrationOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                
                {league.creator && (
                  <p className="text-xs text-gray-500 mb-4">
                    Created by: {league.creator.email}
                  </p>
                )}
                
                {league.registrationOpen && !hasAppliedToLeague(league.id) ? (
                  <Button 
                    onClick={() => openApplyDialog(league.id)}
                    className="w-full"
                  >
                    Apply with Team
                  </Button>
                ) : hasAppliedToLeague(league.id) ? (
                  <Button disabled className="w-full">
                    Application Submitted
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    Registration Closed
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Apply to League</DialogTitle>
            </DialogHeader>
            <Form {...applyForm}>
              <form onSubmit={applyForm.handleSubmit(handleApplyToLeague)} className="space-y-4">
                <FormField
                  control={applyForm.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your team name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={applyForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="team@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={applyForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setApplyDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={applyToLeagueMutation.isPending}>
                    {applyToLeagueMutation.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}