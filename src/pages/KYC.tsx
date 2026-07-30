import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, XCircle, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useKYCUpload, useCamera } from '@/hooks/useKYC';

type DocumentType = 'selfie' | 'cni' | 'passport' | 'permis' | 'electoral_card';
type DocumentSide = 'recto' | 'verso' | 'single';
type KYCStep = 'selfie' | 'select-doc' | 'capture-doc' | 'review';

interface UploadedFile {
  name: string;
  path: string;
  type: DocumentType;
  side: DocumentSide;
  preview: string;
  timestamp: number;
}

// Professional SVG Icons for Documents
const DocumentIcons = {
  selfie: (
    <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.3" />
    </svg>
  ),
  cni: (
    <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="20" height="14" rx="1" />
      <circle cx="7" cy="10" r="2" />
      <line x1="11" y1="9" x2="19" y2="9" />
      <line x1="11" y1="12" x2="19" y2="12" />
      <line x1="5" y1="15" x2="19" y2="15" />
    </svg>
  ),
  passport: (
    <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4h12c1 0 2 1 2 2v12c0 1-1 2-2 2H6c-1 0-2-1-2-2V6c0-1 1-2 2-2z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 16c2-1 4-1 4-1s2 0 4 1" />
      <line x1="5" y1="20" x2="19" y2="20" strokeLinecap="round" />
    </svg>
  ),
  permis: (
    <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="1" />
      <circle cx="8" cy="11" r="2" />
      <line x1="12" y1="9" x2="20" y2="9" />
      <line x1="12" y1="12" x2="20" y2="12" />
      <line x1="12" y1="15" x2="20" y2="15" />
    </svg>
  ),
  electoral: (
    <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="8" x2="21" y2="8" />
    </svg>
  ),
};

const DOCUMENT_TYPES = {
  selfie: {
    label: 'Selfie',
    icon: DocumentIcons.selfie,
    sides: ['single'] as const,
    tips: 'Photo claire de votre visage, éclairage naturel',
    description: 'Vérification de votre identité',
  },
  cni: {
    label: 'Carte d\'Identité',
    icon: DocumentIcons.cni,
    sides: ['recto', 'verso'] as const,
    tips: 'Recto et verso lisibles, pas de reflets',
    description: 'CNI ou équivalent',
  },
  passport: {
    label: 'Passeport',
    icon: DocumentIcons.passport,
    sides: ['recto', 'verso'] as const,
    tips: 'Pages clairement visibles',
    description: 'Passeport en cours de validité',
  },
  permis: {
    label: 'Permis de Conduire',
    icon: DocumentIcons.permis,
    sides: ['recto', 'verso'] as const,
    tips: 'Document lisible sans ombres',
    description: 'Permis valide',
  },
  electoral_card: {
    label: 'Carte d\'Électeur',
    icon: DocumentIcons.electoral,
    sides: ['recto', 'verso'] as const,
    tips: 'Document complet et visible',
    description: 'Carte d\'électeur',
  },
};


