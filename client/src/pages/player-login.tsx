import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  player: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    samsPlayerId: string;
    verificationStatus: string;
  };
  token?: string;
}

export default function PlayerLogin() {
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await fetch('/api/player-accounts/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          passwordHash: btoa(data.password) // Simple encoding - in production use proper hashing
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (data: LoginResponse) => {
      if (data.success) {
        // Store player data in localStorage for session management
        localStorage.setItem('playerSession', JSON.stringify(data.player));
        setLocation('/player-dashboard');
      }
    },
    onError: (error: Error) => {
      setErrors([error.message]);
    }
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    
    const newErrors: string[] = [];
    
    if (!loginData.email.trim()) newErrors.push('Email is required');
    if (!loginData.password) newErrors.push('Password is required');
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    loginMutation.mutate(loginData);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Player Login
          </CardTitle>
          <CardDescription className="text-center">
            Access your volleyball team dashboard and training sessions
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {errors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button 
                onClick={() => setLocation('/player-register')}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Register as Player
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}