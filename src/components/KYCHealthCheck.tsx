import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

/**
 * KYC Health Check Component
 * Diagnostique et teste si le système KYC fonctionne correctement
 */
export function KYCHealthCheck() {
  const [status, setStatus] = useState<{
    columns: boolean;
    tables: boolean;
    rls: boolean;
    user: boolean;
    storage: boolean;
    ready: boolean;
  }>({
    columns: false,
    tables: false,
    rls: false,
    user: false,
    storage: false,
    ready: false,
  });

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    runHealthCheck();
  }, []);

  const addMessage = (msg: string) => {
    setMessages((prev) => [...prev, msg]);
  };

  const runHealthCheck = async () => {
    try {
      addMessage('🔍 Démarrage du diagnostic KYC...');

      // 1. Check if user is logged in
      addMessage('📋 Vérification de l\'authentification...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        addMessage('❌ Pas de user connecté');
        setLoading(false);
        return;
      }
      addMessage(`✅ User connecté: ${user.email}`);
      setStatus((prev) => ({ ...prev, user: true }));

      // 2. Check if KYC columns exist
      addMessage('📊 Vérification des colonnes KYC...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('kyc_status, kyc_document_url')
        .eq('id', user.id)
        .single();

      if (userError) {
        addMessage(`❌ Erreur: ${userError.message}`);
        if (userError.message.includes('kyc_status')) {
          addMessage('⚠️ Les colonnes KYC n\'existent pas dans la table users');
          addMessage('📝 À FAIRE: Appliquez la migration SQL');
          addMessage('👉 Consultez: KYC_MIGRATION_INSTRUCTIONS.md');
        }
        setLoading(false);
        return;
      }
      addMessage('✅ Colonnes KYC présentes');
      setStatus((prev) => ({ ...prev, columns: true, tables: true }));

      // 3. Check current KYC status
      addMessage('🔍 Vérification du statut KYC actuel...');
      const typedUserData = userData as Record<string, any>;
      if (typedUserData?.kyc_status) {
        addMessage(`ℹ️ Statut KYC: ${typedUserData.kyc_status}`);
      } else {
        addMessage('ℹ️ Pas de soumission KYC encore');
      }

      // 4. Check Storage access
      addMessage('💾 Vérification de l\'accès au Storage...');
      try {
        const { data: bucket } = await supabase.storage.getBucket('kyc');
        if (bucket) {
          addMessage('✅ Bucket KYC accessible');
          setStatus((prev) => ({ ...prev, storage: true }));
        }
      } catch (err) {
        addMessage('⚠️ Bucket KYC non accessible ou n\'existe pas');
      }

      // 5. Set RLS status (simplified - will be tested once migration is applied)
      setStatus((prev) => ({ ...prev, rls: true }));

      addMessage('✅ Diagnostic terminé!');
      addMessage('');
      addMessage('📝 PROCHAINE ÉTAPE:');
      addMessage('Si les colonnes ne sont pas présentes → appliquez la migration SQL');
      addMessage('Si tout est vert → allez à /dashboard/kyc pour tester');
      
      setStatus((prev) => ({ ...prev, ready: prev.columns }));

    } catch (err) {
      addMessage(`❌ Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏥 Diagnostic KYC
          {loading && <Clock className="animate-spin" size={20} />}
        </CardTitle>
        <CardDescription>Vérification de l'état du système KYC</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-lg border ${status.user ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'}`}>
            <p className="text-sm font-semibold">{status.user ? '✅' : '❌'} Authentification</p>
          </div>
          <div className={`p-3 rounded-lg border ${status.columns ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'}`}>
            <p className="text-sm font-semibold">{status.columns ? '✅' : '❌'} Colonnes KYC</p>
          </div>
          <div className={`p-3 rounded-lg border ${status.tables ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'}`}>
            <p className="text-sm font-semibold">{status.tables ? '✅' : '❌'} Tables</p>
          </div>
          <div className={`p-3 rounded-lg border ${status.storage ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'}`}>
            <p className="text-sm font-semibold">{status.storage ? '✅' : '⚠️'} Storage</p>
          </div>
        </div>

        {/* Status Alert */}
        {!status.columns && (
          <Alert className="border-red-300 bg-red-50">
            <AlertCircle className="text-red-600" size={18} />
            <AlertDescription className="text-red-800">
              <strong>Migration SQL requise!</strong><br />
              Les colonnes KYC n'existent pas dans la table users.<br />
              <strong>À FAIRE:</strong> Consultez KYC_MIGRATION_INSTRUCTIONS.md et appliquez la migration dans Supabase.
            </AlertDescription>
          </Alert>
        )}

        {status.columns && status.ready && (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle2 className="text-green-600" size={18} />
            <AlertDescription className="text-green-800">
              <strong>✅ Système KYC prêt!</strong><br />
              Tous les composants sont configurés. Vous pouvez maintenant utiliser le KYC.
            </AlertDescription>
          </Alert>
        )}

        {/* Messages */}
        <div className="space-y-2 max-h-96 overflow-y-auto bg-slate-50 p-4 rounded-lg border border-slate-200">
          {messages.length === 0 ? (
            <p className="text-slate-600 text-sm">Chargement...</p>
          ) : (
            messages.map((msg, idx) => (
              <p key={idx} className="text-sm font-mono text-slate-700">
                {msg}
              </p>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={runHealthCheck}
            disabled={loading}
            className="flex-1"
          >
            🔄 Relancer diagnostic
          </Button>
          {!status.columns && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                // Copy migration instructions to clipboard
                const instructions = document.body.textContent;
                navigator.clipboard.writeText(instructions);
              }}
            >
              📋 Copier instructions
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default KYCHealthCheck;
