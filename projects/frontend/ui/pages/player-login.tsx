import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle, Mail, Lock, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

interface LoginResponse {
  message: string;
  account: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    samsPlayerId: string;
    verificationStatus: string;
  };
  isVerified: boolean;
}

export default function PlayerLogin() {
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await fetch("/api/player-accounts/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, passwordHash: btoa(data.password) }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return response.json() as Promise<LoginResponse>;
    },
    onSuccess: (data) => {
      if (data.message === "Login successful") {
        localStorage.setItem("playerSession", JSON.stringify(data.account));
        setLocation("/player-dashboard");
      }
    },
  });

  const onSubmit = (data: FormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Player Login</CardTitle>
          <CardDescription className="text-center">
            Access your volleyball team dashboard and training sessions
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loginMutation.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{(loginMutation.error as Error).message}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="your.email@example.com"
                          className="pl-10"
                          disabled={loginMutation.isPending}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10"
                          disabled={loginMutation.isPending}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
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
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <button
                onClick={() => setLocation("/player-register")}
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
