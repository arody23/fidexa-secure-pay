import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  Package,
  Receipt,
  User,
  Menu,
  X,
  LogOut,
  Crown,
  Wallet,
  MessageCircle,
  PlayCircle,
  MessageSquareQuote,
  Plus,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
import PushNotificationPrompt from "@/components/layout/PushNotificationPrompt";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { clearProviderCache, useProvider } from "@/contexts/ProviderContext";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/create-link", label: "Créer un lien", icon: Link2 },
  { href: "/dashboard/orders", label: "Tous mes liens", icon: Package },
  { href: "/dashboard/active-orders", label: "Commandes actives", icon: PlayCircle },
  { href: "/dashboard/subscriptions", label: "Abonnements", icon: Crown },
  { href: "/dashboard/withdrawal", label: "Retraits", icon: Wallet },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/support", label: "Support", icon: MessageCircle },
  { href: "/dashboard/feedback", label: "Avis", icon: MessageSquareQuote },
  { href: "/dashboard/profile", label: "Paramètres", icon: User },
];

const bottomNavItems = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard, match: "exact" as const },
  { href: "/dashboard/orders", label: "Liens", icon: Package, match: "prefix" as const },
  { href: "/dashboard/create-link", label: "Créer", icon: Plus, match: "exact" as const, primary: true },
  { href: "/dashboard/withdrawal", label: "Retraits", icon: Wallet, match: "prefix" as const },
  { href: "/dashboard/profile", label: "Compte", icon: User, match: "prefix" as const },
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProvider();
  const kycVerified = profile?.kyc_status === "verified";
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

  const NavLink = ({
    href,
    label,
    icon: Icon,
    onClick,
  }: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    onClick?: () => void;
  }) => {
    const isActive =
      href === "/dashboard"
        ? location.pathname === "/dashboard"
        : location.pathname === href || location.pathname.startsWith(`${href}/`);

    return (
      <Link
        to={href}
        onClick={onClick}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-[#0b3b78] text-white shadow-[0_10px_22px_rgba(11,59,120,.22)]"
            : "text-[#6a7f96] hover:bg-white/10 hover:text-white"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            isActive
              ? "bg-white/15 text-white"
              : "bg-white/5 text-[#9bb0c7] group-hover:bg-white/10 group-hover:text-white"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#eef3f9]">
      <aside className="fixed left-0 top-0 z-40 hidden h-[100dvh] w-[17rem] bg-[#0a2f5f] lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-[4.75rem] items-center justify-between border-b border-white/10 px-5">
            <Logo size="sm" to="/dashboard" variant="white" />
            <NotificationBell className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white" />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
          <div className="border-t border-white/10 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-[#9bb0c7] hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[#dbe6f2] bg-white/95 px-3 backdrop-blur-xl sm:h-16 sm:px-4 lg:hidden">
        <Logo size="sm" to="/dashboard" />
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
            className="absolute inset-0 bg-[#041628]/50"
            aria-label="Fermer le menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col bg-[#0a2f5f] shadow-2xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:h-16">
              <Logo size="sm" to="/dashboard" variant="white" />
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>
            <div className="shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-[#9bb0c7] hover:bg-white/10 hover:text-white"
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
        <div className="mx-auto w-full max-w-6xl p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:p-5 lg:p-8 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Bottom navigation — PWA / mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dbe6f2] bg-white/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
        aria-label="Navigation principale"
      >
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-end px-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.match === "exact"
                ? location.pathname === item.href
                : location.pathname === item.href ||
                  location.pathname.startsWith(`${item.href}/`) ||
                  (item.href === "/dashboard/orders" &&
                    location.pathname.startsWith("/dashboard/active-orders"));

            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="relative -top-3 flex flex-col items-center justify-end gap-1"
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_10px_24px_rgba(11,59,120,.28)] transition-transform active:scale-95",
                      isActive ? "bg-[#0a3266]" : "bg-[#0b3b78]"
                    )}
                  >
                    <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold tracking-wide",
                      isActive ? "text-[#0b3b78]" : "text-[#6a7f96]"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            const showVerified = item.href === "/dashboard/profile" && kycVerified;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors",
                  isActive ? "text-[#0b3b78]" : "text-[#7a8fa6] active:text-[#0b3b78]"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="relative">
                  <Icon
                    className={cn("h-5 w-5", isActive && "stroke-[2.25]")}
                    strokeWidth={isActive ? 2.25 : 1.75}
                  />
                  {showVerified && (
                    <BadgeCheck
                      className="absolute -bottom-1 -right-1.5 h-3.5 w-3.5 fill-[#1d9bf0] text-white"
                      strokeWidth={1.5}
                      aria-label="Compte vérifié"
                    />
                  )}
                </span>
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
