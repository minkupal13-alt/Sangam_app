import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Image as ImageIcon, Loader2, Send, Smile, Film, Globe,
  Users, UserCheck, Lock, MapPin, BarChart3, Plus, Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useFeedStore } from '@/lib/feedStore';
import { createPost, uploadMedia } from '@/lib/feedApi';
import type { Post } from '@/lib/types';

interface MediaItem { url: string; type: 'image' | 'video'; }
type Audience = 'everyone' | 'my_circle' | 'close_friends' | 'only_me';

const EMOJIS = ['😀','😂','🥹','😍','🤩','😎','🤔','😴','🥳','😭','😡','👍','👎','👏','🙌','🔥','💯','❤️','✨','🎉','🚀','💡','👀','🤝','💪','🌟','⚡','🌈','🍕','☕'];
const FEELINGS = [
  { key: 'feeling_happy', emoji: '😊' },
  { key: 'feeling_sad', emoji: '😢' },
  { key: 'feeling_excited', emoji: '🤩' },
  { key: 'feeling_grateful', emoji: '🙏' },
  { key: 'feeling_blessed', emoji: '😇' },
  { key: 'feeling_loved', emoji: '🥰' },
];

const AUDIENCE_OPTIONS: { value: Audience; icon: React.ReactNode; key: string }[] = [
  { value: 'everyone', icon: <Globe className="h-4 w-4" />, key: 'feed.everyone' },
  { value: 'my_circle', icon: <Users className="h-4 w-4" />, key: 'feed.myCircleAudience' },
  { value: 'close_friends', icon: <UserCheck className="h-4 w-4" />, key: 'feed.closeFriends' },
  { value: 'only_me', icon: <Lock className="h-4 w-4" />, key: 'feed.onlyMe' },
];

