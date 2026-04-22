import { Navbar } from '@/components/Navbar';
import { ThemeToggle } from '@/components/ThemeToggle';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-slate-50 ${className}`}>
      <Navbar />
      <ThemeToggle />
      <div className="pt-20">
        {children}
      </div>
    </div>
  );
}
