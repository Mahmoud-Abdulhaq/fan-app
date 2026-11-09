import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  getGetDashboardQueryKey,
  getGetProfileQueryKey,
  getListKitsQueryKey,
  useDeleteFavorite,
  useGetProfile,
  useSaveFavorite,
  useSaveRating,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useInvalidate() {
  const qc = useQueryClient();
  return (what: ("kits" | "dashboard" | "profile")[]) => {
    const keys = {
      kits: getListKitsQueryKey(),
      dashboard: getGetDashboardQueryKey(),
      profile: getGetProfileQueryKey(),
    };
    what.forEach((w) => qc.invalidateQueries({ queryKey: keys[w] }));
  };
}

export function useProfile() {
  const { isSignedIn } = useAuth();
  const q = useGetProfile({ query: { enabled: !!isSignedIn, queryKey: getGetProfileQueryKey() } });
  return { ...q, isSignedIn: !!isSignedIn, profile: isSignedIn ? q.data : undefined };
}

export function useFavorite(kitId: string) {
  const { profile } = useProfile();
  const invalidate = useInvalidate();
  const { toast } = useToast();
  const save = useSaveFavorite();
  const del = useDeleteFavorite();
  const isFav = !!profile?.favorites.includes(kitId);
  const toggle = () => {
    const opts = {
      onSuccess: () => {
        invalidate(["profile", "dashboard"]);
        toast({ title: isFav ? "Removed from favorites" : "Saved to favorites" });
      },
      onError: () => toast({ title: "Could not update favorites", variant: "destructive" as const }),
    };
    if (isFav) del.mutate({ kitId }, opts);
    else save.mutate({ kitId }, opts);
  };
  return { isFav, toggle, pending: save.isPending || del.isPending };
}

export function useRate(kitId: string) {
  const { profile } = useProfile();
  const invalidate = useInvalidate();
  const { toast } = useToast();
  const m = useSaveRating();
  const mine = profile?.ratings.find((r) => r.kitId === kitId)?.rating ?? 0;
  const rate = (rating: number) =>
    m.mutate(
      { kitId, data: { rating } },
      {
        onSuccess: () => {
          invalidate(["kits", "dashboard", "profile"]);
          toast({ title: `Rated ${rating} of 5` });
        },
        onError: () => toast({ title: "Rating failed", variant: "destructive" }),
      },
    );
  return { mine, rate, pending: m.isPending };
}
