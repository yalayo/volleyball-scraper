import React from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, CheckCircle, AlertCircle, Users, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiBaseUrl } from "@/lib/api-url";

interface VerificationGateProps {
  playerAccount: any;
  onVerified: () => void;
}

export default function VerificationGate({ playerAccount, onVerified }: VerificationGateProps) {
  const [samsIdToVerify, setSamsIdToVerify] = useState("");
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [isLoadingPlayerInfo, setIsLoadingPlayerInfo] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get verification progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: [`/api/verification-progress?playerAccountId=${playerAccount?.id}`],
    enabled: !!playerAccount?.id,
    retry: false,
  });

  // Function to fetch player info by SAMS ID
  const fetchPlayerInfo = async (samsId: string) => {
    if (!samsId.trim()) {
      setPlayerInfo(null);
      return;
    }

    // Check if trying to verify themselves
    if (samsId === playerAccount?.samsPlayerId) {
      toast({
        title: "Error",
        description: "You cannot verify yourself",
        variant: "destructive",
      });
      setPlayerInfo(null);
      return;
    }

    setIsLoadingPlayerInfo(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/player-info/${samsId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const info = await response.json();
      setPlayerInfo(info);
    } catch (error: any) {
      setPlayerInfo(null);
      if (error.message.includes('404')) {
        toast({
          title: "Player Not Found",
          description: "No player found with this SAMS ID",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingPlayerInfo(false);
    }
  };

  // Verify another player mutation
  const verifyPlayerMutation = useMutation({
    mutationFn: async (targetSamsId: string) => {
      const response = await fetch(`${getApiBaseUrl()}/api/verify-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifierPlayerId: playerAccount.id,
          targetSamsId,
          isTrainer: false
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
        description: "Player verification completed successfully!",
      });
      setIsVerifyDialogOpen(false);
      setSamsIdToVerify("");
      setPlayerInfo(null);
      queryClient.invalidateQueries({ queryKey: ['/api/verification-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/player-account/check-verification'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify player",
        variant: "destructive",
      });
    },
  });

  if (progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verification status...</p>
        </div>
      </div>
    );
  }

  // If fully verified, allow access
  if (progress && typeof progress === 'object' && 'isFullyVerified' in progress && progress.isFullyVerified) {
    onVerified();
    return null;
  }

  const progressData = progress && typeof progress === 'object' && 'isFullyVerified' in progress ? progress as {
    teammateVerifications: number;
    trainerVerification: boolean;
    adminVerification: boolean;
    totalNeeded: number;
    isFullyVerified: boolean;
  } : null;
  const verificationPercentage = progressData ? Math.round((progressData.teammateVerifications / progressData.totalNeeded) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Verification Required</h1>
          <p className="text-gray-600">Your account needs to be verified by teammates before you can access team features.</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Verification Progress
            </CardTitle>
            <CardDescription>
              You need {progressData?.totalNeeded || 3} teammate verifications to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Teammate Verifications</span>
                <span>{progressData?.teammateVerifications || 0} / {progressData?.totalNeeded || 3}</span>
              </div>
              <Progress value={verificationPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Teammate Verifications</p>
                  <p className="text-xs text-gray-600">{progressData?.teammateVerifications || 0} received</p>
                </div>
                {(progressData?.teammateVerifications || 0) >= (progressData?.totalNeeded || 3) && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-sm">Trainer Verification</p>
                  <p className="text-xs text-gray-600">
                    {progressData?.trainerVerification ? "Verified" : "Pending"}
                  </p>
                </div>
                {progressData?.trainerVerification && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-sm">Admin Verification</p>
                  <p className="text-xs text-gray-600">
                    {progressData?.adminVerification ? "Verified" : "Pending"}
                  </p>
                </div>
                {progressData?.adminVerification && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Help Verify Other Players</CardTitle>
            <CardDescription>
              Verify your teammates to help them access their dashboards. You can verify players using their SAMS player ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Verify a Teammate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Verify Teammate</DialogTitle>
                  <DialogDescription>
                    Enter the SAMS player ID of the teammate you want to verify.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="samsId">SAMS Player ID</Label>
                    <Input
                      id="samsId"
                      value={samsIdToVerify}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSamsIdToVerify(value);
                        if (value.length >= 3) {
                          fetchPlayerInfo(value);
                        } else {
                          setPlayerInfo(null);
                        }
                      }}
                      placeholder="Enter SAMS player ID"
                    />
                    {isLoadingPlayerInfo && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Loading player info...
                      </div>
                    )}
                    {playerInfo && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="text-sm">
                          <p className="font-medium text-green-800">{playerInfo.name}</p>
                          {playerInfo.position && (
                            <p className="text-green-600">Position: {playerInfo.position}</p>
                          )}
                          {playerInfo.jerseyNumber && (
                            <p className="text-green-600">Jersey: #{playerInfo.jerseyNumber}</p>
                          )}
                          {playerInfo.team && (
                            <p className="text-green-600">Team: {playerInfo.team.name}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {samsIdToVerify.length >= 3 && !isLoadingPlayerInfo && !playerInfo && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">No player found with this SAMS ID</p>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsVerifyDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => verifyPlayerMutation.mutate(samsIdToVerify)}
                    disabled={!playerInfo || verifyPlayerMutation.isPending}
                  >
                    {verifyPlayerMutation.isPending ? "Verifying..." : "Verify Player"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-blue-800 mb-2">
              <strong>Your SAMS Player ID:</strong> {playerAccount?.samsPlayerId}
            </p>
            <p className="text-xs text-blue-600">
              Share this ID with your teammates so they can verify you!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}