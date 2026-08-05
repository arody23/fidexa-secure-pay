import { Check, Circle, Lock, Package, Shield, User } from 'lucide-react';

/** Ref: landing-01 — glass payment status card */
export function EscrowHeroWidget() {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2BB673]/20">
            <Lock className="h-5 w-5 text-[#2BB673]" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs text-white/50">Statut du paiement</p>
            <p className="text-lg font-semibold text-[#2BB673]">Séquestré</p>
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-white/50">Montant séquestré</p>
      <p className="mt-1 font-mono text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.25rem]">
        50 000 XOF
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#2BB673]" aria-hidden />
        <span className="text-xs font-medium text-white/85">Fonds sécurisés</span>
      </div>

      <div className="my-6 h-px bg-white/10" />

      <ul className="space-y-4">
        <li className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-white/45" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-white">Payer</p>
              <p className="text-xs text-white/45">Acheteur</p>
            </div>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2BB673]">
            <Check className="h-4 w-4 text-[#0B1220]" strokeWidth={2.5} />
          </div>
        </li>
        <li className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-white/45" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-white">Recevoir</p>
              <p className="text-xs text-white/45">Vendeur</p>
            </div>
          </div>
          <Circle className="h-7 w-7 text-white/25" strokeWidth={1.5} />
        </li>
      </ul>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-[#2BB673]/25 bg-[#2BB673]/10 px-3.5 py-3">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#2BB673]" strokeWidth={1.75} />
        <p className="text-xs leading-relaxed text-white/55">
          Libération des fonds après confirmation de livraison
        </p>
      </div>
    </div>
  );
}
