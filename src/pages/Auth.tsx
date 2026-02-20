import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";
import Footer from "@/components/Footer";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter email and password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        // Create localist_reps record
        if (data.user) {
          await supabase.from("localist_reps").upsert({
            id: data.user.id,
            email,
            full_name: fullName.trim() || email,
            subscription_tier: 'standalone',
          }, { onConflict: 'id' });
        }
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to activate your account.",
        });
      }
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
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
            <div className="flex items-center justify-center gap-2 mb-2">
              <MapPin className="h-7 w-7 text-primary" />
              <span className="text-2xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                EdgeLocalist
              </span>
            </div>
            <CardTitle className="text-base font-normal">
              {forgotPassword
                ? "Reset your password"
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
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
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
                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => setForgotPassword(true)}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? "Sign In" : "Create Account"}
                </Button>
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
