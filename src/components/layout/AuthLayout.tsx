import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      animate={{ y: [0, -24, 0], x: [0, 12, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <FloatingOrb className="left-[-10%] top-[10%] h-72 w-72 bg-primary/30" delay={0} />
      <FloatingOrb className="right-[-5%] top-[40%] h-96 w-96 bg-violet-600/20" delay={2} />
      <FloatingOrb className="bottom-[5%] left-[30%] h-64 w-64 bg-cyan-500/15" delay={4} />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <Link to="/" className="mb-8">
          <Logo />
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
