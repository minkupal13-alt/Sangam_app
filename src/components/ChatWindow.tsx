import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Reply,
  Copy,
  Trash2,
  X,
  Image as ImageIcon,
  Loader2,
  Users,
} from 'lucide-react';
import type { ChatMessage, Conversation, Profile } from '@/lib/types';
import {
  fetchMessages,
  sendMessage,
  markConversationRead,
  deleteMessage,
  uploadChatImage,
  subscribeToMessages,
  subscribeToTyping,
  subscribeToPresence,
} from '@/lib/chatApi';
import { useAuthStore } from '@/lib/authStore';
import { timeAgo } from '@/lib/format';

interface ChatWindowProps {
  conversation: Conversation;
  onBack: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Determine the "other" user for 1:1 chats
  const otherUser: Profile | undefined = conversation.is_group
    ? undefined
    : conversation.participants?.find((p) => p.user_id !== profile?.id)?.profile;

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const msgs = await fetchMessages(conversation.id);
    setMessages(msgs);
    setLoading(false);
    await markConversationRead(conversation.id);
  }, [conversation.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime: new messages
  useEffect(() => {
    const unsub = subscribeToMessages(conversation.id, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      markConversationRead(conversation.id);
    });
    return unsub;
  }, [conversation.id]);

  // Realtime: typing
  useEffect(() => {
    if (!profile) return;
    const { sendTyping, unsubscribe } = subscribeToTyping(
      conversation.id,
      profile.id,
      (uid) => setTypingUserId(uid),
    );
    // Expose sendTyping via ref
    sendTypingRef.current = sendTyping;
    return unsubscribe;
  }, [conversation.id, profile?.id]);

  const sendTypingRef = useRef<() => void>(() => {});

  // Realtime: presence
  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToPresence(conversation.id, profile.id, setOnlineIds);
    return unsub;
  }, [conversation.id, profile?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    // Send typing indicator
    if (e.target.value.trim()) sendTypingRef.current();
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    setReplyTo(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    try {
      await sendMessage(conversation.id, content, null, replyTo?.id);
    } catch {
      // ignore
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingImage(true);
    try {
      const url = await uploadChatImage(file, profile.id);
      await sendMessage(conversation.id, null, url, replyTo?.id);
      setReplyTo(null);
    } catch {
      // ignore
    }
    setUploadingImage(false);
  }

  function handleReply(msg: ChatMessage) {
    setReplyTo(msg);
    setShowActions(null);
    inputRef.current?.focus();
  }

  async function handleCopy(msg: ChatMessage) {
    if (msg.content) {
      try {
        await navigator.clipboard.writeText(msg.content);
      } catch {
        // ignore
      }
    }
    setShowActions(null);
  }

  async function handleDelete(msg: ChatMessage) {
    await deleteMessage(msg.id);
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, deleted_at: new Date().toISOString(), content: null, media_url: null } : m)),
    );
    setShowActions(null);
  }

  function reactToMessage(msg: ChatMessage, emoji: string) {
    // Simple: just add a reaction visual (no DB table for reactions in this phase)
    setShowActions(null);
  }

  function formatDateSeparator(ts: string): string {
    const date = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function shouldShowSeparator(index: number): boolean {
    if (index === 0) return true;
    const prev = new Date(messages[index - 1].created_at);
    const curr = new Date(messages[index].created_at);
    return prev.toDateString() !== curr.toDateString();
  }

  function getSeenStatus(msg: ChatMessage): 'sent' | 'delivered' | 'seen' {
    if (msg.sender_id !== profile?.id) return 'sent';
    const otherParticipants = conversation.participants?.filter((p) => p.user_id !== profile?.id) || [];
    if (otherParticipants.length === 0) return 'sent';
    const allSeen = otherParticipants.every((p) => msg.read_by?.includes(p.user_id));
    if (allSeen) return 'seen';
    if (msg.read_by && msg.read_by.length > 0) return 'delivered';
    return 'sent';
  }

  const isOtherOnline = otherUser ? onlineIds.has(otherUser.id) : false;
  const typingUser = conversation.participants?.find((p) => p.user_id === typingUserId)?.profile;

  return (
    <div className="flex flex-col h-full bg-[#fafaf9] dark:bg-[#0b1220]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-navy-300 bg-white dark:bg-navy-200">
        <button
          onClick={onBack}
          className="md:hidden h-9 w-9 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {conversation.is_group ? (
          <>
            <div className="h-10 w-10 rounded-full bg-sangam-gradient flex items-center justify-center text-white flex-shrink-0">
              {conversation.group_avatar ? (
                <img src={conversation.group_avatar} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <Users className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-gray-900 dark:text-white truncate">
                {conversation.group_name || 'Group Chat'}
              </p>
              <p className="text-xs text-gray-400">
                {conversation.participants?.length || 0} members
              </p>
            </div>
          </>
        ) : (
          <>
            <img
              src={otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${otherUser?.full_name || 'U'}`}
              alt=""
              onClick={() => otherUser && navigate(`/u/${otherUser.username}`)}
              className="h-10 w-10 rounded-full object-cover flex-shrink-0 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <p
                onClick={() => otherUser && navigate(`/u/${otherUser.username}`)}
                className="font-heading font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
              >
                {otherUser?.full_name || 'Unknown'}
              </p>
              <p className="text-xs flex items-center gap-1">
                {typingUser ? (
                  <span className="text-brand-500">typing...</span>
                ) : isOtherOnline ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-gray-400">Online</span>
                  </>
                ) : (
                  <span className="text-gray-400">Offline</span>
                )}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-400 font-heading font-bold text-lg">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">Say hello and start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === profile?.id;
            const showSep = shouldShowSeparator(i);
            const seen = getSeenStatus(msg);

            return (
              <div key={msg.id}>
                {showSep && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-navy-300 px-3 py-1 rounded-full font-medium">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} group relative`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 relative ${
                      isMine
                        ? 'bg-sangam-gradient text-white rounded-br-md'
                        : 'bg-white dark:bg-navy-300 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-navy-300'
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setShowActions(showActions === msg.id ? null : msg.id);
                    }}
                    onDoubleClick={() => setShowActions(showActions === msg.id ? null : msg.id)}
                  >
                    {/* Reply preview */}
                    {msg.reply_to && (
                      <div
                        className={`mb-1.5 pl-2 border-l-2 rounded-sm text-xs ${
                          isMine
                            ? 'border-white/50 text-white/80'
                            : 'border-brand-500 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <p className="font-semibold">
                          {msg.reply_to.sender_id === profile?.id ? 'You' : msg.reply_to.sender?.full_name?.split(' ')[0] || 'User'}
                        </p>
                        <p className="truncate opacity-80">
                          {msg.reply_to.content || (msg.reply_to.media_url ? '📷 Photo' : '')}
                        </p>
                      </div>
                    )}

                    {/* Reply-to banner above input */}
                    {/* Content */}
                    {msg.deleted_at ? (
                      <p className={`text-sm italic ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                        This message was deleted
                      </p>
                    ) : (
                      <>
                        {msg.media_url && (
                          <img
                            src={msg.media_url}
                            alt=""
                            onClick={() => setImagePreview(msg.media_url)}
                            className="rounded-lg mb-1.5 max-w-full max-h-60 object-cover cursor-pointer"
                          />
                        )}
                        {msg.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                      </>
                    )}

                    {/* Timestamp + seen ticks */}
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-[10px] ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {isMine && !msg.deleted_at && (
                        <span className={isMine ? 'text-white/70' : 'text-gray-400'}>
                          {seen === 'sent' && <Check className="h-3 w-3" />}
                          {seen === 'delivered' && <CheckCheck className="h-3 w-3" />}
                          {seen === 'seen' && <CheckCheck className="h-3 w-3 text-cyan-200" />}
                        </span>
                      )}
                    </div>

                    {/* Action menu */}
                    {showActions === msg.id && !msg.deleted_at && (
                      <div className="absolute -top-10 right-0 bg-white dark:bg-navy-300 rounded-xl shadow-lg border border-gray-100 dark:border-navy-300 flex items-center gap-1 px-1 py-1 z-20">
                        <button
                          onClick={() => handleReply(msg)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-navy-50 rounded-lg text-gray-500"
                          title="Reply"
                        >
                          <Reply className="h-4 w-4" />
                        </button>
                        {msg.content && (
                          <button
                            onClick={() => handleCopy(msg)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-navy-50 rounded-lg text-gray-500"
                            title="Copy"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        {isMine && (
                          <button
                            onClick={() => handleDelete(msg)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-coral-500"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div className="flex items-center gap-0.5 pl-1 border-l border-gray-100 dark:border-navy-300">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => reactToMessage(msg, emoji)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-navy-50 rounded-lg text-sm"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply banner */}
      {replyTo && (
        <div className="px-4 py-2 bg-brand-50 dark:bg-brand-900/10 border-t border-brand-100 dark:border-brand-900/20 flex items-center gap-2">
          <Reply className="h-4 w-4 text-brand-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
              Replying to {replyTo.sender_id === profile?.id ? 'yourself' : replyTo.sender?.full_name?.split(' ')[0] || 'user'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {replyTo.content || (replyTo.media_url ? '📷 Photo' : '')}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-navy-300 bg-white dark:bg-navy-200">
        {showEmoji && (
          <div className="mb-2 flex gap-1 flex-wrap">
            {['😀', '😂', '❤️', '👍', '🔥', '🎉', '😮', '😢', '🙏', '💯', '👏', '✨'].map((e) => (
              <button
                key={e}
                onClick={() => {
                  setInput((prev) => prev + e);
                  setShowEmoji(false);
                  inputRef.current?.focus();
                }}
                className="text-xl p-1.5 hover:bg-gray-100 dark:hover:bg-navy-300 rounded-lg"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Emoji toggle */}
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="h-10 w-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors flex-shrink-0"
          >
            <Smile className="h-5 w-5" />
          </button>
          {/* Image upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="h-10 w-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-navy-300 transition-colors flex-shrink-0"
          >
            {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none text-sm max-h-30"
          />
          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-10 w-10 rounded-full bg-sangam-gradient flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform flex-shrink-0 shadow-md shadow-coral-500/20"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Image preview modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setImagePreview(null)}
        >
          <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X className="h-5 w-5" />
          </button>
          <img src={imagePreview} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