export default function CreatePostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const addPost = useFeedStore((s) => s.addPost);
  const [content, setContent] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [audience, setAudience] = useState<Audience>('everyone');
  const [showAudience, setShowAudience] = useState(false);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  function reset() {
    setContent('');
    setMediaItems([]);
    setError('');
    setShowEmoji(false);
    setAudience('everyone');
    setFeeling(null);
    setLocation('');
    setShowPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  }

  function handleClose() { reset(); onClose(); }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !profile) return;
    setUploading(true);
    setError('');
    try {
      const items: MediaItem[] = [];
      for (const file of files) {
        const isVideo = file.type.startsWith('video');
        const url = await uploadMedia(file, isVideo ? 'videos' : 'images', profile.id);
        items.push({ url, type: isVideo ? 'video' : 'image' });
      }
      setMediaItems((prev) => [...prev, ...items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeMedia(index: number) {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addPollOption() {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, '']);
  }

  function updatePollOption(idx: number, val: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }

  async function handleSubmit() {
    if (!content.trim() && mediaItems.length === 0 && !showPoll) return;
    setLoading(true);
    setError('');
    try {
      const urls = mediaItems.map((m) => m.url);
      const hasVideo = mediaItems.some((m) => m.type === 'video');
      const hasImage = mediaItems.some((m) => m.type === 'image');
      const type = hasVideo ? 'video' : hasImage ? 'image' : 'text';
      let finalContent = content.trim();
      if (feeling) finalContent += ` ${feeling}`;
      if (location) finalContent += ` 📍 ${location}`;
      const post = await createPost(finalContent, urls, type);
      if (post) {
        addPost({
          ...post,
          author: profile || undefined,
          liked_by_me: false,
          bookmarked_by_me: false,
          original_post: null,
        });
      }
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    }
    setLoading(false);
  }

  const canSubmit = content.trim().length > 0 || mediaItems.length > 0 || (showPoll && pollQuestion.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={handleClose}>
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
          <button onClick={handleClose} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500">
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">{t('feed.createPost')}</h2>
          <div className="w-8" />
        </div>

        <div className="p-4">
          <div className="flex gap-3">
            <img
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'U'}`}
              alt=""
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              {/* Audience selector */}
              <div className="relative mb-2">
                <button
                  onClick={() => setShowAudience((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-navy-300 text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  {AUDIENCE_OPTIONS.find((a) => a.value === audience)?.icon}
                  {t(AUDIENCE_OPTIONS.find((a) => a.value === audience)?.key || 'feed.everyone')}
                </button>
                {showAudience && (
                  <div className="absolute top-full mt-1 left-0 w-48 rounded-xl bg-white dark:bg-navy-200 shadow-xl border border-gray-100 dark:border-navy-300 py-1 z-20 animate-scaleIn">
                    {AUDIENCE_OPTIONS.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => { setAudience(a.value); setShowAudience(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-start transition-colors ${
                          audience === a.value ? 'bg-brand-50 dark:bg-navy-300 text-brand-600 dark:text-brand-400 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-300'
                        }`}
                      >
                        {a.icon}
                        {t(a.key)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('feed.whatsOnYourMind')}
                rows={3}
                maxLength={280}
                className="w-full bg-transparent text-gray-900 dark:text-white text-lg placeholder-gray-400 resize-none outline-none"
              />

              {/* Feeling tag */}
              {feeling && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-medium mb-2">
                  {feeling}
                  <button onClick={() => setFeeling(null)} className="hover:text-amber-800">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Location tag */}
              {location && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-2">
                  <MapPin className="h-3 w-3" /> {location}
                  <button onClick={() => setLocation('')} className="hover:text-emerald-800">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Emoji picker */}
              {showEmoji && (
                <div className="mt-1 p-2 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 grid grid-cols-10 gap-1 animate-fadeIn">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => setContent((c) => c + emoji)} className="text-xl hover:bg-gray-200 dark:hover:bg-navy-50 rounded p-1 transition-colors">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Feeling picker */}
              {feeling === null && showEmoji && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {FEELINGS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setFeeling(`${f.emoji} ${t(`feed.${f.key}`)}`); setShowEmoji(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-navy-300 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-400 transition-colors"
                    >
                      {f.emoji} {t(`feed.${f.key}`)}
                    </button>
                  ))}
                </div>
              )}

              {/* Poll creator */}
              {showPoll && (
                <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 space-y-2 animate-fadeIn">
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder={t('feed.pollQuestion')}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
                  />
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      value={opt}
                      onChange={(e) => updatePollOption(i, e.target.value)}
                      placeholder={`${t('feed.pollOption')} ${i + 1}`}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
                    />
                  ))}
                  {pollOptions.length < 4 && (
                    <button onClick={addPollOption} className="flex items-center gap-1 text-xs text-brand-500 hover:underline">
                      <Plus className="h-3 w-3" /> {t('feed.addOption')}
                    </button>
                  )}
                </div>
              )}

              {/* Media previews */}
              {mediaItems.length > 0 && (
                <div className={`mt-2 grid gap-1 ${mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {mediaItems.map((item, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-navy-300">
                      {item.type === 'image' ? (
                        <img src={item.url} alt="" className="w-full h-32 object-cover" />
                      ) : (
                        <video src={item.url} controls className="w-full h-32 object-cover" />
                      )}
                      <button onClick={() => removeMedia(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploading && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-navy-300">
            <div className="flex items-center gap-1 flex-wrap">
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
              <ToolButton icon={<ImageIcon className="h-5 w-5" />} label={t('feed.photo')} onClick={() => fileRef.current?.click()} disabled={uploading} color="text-brand-500" />
              <ToolButton icon={<Film className="h-5 w-5" />} label={t('feed.video')} onClick={() => fileRef.current?.click()} disabled={uploading} color="text-coral-500" />
              <ToolButton icon={<BarChart3 className="h-5 w-5" />} label={t('feed.poll')} onClick={() => setShowPoll((v) => !v)} color="text-amber-500" />
              <ToolButton icon={<Smile className="h-5 w-5" />} label={t('feed.emoji')} onClick={() => setShowEmoji((v) => !v)} color={showEmoji ? 'text-amber-500' : 'text-gray-500'} />
              <ToolButton icon={<MapPin className="h-5 w-5" />} label={t('feed.location')} onClick={() => setLocation(location ? '' : prompt(t('feed.location')) || '')} color="text-emerald-500" />
              <ToolButton icon={<Calendar className="h-5 w-5" />} label={t('feed.schedulePost')} onClick={() => {}} color="text-violet-500" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{content.length}/280</span>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  canSubmit && !loading ? 'bg-sangam-gradient text-white active:scale-95' : 'bg-gray-200 dark:bg-navy-300 text-gray-400'
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('post.postBtn')}
              </button>
            </div>
          </div>
          {error && <p className="text-coral-500 text-sm mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, onClick, disabled, color }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; color: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-navy-300 ${color}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
