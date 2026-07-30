import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Bell, CheckCircle, AlertCircle, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadNotifications() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        navigate('/auth/signin');
        return;
      }

      // Charger les vraies notifications depuis la base de données
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        setLoading(false);
        return;
      }

      setNotifications((data || []) as Notification[]);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadNotifications:', error);
      setLoading(false);
    }
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

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
    try {
      // Mettre à jour localement d'abord pour une meilleure UX
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );

      // Mettre à jour dans la base de données
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        // Recharger en cas d'erreur
        loadNotifications();
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mettre à jour localement d'abord
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );

      // Mettre à jour toutes les notifications non lues dans la base de données
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        // Recharger en cas d'erreur
        loadNotifications();
      }
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  }

  if (loading) {
    return (
              <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des notifications...</p>
          </div>
        </div>
          );
  }

  return (
          <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 overflow-x-hidden max-w-full"
      >
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Restez informé de toutes vos activités
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" className="shrink-0" onClick={markAllAsRead}>
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Notifications Non Lues
              </CardTitle>
              <Bell className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Notifications
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Toutes ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
          >
            Non lues ({unreadCount})
          </Button>
        </div>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Aucune notification</p>
                <p className="text-sm text-gray-500">
                  {filter === 'unread'
                    ? 'Toutes vos notifications ont été lues'
                    : 'Vous n\'avez aucune notification pour le moment'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.link) {
                        navigate(notification.link);
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3 className="truncate font-semibold">
                              {notification.title}
                            </h3>
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
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      );
}
