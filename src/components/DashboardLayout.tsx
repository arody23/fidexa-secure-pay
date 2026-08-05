import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  Package,
  Receipt,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  Crown,
  Wallet,
  Shield,
  MessageCircle,
  PlayCircle,
  MessageSquareQuote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
import PushNotificationPrompt from "@/components/layout/PushNotificationPrompt";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { clearProviderCache } from "@/contexts/ProviderContext";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/create-link", label: "Créer un lien", icon: Link2 },
  { href: "/dashboard/orders", label: "Tous mes liens", icon: Package },
  { href: "/dashboard/active-orders", label: "Commandes actives", icon: PlayCircle },
  { href: "/dashboard/subscriptions", label: "Abonnements", icon: Crown },
  { href: "/dashboard/kyc", label: "Vérification", icon: Shield },
  { href: "/dashboard/withdrawal", label: "Retraits", icon: Wallet },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/support", label: "Support", icon: MessageCircle },
  { href: "/dashboard/feedback", label: "Avis", icon: MessageSquareQuote },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profil", icon: User },
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    clearProviderCache();
    await supabase.auth.signOut();
    navigate("/auth/signin");
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#f6f9fd]">
      <aside className="fixed left-0 top-0 z-40 hidden h-[100dvh] w-[17rem] border-r border-[#dbe6f2] bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-[4.75rem] items-center justify-between border-b border-[#e4edf6] px-5">
            <Logo size="sm" />
            <NotificationBell />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#0b3b78] text-white shadow-[0_8px_18px_rgba(11,59,120,.15)]"
                      : "text-[#5c7188] hover:bg-[#f1f6fc] hover:text-[#0b3b78]"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-[#e4edf6] p-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[#dbe6f2] bg-white/95 px-3 backdrop-blur-xl sm:h-16 sm:px-4 lg:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-fidexa-ink/40"
            aria-label="Fermer le menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col border-l border-border bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border/80 px-4 sm:h-16">
              <Logo size="sm" />
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} aria-label="Fermer">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </aside>
        </div>
      )}

      <main className="min-h-[100dvh] overflow-x-hidden pt-14 sm:pt-16 lg:ml-[17rem] lg:pt-0">
        <PushNotificationPrompt />
        <div className="mx-auto w-full max-w-6xl p-3 sm:p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;

