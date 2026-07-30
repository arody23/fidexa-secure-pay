import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import KYCHealthCheck from '@/components/KYCHealthCheck';

/**
 * KYC Setup & Test Page
 * Helps user set up KYC system and test all components
 */
export function KYCSetup() {
  const [step, setStep] = useState<'health' | 'test' | 'ready'>(
    'health'
  );
  const [testData, setTestData] = useState({
    userLoaded: false,
    userId: '',
    email: '',
  });

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTestData({
          userLoaded: true,
          userId: user.id,
          email: user.email || 'N/A',
        });
      }
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  return (
          <div className="max-w-4xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Setup KYC</h1>
          <p className="text-slate-600">
            Configurez et testez le système de vérification d'identité
          </p>
        </div>

        {/* User Info */}
        {testData.userLoaded && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-sm">
                <strong>Utilisateur connecté:</strong> {testData.email}
              </p>
              <p className="text-sm text-slate-600">
                ID: {testData.userId}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Health Check */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Étape 1: Diagnostic du Système
          </h2>
          <KYCHealthCheck />
        </div>

        {/* Step 2: Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Étape 2: Application de la Migration</CardTitle>
            <CardDescription>
              Si le diagnostic détecte des colonnes manquantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-300 bg-amber-50">
              <AlertDescription className="text-amber-900">
                <strong>⚠️ IMPORTANTE:</strong> Avant de pouvoir utiliser le KYC, vous DEVEZ appliquer la migration SQL.
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-slate-900">Instructions rapides:</h4>
              <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                <li>Ouvrez <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Console</a></li>
                <li>Allez à: SQL Editor</li>
                <li>Cliquez: "New Query"</li>
                <li>Copier le code de: <code className="bg-white px-2 py-1 rounded text-xs">supabase/migrations/20251229_kyc_schema.sql</code></li>
                <li>Collez et cliquez: "Run"</li>
                <li>Attendez le succès ✅</li>
              </ol>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                const instructions = document.querySelector('[data-migration-instructions]');
                if (instructions) {
                  navigator.clipboard.writeText(instructions.textContent || '');
                  alert('Instructions copiées!');
                }
              }}
            >
              📋 Copier le fichier de migration
            </Button>

            <div className="bg-white border border-slate-200 p-4 rounded-lg text-sm font-mono overflow-auto max-h-64">
              <p className="text-slate-700 whitespace-pre-wrap" data-migration-instructions>
{`ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT NULL CHECK (kyc_status IN ('pending', 'verified', 'rejected') OR kyc_status IS NULL),
ADD COLUMN IF NOT EXISTS kyc_document_url JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.kyc_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own KYC audit logs" ON public.kyc_audit_log;
CREATE POLICY "Users can view their own KYC audit logs"
ON public.kyc_audit_log
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert KYC audit logs" ON public.kyc_audit_log;
CREATE POLICY "System can insert KYC audit logs"
ON public.kyc_audit_log
FOR INSERT
WITH CHECK (true);`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Test */}
        <Card>
          <CardHeader>
            <CardTitle>Étape 3: Tester le KYC</CardTitle>
            <CardDescription>
              Une fois la migration appliquée
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700">
              Après avoir appliqué la migration avec succès:
            </p>
            <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
              <li>Redémarrez le serveur: <code className="bg-white px-2 py-1 rounded text-xs">npm run dev</code></li>
              <li>Attendez la compilation</li>
              <li>Allez à la page: <code className="bg-white px-2 py-1 rounded text-xs">/dashboard/kyc</code></li>
              <li>Testez:
                <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                  <li>Prenez un selfie 📸</li>
                  <li>Sélectionnez un document 📋</li>
                  <li>Capturez le document 🎥</li>
                  <li>Cliquez "Soumettre" ✅</li>
                </ul>
              </li>
              <li>Vérifiez dans Supabase que les données sont sauvegardées</li>
            </ol>

            <Button
              className="w-full mt-4"
              onClick={() => window.location.href = '/dashboard/kyc'}
            >
              🚀 Aller au KYC
            </Button>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>❓ Dépannage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-slate-900">Erreur: "kyc_status does not exist"</p>
              <p className="text-slate-600">→ La migration n'a pas été appliquée. Exécutez le SQL dans Supabase.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Bouton "Soumettre" ne fonctionne pas</p>
              <p className="text-slate-600">→ Vérifiez la console (F12) pour les erreurs. Vérifiez RLS policies.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Les fichiers ne se sauvegardent pas</p>
              <p className="text-slate-600">→ Vérifiez que Supabase Storage bucket "kyc" existe et RLS est configuré.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Caméra ne fonctionne pas</p>
              <p className="text-slate-600">→ Vérifiez les permissions (localhost doit être en HTTPS en production).</p>
            </div>
          </CardContent>
        </Card>
      </div>
      );
}

export default KYCSetup;
