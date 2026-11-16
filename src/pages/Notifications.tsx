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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Chargement des notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Restez informé de toutes vos activités
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPushSupported() && (
            <Button
              variant={pushActive ? 'outline' : 'secondary'}
              className="shrink-0"
              onClick={enablePush}
              disabled={pushLoading || pushActive}
            >
              {pushActive ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Push activées
                </>
              ) : pushLoading ? (
                'Activation…'
              ) : (
                'Activer les push'
              )}
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" className="shrink-0" onClick={markAllAsRead}>
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-muted-foreground">Non lues</p>
          <p className="text-2xl font-semibold">{unreadCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold">{notifications.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          Toutes ({notifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          onClick={() => setFilter('unread')}
        >
          Non lues ({unreadCount})
        </Button>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="py-12 text-center">
          <Bell className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="mb-2 text-gray-600">Aucune notification</p>
          <p className="text-sm text-gray-500">
            {filter === 'unread'
              ? 'Toutes vos notifications ont été lues'
              : "Vous n'avez aucune notification pour le moment"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/70">
          {filteredNotifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`flex w-full items-start gap-4 py-4 text-left transition-colors hover:bg-muted/40 ${
                !notification.read ? 'bg-primary/5' : ''
              }`}
              onClick={() => {
                void markAsRead(notification.id);
                if (notification.link) navigate(notification.link);
              }}
            >
              <div className="mt-1 shrink-0">{getIcon(notification.type)}</div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate font-semibold">{notification.title}</h3>
                    {!notification.read && (
                      <Badge variant="default" className="text-xs">
                        Nouveau
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="mt-1 break-words text-sm text-muted-foreground">{notification.message}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
