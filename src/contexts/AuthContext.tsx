import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface RepProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: 'standalone' | 'edgedms' | null;
  ghl_location_id: string | null;
  rep_number: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  repProfile: RepProfile | null;
  loadingProfile: boolean;
  /** Set when the app is loaded inside a GHL iframe with ?location_id=... */
  ghlLocationId: string | null;
  /** Rep number from URL (?rep_num=...) used for account merge handshake */
  ghlRepNum: string | null;
  /** Encrypted SSO payload from GHL Custom Page handshake */
  ssoPayload: string | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setSsoPayload: (payload: string | null) => void;
  /** Inject GHL locationId from IframeApp after SSO verification */
  setGhlLocationId: (id: string | null) => void;
  /** True when running inside GHL iframe (location_id present) */
  isGhlMode: boolean;
  /** True when user logged in via email/password without GHL context */
  isStandaloneMode: boolean;
  /** True when user is authenticated by either pathway */
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Read ?location_id from the current URL (works both on initial load and SPA nav).
 * We read from window.location so it works before React Router mounts.
 */
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

const DEFAULT_STATE: AuthState = {
  user: null,
  session: null,
  loading: true, // Always wait for Supabase auth session (both modes)
  repProfile: null,
  loadingProfile: false,
  ghlLocationId: initialGhlLocationId,
  ghlRepNum: initialGhlRepNum,
  ssoPayload: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(DEFAULT_STATE);
  const navigate = useNavigate();

  // Also check search params via React Router (for SPA navigations)
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

  // ── Supabase auth (Pathway B: Standalone) ──
  const fetchRepProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setState((s) => ({ ...s, repProfile: null, loadingProfile: false }));
      return;
    }
    setState((s) => ({ ...s, loadingProfile: true }));
    try {
      // Use secure RPC that excludes sensitive fields (ghl_access_token)
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

  useEffect(() => {
    // Listen for Supabase auth state changes in ALL modes
    // In GHL mode, session is established via verifyOtp in IframeApp
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
    setState({ ...DEFAULT_STATE, loading: false, ghlLocationId: null });
    navigate("/auth", { replace: true });
  }, [navigate]);

  const setSsoPayload = useCallback((payload: string | null) => {
    setState((s) => ({ ...s, ssoPayload: payload }));
  }, []);

  const setGhlLocationId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, ghlLocationId: id, loading: false }));
  }, []);

  // ── Derived mode flags ──
  const isGhlMode = !!state.ghlLocationId;
  const isStandaloneMode = !isGhlMode && !!state.user;
  const isAuthenticated = !!state.user; // Real Supabase session required in all modes

  return (
    <AuthContext.Provider
      value={{ ...state, signOut, refreshProfile, setSsoPayload, setGhlLocationId, isGhlMode, isStandaloneMode, isAuthenticated }}
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
