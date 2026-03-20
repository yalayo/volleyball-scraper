import React from "react";
import { useTranslation } from "react-i18next";
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
import LanguageSwitcher from "@/components/ui/language-switcher";

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

interface PlayerLoginProps {
  onLoginSuccess?: () => void;
  onRegister?: () => void;
  onGoHome?: () => void;
}

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function PlayerLogin(props: PlayerLoginProps) {
  const { t } = useTranslation();

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
        if (props.onLoginSuccess) {
          props.onLoginSuccess();
        } else {
          window.location.href = "/player-dashboard";
        }
      }
    },
  });

  const onSubmit = (data: FormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">{t("playerLogin.title")}</CardTitle>
            <CardDescription className="text-center">
              {t("playerLogin.subtitle")}
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
                      <FormLabel>{t("common.email")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder={t("playerLogin.emailPlaceholder")}
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
                      <FormLabel>{t("common.password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="password"
                            placeholder={t("playerLogin.passwordPlaceholder")}
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
                      {t("common.signingIn")}
                    </>
                  ) : (
                    <>
                      {t("common.signIn")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                {t("playerLogin.noAccount")}{" "}
                <button
                  onClick={props.onRegister ?? (() => { window.location.href = "/player-register"; })}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  {t("playerLogin.registerLink")}
                </button>
              </p>
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={props.onGoHome ?? (() => { window.location.href = "/"; })}
                >
                  {t("nav.backToHome")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
