import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Composant de redirection pour compatibilité
 * Redirige automatiquement /pay/:linkId vers /order/:linkId
 */
export default function PaymentRedirect() {
  const { linkId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (linkId) {
      // Redirection automatique vers la nouvelle page
      navigate(`/order/${linkId}`, { replace: true });
    }
  }, [linkId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirection...</p>
      </div>
    </div>
  );
}
