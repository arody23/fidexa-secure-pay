import { BriefcaseBusiness, Code2, GraduationCap, Palette, PenLine } from 'lucide-react';
import { motion } from 'framer-motion';

const USE_CASES = [
  {
    title: 'Prestations freelance',
    text: 'Créez un lien, faites payer le client, livrez, puis libérez les fonds après validation.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Design & création',
    text: 'Protégez chaque mission créative : le paiement reste séquestré jusqu’à acceptation du livrable.',
    icon: Palette,
  },
  {
    title: 'Développement web',
    text: 'Encaissez les acomptes et soldes sans courir après le client. Le suivi reste clair pour les deux côtés.',
    icon: Code2,
  },
  {
    title: 'Formation & coaching',
    text: 'Vos clients réservent et paient avant la session. Vous êtes payé une fois le service rendu.',
    icon: GraduationCap,
  },
  {
    title: 'Conseil & rédaction',
    text: 'Partagez un lien de paiement sécurisé. Le client suit l’avancement sans créer de compte.',
    icon: PenLine,
  },
];

export function LandingUseCasesSection() {
  return (
    <section id="use-cases" className="bg-white py-24 sm:py-32 md:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0b2f63] sm:text-5xl">
            Pensé pour les prestataires de service.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#526d87] sm:text-lg">
            FidexaPay sécurise vos missions : le client paie d’abord, vous livrez, les fonds sont libérés
            après validation.
          </p>
        </div>
        <div className="mt-12 grid grid-flow-dense gap-4 md:grid-cols-12">
          {USE_CASES.map((useCase, index) => {
            const span = index === 0 ? 'md:col-span-7' : index === 1 ? 'md:col-span-5' : 'md:col-span-4';
            return (
              <motion.article
                key={useCase.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className={`group min-h-52 overflow-hidden rounded-2xl border border-[#dce8f5] p-6 transition duration-500 hover:-translate-y-1 hover:border-[#a9c8ef] ${span} ${
                  index === 0 ? 'bg-[#0b3b78] text-white' : index === 3 ? 'bg-[#eaf8f0]' : 'bg-[#f7faff]'
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition duration-500 group-hover:scale-105 ${
                    index === 0 ? 'bg-white/15 text-[#6ce0a0]' : 'bg-white text-[#1354b8]'
                  }`}
                >
                  <useCase.icon className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <h3 className={`mt-10 text-xl font-semibold ${index === 0 ? 'text-white' : 'text-[#0b2f63]'}`}>
                  {useCase.title}
                </h3>
                <p
                  className={`mt-2 max-w-sm text-sm leading-relaxed ${
                    index === 0 ? 'text-white/75' : 'text-[#58738d]'
                  }`}
                >
                  {useCase.text}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
