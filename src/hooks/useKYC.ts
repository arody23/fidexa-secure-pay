import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KYCFile {
  type: 'selfie' | 'cni' | 'passport' | 'permis' | 'electoral_card';
  side: 'recto' | 'verso' | 'single';
  url: string;
  uploadedAt: string;
}

export function useKYCUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const uploadFile = async (
    file: Blob | File,
    documentType: string,
    side: string,
    userId: string
  ): Promise<{ url: string; filePath: string } | null> => {
    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);

      // Créer le chemin : auth.uid() / type_document / side_timestamp.jpg
      const timestamp = Math.floor(Date.now() / 1000);
      const fileName = `${side}_${timestamp}.jpg`;
      const filePath = `${userId}/${documentType}/${fileName}`;

      // Upload avec simulation de progression
      const { error: uploadError, data } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, {
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(100);

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      return { url: publicUrl, filePath };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de l\'upload';
      setError(errorMsg);
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteFile = async (userId: string, documentType: string, fileName: string) => {
    try {
      const filePath = `${userId}/${documentType}/${fileName}`;
      const { error } = await supabase.storage.from('kyc-documents').remove([filePath]);

      if (error) throw error;
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(errorMsg);
      console.error('Delete error:', err);
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploading,
    uploadProgress,
    error,
    setError,
  };
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Impossible d\'accéder à la caméra. Vérifiez les permissions.';
      setCameraError(errorMsg);
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
  };

  const capturePhoto = async (): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) {
      return null;
    }

    const context = canvasRef.current.getContext('2d');
    if (!context) return null;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    return new Promise<Blob | null>((resolve) => {
      canvasRef.current!.toBlob((blob: Blob | null) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  return {
    videoRef,
    canvasRef,
    cameraActive,
    cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}
