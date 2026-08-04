import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Link2, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SangamLogo from '@/components/SangamLogo';

interface BioLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  order: number;
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  verified: boolean;
}

export default function LinkInBioPage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<BioLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url, verified')
        .eq('username', username)
        .maybeSingle();
      if (prof) {
        setProfile(prof as Profile);
        const { data: linkData } = await supabase
          .from('bio_links')
          .select('id, title, url, icon, order')
          .eq('user_id', prof.id)
          .order('order', { ascending: true })
          .limit(5);
        if (linkData) setLinks(linkData as BioLink[]);
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0b1220]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1220] text-center px-4">
        <SangamLogo size={48} />
        <p className="text-gray-400 text-sm mt-4">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] to-[#0d1a2e] flex flex-col items-center px-4 py-12">
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.full_name} className="h-24 w-24 rounded-full object-cover border-2 border-brand-500/30 mb-4" />
      ) : (
        <div className="h-24 w-24 rounded-full bg-sangam-gradient flex items-center justify-center mb-4">
          <span className="text-white font-heading font-bold text-3xl">{profile.full_name[0]?.toUpperCase()}</span>
        </div>
      )}
      <h1 className="font-heading text-xl font-extrabold text-white flex items-center gap-1.5">
        {profile.full_name}
        {profile.verified && <span className="text-brand-400 text-sm">✓</span>}
      </h1>
      <p className="text-gray-400 text-sm mt-1">@{profile.username}</p>
      {profile.bio && <p className="text-gray-500 text-sm text-center mt-2 max-w-xs">{profile.bio}</p>}

      <div className="w-full max-w-sm mt-8 space-y-3">
        {links.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">No links yet</p>
        ) : (
          links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-colors group"
            >
              <Link2 className="h-4 w-4 text-brand-400 flex-shrink-0" />
              <span className="text-white text-sm font-medium flex-1">{link.title}</span>
              <Globe className="h-3.5 w-3.5 text-gray-500 group-hover:text-brand-400 transition-colors" />
            </a>
          ))
        )}
      </div>

      <div className="mt-10">
        <SangamLogo size={28} />
        <p className="text-gray-600 text-xs text-center mt-1.5">Everything. One Sangam.</p>
      </div>
    </div>
  );
}
