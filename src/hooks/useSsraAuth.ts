import * as Sentry from "@sentry/react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface SsraProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "student" | "admin" | "super_admin" | "instructor";
  country: string | null;
  city: string | null;
  address: string | null;
  degree: string | null;
  german_level: string | null;
  phone_number: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: SsraProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isInstructor: boolean;
}

export function useSsraAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null, loading: true,
    isAdmin: false, isSuperAdmin: false, isInstructor: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session);
      } else {
        setState({ user: null, session: null, profile: null, loading: false, isAdmin: false, isSuperAdmin: false, isInstructor: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session);
      } else {
        setState({ user: null, session: null, profile: null, loading: false, isAdmin: false, isSuperAdmin: false, isInstructor: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, session: Session) {
    const { data: profile } = await supabase
      .from("ssra_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const ssraProfile = profile as SsraProfile | null;
    Sentry.setUser(ssraProfile ? {
      id:       userId,
      email:    ssraProfile.email ?? session.user.email ?? undefined,
      username: ssraProfile.full_name ?? undefined,
    } : { id: userId });
    setState({
      user:         session.user,
      session,
      profile:      ssraProfile,
      loading:      false,
      isAdmin:      ssraProfile?.role === "admin" || ssraProfile?.role === "super_admin",
      isSuperAdmin: ssraProfile?.role === "super_admin",
      isInstructor: ssraProfile?.role === "instructor",
    });
  }

  return state;
}

export async function ssraSignOut() {
  Sentry.setUser(null);
  await supabase.auth.signOut();
  window.location.href = "/login";
}
