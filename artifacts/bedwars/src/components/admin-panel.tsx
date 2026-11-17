import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePerformDemoAdminAction, useUnlockDemoAdmin, useLockDemoAdmin, getGetGameProfileQueryKey, type DemoAdminActionInputAction } from "@workspace/api-client-react";
import { Shield, Coins, RotateCcw, Unlock, LockKeyhole, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "The request could not be completed.";
}

export function AdminPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [amountText, setAmountText] = useState("100");
  const unlock = useUnlockDemoAdmin();
  const actionMutation = usePerformDemoAdminAction();
  const lockAdmin = useLockDemoAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!expiresAt) return;
    const timeout = window.setTimeout(() => {
      setToken(null);
      setExpiresAt(null);
      toast({ title: "Admin access expired", description: "Enter the demo PIN again to continue." });
    }, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [expiresAt, toast]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleOpenChange(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) handleOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && token) {
      void lockAdmin.mutateAsync({ data: { token } }).catch(() => {
        toast({ title: "Admin access will expire automatically", description: "The server could not be reached to lock the session early.", variant: "destructive" });
      });
    }
    setOpen(nextOpen);
    if (!nextOpen) {
      setPin("");
      setToken(null);
      setExpiresAt(null);
    }
  };

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const session = await unlock.mutateAsync({ data: { pin } });
      setToken(session.token);
      setExpiresAt(Date.now() + session.expiresInSeconds * 1000);
      setPin("");
      toast({ title: "Demo admin unlocked", description: "Access lasts 30 minutes or until you close this panel." });
    } catch (error) {
      toast({ title: "Could not unlock admin panel", description: errorMessage(error), variant: "destructive" });
    }
  };

  const runAction = async (action: DemoAdminActionInputAction, amount?: number) => {
    if (!token || actionMutation.isPending) return;
    try {
      const profile = await actionMutation.mutateAsync({ data: { token, action, ...(amount === undefined ? {} : { amount }) } });
      queryClient.setQueryData(getGetGameProfileQueryKey(), profile);
      await queryClient.invalidateQueries({ queryKey: getGetGameProfileQueryKey() });
      const descriptions: Record<DemoAdminActionInputAction, string> = {
        grantCoins: `${amount?.toLocaleString()} coins added to your account.`,
        setCoins: `Your balance is now ${amount?.toLocaleString()} coins.`,
        resetStats: "Your wins, matches played, and ranked points are now zero.",
        unlockAllKits: "Every kit is now unlocked on your account.",
      };
      toast({ title: "Admin action complete", description: descriptions[action] });
    } catch (error) {
      toast({ title: "Admin action failed", description: errorMessage(error), variant: "destructive" });
    }
  };

  const amount = Number(amountText);
  const amountValid = Number.isSafeInteger(amount) && amount >= 0 && amount <= 2_147_483_647;

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Open admin panel"
        aria-label="Open admin panel"
        aria-expanded={open}
        aria-controls="demo-admin-panel"
        className="h-8 gap-1.5 border-[#642525] bg-[#0d0909] px-2 text-[#B22222] hover:bg-[#201719] hover:text-[#B22222] sm:px-3"
        data-testid="button-admin-panel"
      >
        <Shield className="h-4 w-4" />
        <span>Admin</span>
      </Button>
      {open && (
          <section
            id="demo-admin-panel"
            role="dialog"
            aria-labelledby="demo-admin-title"
            className="absolute right-0 top-full z-[80] mt-2 max-h-[calc(100dvh-5rem)] w-[min(90vw,24rem)] overflow-y-auto border border-[#642525] bg-[#090707] p-4 text-[#B22222] shadow-2xl sm:p-5"
          >
            <button type="button" onClick={() => handleOpenChange(false)} aria-label="Close admin panel" className="absolute right-4 top-4 rounded p-1 text-[#8f2929] hover:bg-[#201719] hover:text-[#B22222]" data-testid="button-admin-close">
              <X className="h-4 w-4" />
            </button>
            <header className="mb-5 pr-8">
              <h2 id="demo-admin-title" className="flex items-center gap-2 font-display text-base font-bold uppercase text-[#B22222]">
                <Shield className="h-5 w-5" /> Demo admin panel
              </h2>
              <p className="mt-1 text-sm text-[#8f2929]">
                Demo-only controls for your signed-in account. This PIN is not suitable for protecting real admin data.
              </p>
            </header>

            {!token ? (
              <form onSubmit={handleUnlock} className="space-y-3">
            <label htmlFor="demo-admin-pin" className="block text-sm font-semibold text-[#B22222]">Enter demo PIN</label>
            <div className="flex gap-2">
              <Input
                id="demo-admin-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={32}
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="border-[#642525] bg-black text-[#B22222] placeholder:text-[#702222]"
                aria-label="Demo admin PIN"
                data-testid="input-admin-pin"
              />
              <Button type="submit" disabled={!pin || unlock.isPending} className="bg-[#321010] text-[#B22222] hover:bg-[#4a1717]" data-testid="button-admin-unlock">
                <LockKeyhole className="mr-2 h-4 w-4" />
                {unlock.isPending ? "Checking…" : "Unlock"}
              </Button>
            </div>
            <p className="text-xs text-[#7e2525]">Access expires after 30 minutes and is cleared when this panel closes.</p>
              </form>
            ) : (
              <div className="space-y-5">
            <section className="space-y-3 border border-[#421a1a] bg-[#100b0b] p-3">
              <div>
                <h3 className="font-display font-bold uppercase text-[#B22222]">Coin controls</h3>
                <p className="text-xs text-[#8f2929]">Change only your own game balance.</p>
              </div>
              <label htmlFor="admin-coin-amount" className="block text-xs font-semibold text-[#B22222]">Coin amount</label>
              <Input
                id="admin-coin-amount"
                type="number"
                min={0}
                max={2_147_483_647}
                step={1}
                value={amountText}
                onChange={(event) => setAmountText(event.target.value)}
                className="border-[#642525] bg-black text-[#B22222]"
                data-testid="input-admin-coins"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" disabled={!amountValid || amount < 1 || actionMutation.isPending} onClick={() => void runAction("grantCoins", amount)} className="bg-[#321010] text-[#B22222] hover:bg-[#4a1717]" data-testid="button-admin-grant-coins">
                  <Coins className="mr-2 h-4 w-4" /> Add coins
                </Button>
                <Button type="button" disabled={!amountValid || actionMutation.isPending} onClick={() => void runAction("setCoins", amount)} className="bg-[#321010] text-[#B22222] hover:bg-[#4a1717]" data-testid="button-admin-set-coins">
                  Set balance
                </Button>
              </div>
            </section>

            <section className="space-y-2 border border-[#421a1a] bg-[#100b0b] p-3">
              <h3 className="font-display font-bold uppercase text-[#B22222]">Other controls</h3>
              <Button type="button" variant="outline" disabled={actionMutation.isPending} onClick={() => void runAction("unlockAllKits")} className="w-full border-[#642525] bg-[#0b0808] text-[#B22222] hover:bg-[#201719] hover:text-[#B22222]" data-testid="button-admin-unlock-kits">
                <Unlock className="mr-2 h-4 w-4" /> Unlock every kit
              </Button>
              <Button type="button" variant="outline" disabled={actionMutation.isPending} onClick={() => void runAction("resetStats")} className="w-full border-[#642525] bg-[#0b0808] text-[#B22222] hover:bg-[#201719] hover:text-[#B22222]" data-testid="button-admin-reset-stats">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset match stats
              </Button>
              <p className="text-[11px] leading-relaxed text-[#7e2525]">Resetting stats clears matches and wins only. It keeps your coins, kits, and cosmetics.</p>
            </section>
              </div>
            )}
          </section>
      )}
    </div>
  );
}
