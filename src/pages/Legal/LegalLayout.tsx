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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
        <h1>{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
