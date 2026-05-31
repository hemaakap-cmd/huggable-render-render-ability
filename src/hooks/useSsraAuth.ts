import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface SsraProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "student" | "admin" | "super_admin";
  country: string | null;
  degree: string | null;
  german_level: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: SsraProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function useSsraAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null, loading: true, isAdmin: false, isSuperAdmin: false,
  });

  useEffect(() => {
    const empty = { user: null, session: null, profile: null, loading: false, isAdmin: false, isSuperAdmin: false };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id, session);
      else setState(empty);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id, session);
      else setState(empty);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, session: Session) {
    const { data: profile } = await supabase
      .from("ssra_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setState({
      user: session.user,
      session,
      profile: profile as SsraProfile | null,
      loading: false,
      isAdmin:      profile?.role === "admin" || profile?.role === "super_admin",
      isSuperAdmin: profile?.role === "super_admin",
    });
  }

  return state;
}

export async function ssraSignOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
