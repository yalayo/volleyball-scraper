import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, User, Mail, Lock, IdCard } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface ValidationResponse {
  isValid: boolean;
  samsPlayerId: string;
  message?: string;
}

interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  samsPlayerId: string;
}

export default function PlayerRegister() {
  const [step, setStep] = useState<'validate' | 'register' | 'success'>('validate');
  const [samsPlayerId, setSamsPlayerId] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    samsPlayerId: ''
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Validate SAMS Player ID
  const validateMutation = useMutation({
    mutationFn: async (samsId: string) => {
      const response = await fetch('/api/player-accounts/validate-sams-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samsPlayerId: samsId })
      });
      
      const data = await response.json();
      
      // Handle all response cases
      if (response.status === 200) {
        // Valid player ID, no account exists - proceed to registration
        return { ...data, canProceed: true };
      } else if (response.status === 409) {
        // Valid player ID but account exists - show error
        throw new Error(data.message || 'Account already exists');
      } else if (response.status === 404) {
        // Invalid player ID - show error
        throw new Error(data.message || 'Player ID not found');
      } else {
        // Other errors
        throw new Error(data.message || 'Validation failed');
      }
    },
    onSuccess: (data: ValidationResponse & { canProceed?: boolean }) => {
      if (data.canProceed) {
        setValidationResult(data);
        setRegistrationData(prev => ({ ...prev, samsPlayerId: data.samsPlayerId }));
        setStep('register');
        setErrors([]);
      }
    },
    onError: (error: Error) => {
      setErrors([error.message]);
      setValidationResult(null);
    }
  });

  // Register player account
  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      // Simple password hashing (in production, use proper bcrypt)
      const passwordHash = btoa(data.password);
      
      const response = await fetch('/api/player-accounts/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          passwordHash,
          password: undefined,
          confirmPassword: undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setStep('success');
    },
    onError: (error: Error) => {
      setErrors([error.message]);
    }
  });

  const handleValidateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    
    if (!samsPlayerId.trim()) {
      setErrors(['Please enter your SAMS Player ID']);
      return;
    }
    
    validateMutation.mutate(samsPlayerId.trim());
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    
    const newErrors: string[] = [];
    
    if (!registrationData.firstName.trim()) newErrors.push('First name is required');
    if (!registrationData.lastName.trim()) newErrors.push('Last name is required');
    if (!registrationData.email.trim()) newErrors.push('Email is required');
    if (!registrationData.password) newErrors.push('Password is required');
    if (registrationData.password !== registrationData.confirmPassword) {
      newErrors.push('Passwords do not match');
    }
    if (registrationData.password && registrationData.password.length < 6) {
      newErrors.push('Password must be at least 6 characters long');
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    registerMutation.mutate(registrationData);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-green-700">Registration Successful!</CardTitle>
            <CardDescription>
              Your volleyball player account has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Account Status: Pending Verification</strong><br/>
                Your account requires verification by 3 teammates or team management to ensure player identity. 
                Contact your teammates or trainer to validate your account.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = '/player-login'} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {step === 'validate' ? 'Volleyball Player Registration' : 'Complete Your Registration'}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 'validate' 
              ? 'Enter your SAMS Player ID to verify your volleyball player status'
              : 'Create your account with the verified player ID'
            }
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

          {step === 'validate' ? (
            <form onSubmit={handleValidateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="samsPlayerId">SAMS Player ID</Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="samsPlayerId"
                    type="text"
                    placeholder="Enter your SAMS Player ID (e.g., 75996241)"
                    value={samsPlayerId}
                    onChange={(e) => setSamsPlayerId(e.target.value)}
                    className="pl-10"
                    disabled={validateMutation.isPending}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  This ID links your account to your official volleyball player record in the SAMS system.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate Player ID'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={registrationData.firstName}
                      onChange={(e) => setRegistrationData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="pl-10"
                      disabled={registerMutation.isPending}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={registrationData.lastName}
                      onChange={(e) => setRegistrationData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="pl-10"
                      disabled={registerMutation.isPending}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={registrationData.email}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    disabled={registerMutation.isPending}
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
                    placeholder="Choose a password"
                    value={registrationData.password}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                    disabled={registerMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={registrationData.confirmPassword}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10"
                    disabled={registerMutation.isPending}
                  />
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  SAMS Player ID <strong>{registrationData.samsPlayerId}</strong> verified successfully.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('validate')}
                  disabled={registerMutation.isPending}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}