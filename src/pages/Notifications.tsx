import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Bell, CheckCircle, AlertCircle, Clock, DollarSign, MessageSquare, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isPushSupported, isPushEnabled, subscribeToPush } from '@/lib/webPush';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  user_id: string;
  type: 'payment' | 'order' | 'system' | 'kyc' | 'dispute' | 'withdrawal';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const refreshPushState = useCallback(async () => {
    if (!isPushSupported()) {
      setPushActive(false);
      return;
    }
    setPushActive(await isPushEnabled());
  }, []);

  async function enablePush() {
    if (!isPushSupported()) {
      toast({
        title: 'Non supporté',
        description: 'Ce navigateur ne gère pas les notifications push.',
        variant: 'destructive',
      });
      return;
    }
    if (pushActive) return;

    setPushLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Session requise');
      const ok = await subscribeToPush(session.user.id);
      await refreshPushState();
      toast({
        title: ok ? 'Notifications activées' : 'Non activé',
        description: ok
          ? 'Cet appareil recevra les alertes push.'
          : 'Autorisez les notifications dans les paramètres du navigateur.',
        variant: ok ? 'default' : 'destructive',
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Activation impossible',
        variant: 'destructive',
      });
    } finally {
      setPushLoading(false);
    }
  }

  const loadNotifications = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading notifications:', error);
      setLoading(false);
      return;
    }

    setNotifications((data || []) as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth/signin');
        return;
      }
      if (cancelled) return;

      setUserId(session.user.id);
      await Promise.all([loadNotifications(session.user.id), refreshPushState()]);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [navigate, loadNotifications, refreshPushState]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadNotifications(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  function getIcon(type: string) {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'order':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'dispute':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'kyc':
        return <CheckCircle className="h-5 w-5 text-purple-600" />;
      case 'withdrawal':
        return <DollarSign className="h-5 w-5 text-orange-600" />;
      case 'system':
        return <MessageSquare className="h-5 w-5 text-gray-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  }

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);

    if (error && userId) {
      console.error('Error marking notification as read:', error);
      void loadNotifications(userId);
    }
  }

  async function markAllAsRead() {
    if (!userId) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      void loadNotifications(userId);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">
          Notifications
        </h1>
        <div className="flex flex-wrap justify-end gap-2">
          {isPushSupported() && (
            <Button
              variant={pushActive ? 'outline' : 'secondary'}
              size="sm"
              className="h-8 shrink-0 text-xs"
              onClick={enablePush}
              disabled={pushLoading || pushActive}
            >
              {pushActive ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Push
                </>
              ) : pushLoading ? (
                '…'
              ) : (
                'Activer push'
              )}
            </Button>
          )}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 text-xs"
              onClick={markAllAsRead}
            >
              Tout lu
            </Button>
          )}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <p className="text-[11px] text-[#8a9bb0]">Non lues</p>
          <p className="mt-1 text-xl font-semibold tabular-nums leading-none text-[#0b2f63]">
            {unreadCount}
          </p>
        </div>
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <p className="text-[11px] text-[#8a9bb0]">Total</p>
          <p className="mt-1 text-xl font-semibold tabular-nums leading-none text-[#0b2f63]">
            {notifications.length}
          </p>
        </div>
      </section>

      <div className="flex gap-1 rounded-full bg-[#e8eef6] p-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
            filter === 'all' ? 'bg-white text-[#0b3b78] shadow-sm' : 'text-[#5c7188]'
          }`}
        >
          Toutes
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
            filter === 'unread' ? 'bg-white text-[#0b3b78] shadow-sm' : 'text-[#5c7188]'
          }`}
        >
          Non lues
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-[#e2eaf3] bg-white py-10 text-center shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <Bell className="mx-auto mb-2 h-8 w-8 text-[#c5d0de]" />
          <p className="text-sm text-[#8a9bb0]">
            {filter === 'unread' ? 'Tout est lu' : 'Aucune notification'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="divide-y divide-[#eef3f9]">
            {filteredNotifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#f7fafd] ${
                  !notification.read ? 'bg-[#f5f8fc]' : ''
                }`}
                onClick={() => {
                  void markAsRead(notification.id);
                  if (notification.link) navigate(notification.link);
                }}
              >
                <div className="mt-0.5 shrink-0">{getIcon(notification.type)}</div>
                <div className="min-w-0 flex-1 leading-none">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold text-[#0b2f63]">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <Badge className="h-4 px-1.5 text-[9px]">Nouveau</Badge>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-[#8a9bb0]">
                      {new Date(notification.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs leading-snug text-[#5c7188]">
                    {notification.message}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
