import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  DollarSign, 
  Package, 
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const ADMIN_MENU = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, path: '/admin' },
  { id: 'kyc', label: 'Vérification KYC', icon: ShieldCheck, path: '/admin/kyc' },
  { id: 'users', label: 'Utilisateurs', icon: Users, path: '/admin/users' },
  { id: 'transactions', label: 'Transactions', icon: DollarSign, path: '/admin/transactions' },
  { id: 'orders', label: 'Commandes', icon: Package, path: '/admin/orders' },
  { id: 'disputes', label: 'Litiges', icon: AlertTriangle, path: '/admin/disputes' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path !== '/admin' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold">Admin Panel</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {ADMIN_MENU.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={item.label}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 transition-all"
            title="Déconnexion"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
