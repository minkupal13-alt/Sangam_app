import { lazy, Suspense, useEffect, useState, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useUIStore } from '@/lib/uiStore';
import { supabase } from '@/lib/supabase';
import { subscribeToNotifications, fetchUnreadCount } from '@/lib/notificationApi';
import type { Notification } from '@/lib/types';
import AppLayout from '@/components/AppLayout';
import CreatePostModal from '@/components/CreatePostModal';
import UploadFlickModal from '@/components/UploadFlickModal';
import UploadVideoModal from '@/components/UploadVideoModal';
import NotificationToast from '@/components/NotificationToast';
import SangamLogo from '@/components/SangamLogo';
import PageSkeleton from '@/components/PageSkeleton';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const HomeFeed = lazy(() => import('@/pages/HomeFeed'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const NotificationSettingsPage = lazy(() => import('@/pages/NotificationSettingsPage'));
const PlaceholderPage = lazy(() => import('@/pages/PlaceholderPage'));
const FlicksPage = lazy(() => import('@/pages/FlicksPage'));
const FlickAudioPage = lazy(() => import('@/pages/FlickAudioPage'));
const WatchPage = lazy(() => import('@/pages/WatchPage'));
const WatchVideoPage = lazy(() => import('@/pages/WatchVideoPage'));
const WatchHistoryPage = lazy(() => import('@/pages/WatchHistoryPage'));
const WatchSubscriptionsPage = lazy(() => import('@/pages/WatchSubscriptionsPage'));
const SubscriptionsPage = lazy(() => import('@/pages/SubscriptionsPage'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const ChatsPage = lazy(() => import('@/pages/ChatsPage'));
const SearchResultsPage = lazy(() => import('@/pages/SearchResultsPage'));
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const HashtagPage = lazy(() => import('@/pages/HashtagPage'));
const PeopleDiscoveryPage = lazy(() => import('@/pages/PeopleDiscoveryPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const LiveStreamPage = lazy(() => import('@/pages/LiveStreamPage'));
const AudioRoomsPage = lazy(() => import('@/pages/AudioRoomsPage'));
const AudioRoomPage = lazy(() => import('@/pages/AudioRoomPage'));
const EventsPage = lazy(() => import('@/pages/EventsPage'));
const EventDetailPage = lazy(() => import('@/pages/EventDetailPage'));
const MarketplacePage = lazy(() => import('@/pages/MarketplacePage'));
const ListingDetailPage = lazy(() => import('@/pages/ListingDetailPage'));
const CreateListingPage = lazy(() => import('@/pages/CreateListingPage'));
const RewardsPage = lazy(() => import('@/pages/RewardsPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const GroupsPage = lazy(() => import('@/pages/GroupsPage'));
const GroupDetailPage = lazy(() => import('@/pages/GroupDetailPage'));
const PodcastsPage = lazy(() => import('@/pages/PodcastsPage'));
const JobsPage = lazy(() => import('@/pages/JobsPage'));
const MemoriesPage = lazy(() => import('@/pages/MemoriesPage'));
const BookmarksPage = lazy(() => import('@/pages/BookmarksPage'));
const WalletPage = lazy(() => import('@/pages/WalletPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const PaymentSuccessPage = lazy(() => import('@/pages/PaymentSuccessPage'));
const PaymentFailedPage = lazy(() => import('@/pages/PaymentFailedPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const PayoutsPage = lazy(() => import('@/pages/PayoutsPage'));
const ReferralPage = lazy(() => import('@/pages/ReferralPage'));
const RefundPolicyPage = lazy(() => import('@/pages/RefundPolicyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));
const FundraisersPage = lazy(() => import('@/pages/FundraisersPage'));
const PagesPage = lazy(() => import('@/pages/PagesPage'));
const LinkInBioPage = lazy(() => import('@/pages/LinkInBioPage'));
const NewsletterBlogPage = lazy(() => import('@/pages/NewsletterBlogPage'));
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'));
const AdminContentPage = lazy(() => import('@/pages/admin/AdminContentPage'));
const AdminVerificationPage = lazy(() => import('@/pages/admin/AdminVerificationPage'));
const AdminFinancePage = lazy(() => import('@/pages/admin/AdminFinancePage'));
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AdminAnnouncementsPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminRolesPage = lazy(() => import('@/pages/admin/AdminRolesPage'));
const AdminAuditLogPage = lazy(() => import('@/pages/admin/AdminAuditLogPage'));
const AdminSupportPage = lazy(() => import('@/pages/admin/AdminSupportPage'));

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <SangamLogo size={48} />
          <p className="text-gray-900 dark:text-white font-heading font-bold text-lg mt-4">
            कुछ गलत हो गया
          </p>
          <p className="text-gray-400 text-sm mt-1">Something went wrong. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, initialized } = useAuthStore();
  const [forceTimeout, setForceTimeout] = useState(false);

  useEffect(() => {
    if (!initialized || loading) {
      const timer = setTimeout(() => setForceTimeout(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [initialized, loading]);

  if ((!initialized || loading) && !forceTimeout) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#fafaf9] dark:bg-[#0b1220]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppShell() {
  const profile = useAuthStore((s) => s.profile);
  const createOpen = useUIStore((s) => s.createOpen);
  const openCreate = useUIStore((s) => s.openCreate);
  const closeCreate = useUIStore((s) => s.closeCreate);
  const flickUploadOpen = useUIStore((s) => s.flickUploadOpen);
  const closeFlickUpload = useUIStore((s) => s.closeFlickUpload);
  const videoUploadOpen = useUIStore((s) => s.videoUploadOpen);
  const closeVideoUpload = useUIStore((s) => s.closeVideoUpload);
  const [notifCount, setNotifCount] = useState(0);
  const [toastNotif, setToastNotif] = useState<Notification | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const count = await fetchUnreadCount();
      if (!cancelled) setNotifCount(count);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToNotifications(profile.id, (n) => {
      setNotifCount((prev) => prev + 1);
      setToastNotif(n);
    });
    return unsub;
  }, [profile]);

  // Auth expire: redirect to login if session is removed
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Suspense fallback={<PageSkeleton />}><LoginPage /></Suspense>} />
        <Route path="/signup" element={<Suspense fallback={<PageSkeleton />}><SignupPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<PageSkeleton />}><ForgotPasswordPage /></Suspense>} />
        <Route path="/u/:username/links" element={<Suspense fallback={<PageSkeleton />}><LinkInBioPage /></Suspense>} />
        <Route path="/u/:username/blog" element={<Suspense fallback={<PageSkeleton />}><NewsletterBlogPage /></Suspense>} />
        {/* Admin routes */}
        <Route path="/admin" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminDashboardPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/users" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminUsersPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/reports" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminReportsPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/content" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminContentPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/verification" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminVerificationPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/finance" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminFinancePage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/announcements" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminAnnouncementsPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/analytics" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminAnalyticsPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/settings" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminSettingsPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/roles" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminRolesPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/audit-log" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminAuditLogPage /></Suspense></AdminLayout></Suspense>} />
        <Route path="/admin/support" element={<Suspense fallback={<PageSkeleton />}><AdminLayout><Suspense fallback={<PageSkeleton />}><AdminSupportPage /></Suspense></AdminLayout></Suspense>} />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}><OnboardingPage /></Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}><OnboardingPage /></Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Routes>
                <Route
                  path="/flicks"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <FlicksPage uploadOpen={flickUploadOpen} onUploadClose={closeFlickUpload} />
                    </Suspense>
                  }
                />
                <Route
                  path="/flicks/audio/:audioId"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <FlickAudioPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/*"
                  element={
                    <AppLayout onCreate={openCreate} notificationCount={notifCount}>
                      <Routes>
                        <Route path="/" element={<Suspense fallback={<PageSkeleton />}><HomeFeed /></Suspense>} />
                        <Route path="/explore" element={<Suspense fallback={<PageSkeleton />}><ExplorePage /></Suspense>} />
                        <Route path="/explore/people" element={<Suspense fallback={<PageSkeleton />}><PeopleDiscoveryPage /></Suspense>} />
                        <Route path="/search" element={<Suspense fallback={<PageSkeleton />}><SearchResultsPage /></Suspense>} />
                        <Route path="/hashtag/:tagname" element={<Suspense fallback={<PageSkeleton />}><HashtagPage /></Suspense>} />
                        <Route path="/watch" element={<Suspense fallback={<PageSkeleton />}><WatchPage /></Suspense>} />
                        <Route path="/watch/history" element={<Suspense fallback={<PageSkeleton />}><WatchHistoryPage /></Suspense>} />
                        <Route path="/watch/subscriptions" element={<Suspense fallback={<PageSkeleton />}><WatchSubscriptionsPage /></Suspense>} />
                        <Route path="/watch/:videoId" element={<Suspense fallback={<PageSkeleton />}><WatchVideoPage /></Suspense>} />
                        <Route path="/subscriptions" element={<Suspense fallback={<PageSkeleton />}><SubscriptionsPage /></Suspense>} />
                        <Route path="/history" element={<Suspense fallback={<PageSkeleton />}><HistoryPage /></Suspense>} />
                        <Route path="/chats" element={<Suspense fallback={<PageSkeleton />}><ChatsPage /></Suspense>} />
                        <Route path="/chats/:conversationId" element={<Suspense fallback={<PageSkeleton />}><ChatsPage /></Suspense>} />
                        <Route path="/reels" element={<Suspense fallback={<PageSkeleton />}><PlaceholderPage title="Reels" description="Short vertical videos — try Flicks instead!" /></Suspense>} />
                        <Route path="/videos" element={<Suspense fallback={<PageSkeleton />}><PlaceholderPage title="Videos" description="Long-form videos — try Watch instead!" /></Suspense>} />
                        <Route path="/messages" element={<Navigate to="/chats" replace />} />
                        <Route path="/notifications" element={<Suspense fallback={<PageSkeleton />}><NotificationsPage /></Suspense>} />
                        <Route path="/settings/notifications" element={<Suspense fallback={<PageSkeleton />}><NotificationSettingsPage /></Suspense>} />
                        <Route path="/profile" element={<Navigate to={`/u/${profile?.username}`} replace />} />
                        <Route path="/u/:username" element={<Suspense fallback={<PageSkeleton />}><ProfilePage /></Suspense>} />
                        <Route path="/live/:id" element={<Suspense fallback={<PageSkeleton />}><LiveStreamPage /></Suspense>} />
                        <Route path="/audio-rooms" element={<Suspense fallback={<PageSkeleton />}><AudioRoomsPage /></Suspense>} />
                        <Route path="/audio-rooms/:id" element={<Suspense fallback={<PageSkeleton />}><AudioRoomPage /></Suspense>} />
                        <Route path="/events" element={<Suspense fallback={<PageSkeleton />}><EventsPage /></Suspense>} />
                        <Route path="/events/:id" element={<Suspense fallback={<PageSkeleton />}><EventDetailPage /></Suspense>} />
                        <Route path="/marketplace" element={<Suspense fallback={<PageSkeleton />}><MarketplacePage /></Suspense>} />
                        <Route path="/marketplace/new" element={<Suspense fallback={<PageSkeleton />}><CreateListingPage /></Suspense>} />
                        <Route path="/marketplace/:id" element={<Suspense fallback={<PageSkeleton />}><ListingDetailPage /></Suspense>} />
                        <Route path="/rewards" element={<Suspense fallback={<PageSkeleton />}><RewardsPage /></Suspense>} />
                        <Route path="/dashboard" element={<Suspense fallback={<PageSkeleton />}><DashboardPage /></Suspense>} />
                        <Route path="/settings" element={<Suspense fallback={<PageSkeleton />}><SettingsPage /></Suspense>} />
                        <Route path="/groups" element={<Suspense fallback={<PageSkeleton />}><GroupsPage /></Suspense>} />
                        <Route path="/groups/:id" element={<Suspense fallback={<PageSkeleton />}><GroupDetailPage /></Suspense>} />
                        <Route path="/podcasts" element={<Suspense fallback={<PageSkeleton />}><PodcastsPage /></Suspense>} />
                        <Route path="/jobs" element={<Suspense fallback={<PageSkeleton />}><JobsPage /></Suspense>} />
                        <Route path="/memories" element={<Suspense fallback={<PageSkeleton />}><MemoriesPage /></Suspense>} />
                        <Route path="/bookmarks" element={<Suspense fallback={<PageSkeleton />}><BookmarksPage /></Suspense>} />
                        <Route path="/wallet" element={<Suspense fallback={<PageSkeleton />}><WalletPage /></Suspense>} />
                        <Route path="/pricing" element={<Suspense fallback={<PageSkeleton />}><PricingPage /></Suspense>} />
                        <Route path="/payment/success" element={<Suspense fallback={<PageSkeleton />}><PaymentSuccessPage /></Suspense>} />
                        <Route path="/payment/failed" element={<Suspense fallback={<PageSkeleton />}><PaymentFailedPage /></Suspense>} />
                        <Route path="/marketplace/orders" element={<Suspense fallback={<PageSkeleton />}><OrdersPage /></Suspense>} />
                        <Route path="/payouts" element={<Suspense fallback={<PageSkeleton />}><PayoutsPage /></Suspense>} />
                        <Route path="/referral" element={<Suspense fallback={<PageSkeleton />}><ReferralPage /></Suspense>} />
                        <Route path="/refund-policy" element={<Suspense fallback={<PageSkeleton />}><RefundPolicyPage /></Suspense>} />
                        <Route path="/terms" element={<Suspense fallback={<PageSkeleton />}><TermsPage /></Suspense>} />
                        <Route path="/privacy" element={<Suspense fallback={<PageSkeleton />}><PrivacyPage /></Suspense>} />
                        <Route path="/help" element={<Suspense fallback={<PageSkeleton />}><HelpPage /></Suspense>} />
                        <Route path="/fundraisers" element={<Suspense fallback={<PageSkeleton />}><FundraisersPage /></Suspense>} />
                        <Route path="/pages" element={<Suspense fallback={<PageSkeleton />}><PagesPage /></Suspense>} />
                        <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFoundPage /></Suspense>} />
                      </Routes>
                    </AppLayout>
                  }
                />
              </Routes>
              <CreatePostModal open={createOpen} onClose={closeCreate} />
              {flickUploadOpen && (
                <UploadFlickModal onClose={closeFlickUpload} onPublished={closeFlickUpload} />
              )}
              {videoUploadOpen && (
                <UploadVideoModal onClose={closeVideoUpload} onPublished={closeVideoUpload} />
              )}
            </ProtectedRoute>
          }
        />
      </Routes>
      {toastNotif && (
        <NotificationToast
          notification={toastNotif}
          onClose={() => setToastNotif(null)}
          onClick={() => {
            if (toastNotif.type === 'message' && toastNotif.target_id) {
              navigate(`/chats/${toastNotif.target_id}`);
            } else if (toastNotif.actor) {
              navigate(`/u/${toastNotif.actor.username}`);
            }
            setToastNotif(null);
          }}
        />
      )}
    </>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);
  const [forceInit, setForceInit] = useState(false);

  useEffect(() => {
    init();
    // Safety net: if init() hasn't completed in 3s, force the app to render
    // so the user sees the login page instead of an infinite spinner.
    const timer = setTimeout(() => setForceInit(true), 3000);
    return () => clearTimeout(timer);
  }, [init]);

  if (!initialized && !forceInit) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#fafaf9] dark:bg-[#0b1220]">
        <div className="flex flex-col items-center gap-3">
          <SangamLogo size={48} />
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
