import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export interface KYCProfile {
  kyc_status: 'pending' | 'verified' | 'rejected';
  kyc_document_url?: string;
}

export function KYCWidget() {
  const [showKYC, setShowKYC] = useState(false);
  const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [documentCount, setDocumentCount] = useState(0);

  const statusConfig: Record<string, { icon: typeof Clock; title: string; description: string; color: string; bgColor: string; borderColor: string }> = {
    pending: {
      icon: Clock,
      title: 'En attente de vérification',
      description: 'Votre profil doit être vérifié pour effectuer des retraits.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    verified: {
      icon: CheckCircle2,
      title: 'Profil vérifié ✅',
      description: 'Vous pouvez maintenant effectuer des retraits sans limitation.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    rejected: {
      icon: AlertCircle,
      title: 'Vérification rejetée',
      description: 'Veuillez soumettre de nouveaux documents.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  };

  const config = statusConfig[kycStatus];
  const Icon = config.icon;

  if (showKYC) {
    return (
      <div>
        <p className="text-sm text-gray-600 mb-4">
          Consultez la page{' '}
          <a href="/dashboard/kyc" className="text-blue-600 hover:underline">
            Vérification (KYC)
          </a>{' '}
          pour soumettre vos documents.
        </p>
      </div>
    );
  }

  return (
    <Card className={`border ${config.borderColor} ${config.bgColor}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Icon className={`h-6 w-6 ${config.color} mt-0.5`} />
            <div>
              <CardTitle className={config.color}>{config.title}</CardTitle>
              <CardDescription className="mt-1">{config.description}</CardDescription>
            </div>
          </div>
          {kycStatus !== 'verified' && documentCount > 0 && (
            <Badge variant="secondary">{documentCount} doc(s)</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {kycStatus === 'pending' && (
          <>
            <div className="bg-white rounded-lg p-3 text-sm text-gray-700 space-y-2">
              <p className="font-semibold">💡 Conseil:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Préparez une pièce d'identité valide (CNI, Passeport, Permis, etc.)</li>
                <li>Assez lumière pour la photo</li>
                <li>La vérification prend généralement 24-48h</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Progression</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Documents</span>
                  <span>{documentCount}/2</span>
                </div>
                <Progress value={(documentCount / 2) * 100} />
              </div>
            </div>

            <Button onClick={() => setShowKYC(true)} className="w-full" size="lg">
              <FileUp className="mr-2 h-5 w-5" />
              Commencer la vérification
            </Button>
          </>
        )}

        {kycStatus === 'verified' && (
          <div className="bg-white rounded-lg p-4 text-center text-sm text-green-700">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="font-semibold">Félicitations!</p>
            <p className="text-gray-600 mt-1">Tous les retraits sont maintenant disponibles.</p>
          </div>
        )}

        {kycStatus === 'rejected' && (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Les documents ont été rejetés. Veuillez en soumettre de nouveaux.
              </AlertDescription>
            </Alert>
            <Button onClick={() => setShowKYC(true)} className="w-full">
              Soumettre de nouveaux documents
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default KYCWidget;
