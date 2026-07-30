import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionPlans';
import { UserProfile } from '@/types/index';
import { loadUserProfile, updateUserProfile } from '@/lib/userService';

export function Subscriptions() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await loadUserProfile();
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Erreur au chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!profile) return;

    try {
      setSelecting(true);
      setError('');

      const plan = SUBSCRIPTION_PLANS[planId];
      const validPlan = planId as 'basic' | 'essential' | 'standard' | 'premium';
      await updateUserProfile({
        subscription_plan: validPlan,
        commission_rate: plan.commission,
      });

      setSuccess(`Vous êtes passé au plan ${plan.name}`);
      await loadProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error selecting plan:', err);
      setError('Erreur lors de la sélection du plan');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
              <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des plans...</p>
          </div>
        </div>
          );
  }

  return (
          <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Abonnements</h1>
          <p className="text-gray-600 mt-1">Choisissez le plan qui convient à votre entreprise</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Current Plan Info */}
        {profile && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>Plan Actuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold capitalize">{profile.subscription_plan}</p>
                  <p className="text-gray-600 mt-1">
                    Commission: <span className="font-semibold">{profile.commission_rate}%</span>
                  </p>
                </div>
                <Badge className="bg-blue-600">{profile.subscription_plan.toUpperCase()}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => {
            const isCurrent = profile?.subscription_plan === planId;
            return (
              <Card
                key={planId}
                className={`flex flex-col transition-all duration-300 ${
                  isCurrent
                    ? `border-2 border-blue-500 ring-2 ring-blue-200`
                    : `hover:border-blue-300`
                }`}
              >
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-6">
                  {/* Price */}
                  <div>
                    <p className="text-4xl font-bold">
                      ${plan.price}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {plan.price === 0 ? 'Pour toujours' : 'par mois'}
                    </p>
                  </div>

                  {/* Commission */}
                  <div className="p-3 bg-gray-100 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Commission</p>
                    <p className="text-2xl font-bold text-blue-600">{plan.commission}%</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  <Button
                    onClick={() => handleSelectPlan(planId)}
                    disabled={isCurrent || selecting}
                    className="w-full"
                    variant={isCurrent ? 'default' : 'outline'}
                  >
                    {isCurrent ? '✓ Plan Actuel' : selecting ? 'En cours...' : 'Sélectionner'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle>Questions Fréquentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold mb-1">Puis-je changer de plan?</p>
              <p className="text-sm text-gray-600">
                Oui, vous pouvez changer de plan à tout moment. La nouvelle commission s'applique immédiatement aux nouveaux liens de paiement.
              </p>
            </div>
            <div className="border-t pt-4">
              <p className="font-semibold mb-1">Y a-t-il des frais cachés?</p>
              <p className="text-sm text-gray-600">
                Non, les prix affichés sont définitifs. La commission est le seul coût associé à vos transactions.
              </p>
            </div>
            <div className="border-t pt-4">
              <p className="font-semibold mb-1">Puis-je revenir au plan Basique?</p>
              <p className="text-sm text-gray-600">
                Bien sûr! Vous pouvez réduire votre plan à tout moment sans pénalité.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      );
}

export default Subscriptions;
