import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Plus, MessageCircle, Loader2 } from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { fetchConversations } from '@/lib/chatApi';
import { useAuthStore } from '@/lib/authStore';
import { timeAgo } from '@/lib/format';
import ChatWindow from '@/components/ChatWindow';
import NewChatModal from '@/components/NewChatModal';
import { usePageTitle } from '@/lib/usePageTitle';

export default function ChatsPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  usePageTitle('Chats | Sangam');

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const convs = await fetchConversations();
      setConversations(convs);
    } catch {
      setConversations([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const selectedConversation = conversations.find((c) => c.id === conversationId);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const name = c.is_group
      ? c.group_name || ''
      : c.participants?.find((p) => p.user_id !== profile?.id)?.profile?.full_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  function getConversationName(conv: Conversation): string {
    if (conv.is_group) return conv.group_name || 'Group Chat';
    const other = conv.participants?.find((p) => p.user_id !== profile?.id)?.profile;
    return other?.full_name || 'Unknown';
  }

  function getConversationAvatar(conv: Conversation): string {
    if (conv.is_group) {
      return conv.group_avatar || `https://ui-avatars.com/api/?name=${conv.group_name || 'G'}`;
    }
    const other = conv.participants?.find((p) => p.user_id !== profile?.id)?.profile;
    return other?.avatar_url || `https://ui-avatars.com/api/?name=${other?.full_name || 'U'}`;
  }

  function getLastMessagePreview(conv: Conversation): string {
    if (!conv.last_message) return 'No messages yet';
    if (conv.last_message.deleted_at) return 'Message deleted';
    if (conv.last_message.content) return conv.last_message.content;
    if (conv.last_message.media_url) return '📷 Photo';
    return '';
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen">
      {/* Left panel: conversation list */}
      <div
        className={`${
          conversationId ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 lg:w-96 border-r border-gray-100 dark:border-navy-300 bg-white dark:bg-navy-200`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-navy-300">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Chats</h1>
            <button
              onClick={() => setShowNewChat(true)}
              className="h-9 w-9 rounded-full bg-sangam-gradient flex items-center justify-center text-white active:scale-90 transition-transform shadow-md shadow-coral-500/20"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageCircle className="h-12 w-12 text-gray-300 dark:text-navy-300 mb-3" />
              <p className="text-gray-400 font-heading font-bold text-base">No conversations yet</p>
              <p className="text-gray-400 text-sm mt-1">Start a conversation with your friends!</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-4 px-5 py-2 rounded-full bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform shadow-md shadow-coral-500/20"
              >
                Start a Chat
              </button>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((conv) => {
                const isActive = conv.id === conversationId;
                const unread = conv.unread_count || 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/chats/${conv.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-navy-300'
                    }`}
                  >
                    <img
                      src={getConversationAvatar(conv)}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm truncate ${
                            unread > 0
                              ? 'font-bold text-gray-900 dark:text-white'
                              : 'font-semibold text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {getConversationName(conv)}
                        </p>
                        {conv.last_message && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {timeAgo(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p
                          className={`text-xs truncate ${
                            unread > 0
                              ? 'font-semibold text-gray-600 dark:text-gray-300'
                              : 'text-gray-400'
                          }`}
                        >
                          {getLastMessagePreview(conv)}
                        </p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-sangam-gradient text-white text-[10px] font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: chat window */}
      <div
        className={`${
          conversationId ? 'flex' : 'hidden md:flex'
        } flex-1 min-w-0`}
      >
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            onBack={() => navigate('/chats')}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <MessageCircle className="h-16 w-16 text-gray-200 dark:text-navy-300 mb-4" />
            <p className="text-gray-400 font-heading font-bold text-lg">Select a conversation</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              Choose a chat from the list to start messaging, or start a new conversation.
            </p>
          </div>
        )}
      </div>

      {/* New Chat modal */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onConversationCreated={(id) => {
            setShowNewChat(false);
            loadConversations();
            navigate(`/chats/${id}`);
          }}
        />
      )}
    </div>
  );
}
