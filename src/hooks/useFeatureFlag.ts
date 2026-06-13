import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFeatureFlag(key: string) {
  const q = useQuery({
    queryKey: ["feature-flag", key],
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_feature_flags" as never) as any)
        .select("enabled")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.enabled ?? false) as boolean;
    },
    staleTime: 60_000,
  });
  return { enabled: q.data ?? false, isLoading: q.isLoading };
}

export function useSetFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { error } = await (supabase.from("ssra_feature_flags" as never) as any)
        .upsert({ key, enabled, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["feature-flag", vars.key] });
    },
  });
}
