import { useState } from "react";
import { motion } from "framer-motion";
import { User, Camera, Star, Edit2, Save, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import StarRating from "@/components/StarRating";
import { useToast } from "@/hooks/use-toast";

const mockProfile = {
  name: "Design Studio Pro",
  email: "contact@designstudio.pro",
  description:
    "Studio de design créatif spécialisé dans les identités visuelles, logos et supports marketing. Plus de 5 ans d'expérience au service de votre image de marque.",
  skills: ["Logo Design", "Branding", "UI/UX", "Print Design", "Motion Graphics"],
  rating: 4.8,
  reviewCount: 127,
  plan: "Standard",
  monthlyLimit: 40,
  usedOrders: 28,
  commission: "4%",
};

const plans = [
  {
    name: "Basique",
    price: "Gratuit",
    commission: "15%",
    orders: "Illimité",
    current: false,
  },
  {
    name: "Essentiel",
    price: "15$",
    commission: "6%",
    orders: "20/mois",
    current: false,
  },
  {
    name: "Standard",
    price: "29$",
    commission: "4%",
    orders: "40/mois",
    current: true,
  },
  {
    name: "Premium",
    price: "49$",
    commission: "0%",
    orders: "Illimité",
    current: false,
  },
];

const reviews = [
  {
    id: 1,
    client: "Marie L.",
    rating: 5,
    comment: "Excellent travail! Très professionnel et réactif.",
    date: "2024-01-10",
  },
  {
    id: 2,
    client: "Pierre D.",
    rating: 5,
    comment: "Logo parfait, exactement ce que je voulais. Je recommande!",
    date: "2024-01-08",
  },
  {
    id: 3,
    client: "Sophie M.",
    rating: 4,
    comment: "Bon travail dans l'ensemble, quelques révisions nécessaires.",
    date: "2024-01-05",
  },
];

const Profile = () => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: mockProfile.name,
    email: mockProfile.email,
    description: mockProfile.description,
    skills: mockProfile.skills.join(", "),
  });

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Profil mis à jour",
      description: "Vos modifications ont été enregistrées.",
    });
  };

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
          >
            {isEditing ? (
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
                        DS
                      </div>
                      {isEditing && (
                        <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-secondary border border-border shadow-md">
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <StarRating rating={mockProfile.rating} showValue />
                        <span className="text-sm text-muted-foreground">
                          ({mockProfile.reviewCount} avis)
                        </span>
                      </div>
                      <Badge variant="success" className="mt-2">
                        Prestataire vérifié
                      </Badge>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom / Entreprise</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          disabled={!isEditing}
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
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        disabled={!isEditing}
                        rows={4}
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
                      />
                    </div>

                    {!isEditing && (
                      <div className="flex flex-wrap gap-2">
                        {mockProfile.skills.map((skill) => (
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

            {/* Reviews */}
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
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-lg border border-border p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-medium">
                              {review.client[0]}
                            </div>
                            <span className="font-medium">{review.client}</span>
                          </div>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          "{review.comment}"
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {review.date}
                        </p>
                      </div>
                    ))}
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
                      {mockProfile.plan}
                    </Badge>
                    <p className="font-display text-3xl font-bold">29$/mois</p>
                    <p className="text-sm text-muted-foreground">
                      Commission: {mockProfile.commission}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commandes utilisées</span>
                      <span className="font-medium">
                        {mockProfile.usedOrders}/{mockProfile.monthlyLimit}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(mockProfile.usedOrders / mockProfile.monthlyLimit) * 100}%`,
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
                          plan.current
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{plan.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {plan.orders} • {plan.commission}
                            </p>
                          </div>
                          <p className="font-display font-bold">{plan.price}</p>
                        </div>
                        {plan.current && (
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
