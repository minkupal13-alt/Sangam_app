import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  Wallet,
  Award,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';

interface MenuEntry {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const MENU_ITEMS: MenuEntry[] = [
  { label: 'Profile', icon: <User className="h-5 w-5" />, path: '/profile' },
  { label: 'Wallet', icon: <Wallet className="h-5 w-5" />, path: '/wallet' },
  { label: 'Rewards', icon: <Award className="h-5 w-5" />, path: '/rewards' },
  { label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" />, path: '/dashboard' },
  { label: 'Settings', icon: <Settings className="h-5 w-5" />, path: '/settings' },
  { label: 'Help', icon: <HelpCircle className="h-5 w-5" />, path: '/help' },
];

export default function FloatingMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  return (
    <>
      <div ref={menuRef} className="fixed right-4 bottom-24 md:bottom-6 z-40">
        {/* Menu panel */}
        {open && (
          <div className="absolute bottom-16 right-0 w-56 rounded-2xl bg-white dark:bg-navy-200 shadow-2xl border border-gray-100 dark:border-navy-300 py-2 animate-scaleIn origin-bottom-right">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  setOpen(false);
                  navigate(item.path);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-400">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="my-1 border-t border-gray-100 dark:border-navy-300" />
            <button
              onClick={() => {
                setOpen(false);
                setLogoutOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="h-14 w-14 rounded-full bg-sangam-gradient text-white flex items-center justify-center shadow-lg shadow-brand-500/30 active:scale-90 transition-transform"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </>
  );
}
