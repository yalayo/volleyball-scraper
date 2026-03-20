import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, CheckCircle, AlertCircle, User, Mail, Lock, IdCard } from "lucide-react";
import LanguageSwitcher from "@/components/ui/language-switcher";

type ValidateValues = { samsPlayerId: string };
type RegisterValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

interface PlayerRegisterProps {
  onSubmit?: (data: any) => void;
  isPending?: boolean;
  user?: any;
  showSignIn?: () => void;
  onGoHome?: () => void;
}

export default function PlayerRegister(props: PlayerRegisterProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"validate" | "register" | "success">("validate");
  const [verifiedSamsId, setVerifiedSamsId] = useState("");
  const [serverError, setServerError] = useState("");

  const validateSchema = z.object({
    samsPlayerId: z.string().min(1, t("playerRegister.samsIdError")),
  });

  const registerSchema = z.object({
    firstName: z.string().min(1, t("playerRegister.errorFirstName")),
    lastName: z.string().min(1, t("playerRegister.errorLastName")),
    email: z.string().min(1, t("playerRegister.errorEmail")).email(t("adminLogin.errorCredentials")),
    password: z.string().min(6, t("playerRegister.errorPasswordLength")),
    confirmPassword: z.string().min(1, t("playerRegister.errorPassword")),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t("playerRegister.errorPasswordMatch"),
    path: ["confirmPassword"],
  });

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
        setServerError(body.message || t("playerRegister.samsIdError"));
      }
    } catch (err: any) {
      setServerError(err.message || t("playerRegister.samsIdError"));
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
        throw new Error(error.message || t("playerRegister.errorPassword"));
      }
      setStep("success");
    } catch (err: any) {
      setServerError(err.message || t("playerRegister.errorPassword"));
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold text-green-700">{t("playerRegister.successTitle")}</CardTitle>
              <CardDescription>{t("playerRegister.successDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t("playerRegister.pendingVerificationTitle")}</strong>
                  <br />
                  {t("playerRegister.pendingVerificationText")}
                </AlertDescription>
              </Alert>
              <Button onClick={props.showSignIn ?? (() => {})} className="w-full">
                {t("playerRegister.goToLogin")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {step === "validate" ? t("playerRegister.titleValidate") : t("playerRegister.titleRegister")}
            </CardTitle>
            <CardDescription className="text-center">
              {step === "validate"
                ? t("playerRegister.subtitleValidate")
                : t("playerRegister.subtitleRegister")}
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
                        <FormLabel>{t("playerRegister.samsIdLabel")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IdCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder={t("playerRegister.samsIdPlaceholder")}
                              className="pl-10"
                              disabled={validateForm.formState.isSubmitting}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-500">
                          {t("playerRegister.samsIdHint")}
                        </p>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={validateForm.formState.isSubmitting}>
                    {validateForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("playerRegister.validating")}
                      </>
                    ) : (
                      t("playerRegister.validate")
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
                          <FormLabel>{t("common.firstName")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input placeholder={t("playerRegister.firstNamePlaceholder")} className="pl-10" disabled={isPending} {...field} />
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
                          <FormLabel>{t("common.lastName")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input placeholder={t("playerRegister.lastNamePlaceholder")} className="pl-10" disabled={isPending} {...field} />
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
                        <FormLabel>{t("common.email")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input type="email" placeholder={t("playerRegister.emailPlaceholder")} className="pl-10" disabled={isPending} {...field} />
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
                        <FormLabel>{t("playerRegister.passwordLabel")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input type="password" placeholder={t("playerRegister.passwordPlaceholder")} className="pl-10" disabled={isPending} {...field} />
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
                        <FormLabel>{t("playerRegister.confirmPasswordLabel")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input type="password" placeholder={t("playerRegister.confirmPasswordPlaceholder")} className="pl-10" disabled={isPending} {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t("playerRegister.samsIdVerified", { id: verifiedSamsId })}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep("validate")} disabled={isPending} className="flex-1">
                      {t("common.back")}
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("playerRegister.creating")}
                        </>
                      ) : (
                        t("playerRegister.createAccount")
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
