import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import SiteFooter from '@/components/layout/SiteFooter';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
          <Logo />
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </header>
      <main className="prose prose-neutral dark:prose-invert container mx-auto max-w-3xl overflow-x-hidden break-words px-4 py-8 prose-headings:scroll-mt-20 prose-p:leading-relaxed sm:py-12">
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
