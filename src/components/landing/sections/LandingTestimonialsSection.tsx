import { Quote, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TestimonialItem = {
  key: string;
  name: string;
  subtitle: string;
  text: string;
  rating: number;
  avatar: string | null;
};

type Props = {
  items: TestimonialItem[];
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-12 w-12 rounded-full object-cover ring-2 ring-white" />;
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b3b78] text-sm font-semibold text-white ring-2 ring-white">
      {initials}
    </div>
  );
}

/** Section avis — style éditorial premium */
export function LandingTestimonialsSection({ items, page, pageCount, onPageChange }: Props) {
  const visible = items.slice(page * 3, page * 3 + 3);
  const featured = visible[0];
  const side = visible.slice(1);

  return (
    <section id="testimonials" className="relative overflow-hidden bg-[#0b2f63] py-24 sm:py-32">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#2BB673]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2BB673]">Avis vérifiés</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Ce que disent ceux qui encaissent avec FidexaPay
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Des retours de prestataires après de vraies missions — pas des slogans marketing.
          </p>
        </div>

        {featured && (
          <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <article className="relative overflow-hidden rounded-[1.75rem] bg-white p-7 sm:p-10">
              <Quote className="absolute right-6 top-6 h-10 w-10 text-[#0b3b78]/10" strokeWidth={1.25} />
              <div className="flex gap-1">
                {Array.from({ length: featured.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-6 text-xl leading-relaxed text-[#0b2f63] sm:text-2xl sm:leading-snug">
                &ldquo;{featured.text}&rdquo;
              </p>
              <div className="mt-8 flex items-center gap-3">
                <Avatar name={featured.name} url={featured.avatar} />
                <div>
                  <p className="text-sm font-semibold text-[#0b2f63]">{featured.name}</p>
                  <p className="text-xs text-[#5c7188]">{featured.subtitle}</p>
                </div>
              </div>
            </article>

            <div className="flex flex-col gap-4">
              {side.map((t) => (
                <article
                  key={t.key}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/85">&ldquo;{t.text}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar name={t.name} url={t.avatar} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                      <p className="truncate text-xs text-white/55">{t.subtitle}</p>
                    </div>
                  </div>
                </article>
              ))}
              {side.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/20 p-8 text-center text-sm text-white/50">
                  Plus d&apos;avis arrivent après chaque mission validée.
                </div>
              )}
            </div>
          </div>
        )}

        {pageCount > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Page ${i + 1}`}
                onClick={() => onPageChange(i)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  page === i ? 'w-8 bg-[#2BB673]' : 'w-2 bg-white/25 hover:bg-white/40'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
