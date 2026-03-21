import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Book, ArrowLeft } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/app";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError("");
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes("weak") || msg.includes("easy to guess")) {
            setPasswordError(t.login.weakPassword);
          } else {
            toast({
              title: t.login.signUpFailed,
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }
        toast({
          title: t.login.welcomeToHomeShelf,
          description: t.login.accountCreated,
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: t.login.signInFailed,
            description: error.message,
            variant: "destructive",
          });
          return;
        }
      }
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({
          title: t.resetPassword.failed,
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t.resetPassword.resetEmailSent,
        description: t.resetPassword.resetEmailSentDesc,
      });
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="absolute right-4 top-4">
          <LanguageToggle />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Book className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">{t.resetPassword.forgotTitle}</CardTitle>
            <CardDescription>{t.resetPassword.forgotDescription}</CardDescription>
          </CardHeader>
          <form onSubmit={handleForgotPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">{t.login.email}</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder={t.login.emailPlaceholder}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.login.pleaseWait : t.resetPassword.sendResetLink}
              </Button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                {t.resetPassword.backToSignIn}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Book className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isSignUp ? t.login.createAccount : t.login.welcomeBack}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? t.login.getStarted
              : t.login.signInToManage}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">{t.login.displayName}</Label>
                <Input
                  id="displayName"
                  placeholder={t.login.displayNamePlaceholder}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.login.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.login.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.login.password}</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t.login.forgotPassword}
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.login.pleaseWait : isSignUp ? t.login.createAccountBtn : t.login.signIn}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? t.login.alreadyHaveAccount : t.login.dontHaveAccount}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {isSignUp ? t.login.signIn : t.login.signUp}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
