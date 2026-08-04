import { Loader2, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import type { StoryGroup, Story } from '@/lib/storyApi';

interface StoryRingProps {
  groups: StoryGroup[];
  ownStories: Story[];
  loading: boolean;
  onAddStory: () => void;
  onOpenStory: (groupIndex: number) => void;
  onOpenOwnStory: () => void;
}

export default function StoryRing({
  groups,
  ownStories,
  loading,
  onAddStory,
  onOpenStory,
  onOpenOwnStory,
}: StoryRingProps) {
  const profile = useAuthStore((s) => s.profile);

  if (loading) {
    return (
      <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-navy-300">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="h-16 w-16 rounded-full skeleton" />
            <div className="h-3 w-12 rounded skeleton" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-navy-300">
      {/* Your Story */}
      <StoryCircle
        avatar={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'U'}`}
        username="Your Story"
        hasUnseen={false}
        onClick={ownStories.length > 0 ? onOpenOwnStory : onAddStory}
        showPlus={ownStories.length === 0}
      />

      {/* Other users' stories */}
      {groups.map((group, i) => (
        <StoryCircle
          key={group.user.id}
          avatar={group.user.avatar_url || `https://ui-avatars.com/api/?name=${group.user.full_name}`}
          username={group.user.username}
          hasUnseen={group.has_unseen}
          onClick={() => onOpenStory(i)}
        />
      ))}
    </div>
  );
}

function StoryCircle({
  avatar,
  username,
  hasUnseen,
  onClick,
  showPlus,
}: {
  avatar: string;
  username: string;
  hasUnseen: boolean;
  onClick: () => void;
  showPlus?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 flex-shrink-0 group">
      <div
        className={`relative h-16 w-16 rounded-full p-[2px] ${
          hasUnseen
            ? 'bg-sangam-gradient'
            : 'bg-gray-200 dark:bg-navy-300'
        }`}
      >
        <img
          src={avatar}
          alt=""
          className="h-full w-full rounded-full object-cover border-2 border-white dark:border-black"
        />
        {showPlus && (
          <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-sangam-gradient border-2 border-white dark:border-black flex items-center justify-center">
            <Plus className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[64px] truncate">
        {username}
      </span>
    </button>
  );
}

void Loader2;
