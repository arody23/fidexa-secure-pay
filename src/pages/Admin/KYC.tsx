import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, X, Clock, Eye, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
type KycStatus = 'pending' | 'verified' | 'rejected' | null;

type DocumentSide = 'recto' | 'verso' | 'single';

interface KycDocumentFile {
  name?: string;
  path: string;
  preview?: string;
  type?: string;
  side?: DocumentSide;
  timestamp?: number;
  signedUrl?: string;
}

interface KycSubmission {
  user_id: string;
  email: string;
  full_name: string | null;
  kyc_status: KycStatus;
  kyc_document_url: Record<string, KycDocumentFile[]> | null;
  created_at: string;
  files: KycDocumentFile[];
}

const statusColors: Record<Exclude<KycStatus, null>, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AdminKYC() {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [selected, setSelected] = useState<KycSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const parseDocuments = (rawDocs: any): KycDocumentFile[] => {
    if (!rawDocs || typeof rawDocs !== 'object') return [];
    return Object.values(rawDocs)
      .flat()
      .map((file: any) => ({
        name: file?.name ?? '',
        path: file?.path ?? '',
        preview: file?.preview ?? '',
        type: file?.type ?? '',
        side: file?.side ?? 'single',
        timestamp: file?.timestamp ?? 0,
      }))
      .filter((file: KycDocumentFile) => Boolean(file.path));
  };

  const withSignedUrls = async (files: KycDocumentFile[]) => {
    return Promise.all(
      files.map(async (file) => {
        if (!file.path) return file;

        try {
          const { data, error: urlError } = await supabase.storage
            .from('kyc-documents')
            .createSignedUrl(file.path, 60 * 60);

          if (urlError) {
            console.warn('Signed URL error:', urlError.message);
          }

          return {
            ...file,
            signedUrl: data?.signedUrl ?? file.preview ?? '',
          };
        } catch (err) {
          console.error('Signed URL generation failed:', err);
          return { ...file, signedUrl: file.preview ?? '' };
        }
      })
    );
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError('');

      // Use security definer function to bypass RLS for admins
      let data: any[] = [];
      try {
        const rpc = await (supabase as any).rpc('get_kyc_submissions');
        if (rpc.error) throw rpc.error;
        data = rpc.data || [];
      } catch (rpcErr) {
        console.warn('RPC get_kyc_submissions indisponible, fallback users', rpcErr);
        const fallback = await supabase
          .from('users')
          .select('id, email, full_name, kyc_status, kyc_document_url, created_at')
          .not('kyc_status', 'is', null)
          .order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        data = (fallback.data || []).map((item: any) => ({
          user_id: item.id,
          email: item.email,
          full_name: item.full_name,
          kyc_status: item.kyc_status,
          kyc_document_url: item.kyc_document_url,
          created_at: item.created_at,
        }));
      }

      const normalized: KycSubmission[] = await Promise.all(
        (data || []).map(async (item: any) => {
          const files = parseDocuments(item.kyc_document_url);
          const filesWithUrls = await withSignedUrls(files);
          return {
            user_id: item.user_id,
            email: item.email,
            full_name: item.full_name,
            kyc_status: (item.kyc_status as KycStatus) ?? 'pending',
            kyc_document_url: item.kyc_document_url ?? null,
            created_at: item.created_at,
            files: filesWithUrls,
          };
        })
      );

      normalized.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSubmissions(normalized);
    } catch (err) {
      console.error('Error loading KYC submissions:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger les demandes KYC');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (userId: string, status: Exclude<KycStatus, null>) => {
    try {
      setActionLoading(userId);
      setError('');

      const { error: updateError } = await (supabase as any).rpc('admin_update_kyc_status', {
        target_user_id: userId,
        new_status: status,
      });

      if (updateError) {
        throw updateError;
      }

      await loadSubmissions();
      setSelected(null);
    } catch (err) {
      console.error('KYC update failed:', err);
      setError(err instanceof Error ? err.message : 'Échec de la mise à jour du statut');
    } finally {
      setActionLoading(null);
    }
  };

  const stats = useMemo(() => {
    const pending = submissions.filter((s) => s.kyc_status === 'pending').length;
    const verified = submissions.filter((s) => s.kyc_status === 'verified').length;
    const rejected = submissions.filter((s) => s.kyc_status === 'rejected').length;
    return {
      total: submissions.length,
      pending,
      verified,
      rejected,
    };
  }, [submissions]);

  const renderSubmissionRow = (submission: KycSubmission) => (
    <div
      key={submission.user_id}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{submission.full_name || submission.email}</p>
          <p className="text-sm text-slate-600">{submission.email}</p>
          <p className="text-xs text-slate-500">Soumis le {new Date(submission.created_at).toLocaleString('fr-FR')}</p>
        </div>
        {submission.kyc_status && (
          <Badge className={statusColors[submission.kyc_status]}> {submission.kyc_status}</Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">{submission.files.length} fichier(s)</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">ID: {submission.user_id}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(submission)}
          className="gap-2"
        >
          <Eye size={16} /> Voir les documents
        </Button>
        {submission.kyc_status === 'pending' && (
          <>
            <Button
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
              disabled={actionLoading === submission.user_id}
              onClick={() => updateStatus(submission.user_id, 'verified')}
            >
              <CheckCircle2 size={16} /> Approuver
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-2"
              disabled={actionLoading === submission.user_id}
              onClick={() => updateStatus(submission.user_id, 'rejected')}
            >
              <X size={16} /> Rejeter
            </Button>
          </>
        )}
        {submission.kyc_status === 'verified' && (
          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
            <CheckCircle2 size={14} /> Dossier validé
          </span>
        )}
        {submission.kyc_status === 'rejected' && (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
            <X size={14} /> Dossier rejeté
          </span>
        )}
      </div>
    </div>
  );

  const pending = submissions.filter((s) => s.kyc_status === 'pending');
  const rejected = submissions.filter((s) => s.kyc_status === 'rejected');
  const verified = submissions.filter((s) => s.kyc_status === 'verified');

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-slate-600">
        Chargement des dossiers KYC...
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Administration</p>
            <h1 className="text-3xl font-bold text-slate-900">Vérification KYC</h1>
            <p className="text-slate-600 mt-1">Contrôlez les dossiers soumis, visualisez les pièces et validez ou rejetez.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:flex">
            <Shield size={16} /> Accès Admin
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total dossiers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Validés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Rejetés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">En attente <Clock size={18} className="text-yellow-600" /></CardTitle>
            <CardDescription>Dossiers soumis par les prestataires à examiner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.length === 0 && <p className="text-sm text-slate-600">Aucun dossier en attente</p>}
            {pending.map(renderSubmissionRow)}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Validés</CardTitle>
              <CardDescription>Prestataires avec KYC approuvé</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {verified.length === 0 && <p className="text-sm text-slate-600">Aucun dossier validé</p>}
              {verified.map(renderSubmissionRow)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rejetés</CardTitle>
              <CardDescription>Dossiers refusés nécessitant une nouvelle soumission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rejected.length === 0 && <p className="text-sm text-slate-600">Aucun dossier rejeté</p>}
              {rejected.map(renderSubmissionRow)}
            </CardContent>
          </Card>
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-4xl overflow-hidden">
              <CardHeader className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Dossier KYC</CardTitle>
                    <CardDescription>
                      {selected.full_name || selected.email} · {selected.email}
                    </CardDescription>
                  </div>
                  {selected.kyc_status && (
                    <Badge className={statusColors[selected.kyc_status]}> {selected.kyc_status}</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">Soumis le {new Date(selected.created_at).toLocaleString('fr-FR')}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">ID utilisateur: {selected.user_id}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{selected.files.length} fichier(s)</span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {selected.files.map((file, idx) => (
                    <div key={`${file.path}-${idx}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {file.signedUrl || file.preview ? (
                        <img
                          src={file.signedUrl || file.preview}
                          alt={file.name || file.type || 'Document'}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                          Aperçu indisponible
                        </div>
                      )}
                      <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-700">
                        <p className="font-semibold">{file.type || 'Document'}</p>
                        <p className="text-slate-500">{file.side ? `Face: ${file.side}` : 'Face: n/d'}</p>
                        {file.timestamp && (
                          <p className="text-slate-500">{new Date(file.timestamp).toLocaleString('fr-FR')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selected.kyc_status === 'pending' && (
                    <>
                      <Button
                        className="gap-2 bg-green-600 hover:bg-green-700"
                        disabled={actionLoading === selected.user_id}
                        onClick={() => updateStatus(selected.user_id, 'verified')}
                      >
                        <CheckCircle2 size={16} /> Approuver ce dossier
                      </Button>
                      <Button
                        variant="destructive"
                        className="gap-2"
                        disabled={actionLoading === selected.user_id}
                        onClick={() => updateStatus(selected.user_id, 'rejected')}
                      >
                        <X size={16} /> Rejeter
                      </Button>
                    </>
                  )}
                  <Button variant="outline" className="gap-2" onClick={() => setSelected(null)}>
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  );
}
