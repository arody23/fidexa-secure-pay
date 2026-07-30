import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  MessageCircle,
  Users,
  Receipt,
  Shield,
  Package,
  Scale,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Bell,
  MessageSquareQuote,
  Undo2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth/signin');
  };

  const navItems = [
    { href: '/admin', label: 'Tableau de Bord', icon: LayoutDashboard },
    { href: '/admin/kyc', label: 'Vérification KYC', icon: Shield },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users },
    { href: '/admin/transactions', label: 'Transactions', icon: Receipt },
    { href: '/admin/withdrawals', label: 'Retraits', icon: Banknote },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
    { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareQuote },
    { href: '/admin/exchange-rates', label: 'Taux de change', icon: TrendingUp },
    { href: '/admin/escrow', label: 'Escrow', icon: Shield },
    { href: '/admin/disputes', label: 'Litiges', icon: Scale },
    { href: '/admin/refunds', label: 'Remboursements', icon: Undo2 },
    { href: '/admin/orders', label: 'Commandes', icon: Package },
    { href: '/admin/support', label: 'Support', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-screen border-r border-border bg-card transition-all duration-300 lg:block',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className="flex h-24 items-center border-b border-border px-6 justify-between">
            {sidebarOpen && <Logo to="/admin" />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8"
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {/* Admin Badge */}
          {sidebarOpen && (
            <div className="px-6 py-4 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold">Panneau Admin</p>
                  <p className="text-xs text-muted-foreground">Gestion avancée</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </motion.button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="border-t border-border p-4">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className={cn('w-full', !sidebarOpen && 'px-2')}
            >
              <LogOut className={cn('h-5 w-5', sidebarOpen && 'mr-2')} />
              {sidebarOpen && 'Déconnexion'}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="fixed right-4 top-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-card shadow-lg"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card lg:hidden"
            >
              <div className="flex h-full flex-col">
                <div className="flex h-24 items-center border-b border-border px-6">
                  <Logo to="/admin" />
                </div>
                <nav className="flex-1 space-y-1 p-4">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          navigate(item.href);
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
                <div className="border-t border-border p-4">
                  <Button onClick={handleLogout} variant="destructive" className="w-full">
                    <LogOut className="mr-2 h-5 w-5" />
                    Déconnexion
                  </Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        )}
      >
        <div className="container mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
