import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, CheckCircle, AlertCircle, User, Mail, Lock, IdCard } from "lucide-react";

const validateSchema = z.object({
  samsPlayerId: z.string().min(1, "SAMS Player ID is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ValidateValues = z.infer<typeof validateSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

interface PlayerRegisterProps {
  onSubmit?: (data: any) => void;
  isPending?: boolean;
  user?: any;
  showSignIn?: () => void;
  onGoHome?: () => void;
}

export default function PlayerRegister(props: PlayerRegisterProps) {
  const [step, setStep] = useState<"validate" | "register" | "success">("validate");
  const [verifiedSamsId, setVerifiedSamsId] = useState("");
  const [serverError, setServerError] = useState("");

  const validateForm = useForm<ValidateValues>({
    resolver: zodResolver(validateSchema),
    defaultValues: { samsPlayerId: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
  });

  const isPending = props.isPending ?? registerForm.formState.isSubmitting;

  const onValidate = async (data: ValidateValues) => {
    setServerError("");
    try {
      const response = await fetch("/api/player-accounts/validate-sams-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samsPlayerId: data.samsPlayerId.trim() }),
      });
      const body = await response.json();
      if (response.status === 200) {
        setVerifiedSamsId(body.samsPlayerId);
        setStep("register");
      } else {
        setServerError(body.message || "Validation failed");
      }
    } catch (err: any) {
      setServerError(err.message || "Validation failed");
    }
  };

  const onRegister = async (data: RegisterValues) => {
    setServerError("");

    if (props.onSubmit) {
      props.onSubmit({ ...data, samsPlayerId: verifiedSamsId });
      return;
    }

    try {
      const response = await fetch("/api/player-accounts/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          passwordHash: btoa(data.password),
          samsPlayerId: verifiedSamsId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      setStep("success");
    } catch (err: any) {
      setServerError(err.message || "Registration failed");
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-green-700">Registration Successful!</CardTitle>
            <CardDescription>Your volleyball player account has been created successfully.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Account Status: Pending Verification</strong>
                <br />
                Your account requires verification by 3 teammates or team management.
              </AlertDescription>
            </Alert>
            <Button onClick={props.showSignIn ?? (() => {})} className="w-full">
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
            {step === "validate" ? "Volleyball Player Registration" : "Complete Your Registration"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === "validate"
              ? "Enter your SAMS Player ID to verify your volleyball player status"
              : "Create your account with the verified player ID"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {serverError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {step === "validate" ? (
            <Form {...validateForm}>
              <form onSubmit={validateForm.handleSubmit(onValidate)} className="space-y-4">
                <FormField
                  control={validateForm.control}
                  name="samsPlayerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SAMS Player ID</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Enter your SAMS Player ID (e.g., 75996241)"
                            className="pl-10"
                            disabled={validateForm.formState.isSubmitting}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-500">
                        This ID links your account to your official volleyball player record.
                      </p>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={validateForm.formState.isSubmitting}>
                  {validateForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    "Validate Player ID"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input placeholder="First name" className="pl-10" disabled={isPending} {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input placeholder="Last name" className="pl-10" disabled={isPending} {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input type="email" placeholder="your.email@example.com" className="pl-10" disabled={isPending} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input type="password" placeholder="Choose a password (min 6 chars)" className="pl-10" disabled={isPending} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input type="password" placeholder="Confirm your password" className="pl-10" disabled={isPending} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    SAMS Player ID <strong>{verifiedSamsId}</strong> verified successfully.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep("validate")} disabled={isPending} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
