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

interface VerificationGateProps {
  playerAccount: any;
  onVerified: () => void;
}

export default function VerificationGate({ playerAccount, onVerified }: VerificationGateProps) {
  const [samsIdToVerify, setSamsIdToVerify] = useState("");
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get verification progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['/api/verification-progress', playerAccount?.id],
    enabled: !!playerAccount?.id,
    retry: false,
  });

  // Verify another player mutation
  const verifyPlayerMutation = useMutation({
    mutationFn: async (targetSamsId: string) => {
      return await apiRequest('/api/verify-player', {
        method: 'POST',
        body: JSON.stringify({
          verifierPlayerId: playerAccount.id,
          targetSamsId,
          isTrainer: false
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Player verification completed successfully!",
      });
      setIsVerifyDialogOpen(false);
      setSamsIdToVerify("");
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
  if (progress?.isFullyVerified) {
    onVerified();
    return null;
  }

  const verificationPercentage = progress ? Math.round((progress.teammateVerifications / progress.totalNeeded) * 100) : 0;

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
              You need {progress?.totalNeeded || 3} teammate verifications to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Teammate Verifications</span>
                <span>{progress?.teammateVerifications || 0} / {progress?.totalNeeded || 3}</span>
              </div>
              <Progress value={verificationPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Teammate Verifications</p>
                  <p className="text-xs text-gray-600">{progress?.teammateVerifications || 0} received</p>
                </div>
                {(progress?.teammateVerifications || 0) >= (progress?.totalNeeded || 3) && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-sm">Trainer Verification</p>
                  <p className="text-xs text-gray-600">
                    {progress?.trainerVerification ? "Verified" : "Pending"}
                  </p>
                </div>
                {progress?.trainerVerification && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-sm">Admin Verification</p>
                  <p className="text-xs text-gray-600">
                    {progress?.adminVerification ? "Verified" : "Pending"}
                  </p>
                </div>
                {progress?.adminVerification && (
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
                      onChange={(e) => setSamsIdToVerify(e.target.value)}
                      placeholder="Enter SAMS player ID"
                    />
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
                    disabled={!samsIdToVerify.trim() || verifyPlayerMutation.isPending}
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