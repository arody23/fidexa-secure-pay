/**
 * MoneyFusion API Integration
 * Documentation: https://docs.moneyfusion.net
 */

const MONEYFUSION_API_KEY = import.meta.env.VITE_MONEYFUSION_API_URL;
const MONEYFUSION_API_URL = "https://www.pay.moneyfusion.net/paiement";

export interface MoneyFusionPaymentData {
  totalPrice: number;
  article: Array<Record<string, number>>;
  numeroSend: string;
  nomclient: string;
  personal_Info?: Array<Record<string, any>>;
  return_url?: string;
  webhook_url?: string;
}

export interface MoneyFusionPaymentResponse {
  statut: boolean;
  token: string;
  message: string;
  url: string;
}

export interface MoneyFusionStatusResponse {
  statut: boolean;
  data: {
    _id: string;
    tokenPay: string;
    numeroSend: string;
    nomclient: string;
    personal_Info?: Array<Record<string, any>>;
    numeroTransaction?: string;
    Montant: number;
    frais: number;
    statut: 'pending' | 'paid' | 'failure' | 'no paid';
    moyen?: string;
    return_url?: string;
    createdAt: string;
  };
  message: string;
}

/**
 * MoneyFusion API Client
 */
class MoneyFusionClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    // Ne pas exiger la clé API au constructeur - sera vérifiée lors de l'utilisation
    this.apiUrl = MONEYFUSION_API_URL;
    this.apiKey = MONEYFUSION_API_KEY || '';
  }

  private checkApiKey() {
    if (!this.apiKey) {
      throw new Error('MoneyFusion API Key is not configured. Please add VITE_MONEYFUSION_API_URL to .env');
    }
  }

  /**
   * Initier un paiement
   */
  async initiatePayment(paymentData: MoneyFusionPaymentData): Promise<MoneyFusionPaymentResponse> {
    this.checkApiKey(); // Vérifier la clé API avant d'utiliser
    
    console.log('🌐 MoneyFusion Payment Request:', {
      url: this.apiUrl,
      data: paymentData,
      apiKey: this.apiKey,
    });

    try {
      // Ajouter la clé API dans le body
      const requestBody = {
        ...paymentData,
        API_URL: this.apiKey, // La clé API va dans le body
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 MoneyFusion Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ MoneyFusion Error:', errorData);
        throw new Error(
          errorData.message || 
          `MoneyFusion API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('✅ MoneyFusion Success:', data);
      
      if (!data.statut) {
        throw new Error(data.message || 'Échec de l\'initiation du paiement');
      }

      return data;
    } catch (error) {
      console.error('💥 MoneyFusion Request Failed:', error);
      throw error;
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(token: string): Promise<MoneyFusionStatusResponse> {
    this.checkApiKey(); // Vérifier la clé API avant d'utiliser
    
    const url = `https://www.pay.moneyfusion.net/paiementNotif/${token}`;
    
    console.log('🔍 Checking payment status:', { token, url });

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Payment status:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Status check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const moneyFusion = new MoneyFusionClient();

// Export helper functions
export const initiatePayment = (data: MoneyFusionPaymentData) => moneyFusion.initiatePayment(data);
export const checkPaymentStatus = (token: string) => moneyFusion.checkPaymentStatus(token);
