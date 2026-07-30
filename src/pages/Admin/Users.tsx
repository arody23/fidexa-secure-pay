import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, X, Search, Filter, UserCog } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  kyc_status: string;
  is_admin: boolean;
  verified: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterStatus]);

  const filterUsers = () => {
    let filtered = [...users];

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter((u) => u.kyc_status === filterStatus);
    }

    setFilteredUsers(filtered);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data as unknown as User[]);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground mt-2">Total: {users.length} utilisateurs</p>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
            >
              Tous
            </Button>
            <Button
              variant={filterStatus === 'verified' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('verified')}
            >
              Vérifiés
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('pending')}
            >
              En attente
            </Button>
            <Button
              variant={filterStatus === 'rejected' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('rejected')}
            >
              Rejetés
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des utilisateurs ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Nom</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">KYC</th>
                    <th className="text-left py-3 px-4">Vérifiés</th>
                    <th className="text-left py-3 px-4">Rôle</th>
                    <th className="text-left py-3 px-4">Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold">{user.full_name || '-'}</td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`${
                            user.kyc_status === 'verified'
                              ? 'bg-green-100 text-green-800'
                              : user.kyc_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.kyc_status || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {user.verified ? (
                          <CheckCircle2 className="text-green-600" size={18} />
                        ) : (
                          <X className="text-red-600" size={18} />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {user.is_admin ? (
                          <Badge className="bg-blue-100 text-blue-800">Admin</Badge>
                        ) : (
                          <Badge variant="outline">Utilisateur</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
