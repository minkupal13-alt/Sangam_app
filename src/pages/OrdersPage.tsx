import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Loader2,
  Package,
  Truck,
  CheckCircle,
  Clock,
  ArrowRight,
  Store,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { usePageTitle } from '@/lib/usePageTitle';
import { timeAgo } from '@/lib/format';

type Tab = 'orders' | 'sales';

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  amount: number;
  status: string;
  created_at: string;
  listings: { title: string } | null;
  buyer: { username: string; full_name: string; avatar_url: string | null } | null;
  seller: { username: string; full_name: string; avatar_url: string | null } | null;
}

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered', 'completed'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  confirmed: { label: 'Confirmed', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  shipped: { label: 'Shipped', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  delivered: { label: 'Delivered', color: 'text-coral-500', bg: 'bg-coral-50 dark:bg-coral-900/20' },
  completed: { label: 'Completed', color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
};

const STEP_ICONS = [Clock, Package, Truck, CheckCircle, CheckCircle];

export default function OrdersPage() {
  const profile = useAuthStore((s) => s.profile);
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  usePageTitle('Orders | Sangam');

  useEffect(() => {
    if (profile) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [profile, tab]);

  async function loadOrders() {
    if (!profile) return;
    setLoading(true);
    try {
      const field = tab === 'orders' ? 'buyer_id' : 'seller_id';
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          listings:listing_id (title),
          buyer:buyer_id (username, full_name, avatar_url),
          seller:seller_id (username, full_name, avatar_url)
        `)
        .eq(field, profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as unknown as Order[]) || []);
    } catch (err) {
      console.error('loadOrders error', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      await loadOrders();
    } catch (err) {
      console.error('updateStatus error', err);
      alert('Failed to update order status.');
    } finally {
      setUpdating(null);
    }
  }

  function renderTimeline(status: string) {
    const currentIdx = STATUS_STEPS.indexOf(status);
    return (
      <div className="flex items-center gap-1 mt-3">
        {STATUS_STEPS.map((step, i) => {
          const Icon = STEP_ICONS[i];
          const isDone = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                    isDone
                      ? 'bg-sangam-gradient text-white'
                      : 'bg-gray-100 dark:bg-navy-300 text-gray-400'
                  } ${isCurrent ? 'ring-2 ring-brand-400 ring-offset-1 dark:ring-offset-navy-200' : ''}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={`text-[9px] font-semibold capitalize ${isDone ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
                  {step}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < currentIdx ? 'bg-brand-400' : 'bg-gray-200 dark:bg-navy-300'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">
          Orders
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('orders')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
            tab === 'orders'
              ? 'bg-sangam-gradient text-white'
              : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
          }`}
        >
          <Package className="h-4 w-4" />
          My Orders
        </button>
        <button
          onClick={() => setTab('sales')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
            tab === 'sales'
              ? 'bg-sangam-gradient text-white'
              : 'bg-white dark:bg-navy-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-300'
          }`}
        >
          <Store className="h-4 w-4" />
          My Sales
        </button>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-10 text-center">
          <ShoppingBag className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {tab === 'orders' ? 'No orders yet. Start shopping on the marketplace!' : 'No sales yet. List something to start selling!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const otherParty = tab === 'orders' ? order.seller : order.buyer;
            const otherLabel = tab === 'orders' ? 'Seller' : 'Buyer';
            return (
              <div
                key={order.id}
                className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {order.listings?.title || 'Untitled listing'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {otherLabel}: @{otherParty?.username || 'unknown'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      ₹{order.amount.toLocaleString()}
                    </p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <p className="text-xs text-gray-400 mb-1">
                  {timeAgo(order.created_at)}
                </p>

                {/* Timeline */}
                {order.status !== 'cancelled' && renderTimeline(order.status)}

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  {tab === 'sales' && order.status === 'confirmed' && (
                    <button
                      onClick={() => updateStatus(order.id, 'shipped')}
                      disabled={updating === order.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {updating === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                      Mark as Shipped
                    </button>
                  )}
                  {tab === 'orders' && order.status === 'shipped' && (
                    <button
                      onClick={() => updateStatus(order.id, 'delivered')}
                      disabled={updating === order.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-sangam-gradient text-white text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {updating === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      Mark as Received
                    </button>
                  )}
                  {tab === 'sales' && order.status === 'delivered' && (
                    <button
                      onClick={() => updateStatus(order.id, 'completed')}
                      disabled={updating === order.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {updating === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      Complete Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
