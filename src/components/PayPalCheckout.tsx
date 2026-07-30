import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Loader2, Shield } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PAYPAL_CLIENT_ID, PAYPAL_ENV } from '@/config';
import { capturePayPalOrder, createPayPalOrder } from '@/lib/paypal';
import { formatAmount } from '@/lib/currency';

interface PayPalCheckoutProps {
  linkId: string;
  amount: number;
  currency: string;
  paypalHint?: { currency_code: string; value: string };
  onSuccess: () => void;
}

export default function PayPalCheckout({
  linkId,
  amount,
  currency,
  paypalHint: initialPaypalHint,
  onSuccess,
}: PayPalCheckoutProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [paypalHint, setPaypalHint] = useState(initialPaypalHint);

  if (!PAYPAL_CLIENT_ID) {
    return (
      <p className="text-sm text-destructive">
        PayPal non configuré (VITE_PAYPAL_CLIENT_ID manquant).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Paiement sécurisé FidexaPay</p>
            <p className="text-muted-foreground">
              {formatAmount(amount, currency)}
              {paypalHint && (
                <>
                  {' '}
                  · ≈ {paypalHint.value} {paypalHint.currency_code} via PayPal
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Visa, Mastercard, Carte bancaire — fonds en escrow jusqu&apos;à validation.
            </p>
          </div>
        </div>
      </div>

      {processing && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Confirmation du paiement...
        </div>
      )}

      <PayPalScriptProvider
        options={{
          clientId: PAYPAL_CLIENT_ID,
          currency: paypalHint?.currency_code || 'EUR',
          intent: 'capture',
          components: 'buttons',
          ...(PAYPAL_ENV === 'sandbox' ? { 'data-sdk-integration-source': 'integrationbuilder' } : {}),
        }}
      >
        <PayPalButtons
          disabled={processing}
          style={{
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'pay',
            height: 45,
          }}
          createOrder={async () => {
            const result = await createPayPalOrder(linkId);
            setPaypalHint(result.paypalAmount);
            return result.orderId;
          }}
          onApprove={async (data) => {
            try {
              setProcessing(true);
              await capturePayPalOrder(data.orderID, linkId);
              toast({
                title: 'Paiement confirmé',
                description: 'Votre paiement est sécurisé en escrow FidexaPay.',
              });
              onSuccess();
            } catch (err) {
              toast({
                title: 'Erreur de paiement',
                description: err instanceof Error ? err.message : 'Capture échouée',
                variant: 'destructive',
              });
            } finally {
              setProcessing(false);
            }
          }}
          onError={(err) => {
            console.error('PayPal error:', err);
            toast({
              title: 'Erreur PayPal',
              description: 'Le paiement a échoué. Réessayez ou utilisez une autre carte.',
              variant: 'destructive',
            });
          }}
          onCancel={() => {
            toast({
              title: 'Paiement annulé',
              description: 'Vous pouvez réessayer quand vous voulez.',
            });
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
