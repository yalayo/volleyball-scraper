import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Mail, Lock, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import LanguageSwitcher from "@/components/ui/language-switcher";

interface LoginData {
  email: string;
  password: string;
}

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
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState<LoginData>({ email: '', password: '' });
  const [errors, setErrors] = useState<string[]>([]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await fetch('/api/player-accounts/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          passwordHash: btoa(data.password)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      return response.json();
    },
    onSuccess: (data: LoginResponse) => {
      if (data.message === "Login successful") {
        localStorage.setItem('playerSession', JSON.stringify(data.account));
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
    if (!loginData.email.trim()) newErrors.push(t("playerLogin.errorEmail"));
    if (!loginData.password) newErrors.push(t("playerLogin.errorPassword"));

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    loginMutation.mutate(loginData);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {t("playerLogin.title")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("playerLogin.subtitle")}
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
                <Label htmlFor="email">{t("common.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("playerLogin.emailPlaceholder")}
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("playerLogin.passwordPlaceholder")}
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

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

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t("playerLogin.noAccount")}{' '}
                <button
                  onClick={() => setLocation('/player-register')}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  {t("playerLogin.registerLink")}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
