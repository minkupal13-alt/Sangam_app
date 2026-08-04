import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Camera, Check, GripVertical, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, BioLink } from '@/lib/types';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onUpdated: () => Promise<void>;
}

const EMOJI_CHOICES = ['🔗', '🌐', '📷', '🎵', '📺', '🛍️', '✨', '🔥', '💡', '🚀', '💼', '📧', '📱', '🎮', '📚', '🎨'];

export default function EditProfileModal({ open, onClose, profile, onUpdated }: EditProfileModalProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(profile.full_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(profile.cover_url || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [location, setLocation] = useState(profile.location || '');
  const [birthday, setBirthday] = useState(profile.birthday || '');
  const [birthdayPublic, setBirthdayPublic] = useState(false);
  const [gender, setGender] = useState(profile.gender || '');
  const [bioLinks, setBioLinks] = useState<BioLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'checking'>('idle');
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(profile.full_name);
    setUsername(profile.username);
    setBio(profile.bio || '');
    setAvatarUrl(profile.avatar_url || '');
    setCoverUrl(profile.cover_url || '');
    setWebsite(profile.website || '');
    setLocation(profile.location || '');
    setBirthday(profile.birthday || '');
    setGender(profile.gender || '');
    setError('');
    setSuccess(false);
    loadBioLinks();
  }, [open, profile]);

  async function loadBioLinks() {
    const { data } = await supabase
      .from('bio_links')
      .select('*')
      .eq('user_id', profile.id)
      .order('display_order', { ascending: true });
    setBioLinks((data || []) as BioLink[]);
  }

  useEffect(() => {
    if (!open || username === profile.username) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      const clean = username.trim().replace(/^@/, '').toLowerCase();
      if (!clean) { setUsernameStatus('idle'); return; }
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', profile.id)
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [username, open, profile]);

  if (!open) return null;

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    const ext = file.name.split('.').pop();
    const path = `${profile.id}-${Date.now()}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar upload failed');
    }
    setUploadingAvatar(false);
  }

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError('');
    const ext = file.name.split('.').pop();
    const path = `${profile.id}-${Date.now()}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('covers').getPublicUrl(path);
      setCoverUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover upload failed');
    }
    setUploadingCover(false);
  }

  function addBioLink() {
    if (bioLinks.length >= 5) return;
    const newLink: BioLink = {
      id: `temp-${Date.now()}`,
      user_id: profile.id,
      title: '',
      url: '',
      emoji: '🔗',
      display_order: bioLinks.length,
      created_at: new Date().toISOString(),
    };
    setBioLinks([...bioLinks, newLink]);
  }

  function updateBioLink(idx: number, field: keyof BioLink, value: string) {
    setBioLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function removeBioLink(idx: number) {
    setBioLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    setSuccess(false);
    const cleanUsername = username.trim().replace(/^@/, '').replace(/\s+/g, '');
    if (!cleanUsername) { setError(t('editProfile.username') + ' required'); setLoading(false); return; }
    if (!fullName.trim()) { setError(t('editProfile.fullName') + ' required'); setLoading(false); return; }
    if (usernameStatus === 'taken') { setError(t('editProfile.usernameTaken')); setLoading(false); return; }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
        cover_url: coverUrl || null,
        website: website.trim() || null,
        location: location.trim() || null,
        birthday: birthday || null,
        gender: gender || null,
      })
      .eq('id', profile.id);

    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    // Save bio links
    const existingLinks = bioLinks.filter((l) => !l.id.startsWith('temp-'));
    const newLinks = bioLinks.filter((l) => l.id.startsWith('temp-'));

    // Delete removed links
    const currentIds = bioLinks.filter((l) => !l.id.startsWith('temp-')).map((l) => l.id);
    const { data: allLinks } = await supabase.from('bio_links').select('id').eq('user_id', profile.id);
    const toDelete = (allLinks || []).filter((l: { id: string }) => !currentIds.includes(l.id));
    if (toDelete.length > 0) {
      await supabase.from('bio_links').delete().in('id', toDelete.map((l: { id: string }) => l.id));
    }

    // Update existing
    for (let i = 0; i < existingLinks.length; i++) {
      const link = bioLinks[i];
      await supabase.from('bio_links').update({
        title: link.title,
        url: link.url,
        emoji: link.emoji,
        display_order: i,
      }).eq('id', link.id);
    }

    // Insert new
    for (let i = 0; i < bioLinks.length; i++) {
      const link = bioLinks[i];
      if (link.id.startsWith('temp-') && link.title && link.url) {
        await supabase.from('bio_links').insert({
          user_id: profile.id,
          title: link.title,
          url: link.url,
          emoji: link.emoji,
          display_order: i,
        });
      }
    }

    setSuccess(true);
    setLoading(false);
    await onUpdated();
    setTimeout(() => { setSuccess(false); onClose(); }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[95vh] overflow-y-auto bg-white dark:bg-navy-200 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-navy-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-navy-300 sticky top-0 bg-white dark:bg-navy-200 z-10">
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center text-gray-500">
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white">{t('editProfile.title')}</h2>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-1.5 rounded-full bg-sangam-gradient text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-60 shadow-md shadow-coral-500/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <Check className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {success ? t('editProfile.saved') : t('editProfile.save')}
          </button>
        </div>

        <div className="space-y-0">
          {/* Cover */}
          <div className="relative h-32 bg-sangam-gradient">
            {coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}
            <label className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center cursor-pointer">
              {uploadingCover ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Camera className="h-4 w-4 text-white" />}
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
            </label>
          </div>

          {/* Avatar */}
          <div className="px-4 -mt-10">
            <div className="relative inline-block">
              <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-navy-300 overflow-hidden border-4 border-white dark:border-navy-200">
                {avatarUrl && <img src={avatarUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-sangam-gradient flex items-center justify-center cursor-pointer border-2 border-white dark:border-navy-200">
                {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Camera className="h-3.5 w-3.5 text-white" />}
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </label>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Username */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('editProfile.username')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-8 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                />
                {usernameStatus === 'checking' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                {usernameStatus === 'available' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                {usernameStatus === 'taken' && <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coral-500" />}
              </div>
              {usernameStatus === 'available' && <p className="text-xs text-emerald-500 mt-1">{t('editProfile.usernameAvailable')}</p>}
              {usernameStatus === 'taken' && <p className="text-xs text-coral-500 mt-1">{t('editProfile.usernameTaken')}</p>}
            </div>

            {/* Full Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('editProfile.fullName')}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('editProfile.bio')}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={160}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors resize-none"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{bio.length}/160</p>
            </div>

            {/* Website */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('editProfile.website')}</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('editProfile.location')}</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Mumbai, India"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Birthday + Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('editProfile.birthday')}</label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('editProfile.gender')}</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="">{t('editProfile.preferNotToSay')}</option>
                  <option value="male">{t('editProfile.male')}</option>
                  <option value="female">{t('editProfile.female')}</option>
                  <option value="other">{t('editProfile.other')}</option>
                </select>
              </div>
            </div>

            {/* Bio Links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('editProfile.bioLinks')}</label>
                {bioLinks.length < 5 && (
                  <button onClick={addBioLink} className="flex items-center gap-1 text-xs text-brand-500 hover:underline">
                    <Plus className="h-3 w-3" /> {t('editProfile.addLink')}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {bioLinks.map((link, idx) => (
                  <div key={link.id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300">
                    <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    <select
                      value={link.emoji}
                      onChange={(e) => updateBioLink(idx, 'emoji', e.target.value)}
                      className="text-lg bg-transparent outline-none cursor-pointer"
                    >
                      {EMOJI_CHOICES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <input
                      type="text"
                      value={link.title}
                      onChange={(e) => updateBioLink(idx, 'title', e.target.value)}
                      placeholder={t('editProfile.linkTitle')}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateBioLink(idx, 'url', e.target.value)}
                      placeholder={t('editProfile.linkUrl')}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none"
                    />
                    <button onClick={() => removeBioLink(idx)} className="text-coral-500 hover:text-coral-700 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {bioLinks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">{t('editProfile.bioLinks')}</p>
                )}
                {bioLinks.length >= 5 && (
                  <p className="text-xs text-gray-400 text-center">{t('editProfile.maxLinksReached')}</p>
                )}
              </div>
            </div>

            {error && <p className="text-coral-500 text-sm">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
