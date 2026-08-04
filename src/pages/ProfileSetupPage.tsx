import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Camera, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import SangamLogo from '@/components/SangamLogo';

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      setError(upErr.message);
      setUploadingAvatar(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploadingAvatar(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!session) return;
    setLoading(true);
    const cleanUsername = username.trim().replace(/^@/, '').replace(/\s+/g, '');

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .neq('id', session.user.id)
      .maybeSingle();
    if (existing) {
      setError('That username is taken');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
        cover_url: coverUrl || null,
      })
      .eq('id', session.user.id);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    await fetchProfile();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#fafaf9] dark:bg-[#0b1220]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <SangamLogo size={56} />
          <h1 className="font-heading text-2xl font-extrabold text-gray-900 dark:text-white mt-3">Set up your profile</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Tell people who you are</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-navy-300 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-sangam-gradient flex items-center justify-center cursor-pointer">
                <Camera className="h-4 w-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            {uploadingAvatar && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Bio</label>
            <textarea
              placeholder="Write a short bio..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={160}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Cover image URL (optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {error && <p className="text-coral-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-sangam-gradient text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md shadow-coral-500/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Complete Profile
          </button>
        </form>
      </div>
    </div>
  );
}
