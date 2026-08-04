import { useState, useEffect } from 'react';
import { X, Search, Check, Users, ArrowRight, Loader2 } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { fetchConnections, createDirectConversation, createGroupConversation } from '@/lib/chatApi';
import { useAuthStore } from '@/lib/authStore';

interface NewChatModalProps {
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

export default function NewChatModal({ onClose, onConversationCreated }: NewChatModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const [connections, setConnections] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchConnections()
      .then(setConnections)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = connections.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size > 1) setGroupMode(true);
      else if (next.size <= 1) setGroupMode(false);
      return next;
    });
  }

  async function handleStart() {
    if (selected.size === 0) return;
    setCreating(true);
    try {
      if (groupMode && selected.size > 1) {
        const id = await createGroupConversation(
          groupName || 'New Group',
          null,
          [...selected],
        );
        if (id) onConversationCreated(id);
      } else {
        const id = await createDirectConversation([...selected][0]);
        if (id) onConversationCreated(id);
      }
    } catch {
      // ignore
    }
    setCreating(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-3xl border border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">
            {groupMode ? 'New Group' : 'New Chat'}
          </h2>
          <div className="w-8" />
        </div>

        {/* Group name (if group mode) */}
        {groupMode && selected.size > 1 && (
          <div className="p-4 border-b border-gray-100 dark:border-navy-300">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {selected.size} members selected
              </span>
            </div>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors text-sm"
            />
          </div>
        )}

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Connections list */}
        <div className="px-2 pb-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              No connections found. Follow people to start chatting!
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-navy-300'
                    }`}
                  >
                    <img
                      src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}`}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {p.full_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">@{p.username}</p>
                    </div>
                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-brand-500 border-brand-500'
                          : 'border-gray-300 dark:border-navy-300'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Start button */}
        {selected.size > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-navy-300 sticky bottom-0 bg-white dark:bg-navy-200">
            <button
              onClick={handleStart}
              disabled={creating || (groupMode && !groupName.trim())}
              className="w-full py-3 rounded-xl bg-sangam-gradient text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md shadow-coral-500/20"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {groupMode ? 'Create Group' : 'Start Chat'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
