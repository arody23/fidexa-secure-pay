/**
 * Configuration et utilitaires pour la capture KYC
 * Gère la caméra, la compression d'images et le traitement des données
 */

/**
 * Configuration de la caméra
 */
export const CAMERA_CONFIG = {
  // Contraintes vidéo
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    // Optional pour meilleure performance
    aspectRatio: { ideal: 16 / 9 },
  },
  // Pas d'audio requis
  audio: false,
};

/**
 * Configuration de compression JPEG
 */
export const IMAGE_COMPRESSION = {
  // Format JPEG pour meilleure compression
  format: 'image/jpeg',
  // Quality entre 0 et 1 (0.8-0.9 recommandé)
  quality: 0.85,
  // Taille max en MB (5MB par navigateur)
  maxSizeMB: 5,
};

/**
 * Configuration du stockage
 */
export const STORAGE_CONFIG = {
  // Bucket Supabase
  bucket: 'kyc-documents',
  // Format du chemin : {user-id}/{document-type}/{side}_{timestamp}
  pathTemplate: (userId: string, docType: string, side: string, timestamp: number) =>
    `${userId}/${docType}/${side}_${timestamp}.jpg`,
  // Content type pour les uploads
  contentType: 'image/jpeg',
};

/**
 * Limites de validation
 */
export const VALIDATION_LIMITS = {
  // Taille minimum de l'image en pixels
  minWidth: 320,
  minHeight: 240,
  // Taille maximum de l'image en bytes (5MB)
  maxFileSize: 5 * 1024 * 1024,
  // Formats acceptés
  acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  // Max documents par utilisateur
  maxDocumentsPerUser: 10,
  // Max documents d'un type
  maxDocumentsPerType: 2, // recto + verso
};

/**
 * Messages et textes
 */
export const MESSAGES = {
  camera: {
    notSupported: 'Votre navigateur ne supporte pas l\'accès à la caméra',
    permissionDenied: 'Permission caméra refusée. Vérifiez les paramètres du navigateur.',
    notAvailable: 'Aucune caméra détectée. Utilisez le mode fichier.',
  },
  upload: {
    success: (docType: string, side: string) =>
      `${docType} (${side}) uploadée avec succès!`,
    error: 'Erreur lors de l\'upload du fichier',
    invalidFormat: 'Format d\'image non supporté. Utilisez JPEG, PNG ou WebP.',
    tooLarge: `Fichier trop volumineux. Maximum ${VALIDATION_LIMITS.maxFileSize / 1024 / 1024}MB`,
  },
  validation: {
    imageTooSmall: `Résolution trop basse. Minimum ${VALIDATION_LIMITS.minWidth}x${VALIDATION_LIMITS.minHeight}`,
    noImageSelected: 'Veuillez d\'abord capturer ou télécharger une image',
    notAuthenticated: 'Vous devez être connecté pour uploader des documents',
  },
};

/**
 * Détecteur de navigateur pour compatibilité
 */
export const BrowserCompat = {
  isMediaDevicesSupported: () => {
    return typeof navigator !== 'undefined' &&
           !!navigator.mediaDevices &&
           !!navigator.mediaDevices.getUserMedia;
  },

  isCameraSupported: () => {
    return BrowserCompat.isMediaDevicesSupported();
  },

  isFileUploadSupported: () => {
    return typeof FileReader !== 'undefined';
  },

  supportsWebP: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  },

  getBestImageFormat: () => {
    // Préférer WebP pour la compression, fallback JPEG
    return BrowserCompat.supportsWebP() ? 'image/webp' : 'image/jpeg';
  },
};

/**
 * Traitement d'images
 */
export const ImageProcessor = {
  /**
   * Compresser une image
   */
  compress: async (
    canvas: HTMLCanvasElement,
    format: string = 'image/jpeg',
    quality: number = 0.85
  ): Promise<Blob> => {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
        },
        format,
        quality
      );
    });
  },

  /**
   * Redimensionner une image (optionnel)
   */
  resize: (
    canvas: HTMLCanvasElement,
    maxWidth: number = 1280,
    maxHeight: number = 720
  ): HTMLCanvasElement => {
    const resizedCanvas = document.createElement('canvas');
    const ctx = resizedCanvas.getContext('2d');
    if (!ctx) return canvas;

    let width = canvas.width;
    let height = canvas.height;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    resizedCanvas.width = width;
    resizedCanvas.height = height;
    ctx.drawImage(canvas, 0, 0, width, height);

    return resizedCanvas;
  },

  /**
   * Valider dimensions d'image
   */
  validateDimensions: (width: number, height: number): { valid: boolean; error?: string } => {
    if (width < VALIDATION_LIMITS.minWidth || height < VALIDATION_LIMITS.minHeight) {
      return {
        valid: false,
        error: MESSAGES.validation.imageTooSmall,
      };
    }
    return { valid: true };
  },

  /**
   * Valider format de fichier
   */
  validateFormat: (mimeType: string): { valid: boolean; error?: string } => {
    if (!VALIDATION_LIMITS.acceptedFormats.includes(mimeType)) {
      return {
        valid: false,
        error: MESSAGES.upload.invalidFormat,
      };
    }
    return { valid: true };
  },

  /**
   * Valider taille de fichier
   */
  validateSize: (sizeInBytes: number): { valid: boolean; error?: string } => {
    if (sizeInBytes > VALIDATION_LIMITS.maxFileSize) {
      return {
        valid: false,
        error: MESSAGES.upload.tooLarge,
      };
    }
    return { valid: true };
  },
};

