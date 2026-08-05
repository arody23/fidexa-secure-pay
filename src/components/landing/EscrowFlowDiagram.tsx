import { ArrowRight, CheckCircle, Shield, Smartphone, Store, User } from 'lucide-react';
import Logo from '@/components/Logo';

/** Escrow flow chart — ref landing-03 */
export function EscrowFlowDiagram() {
  return (
    <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-5 sm:p-8">
      <div className="mb-8 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
          <Shield className="h-5 w-5 text-fidexa-green" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="font-semibold text-fidexa-navy">Le flux d&apos;escrow FidexaPay</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Un processus simple, sécurisé et transparent pour protéger chaque transaction.
          </p>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="flex items-start justify-between gap-2">
          <FlowNode icon={User} label="Client" sub="Initie le paiement" />
          <FlowArrow step="1" title="Paiement" text="Le client paie via Mobile Money." />
          <FlowEscrowCard />
          <FlowArrow step="2" title="Livraison" text="Le vendeur livre le bien ou service." />
          <FlowNode icon={Store} label="Vendeur" sub="Reçoit après validation" />
        </div>
        <div className="mt-6 flex justify-center">
          <div className="flex max-w-md items-center gap-2 rounded-xl border border-dashed border-fidexa-green/35 bg-accent/50 px-4 py-3 text-center">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fidexa-green text-xs font-bold text-fidexa-ink">
              3
            </span>
            <p className="text-xs text-muted-foreground sm:text-sm">
              <span className="font-semibold text-foreground">Validation</span> · Le client confirme la
              livraison
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {[
          { icon: User, label: 'Client', sub: 'Initie le paiement' },
          { step: '1', title: 'Paiement', text: 'Le client paie via Mobile Money.' },
          { escrow: true },
          { step: '2', title: 'Livraison', text: 'Le vendeur livre le bien ou service.' },
          { icon: Store, label: 'Vendeur', sub: 'Reçoit après validation' },
          { step: '3', title: 'Validation', text: 'Le client confirme la livraison.' },
        ].map((item, i) => {
          if ('escrow' in item && item.escrow) {
            return <FlowEscrowCard key={i} className="mx-auto max-w-sm" />;
          }
          if ('step' in item && item.step) {
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fidexa-green text-xs font-bold text-fidexa-ink">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            );
          }
          const Icon = item.icon!;
          return (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
                <Icon className="h-5 w-5 text-fidexa-navy" strokeWidth={1.75} />
              </div>
              <p className="mt-2 text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowNode({
  icon: Icon,
  label,
  sub,
}: {
  icon: typeof User;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex w-[120px] shrink-0 flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-sm">
        <Icon className="h-6 w-6 text-fidexa-navy" strokeWidth={1.75} />
      </div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function FlowArrow({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center pt-4 text-center">
      <span className="mb-1 text-[11px] font-semibold text-fidexa-green">{step}</span>
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 max-w-[140px] text-[11px] leading-snug text-muted-foreground">{text}</p>
      <ArrowRight className="mt-2 h-4 w-4 text-fidexa-green/70" strokeWidth={1.75} />
    </div>
  );
}

function FlowEscrowCard({ className }: { className?: string }) {
  return (
    <div
      className={`w-[200px] shrink-0 rounded-2xl border-2 border-fidexa-green/40 bg-card p-4 shadow-md ${className ?? ''}`}
    >
      <div className="mb-2 flex justify-center">
        <Logo size="sm" wordmark className="pointer-events-none scale-90" />
      </div>
      <p className="text-center text-sm font-semibold text-fidexa-navy">Fonds séquestrés</p>
      <p className="mt-1 text-center text-[11px] leading-snug text-muted-foreground">
        Les fonds sont détenus en toute sécurité jusqu&apos;à validation.
      </p>
      <div className="mt-3 flex justify-center">
        <Smartphone className="h-4 w-4 text-fidexa-green" strokeWidth={1.75} />
      </div>
    </div>
  );
}
