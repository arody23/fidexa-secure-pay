import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Camera, Star, Edit2, Save, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import StarRating from "@/components/StarRating";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileData {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[] | null;
  rating: number | null;
  reviews_count: number | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  monthly_volume: number | null;
  monthly_limit: number | null;
}

const plans = [
  {
    name: "free",
    label: "Basique",
    price: "Gratuit",
    commission: "15%",
    orders: "Illimité",
  },
  {
    name: "essential",
    label: "Essentiel",
    price: "15$",
    commission: "6%",
    orders: "20/mois",
  },
  {
    name: "standard",
    label: "Standard",
    price: "29$",
    commission: "4%",
    orders: "40/mois",
  },
  {
    name: "premium",
    label: "Premium",
    price: "49$",
    commission: "0%",
    orders: "Illimité",
  },
];

const Profile = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    phone: "",
    bio: "",
    skills: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setFormData({
          display_name: data.display_name || "",
          email: data.email || "",
          phone: data.phone || "",
          bio: data.bio || "",
          skills: data.skills?.join(", ") || "",
        });
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const skillsArray = formData.skills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: formData.display_name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        skills: skillsArray,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil.",
        variant: "destructive",
      });
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            display_name: formData.display_name,
            email: formData.email,
            phone: formData.phone,
            bio: formData.bio,
            skills: skillsArray,
          }
        : null
    );

    setIsEditing(false);
    toast({
      title: "Profil mis à jour",
      description: "Vos modifications ont été enregistrées.",
    });
  };

  const currentPlan = plans.find((p) => p.name === profile?.subscription_plan) || plans[0];
  const usedOrders = profile?.monthly_volume || 0;
  const monthlyLimit = profile?.monthly_limit || 500000;

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "FX";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              Mon Profil
            </h1>
            <p className="text-muted-foreground">
              Gérez vos informations et votre abonnement.
            </p>
          </div>
          <Button
            variant={isEditing ? "success" : "outline"}
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : isEditing ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            ) : (
              <>
                <Edit2 className="mr-2 h-4 w-4" />
                Modifier
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Info */}
          <div className="space-y-6 lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Informations du profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-3xl font-bold">
                        {getInitials()}
                      </div>
                      {isEditing && (
                        <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-secondary border border-border shadow-md">
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <StarRating rating={profile?.rating || 0} showValue />
                        <span className="text-sm text-muted-foreground">
                          ({profile?.reviews_count || 0} avis)
                        </span>
                      </div>
                      {profile?.subscription_status === "active" && (
                        <Badge variant="success" className="mt-2">
                          Prestataire vérifié
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom / Entreprise</Label>
                        <Input
                          id="name"
                          value={formData.display_name}
                          onChange={(e) =>
                            setFormData({ ...formData, display_name: e.target.value })
                          }
                          disabled={!isEditing}
                          placeholder="Votre nom ou entreprise"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          disabled={!isEditing}
                          placeholder="votre@email.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        disabled={!isEditing}
                        placeholder="+225 XX XX XX XX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Description</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData({ ...formData, bio: e.target.value })
                        }
                        disabled={!isEditing}
                        rows={4}
                        placeholder="Décrivez votre activité..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skills">Compétences (séparées par des virgules)</Label>
                      <Input
                        id="skills"
                        value={formData.skills}
                        onChange={(e) =>
                          setFormData({ ...formData, skills: e.target.value })
                        }
                        disabled={!isEditing}
                        placeholder="Design, Marketing, Développement..."
                      />
                    </div>

                    {!isEditing && profile?.skills && profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Reviews - Empty state */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-warning" />
                    Avis clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Star className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">
                      Aucun avis pour le moment
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Les avis de vos clients apparaîtront ici
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Subscription */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    Mon abonnement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 p-4 text-center">
                    <Badge variant="default" className="mb-2">
                      {currentPlan.label}
                    </Badge>
                    <p className="font-display text-3xl font-bold">{currentPlan.price}{currentPlan.price !== "Gratuit" && "/mois"}</p>
                    <p className="text-sm text-muted-foreground">
                      Commission: {currentPlan.commission}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Volume mensuel</span>
                      <span className="font-medium">
                        {usedOrders.toLocaleString()} / {monthlyLimit.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min((usedOrders / monthlyLimit) * 100, 100)}%`,
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    Changer de plan
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Plans Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Plans disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.name}
                        className={`rounded-lg border p-3 ${
                          plan.name === profile?.subscription_plan
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{plan.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {plan.orders} • {plan.commission}
                            </p>
                          </div>
                          <p className="font-display font-bold">{plan.price}</p>
                        </div>
                        {plan.name === profile?.subscription_plan && (
                          <Badge variant="success" className="mt-2">
                            Plan actuel
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