const StepIndicator = ({ steps, currentStep }: { steps: KYCStep[]; currentStep: KYCStep }) => {
  const stepLabels: Record<KYCStep, string> = {
    'selfie': 'Selfie',
    'select-doc': 'Sélection',
    'capture-doc': 'Capture',
    'review': 'Révision',
  };

  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-between gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-2 sm:gap-2 sm:p-4">
      {steps.map((step, idx) => (
        <div key={step} className="flex min-w-0 flex-1 items-center relative">
          <motion.div
            animate={{ scale: idx <= currentIndex ? 1.05 : 1 }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all z-10 sm:h-10 sm:w-10 sm:text-sm ${
              idx < currentIndex
                ? 'bg-primary text-primary-foreground shadow'
                : idx === currentIndex
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {idx < currentIndex ? '✓' : idx + 1}
          </motion.div>
          <span className={`ml-1 hidden truncate text-xs font-medium sm:ml-2 sm:inline sm:text-sm ${
            idx <= currentIndex ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {stepLabels[step]}
          </span>
          {idx < steps.length - 1 && (
            <div className={`mx-1 h-0.5 min-w-[8px] flex-1 ${
              idx < currentIndex ? 'bg-primary' : 'bg-border'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default function KYC() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'rejected' | null>(null);
  const [currentStep, setCurrentStep] = useState<KYCStep>('selfie');
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [currentSide, setCurrentSide] = useState<DocumentSide>('recto');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, deleteFile } = useKYCUpload();
  const { videoRef, canvasRef, startCamera, stopCamera, capturePhoto, cameraError } = useCamera();

  useEffect(() => {
    loadKycStatus();
  }, []);

  useEffect(() => {
    if (!showCamera) return;
    let cancelled = false;
    (async () => {
      try {
        await startCamera();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur caméra');
          setShowCamera(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [showCamera]);

  const loadKycStatus = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate('/auth/signin');
        return;
      }

      setUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('kyc_status, kyc_document_url')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Only set status if it's not null
      const typedData = data as any;
      if (typedData?.kyc_status) {
        setKycStatus(typedData.kyc_status);
      } else {
        setKycStatus(null);
      }

      if (typedData?.kyc_document_url && typeof typedData.kyc_document_url === 'object') {
        const files = Object.values(typedData.kyc_document_url).flat() as UploadedFile[];
        setUploadedFiles(files);
      }
    } catch (err) {
      console.error('Error loading KYC status:', err);
      setError('Erreur au chargement du statut KYC');
    }
  };

  const handleStartCamera = () => {
    setError('');
    setShowCamera(true);
  };

  const handleCapture = async (isFromCamera: boolean, file?: File) => {
    try {
      if (!selectedType && currentStep !== 'selfie') {
        setError('Veuillez sélectionner un type de document');
        return;
      }
      if (!userId) return;

      let blob: Blob | null = null;

      if (isFromCamera) {
        blob = await capturePhoto();
      } else if (file) {
        blob = new Blob([file], { type: file.type });
      }

      if (!blob) {
        setError('Impossible de capturer l\'image');
        return;
      }

      setUploading(true);
      setError('');

      const docType = currentStep === 'selfie' ? 'selfie' : selectedType!;
      const side = currentStep === 'selfie' ? 'single' : currentSide;

      const uploaded = await uploadFile(blob, docType, side as DocumentSide, userId);
      if (!uploaded) {
        setError('Échec de l\'envoi du fichier. Réessayez ou importez une autre photo.');
        return;
      }
      const { url, filePath } = uploaded;

      const newFile: UploadedFile = {
        name: `${docType}_${side}`,
        path: filePath,
        type: docType,
        side: side as DocumentSide,
        preview: url,
        timestamp: Date.now(),
      };

      setUploadedFiles(prev => [...prev, newFile]);

      if (currentStep === 'selfie') {
        setSuccess('Selfie capturé avec succès');
        setTimeout(() => {
          setCurrentStep('select-doc');
          setSuccess('');
        }, 1500);
      } else if (currentSide === 'recto' && currentStep === 'capture-doc') {
        const docConfig = DOCUMENT_TYPES[selectedType!];
        const docSides = docConfig.sides as readonly string[];
        if (docSides.includes('verso')) {
          setCurrentSide('verso');
          setSuccess('Recto capturé, veuillez capturer le verso');
        } else {
          setSuccess('Document capturé');
          setTimeout(() => {
            setCurrentStep('review');
            setSuccess('');
          }, 1500);
        }
      } else {
        setSuccess('Document capturé avec succès');
        setTimeout(() => {
          setCurrentStep('review');
          setSuccess('');
        }, 1500);
      }

      stopCamera();
      setShowCamera(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la capture');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCapture(false, file);
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    try {
      if (!userId) return;
      
      // Extract document type and filename from path
      const parts = filePath.split('/');
      const documentType = parts[parts.length - 2] || 'selfie';
      const fileName = parts[parts.length - 1] || '';
      
      await deleteFile(userId, documentType, fileName);
      setUploadedFiles(prev => prev.filter(f => f.path !== filePath));
      setSuccess('Fichier supprimé');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleSubmitForVerification = async () => {
    try {
      if (!userId || uploadedFiles.length === 0) {
        setError('Veuillez télécharger au moins un document');
        return;
      }

      setSubmitting(true);
      setError('');

      // Prepare documents data
      const documentData = uploadedFiles.reduce((acc: any, file) => {
        if (!acc[file.type]) {
          acc[file.type] = [];
        }
        acc[file.type].push(file);
        return acc;
      }, {});

      // Update user with kyc_status and documents (cast to any to bypass type checking)
      const updateData: any = {
        kyc_status: 'pending',
        kyc_document_url: documentData,
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (updateError) throw updateError;

      setKycStatus('pending');
      setSuccess('Dossier soumis pour vérification. Un administrateur l\'examinera sous peu.');
      
      // Reset the form after 2 seconds
      setTimeout(() => {
        setSuccess('');
        setCurrentStep('selfie');
        setSelectedType(null);
        setCurrentSide('recto');
      }, 2000);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (!userId) {
    return (
              <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
          );
  }

  return (
          <div className="mx-auto max-w-2xl space-y-4 overflow-x-hidden px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold sm:text-3xl">Vérification d&apos;identité</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Complétez votre KYC en quelques étapes</p>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800 flex items-center gap-2">
              <CheckCircle2 size={18} />
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* If KYC already submitted (pending), show status only */}
        {kycStatus === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Clock className="text-blue-600" size={24} />
                  Vérification en attente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-blue-800">
                  Votre demande KYC a été soumise avec succès. Notre équipe examine vos documents et vous notifiera dans 24-48 heures.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate('/dashboard/profile')}
                    variant="outline"
                    className="flex-1"
                  >
                    Retour au Profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* If KYC is verified, show confirmation */}
        {kycStatus === 'verified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <CheckCircle2 className="text-green-600" size={24} />
                  Profil Vérifié
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-green-800">
                  Votre profil a été vérifié avec succès. Vous pouvez accéder à tous les services.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate('/dashboard/profile')}
                    variant="outline"
                    className="flex-1"
                  >
                    Retour au Profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Show form only if KYC not submitted or rejected */}
        {(kycStatus === null || kycStatus === 'rejected') && (
          <>
            {/* Step Indicator */}
            <StepIndicator steps={['selfie', 'select-doc', 'capture-doc', 'review']} currentStep={currentStep} />

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {/* STEP 1: SELFIE */}
              {currentStep === 'selfie' && (
            <motion.div
              key="selfie"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-border">
                <CardHeader className="border-b border-border bg-muted/40 px-4 sm:px-6">
                  <CardTitle className="text-xl sm:text-2xl">Prenez un selfie</CardTitle>
                  <CardDescription>Photo claire de votre visage pour vérifier votre identité</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8">
                  {!showCamera ? (
                    <motion.div className="space-y-3 sm:space-y-4">
                      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-6 text-center sm:p-10">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {DocumentIcons.selfie}
                        </div>
                        <div>
                          <p className="text-base font-semibold sm:text-lg">Prêt à commencer ?</p>
                          <p className="mt-1 text-sm text-muted-foreground">Caméra ou import photo</p>
                        </div>
                      </div>
                      {cameraError && (
                        <p className="text-sm text-destructive">{cameraError}</p>
                      )}
                      <Button
                        onClick={handleStartCamera}
                        className="h-11 w-full text-base font-semibold sm:h-12"
                      >
                        Ouvrir la caméra
                      </Button>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="h-11 w-full text-base font-semibold sm:h-12"
                      >
                        Importer une photo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCapture(false, file);
                        }}
                        className="hidden"
                      />
                    </motion.div>
                  ) : (
                    <motion.div className="space-y-4">
                      <div className="relative bg-black rounded-xl overflow-hidden shadow-lg" style={{ aspectRatio: '3/4' }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 border-4 border-blue-500 opacity-70 rounded-xl" />
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleCapture(true)}
                          disabled={uploading}
                          className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base font-semibold rounded-lg"
                        >
                          {uploading ? 'Capture en cours...' : 'Capturer'}
                        </Button>
                        <Button
                          onClick={() => {
                            stopCamera();
                            setShowCamera(false);
                          }}
                          variant="outline"
                          className="flex-1 h-12 font-semibold rounded-lg border-slate-300"
                        >
                          Annuler
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {uploadedFiles.some(f => f.type === 'selfie') && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex gap-3">
                  <Button
                    onClick={() => setCurrentStep('select-doc')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold rounded-lg"
                  >
                    Continuer <ArrowRight className="ml-2" size={18} />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 2: SELECT DOCUMENT TYPE */}
          {currentStep === 'select-doc' && (
            <motion.div
              key="select-doc"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-slate-200">
                <CardHeader className="border-b border-border bg-muted/40 px-4 sm:px-6">
                  <CardTitle className="text-xl sm:text-2xl">Choisir un document</CardTitle>
                  <CardDescription>Sélectionnez le type de document d&apos;identité</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 pb-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(DOCUMENT_TYPES)
                      .filter(([key]) => key !== 'selfie')
                      .map(([key, doc]) => (
                        <motion.button
                          key={key}
                          whileHover={{ scale: 1.04, translateY: -4 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setSelectedType(key as DocumentType);
                            setCurrentStep('capture-doc');
                            setCurrentSide(doc.sides[0]);
                          }}
                          className={`rounded-xl border-2 p-4 text-center transition-all sm:p-6 ${
                            selectedType === key
                              ? 'border-primary bg-primary/5 shadow'
                              : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                          }`}
                        >
                          <div className="mb-2 flex justify-center text-primary sm:mb-3">
                            {doc.icon}
                          </div>
                          <p className="text-sm font-bold sm:text-base">{doc.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{doc.description}</p>
                        </motion.button>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => setCurrentStep('selfie')}
                  variant="outline"
                  className="flex-1 h-12 font-semibold rounded-lg border-slate-300"
                >
                  <ArrowLeft className="mr-2" size={18} /> Retour
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CAPTURE DOCUMENT */}
          {currentStep === 'capture-doc' && selectedType && (
            <motion.div
              key="capture-doc"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-slate-200">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl text-slate-900">{DOCUMENT_TYPES[selectedType].label}</CardTitle>
                      <CardDescription className="text-slate-700 text-sm mt-1">
                        {DOCUMENT_TYPES[selectedType].tips}
                      </CardDescription>
                    </div>
                    {DOCUMENT_TYPES[selectedType].sides.length > 1 && (
                      <Badge className="bg-blue-600 text-white text-sm py-2 px-3 rounded-lg">
                        {currentSide === 'recto' ? 'Recto' : 'Verso'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-8 pb-8">
                  {!showCamera ? (
                    <motion.div className="space-y-4">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-12 text-center space-y-6 border border-slate-200">
                        <div className="text-6xl">{DOCUMENT_TYPES[selectedType].icon}</div>
                        <div>
                          <p className="font-bold text-slate-900 text-lg">
                            Capturer le {currentSide === 'recto' ? 'recto' : 'verso'}
                          </p>
                          <p className="text-sm text-slate-600 mt-2">Document bien éclairé et lisible</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleStartCamera}
                        className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-base font-semibold rounded-lg"
                      >
                        Ouvrir la Caméra
                      </Button>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="w-full h-12 text-base font-semibold rounded-lg border-slate-300 hover:bg-slate-50"
                      >
                        Importer une Photo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </motion.div>
                  ) : (
                    <motion.div className="space-y-4">
                      <div className="relative bg-black rounded-xl overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 border-4 border-amber-500 opacity-70 rounded-xl" />
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleCapture(true)}
                          disabled={uploading}
                          className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base font-semibold rounded-lg"
                        >
                          {uploading ? 'Capture en cours...' : 'Capturer'}
                        </Button>
                        <Button
                          onClick={() => {
                            stopCamera();
                            setShowCamera(false);
                          }}
                          variant="outline"
                          className="flex-1 h-12 font-semibold rounded-lg border-slate-300"
                        >
                          Annuler
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-slate-200">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                  <CardTitle className="text-2xl text-slate-900">Vérification des Documents</CardTitle>
                  <CardDescription className="text-slate-700">Vérifiez vos documents avant de soumettre</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 pb-8 space-y-8">
                  {/* Documents Grid */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 text-lg">Documents capturés</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {uploadedFiles.map((file, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative group rounded-xl overflow-hidden border-2 border-slate-200 bg-white shadow hover:shadow-lg transition-all"
                        >
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-48 object-cover group-hover:opacity-75 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center rounded-xl">
                            <Badge className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-xs">
                              {file.type === 'selfie' ? 'Selfie' : `${file.type} - ${file.side}`}
                            </Badge>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteFile(file.path)}
                            className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-3 bg-slate-50 p-6 rounded-xl border-2 border-slate-200">
                    <p className="font-bold text-slate-900">Avant de soumettre:</p>
                    <ul className="text-sm text-slate-700 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-base">
                          {uploadedFiles.some(f => f.type === 'selfie') ? '✓' : '○'}
                        </span>
                        Selfie clair et net
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-base">
                          {uploadedFiles.length >= 2 ? '✓' : '○'}
                        </span>
                        Documents complets
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-base">✓</span>
                        Pas de reflets ou ombres
                      </li>
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleSubmitForVerification}
                      disabled={uploadedFiles.length === 0 || submitting}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 h-12 text-base font-semibold rounded-lg"
                    >
                      {submitting ? 'Envoi en cours...' : 'Soumettre pour Vérification'}
                    </Button>
                    <Button
                      onClick={() => setCurrentStep('select-doc')}
                      variant="outline"
                      className="w-full h-12 font-semibold rounded-lg border-slate-300"
                    >
                      <ArrowLeft className="mr-2" size={18} /> Ajouter un Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
            </AnimatePresence>
          </>
        )}
      </div>
      );
}
