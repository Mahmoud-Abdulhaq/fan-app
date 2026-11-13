import { useRef, type MutableRefObject, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Axe, Box, ShoppingBag, Sparkles, Sword } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TouchState { mx: number; my: number; attack: boolean; mine: boolean }

function Hold({ onDown, onUp, children, className, label, testId }: { onDown: () => void; onUp?: () => void; children: ReactNode; className?: string; label: string; testId: string }) {
  return (
    <button type="button" aria-label={label} data-testid={testId}
      onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId); onDown(); }}
      onPointerUp={() => onUp?.()} onPointerCancel={() => onUp?.()} onLostPointerCapture={() => onUp?.()}
      onContextMenu={(e) => e.preventDefault()}
      className={cn("mg-touch grid select-none place-items-center rounded-lg border-2 border-[#B22222]/40 bg-[#f3e6dc] active:scale-95 active:bg-[#ead3c6] touch-none", className)}>
      {children}
    </button>
  );
}

export function TouchControls({ touch, onPlace, onAbility, onShop }: { touch: MutableRefObject<TouchState>; onPlace: () => void; onAbility: () => void; onShop: () => void }) {
  const dirs = useRef(new Set<string>());
  const sync = () => {
    const d = dirs.current;
    touch.current.mx = (d.has("r") ? 1 : 0) - (d.has("l") ? 1 : 0);
    touch.current.my = (d.has("d") ? 1 : 0) - (d.has("u") ? 1 : 0);
  };
  const dir = (k: string) => ({ onDown: () => { dirs.current.add(k); sync(); }, onUp: () => { dirs.current.delete(k); sync(); } });
  return (
    <div className="mt-3 flex items-end justify-between gap-4" data-testid="touch-controls">
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
        <span />
        <Hold {...dir("u")} label="Move up" testId="touch-up" className="h-14 w-14"><ArrowUp className="h-6 w-6" /></Hold>
        <span />
        <Hold {...dir("l")} label="Move left" testId="touch-left" className="h-14 w-14"><ArrowLeft className="h-6 w-6" /></Hold>
        <span className="grid place-items-center font-mono text-[9px] uppercase tracking-widest">Move</span>
        <Hold {...dir("r")} label="Move right" testId="touch-right" className="h-14 w-14"><ArrowRight className="h-6 w-6" /></Hold>
        <span />
        <Hold {...dir("d")} label="Move down" testId="touch-down" className="h-14 w-14"><ArrowDown className="h-6 w-6" /></Hold>
        <span />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Hold onDown={onShop} label="Shop" testId="touch-shop" className="h-12 w-14 text-[10px] font-bold"><ShoppingBag className="h-5 w-5" />Shop</Hold>
        <Hold onDown={onAbility} label="Ability" testId="touch-ability" className="h-12 w-14 text-[10px] font-bold"><Sparkles className="h-5 w-5" />Q</Hold>
        <Hold onDown={onPlace} label="Place block" testId="touch-place" className="h-12 w-14 text-[10px] font-bold"><Box className="h-5 w-5" />Block</Hold>
        <Hold onDown={() => { touch.current.mine = true; }} onUp={() => { touch.current.mine = false; }} label="Axe" testId="touch-mine" className="col-span-1 h-16 w-14 text-[10px] font-bold"><Axe className="h-6 w-6" />Axe</Hold>
        <Hold onDown={() => { touch.current.attack = true; }} onUp={() => { touch.current.attack = false; }} label="Sword" testId="touch-attack" className="col-span-2 h-16 w-full bg-[#f7e2d6] text-xs font-bold"><Sword className="h-7 w-7" />Sword</Hold>
      </div>
    </div>
  );
}
