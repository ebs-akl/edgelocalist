/* AuthContext — central auth state for LocaList */
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useInactivityTimeout } from "@/hooks/use-inactivity-timeout";
import { tierFromProductId, type TierKey } from "@/lib/stripe-tiers";
import type { User, Session } from "@supabase/supabase-js";

export interface RepProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: string | null;
  ghl_location_id: string | null;
  rep_number: string | null;
}

export interface SubscriptionInfo {
  subscribed: boolean;
  tier: TierKey | null;
  productId: string | null;
  subscriptionEnd: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  repProfile: RepProfile | null;
  loadingProfile: boolean;
  subscription: SubscriptionInfo;
  loadingSubscription: boolean;
  ghlLocationId: string | null;
  ghlRepNum: string | null;
  ssoPayload: string | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  setSsoPayload: (payload: string | null) => void;
  setGhlLocationId: (id: string | null) => void;
  isGhlMode: boolean;
  isStandaloneMode: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getLocationIdFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("location_id") || null;
  } catch {
    return null;
  }
}

function getRepNumFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("rep_num") || null;
  } catch {
    return null;
  }
}

const initialGhlLocationId = getLocationIdFromUrl();
const initialGhlRepNum = getRepNumFromUrl();

const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  subscribed: false,
  tier: null,
  productId: null,
  subscriptionEnd: null,
};

const DEFAULT_STATE: AuthState = {
  user: null,
  session: null,
  loading: true,
  repProfile: null,
  loadingProfile: false,
  subscription: DEFAULT_SUBSCRIPTION,
  loadingSubscription: true,
  ghlLocationId: initialGhlLocationId,
  ghlRepNum: initialGhlRepNum,
  ssoPayload: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(DEFAULT_STATE);
  const navigate = useNavigate();
  const subIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const locId = searchParams.get("location_id");
    const repNum = searchParams.get("rep_num");
    if (locId && locId !== state.ghlLocationId) {
      setState((s) => ({ ...s, ghlLocationId: locId, loading: false }));
    }
    if (repNum && repNum !== state.ghlRepNum) {
      setState((s) => ({ ...s, ghlRepNum: repNum }));
    }
  }, [searchParams]);

  // ── Subscription check ──
  const checkSubscription = useCallback(async (session: Session | null) => {
    if (!session) {
      setState((s) => ({ ...s, subscription: DEFAULT_SUBSCRIPTION, loadingSubscription: false }));
      return;
    }
    setState((s) => ({ ...s, loadingSubscription: true }));
    try {
      const { data, error } = await supabase.functions.invoke("localist-check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      const tier = tierFromProductId(data?.product_id ?? null);
      setState((s) => ({
        ...s,
        subscription: {
          subscribed: !!data?.subscribed,
          tier,
          productId: data?.product_id ?? null,
          subscriptionEnd: data?.subscription_end ?? null,
        },
        loadingSubscription: false,
      }));
    } catch (err) {
      console.error("[AuthContext] subscription check failed", err);
      setState((s) => ({ ...s, loadingSubscription: false }));
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    await checkSubscription(state.session);
  }, [state.session, checkSubscription]);

  // ── Rep profile ──
  const fetchRepProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setState((s) => ({ ...s, repProfile: null, loadingProfile: false }));
      return;
    }
    setState((s) => ({ ...s, loadingProfile: true }));
    try {
      const { data } = await supabase.rpc("get_my_rep_profile");
      const profile = Array.isArray(data) ? data[0] ?? null : data;
      setState((s) => ({ ...s, repProfile: profile as RepProfile | null, loadingProfile: false }));
    } catch {
      setState((s) => ({ ...s, repProfile: null, loadingProfile: false }));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchRepProfile(state.user?.id);
  }, [state.user?.id, fetchRepProfile]);

  // ── Auth listener ──
  useEffect(() => {
    const syncSessionState = (session: Session | null) => {
      setState((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: false,
        subscription: session ? s.subscription : DEFAULT_SUBSCRIPTION,
        loadingSubscription: !!session,
      }));
      setTimeout(() => fetchRepProfile(session?.user?.id), 0);
      setTimeout(() => checkSubscription(session), 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSessionState(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSessionState(session);
    });

    return () => subscription.unsubscribe();
  }, [fetchRepProfile, checkSubscription]);

  // Periodic subscription refresh (every 60s)
  useEffect(() => {
    if (state.session) {
      subIntervalRef.current = setInterval(() => checkSubscription(state.session), 60_000);
    }
    return () => {
      if (subIntervalRef.current) clearInterval(subIntervalRef.current);
    };
  }, [state.session, checkSubscription]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ ...DEFAULT_STATE, loading: false, ghlLocationId: null });
    navigate("/auth", { replace: true });
  }, [navigate]);

  useInactivityTimeout(signOut, !!state.user);

  const setSsoPayload = useCallback((payload: string | null) => {
    setState((s) => ({ ...s, ssoPayload: payload }));
  }, []);

  const setGhlLocationId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, ghlLocationId: id, loading: false }));
  }, []);

  const isGhlMode = !!state.ghlLocationId;
  const isStandaloneMode = !isGhlMode && !!state.user;
  const isAuthenticated = !!state.user;

  return (
    <AuthContext.Provider
      value={{ ...state, signOut, refreshProfile, refreshSubscription, setSsoPayload, setGhlLocationId, isGhlMode, isStandaloneMode, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