/**
 * Utilitaires pour le chemin de stockage
 */
export const StoragePath = {
  /**
   * Générer le chemin complet du document
   */
  generate: (userId: string, documentType: string, side: string): string => {
    const timestamp = Math.floor(Date.now() / 1000);
    return STORAGE_CONFIG.pathTemplate(userId, documentType, side, timestamp);
  },

  /**
   * Parser le chemin pour extraire les métadonnées
   */
  parse: (path: string): { userId: string; docType: string; side: string; timestamp: number } | null => {
    const regex = /^([a-f0-9-]+)\/([\w-]+)\/(\w+)_(\d+)\.jpg$/;
    const match = path.match(regex);
    if (!match) return null;

    return {
      userId: match[1],
      docType: match[2],
      side: match[3],
      timestamp: parseInt(match[4], 10),
    };
  },
};

/**
 * Configuration des types de documents
 */
export const DOCUMENT_CONFIGS = {
  selfie: {
    name: 'Selfie',
    description: 'Photo de vous-même',
    sides: ['single'] as const,
    icon: '🤳',
    tips: [
      'Visage clair et bien éclairé',
      'Regardez directement la caméra',
      'Pas de lunettes ou filtres',
      'Fond neutre de préférence',
    ],
  },
  cni: {
    name: 'Carte Nationale d\'Identité',
    description: 'CNI - Recto et Verso',
    sides: ['recto', 'verso'] as const,
    icon: '🪪',
    tips: [
      'Placez la carte sur une surface plane',
      'Bonne luminosité sans ombre',
      'Tous les coins visibles',
      'Texte et photo bien lisibles',
    ],
  },
  passport: {
    name: 'Passeport',
    description: 'Page avec photo',
    sides: ['single'] as const,
    icon: '📕',
    tips: [
      'Page de la photo entièrement visible',
      'Coins bien cadrés',
      'Bonne résolution',
      'Pas de reflets',
    ],
  },
  permis: {
    name: 'Permis de Conduire',
    description: 'Recto et Verso',
    sides: ['recto', 'verso'] as const,
    icon: '🚗',
    tips: [
      'Surface plane et bien éclairée',
      'Corners visibles',
      'Numéro bien lisible',
      'Pas de plis ou dommages',
    ],
  },
  electoral_card: {
    name: 'Carte d\'Électeur',
    description: 'Recto et Verso',
    sides: ['recto', 'verso'] as const,
    icon: '🗳️',
    tips: [
      'Carte complètement visible',
      'Bon contraste et lisibilité',
      'Tous les éléments visibles',
      'Pas de reflets ou ombres',
    ],
  },
};

/**
 * Configuration UI (couleurs, animations)
 */
export const UI_CONFIG = {
  colors: {
    success: '#10b981', // vert
    error: '#ef4444',   // rouge
    warning: '#f59e0b', // orange
    info: '#3b82f6',    // bleu
    pending: '#eab308', // jaune
  },
  transitions: {
    default: 'all 0.3s ease-in-out',
    fast: 'all 0.15s ease-in-out',
    slow: 'all 0.5s ease-in-out',
  },
  borderRadius: {
    small: '0.375rem',
    default: '0.5rem',
    large: '0.75rem',
  },
};

/**
 * Configuration des timeouts
 */
export const TIMEOUTS = {
  camera_init: 5000,      // 5 secondes pour démarrer la caméra
  upload_timeout: 60000,  // 60 secondes pour l'upload
  retry_delay: 2000,      // 2 secondes avant retry
  max_retries: 3,         // Maximum 3 tentatives
};

/**
 * Export d'une fonction de validation complète
 */
export const validateDocument = (
  file: File | Blob,
  documentType: string,
  canvas?: HTMLCanvasElement
): { valid: boolean; error?: string } => {
  // Vérifier le format
  const formatCheck = ImageProcessor.validateFormat(
    file instanceof File ? file.type : 'image/jpeg'
  );
  if (!formatCheck.valid) return formatCheck;

  // Vérifier la taille
  const sizeCheck = ImageProcessor.validateSize(file.size);
  if (!sizeCheck.valid) return sizeCheck;

  // Vérifier les dimensions si canvas fourni
  if (canvas) {
    const dimCheck = ImageProcessor.validateDimensions(canvas.width, canvas.height);
    if (!dimCheck.valid) return dimCheck;
  }

  return { valid: true };
};

export default {
  CAMERA_CONFIG,
  IMAGE_COMPRESSION,
  STORAGE_CONFIG,
  VALIDATION_LIMITS,
  MESSAGES,
  BrowserCompat,
  ImageProcessor,
  StoragePath,
  DOCUMENT_CONFIGS,
  UI_CONFIG,
  TIMEOUTS,
  validateDocument,
};
