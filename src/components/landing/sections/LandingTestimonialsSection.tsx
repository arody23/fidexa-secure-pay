import { Star } from 'lucide-react';
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
    <section id="testimonials" className="bg-[#F5F7FA] py-24 sm:py-32 md:py-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0b2f63] sm:text-5xl">
            Ce que disent les prestataires
          </h2>
          <p className="mt-3 text-base text-[#526d87]">Des retours concrets, sans langue de bois.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {visible.map((t) => (
            <article key={t.key} className="border-t border-[#d7e3f0] pt-6">
              <p className="text-[15px] leading-relaxed text-[#3d566f]">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar name={t.name} url={t.avatar} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0b2f63]">{t.name}</p>
                  <p className="truncate text-xs text-[#6B7280]">{t.subtitle}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
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
