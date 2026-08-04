import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Flag,
  FileText,
  CheckCircle,
  DollarSign,
  Megaphone,
  BarChart3,
  Settings,
  Shield,
  ScrollText,
  LifeBuoy,
  ArrowLeft,
  Menu,
  X,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { supabase } from '@/lib/supabase';
import SangamLogo from '@/components/SangamLogo';

const adminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Reports', icon: Flag, path: '/admin/reports' },
  { label: 'Content', icon: FileText, path: '/admin/content' },
  { label: 'Verification', icon: CheckCircle, path: '/admin/verification' },
  { label: 'Finance', icon: DollarSign, path: '/admin/finance' },
  { label: 'Announcements', icon: Megaphone, path: '/admin/announcements' },
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
  { label: 'Roles', icon: Shield, path: '/admin/roles' },
  { label: 'Audit Log', icon: ScrollText, path: '/admin/audit-log' },
  { label: 'Support', icon: LifeBuoy, path: '/admin/support' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (!profile) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', profile.id)
        .maybeSingle();
      const role = (data as { role?: string } | null)?.role;
      setIsAdmin(role === 'admin' || role === 'superadmin');
    }
    checkAdmin();
  }, [profile]);

  if (isAdmin === null) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-[#0b1220]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0b1220] px-4 text-center">
        <Shield className="h-12 w-12 text-gray-300 dark:text-navy-50 mb-4" />
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-gray-400 mt-1">You need admin privileges to access this page.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-5 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
        >
          Back to Sangam
        </button>
      </div>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200 dark:border-navy-300">
        <SangamLogo size={32} />
        <div>
          <span className="font-heading font-extrabold text-lg block leading-none">Sangam</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {adminNav.map((item) => {
          const isActive = item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-sangam-gradient text-white shadow-md shadow-brand-500/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-200'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-gray-200 dark:border-navy-300">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-200 w-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Sangam
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b1220] text-gray-900 dark:text-white">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white dark:bg-[#0b1220] border-r border-gray-200 dark:border-navy-300 z-30">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-20 bg-white dark:bg-[#0b1220] border-b border-gray-200 dark:border-navy-300 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SangamLogo size={28} />
          <span className="font-heading font-extrabold text-base">Admin</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-200">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-white dark:bg-[#0b1220] border-r border-gray-200 dark:border-navy-300 h-full">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebar}
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="md:ml-64">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
