import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface RepProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: 'standalone' | 'edgedms' | null;
  ghl_location_id: string | null;
  ghl_access_token: string | null;
  stripe_customer_id: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  repProfile: RepProfile | null;
  loadingProfile: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isGhlMode: boolean;
  isStandaloneMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_STATE: AuthState = {
  user: null,
  session: null,
  loading: true,
  repProfile: null,
  loadingProfile: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(DEFAULT_STATE);
  const navigate = useNavigate();

  const fetchRepProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setState((s) => ({ ...s, repProfile: null, loadingProfile: false }));
      return;
    }
    setState((s) => ({ ...s, loadingProfile: true }));
    try {
      const { data } = await supabase
        .from("localist_reps")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      setState((s) => ({ ...s, repProfile: data as RepProfile | null, loadingProfile: false }));
    } catch {
      setState((s) => ({ ...s, repProfile: null, loadingProfile: false }));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchRepProfile(state.user?.id);
  }, [state.user?.id, fetchRepProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, session, user: session?.user ?? null, loading: false }));
      setTimeout(() => fetchRepProfile(session?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((s) => ({ ...s, session, user: session?.user ?? null, loading: false }));
      setTimeout(() => fetchRepProfile(session?.user?.id), 0);
    });

    return () => subscription.unsubscribe();
  }, [fetchRepProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ ...DEFAULT_STATE, loading: false });
    navigate("/auth", { replace: true });
  }, [navigate]);

  const isGhlMode = !!(state.repProfile?.subscription_tier === 'edgedms' && state.repProfile?.ghl_location_id);
  const isStandaloneMode = state.repProfile?.subscription_tier === 'standalone' || !isGhlMode;

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshProfile, isGhlMode, isStandaloneMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
