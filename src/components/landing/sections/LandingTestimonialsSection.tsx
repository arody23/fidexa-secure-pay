import { Star } from 'lucide-react';
import Logo from '@/components/Logo';
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
  if (url) return <img src={url} alt={name} className="h-11 w-11 rounded-full object-cover" />;
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2BB673] text-sm font-semibold text-white">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

/** Ref: landing-06-testimonials.png */
export function LandingTestimonialsSection({ items, page, pageCount, onPageChange }: Props) {
  const visible = items.slice(page * 3, page * 3 + 3);

  return (
    <section id="testimonials" className="bg-[#F5F7FA] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <Logo size="sm" className="mb-5 justify-center" />
          <h2 className="text-3xl font-semibold tracking-tight text-[#1A3A5C] sm:text-4xl">
            Ils nous font confiance
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">Avis prestataires</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {visible.map((t) => (
            <article
              key={t.key}
              className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_4px_24px_-4px_rgba(26,58,92,0.08)]"
            >
              <div className="mb-4 flex items-center gap-3">
                <Avatar name={t.name} url={t.avatar} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A3A5C]">{t.name}</p>
                  <p className="truncate text-xs text-[#6B7280]">{t.subtitle}</p>
                </div>
              </div>
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="line-clamp-3 text-sm leading-relaxed text-[#6B7280]">&ldquo;{t.text}&rdquo;</p>
            </article>
          ))}
        </div>

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
                  page === i ? 'w-7 bg-[#2BB673]' : 'w-2 bg-[#1A3A5C]/15'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
