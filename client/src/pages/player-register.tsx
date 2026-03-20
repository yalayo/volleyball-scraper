import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, User, Mail, Lock, IdCard } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import LanguageSwitcher from "@/components/ui/language-switcher";

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
  const { t } = useTranslation();
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

  const validateMutation = useMutation({
    mutationFn: async (samsId: string) => {
      const response = await fetch('/api/player-accounts/validate-sams-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samsPlayerId: samsId })
      });

      const data = await response.json();

      if (response.status === 200) {
        return { ...data, canProceed: true };
      } else if (response.status === 409) {
        throw new Error(data.message || 'Account already exists');
      } else if (response.status === 404) {
        throw new Error(data.message || 'Player ID not found');
      } else {
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

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
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
      setErrors([t("playerRegister.samsIdError")]);
      return;
    }

    validateMutation.mutate(samsPlayerId.trim());
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const newErrors: string[] = [];
    if (!registrationData.firstName.trim()) newErrors.push(t("playerRegister.errorFirstName"));
    if (!registrationData.lastName.trim()) newErrors.push(t("playerRegister.errorLastName"));
    if (!registrationData.email.trim()) newErrors.push(t("playerRegister.errorEmail"));
    if (!registrationData.password) newErrors.push(t("playerRegister.errorPassword"));
    if (registrationData.password !== registrationData.confirmPassword) {
      newErrors.push(t("playerRegister.errorPasswordMatch"));
    }
    if (registrationData.password && registrationData.password.length < 6) {
      newErrors.push(t("playerRegister.errorPasswordLength"));
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
            <CardTitle className="text-2xl font-bold text-green-700">
              {t("playerRegister.successTitle")}
            </CardTitle>
            <CardDescription>{t("playerRegister.successDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t("playerRegister.pendingVerificationTitle")}</strong><br />
                {t("playerRegister.pendingVerificationText")}
              </AlertDescription>
            </Alert>
            <Button onClick={() => window.location.href = '/player-login'} className="w-full">
              {t("playerRegister.goToLogin")}
            </Button>
          </CardContent>
        </Card>
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
              {step === 'validate' ? t("playerRegister.titleValidate") : t("playerRegister.titleRegister")}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'validate'
                ? t("playerRegister.subtitleValidate")
                : t("playerRegister.subtitleRegister")}
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
                  <Label htmlFor="samsPlayerId">{t("playerRegister.samsIdLabel")}</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="samsPlayerId"
                      type="text"
                      placeholder={t("playerRegister.samsIdPlaceholder")}
                      value={samsPlayerId}
                      onChange={(e) => setSamsPlayerId(e.target.value)}
                      className="pl-10"
                      disabled={validateMutation.isPending}
                    />
                  </div>
                  <p className="text-sm text-gray-500">{t("playerRegister.samsIdHint")}</p>
                </div>

                <Button type="submit" className="w-full" disabled={validateMutation.isPending}>
                  {validateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("playerRegister.validating")}
                    </>
                  ) : (
                    t("playerRegister.validate")
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("common.firstName")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder={t("playerRegister.firstNamePlaceholder")}
                        value={registrationData.firstName}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="pl-10"
                        disabled={registerMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("common.lastName")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder={t("playerRegister.lastNamePlaceholder")}
                        value={registrationData.lastName}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="pl-10"
                        disabled={registerMutation.isPending}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("common.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("playerRegister.emailPlaceholder")}
                      value={registrationData.email}
                      onChange={(e) => setRegistrationData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                      disabled={registerMutation.isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("playerRegister.passwordLabel")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("playerRegister.passwordPlaceholder")}
                      value={registrationData.password}
                      onChange={(e) => setRegistrationData(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-10"
                      disabled={registerMutation.isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("playerRegister.confirmPasswordLabel")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t("playerRegister.confirmPasswordPlaceholder")}
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
                    {t("playerRegister.samsIdVerified", { id: registrationData.samsPlayerId })}
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
                    {t("common.back")}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
