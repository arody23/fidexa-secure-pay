import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CameraFacing = 'user' | 'environment';

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

      const timestamp = Math.floor(Date.now() / 1000);
      const mime = (file.type || 'image/jpeg').toLowerCase();
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const contentType = mime.startsWith('image/') ? mime : 'image/jpeg';
      const fileName = `${side}_${timestamp}.${ext}`;
      const filePath = `${userId}/${documentType}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, {
          upsert: false,
          contentType,
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(100);

      const {
        data: { publicUrl },
      } = supabase.storage.from('kyc-documents').getPublicUrl(filePath);

      return { url: publicUrl, filePath };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'upload";
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
  const [facingMode, setFacingMode] = useState<CameraFacing>('user');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (facing: CameraFacing = facingMode) => {
    try {
      setCameraError('');
      stopCamera();
      setFacingMode(facing);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      await new Promise((r) => requestAnimationFrame(() => r(undefined)));

      const attach = async () => {
        if (!videoRef.current) return false;
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        return true;
      };

      if (!(await attach())) {
        await new Promise((r) => setTimeout(r, 180));
        if (!(await attach())) {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          throw new Error('Caméra indisponible. Importez une photo.');
        }
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      let errorMsg =
        err instanceof Error
          ? err.message
          : "Impossible d'accéder à la caméra. Vérifiez les permissions.";
      if (name === 'NotAllowedError') {
        errorMsg = 'Permission caméra refusée. Autorisez-la ou importez une photo.';
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        errorMsg = 'Caméra demandée introuvable. Essayez l’autre caméra ou importez une photo.';
      } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        errorMsg = 'La caméra nécessite HTTPS. Importez une photo.';
      }
      setCameraError(errorMsg);
      console.error('Camera error:', err);
      throw new Error(errorMsg);
    }
  };

  const switchCamera = async () => {
    const next: CameraFacing = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(next);
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
      canvasRef.current!.toBlob(
        (blob: Blob | null) => {
          resolve(blob);
        },
        'image/jpeg',
        0.9
      );
    });
  };

  return {
    videoRef,
    canvasRef,
    cameraActive,
    cameraError,
    facingMode,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
  };
}
