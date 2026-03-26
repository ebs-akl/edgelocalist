import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { validatePasswordStrength } from "@/lib/password-validation";
import Footer from "@/components/Footer";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [repNumber, setRepNumber] = useState("");
  const [repError, setRepError] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, loadingSubscription, subscription } = useAuth();

  useEffect(() => {
    if (authLoading || loadingSubscription || !isAuthenticated) return;

    if (subscription.subscribed && subscription.tier) {
      navigate("/dashboard", { replace: true });
    } else if (localStorage.getItem("pending_checkout_tier")) {
      navigate("/", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, loadingSubscription, navigate, subscription.subscribed, subscription.tier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter email and password.", variant: "destructive" });
      return;
    }
    if (!isLogin) {
      if (!repNumber.trim() || !/^\d{8}$/.test(repNumber.trim())) {
        toast({ title: "Rep Number Required", description: "Enter your 8-digit Cutco rep number.", variant: "destructive" });
        return;
      }
      const strength = validatePasswordStrength(password);
      if (!strength.valid) {
        toast({ title: "Weak password", description: strength.message, variant: "destructive" });
        return;
      }
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem("localist_keep_signed_in", keepSignedIn ? "1" : "0");
        toast({ title: "Welcome back!" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `https://edgelocalist.lovable.app/auth` },
        });
        if (error) throw error;
        if (data.user) {
          // handle_new_user trigger creates the row; update it with full_name & rep_number
          // Use rpc or a direct update (row belongs to this user via RLS)
          await supabase
            .from("localist_reps")
            .update({
              full_name: fullName.trim() || email,
              rep_number: repNumber.trim(),
            })
            .eq("id", data.user.id);
        }
        toast({
          title: "Account created!",
          description: "Redirecting you to choose a plan…",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      // Show generic error for signup to prevent information disclosure
      const userMessage = isLogin ? message : "Signup failed. Please try again or contact support.";
      toast({ title: "Error", description: userMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email", description: "We'll send you a secure login link.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `https://edgelocalist.lovable.app/dashboard` },
      });
      if (error) throw error;
      toast({ title: "Check your email!", description: "We sent you a secure login link." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-reset-email", {
        body: { email, redirectTo: "https://edgelocalist.lovable.app/reset-password" },
      });
      if (error) throw error;
      toast({ title: "Reset link sent", description: "Check your inbox." });
      setForgotPassword(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-2">
              <img src="/lovable-uploads/localist-final-logo-2.png" alt="AKL LocaList" className="h-14 w-auto object-contain" />
            </div>
            <CardTitle className="text-base font-normal">
              {forgotPassword
                ? "Reset your password"
                : useMagicLink
                ? "Sign in with Magic Link"
                : isLogin
                ? "Sign in to your dashboard"
                : "Create your account"}
            </CardTitle>
            <CardDescription className="text-xs">
              <a href="mailto:support@edgedms.com" className="text-primary hover:underline">
                Need help? Contact support
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ fontSize: "16px" }}
                    required
                  />
                </div>
                <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setForgotPassword(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Back to sign in
                  </button>
                </p>
              </form>
            ) : useMagicLink ? (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send you a secure login link — no password needed.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ fontSize: "16px" }}
                    required
                  />
                </div>
                <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Magic Link
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in with password instead
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Smith"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repNumber">Cutco Rep Number <span className="text-destructive">*</span></Label>
                      <Input
                        id="repNumber"
                        value={repNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                          setRepNumber(val);
                          if (val.length > 0 && val.length !== 8) {
                            setRepError("Rep Number must be exactly 8 digits (0-9 only).");
                          } else {
                            setRepError("");
                          }
                        }}
                        placeholder="e.g. 12345678"
                        maxLength={8}
                        inputMode="numeric"
                        pattern="\d{8}"
                        required
                        style={{ fontSize: "16px" }}
                        className={repError ? "border-destructive" : ""}
                      />
                      {repError ? (
                        <p className="text-xs text-destructive">{repError}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Required — exactly 8 digits. Cannot be changed later.</p>
                      )}
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ fontSize: "16px" }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ fontSize: "16px" }}
                    required
                  />
                </div>
                {isLogin && (
                  <div className="flex items-center justify-between -mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={keepSignedIn}
                        onCheckedChange={(v) => setKeepSignedIn(!!v)}
                      />
                      <span className="text-xs text-muted-foreground select-none">Keep me signed in</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotPassword(true)}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                <Button type="submit" className="w-full min-h-[44px]" disabled={loading || (!isLogin && !/^\d{8}$/.test(repNumber))}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? "Sign In" : "Create Account"}
                </Button>
                {isLogin && (
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                )}
                {isLogin && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-h-[44px]"
                    onClick={() => setUseMagicLink(true)}
                  >
                    Sign in with Magic Link
                  </Button>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  {isLogin ? "No account? " : "Already have one? "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary hover:underline font-medium"
                  >
                    {isLogin ? "Sign up free" : "Sign in"}
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
