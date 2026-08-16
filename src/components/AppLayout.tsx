import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Video,
  MessageCircle,
  Bell,
  User,
  Plus,
  Moon,
  Sun,
  LogOut,
  Clapperboard,
  Tv,
  Users,
  History,
  Bookmark,
  Clock,
  Radio,
  Mic,
  CalendarDays,
  ShoppingBag,
  Award,
  BarChart3,
  Settings,
  UsersRound,
  Briefcase,
  Headphones,
  Clock4,
  Wallet,
  PiggyBank,
  Gift,
  Shield,
} from 'lucide-react';
import { useThemeStore } from '@/lib/themeStore';
import { useAuthStore } from '@/lib/authStore';
import SangamLogo from '@/components/SangamLogo';
import SearchBar from '@/components/SearchBar';
import GoLiveModal from '@/components/GoLiveModal';
import FloatingMenu from '@/components/FloatingMenu';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import type { NavKey } from '@/lib/navTypes';

interface AppLayoutProps {
  children: React.ReactNode;
  onCreate: () => void;
  notificationCount: number;
}

const navItems: { key: NavKey; label: string; icon: React.ReactNode; path: string }[] = [
  { key: 'home', label: 'Home', icon: <Home className="h-6 w-6" />, path: '/' },
  { key: 'explore', label: 'Explore', icon: <Compass className="h-6 w-6" />, path: '/explore' },
  { key: 'flicks', label: 'Flicks', icon: <Clapperboard className="h-6 w-6" />, path: '/flicks' },
  { key: 'watch', label: 'Watch', icon: <Tv className="h-6 w-6" />, path: '/watch' },
  { key: 'live', label: 'Go Live', icon: <Radio className="h-6 w-6" />, path: '/live' },
  { key: 'audio-rooms', label: 'Rooms', icon: <Mic className="h-6 w-6" />, path: '/audio-rooms' },
  { key: 'events', label: 'Events', icon: <CalendarDays className="h-6 w-6" />, path: '/events' },
  { key: 'marketplace', label: 'Market', icon: <ShoppingBag className="h-6 w-6" />, path: '/marketplace' },
  { key: 'groups', label: 'Groups', icon: <UsersRound className="h-6 w-6" />, path: '/groups' },
  { key: 'podcasts', label: 'Podcasts', icon: <Headphones className="h-6 w-6" />, path: '/podcasts' },
  { key: 'jobs', label: 'Jobs', icon: <Briefcase className="h-6 w-6" />, path: '/jobs' },
  { key: 'memories', label: 'Memories', icon: <Clock4 className="h-6 w-6" />, path: '/memories' },
  { key: 'subscriptions', label: 'Subscriptions', icon: <Users className="h-6 w-6" />, path: '/subscriptions' },
  { key: 'history', label: 'History', icon: <History className="h-6 w-6" />, path: '/history' },
  { key: 'rewards', label: 'Rewards', icon: <Award className="h-6 w-6" />, path: '/rewards' },
  { key: 'wallet', label: 'Wallet', icon: <Wallet className="h-6 w-6" />, path: '/wallet' },
  { key: 'payouts', label: 'Earnings', icon: <PiggyBank className="h-6 w-6" />, path: '/payouts' },
  { key: 'referral', label: 'Refer & Earn', icon: <Gift className="h-6 w-6" />, path: '/referral' },
  { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-6 w-6" />, path: '/dashboard' },
  { key: 'bookmarks', label: 'Bookmarks', icon: <Bookmark className="h-6 w-6" />, path: '/bookmarks' },
  { key: 'messages', label: 'Chats', icon: <MessageCircle className="h-6 w-6" />, path: '/chats' },
  { key: 'notifications', label: 'Pulse', icon: <Bell className="h-6 w-6" />, path: '/notifications' },
  { key: 'profile', label: 'Profile', icon: <User className="h-6 w-6" />, path: '/profile' },
];

export default function AppLayout({ children, onCreate, notificationCount }: AppLayoutProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0b1220] text-gray-900 dark:text-white">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 border-r border-gray-200 dark:border-navy-300 px-3 py-4 z-30 bg-white dark:bg-[#0b1220]">
        <div className="flex items-center gap-2 px-2 mb-4">
          <SangamLogo size={36} />
          <span className="font-heading font-extrabold text-xl tracking-tight">Sangam</span>
        </div>

        <div className="mb-4 px-1">
          <SearchBar />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            if (item.key === 'live') {
              return (
                <button
                  key={item.key}
                  onClick={() => setGoLiveOpen(true)}
                  className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-200 w-full"
                >
                  <span className="text-red-500">{item.icon}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            }
            return (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-sangam-gradient text-white shadow-md shadow-brand-500/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-200'
                  }`
                }
              >
                <span className="relative">
                  {item.icon}
                  {item.key === 'notifications' && notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </span>
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Shortcuts section */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-navy-300">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-3 mb-2 hidden lg:block">Shortcuts</p>
          <div className="space-y-1">
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/10'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-200'
                }`
              }
            >
              <Clock className="h-4 w-4" />
              <span className="hidden lg:inline text-xs">Recently Watched</span>
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/10'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-200'
                }`
              }
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden lg:inline text-xs">Saved Posts</span>
            </NavLink>
          </div>
        </div>

        <button
          onClick={onCreate}
          className="w-full py-2.5 rounded-xl bg-sangam-gradient text-white font-semibold flex items-center justify-center gap-2 mt-2 active:scale-[0.98] transition-transform shadow-md shadow-coral-500/20"
        >
          <Plus className="h-5 w-5" /> <span className="hidden lg:inline">Create</span>
        </button>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-navy-300">
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-200"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setLogoutOpen(true)}
            aria-label="Logout"
            className="h-9 w-9 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <img
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'U'}`}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          </div>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-200 w-full transition-colors"
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => setLogoutOpen(true)}
          className="hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>

        {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
          <button
            onClick={() => navigate('/admin')}
            className="hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 w-full transition-colors"
          >
            <Shield className="h-5 w-5" />
            <span>Admin Panel</span>
          </button>
        )}

        <GoLiveModal open={goLiveOpen} onClose={() => setGoLiveOpen(false)} onLive={(streamId) => navigate(`/live/${streamId}`)} />
      </aside>

      {/* Main content */}
      <div className="md:ml-64 min-h-screen pb-16 md:pb-0">
        {/* Mobile search bar */}
        <div className="md:hidden sticky top-0 z-20 bg-white/90 dark:bg-[#0b1220]/90 backdrop-blur-xl border-b border-gray-100 dark:border-navy-300 px-4 py-2">
          <SearchBar />
        </div>
        <div className="max-w-6xl mx-auto w-full">{children}</div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-[#0b1220]/90 backdrop-blur-xl border-t border-gray-200 dark:border-navy-300 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-1 py-1.5">
          <MobileNav to="/" end icon={<Home className="h-6 w-6" />} />
          <MobileNav to="/explore" icon={<Compass className="h-6 w-6" />} />
          <MobileNav to="/flicks" icon={<Clapperboard className="h-6 w-6" />} />
          <MobileNav to="/watch" icon={<Tv className="h-6 w-6" />} />
          <button
            onClick={onCreate}
            className="h-11 w-11 -mt-5 rounded-full bg-sangam-gradient flex items-center justify-center shadow-lg shadow-brand-500/30 active:scale-90 transition-transform"
          >
            <Plus className="h-6 w-6 text-white" />
          </button>
          <MobileNav to="/chats" icon={<MessageCircle className="h-6 w-6" />} />
          <MobileNav to="/notifications" icon={<BellWithBadge count={notificationCount} />} />
          <MobileNav to="/profile" icon={<User className="h-6 w-6" />} />
        </div>
      </nav>

      {/* Right-side floating menu */}
      <FloatingMenu />

      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}

function MobileNav({ to, icon, end }: { to: string; icon: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors relative ${
          isActive ? 'text-brand-500' : 'text-gray-500 dark:text-gray-400'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-sangam-gradient" />
          )}
          {icon}
        </>
      )}
    </NavLink>
  );
}

function BellWithBadge({ count }: { count: number }) {
  return (
    <div className="relative">
      <Bell className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
}
