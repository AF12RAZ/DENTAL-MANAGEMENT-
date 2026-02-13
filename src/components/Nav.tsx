import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, X, Instagram, Moon, Sun } from 'lucide-react';

interface NavProps {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  isAuthenticated: boolean;
  logout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
}

export function Nav({ isDark, setIsDark, isAuthenticated, logout, isMobileMenuOpen, setIsMobileMenuOpen }: NavProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-zinc-200 nav-glass dark:border-[#2A3441]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 bg-[#FF6B35] dark:bg-[#FF6B35] rounded-full flex items-center justify-center logo-glow">
              <span className="text-white text-lg sm:text-xl font-semibold">GG</span>
            </div>
            <div className="min-w-0">
              <div className="font-semibold tracking-tighter text-lg sm:text-2xl truncate">GOLDEN GROVE</div>
              <div className="text-[10px] text-zinc-500 dark:text-[#6B7785] -mt-1">DENTAL LOUNGE</div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 sm:gap-9 text-sm uppercase tracking-[2px] font-medium">
          <a href="https://www.instagram.com/tooth_solver" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-zinc-600 dark:text-[#A8B3BF] hover:text-[#FF6B35] dark:hover:text-[#FFB088] transition-colors duration-300" aria-label="Instagram">
            <Instagram className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden lg:inline">@tooth_solver</span>
          </a>
          <Link to="/" className={`${isActive('/') ? 'text-[#FF6B35] dark:text-[#FFB088]' : 'hover:text-[#FF6B35] dark:hover:text-[#FFB088]'} transition-colors duration-300`}>HOME</Link>
          <Link to="/book" className={`${isActive('/book') ? 'text-[#FF6B35] dark:text-[#FFB088]' : 'hover:text-[#FF6B35] dark:hover:text-[#FFB088]'} transition-colors duration-300`}>BOOK APPOINTMENT</Link>
          {isAuthenticated && (
            <>
              <Link to="/dashboard" className={`${isActive('/dashboard') ? 'text-[#FF6B35] dark:text-[#FFB088]' : 'hover:text-[#FF6B35] dark:hover:text-[#FFB088]'} transition-colors duration-300`}>DASHBOARD</Link>
              <Link to="/calendar" className={`${isActive('/calendar') ? 'text-[#FF6B35] dark:text-[#FFB088]' : 'hover:text-[#FF6B35] dark:hover:text-[#FFB088]'} transition-colors duration-300`}>CALENDAR</Link>
              <Link to="/revenue" className={`${isActive('/revenue') ? 'text-[#FF6B35] dark:text-[#FFB088]' : 'hover:text-[#FF6B35] dark:hover:text-[#FFB088]'} transition-colors duration-300`}>REVENUE</Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm hover:text-red-500 dark:hover:text-red-400 transition-colors min-h-[44px]"
              >
                <LogOut size={16} /> LOGOUT
              </button>
            </>
          )}
          <button onClick={() => setIsDark(!isDark)} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-zinc-600 dark:text-[#A8B3BF] hover:bg-zinc-100 dark:hover:bg-[#1E2830] hover:text-[#FF6B35] dark:hover:text-[#D4AF37] transition-all duration-300" aria-label="Toggle dark mode">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <a href="https://www.instagram.com/tooth_solver" target="_blank" rel="noopener noreferrer" className="min-h-[44px] min-w-[44px] flex items-center justify-center p-3 text-zinc-600 dark:text-zinc-400" aria-label="Instagram">
            <Instagram className="w-5 h-5" />
          </a>
          <button onClick={() => setIsDark(!isDark)} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-3 rounded-lg" aria-label="Toggle dark mode">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-3"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-[#151B23] border-t border-zinc-200 dark:border-[#2A3441] px-6 py-8 flex flex-col gap-6 text-lg"
          >
            <a href="https://www.instagram.com/tooth_solver" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-3 min-h-[44px]" onClick={() => setIsMobileMenuOpen(false)}>
              <Instagram className="w-5 h-5" /> @tooth_solver
            </a>
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="py-3 min-h-[44px]">Home</Link>
            <Link to="/book" onClick={() => setIsMobileMenuOpen(false)} className="py-3 min-h-[44px]">Book Appointment</Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="py-3 min-h-[44px]">Dashboard</Link>
                <Link to="/calendar" onClick={() => setIsMobileMenuOpen(false)} className="py-3 min-h-[44px]">Calendar</Link>
                <Link to="/revenue" onClick={() => setIsMobileMenuOpen(false)} className="py-3 min-h-[44px]">Revenue</Link>
                <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="py-3 text-left min-h-[44px]">Logout</button>
              </>
            )}
            <button onClick={() => { setIsDark(!isDark); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 py-3 text-left min-h-[44px]">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />} {isDark ? 'Light mode' : 'Dark mode'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
