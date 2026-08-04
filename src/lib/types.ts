export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  subscribers_count?: number;
  is_verified: boolean;
  created_at: string;
  role?: 'user' | 'creator' | 'moderator' | 'admin' | 'superadmin';
  website?: string | null;
  location?: string | null;
  birthday?: string | null;
  gender?: string | null;
  history_paused?: boolean;
}

export interface BioLink {
  id: string;
  user_id: string;
  title: string;
  url: string;
  emoji: string;
  display_order: number;
  created_at: string;
}

export interface StoryHighlight {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
  stories?: HighlightStory[];
}

export interface HighlightStory {
  id: string;
  highlight_id: string;
  story_id: string | null;
  created_at: string;
}

export interface BookmarkCollection {
  id: string;
  user_id: string;
  title: string;
  cover_url: string | null;
  created_at: string;
  item_count?: number;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  media_type: 'text' | 'image' | 'video';
  likes_count: number;
  comments_count: number;
  created_at: string;
  repost_of: string | null;
  author?: Profile;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
  original_post?: Post | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  likes_count: number;
  created_at: string;
  author?: Profile;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  user_id: string;
  from_user_id: string;
  type: string;
  target_id: string | null;
  target_type: string | null;
  preview_text: string | null;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

export interface NotificationSettings {
  likes_enabled: boolean;
  comments_enabled: boolean;
  follows_enabled: boolean;
  mentions_enabled: boolean;
  messages_enabled: boolean;
  echoes_enabled: boolean;
}

export interface Flick {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string;
  audio_name: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  author?: Profile;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
}

export interface FlickComment {
  id: string;
  flick_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  likes_count: number;
  created_at: string;
  author?: Profile;
  replies?: FlickComment[];
}

export interface Video {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  duration_seconds: number;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  comments_setting?: 'allow' | 'hold' | 'disabled';
  scheduled_at?: string | null;
  created_at: string;
  author?: Profile;
  my_reaction?: 'like' | 'dislike' | null;
  is_subscribed?: boolean;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  visibility: 'public' | 'private';
  created_at: string;
  video_count?: number;
}

export interface WatchHistoryItem {
  id: string;
  user_id: string;
  video_id: string;
  watched_at: string;
  progress_seconds: number;
  video?: Video;
}

export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  likes_count: number;
  created_at: string;
  author?: Profile;
  liked_by_me?: boolean;
  replies?: VideoComment[];
}

export interface Conversation {
  id: string;
  is_group: boolean;
  group_name: string | null;
  group_avatar: string | null;
  created_by: string;
  created_at: string;
  participants?: ConversationParticipant[];
  last_message?: ChatMessage | null;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  is_admin: boolean;
  last_read_at: string;
  profile?: Profile;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  reply_to_message_id: string | null;
  created_at: string;
  deleted_at: string | null;
  sender?: Profile;
  reply_to?: ChatMessage | null;
  read_by?: string[];
}

export interface Hashtag {
  id: string;
  tag_name: string;
  posts_count: number;
  created_at: string;
  trending_score?: number;
  category?: string;
  is_followed?: boolean;
  followers_count?: number;
}

export interface SearchSuggestion {
  type: 'user' | 'hashtag' | 'post';
  user?: Profile;
  hashtag?: Hashtag;
  post?: Post;
}

export interface SearchResult {
  users: Profile[];
  posts: Post[];
  flicks: Flick[];
  videos: Video[];
  hashtags: Hashtag[];
}

// Phase 10+ types
export interface LiveStream { id: string; user_id: string; title: string; thumbnail_url: string | null; status: 'live' | 'ended'; viewer_count: number; started_at: string; ended_at: string | null; replay_url: string | null; author?: Profile; }
export interface LiveComment { id: string; stream_id: string; user_id: string; content: string; created_at: string; author?: Profile; }
export interface AudioRoom { id: string; user_id: string; title: string; topic: string | null; scheduled_at: string | null; status: 'live' | 'scheduled' | 'ended'; listener_count: number; speaker_count: number; created_at: string; ended_at: string | null; author?: Profile; }
export interface RoomParticipant { id: string; room_id: string; user_id: string; role: 'host' | 'speaker' | 'listener'; is_muted: boolean; hand_raised: boolean; joined_at: string; profile?: Profile; }
export interface EventItem { id: string; user_id: string; title: string; description: string | null; cover_url: string | null; event_date: string; event_time: string; location: string; is_online: boolean; going_count: number; interested_count: number; created_at: string; author?: Profile; my_status?: 'going' | 'interested' | 'not_going' | null; }
export interface MarketplaceListing { id: string; user_id: string; title: string; description: string | null; price: number; category: string; condition: 'new' | 'used'; location: string | null; image_urls: string[]; status: 'active' | 'sold' | 'removed'; created_at: string; author?: Profile; saved_by_me?: boolean; }
export interface Poll { id: string; post_id: string; question: string; options: string[]; is_quiz: boolean; correct_option: number | null; duration_hours: number; expires_at: string; total_votes: number; created_at: string; my_vote?: number | null; vote_counts?: number[]; }
export interface ScheduledPost { id: string; user_id: string; post_data: { content: string; media_urls?: string[]; media_type?: string; poll?: { question: string; options: string[]; is_quiz: boolean; correct_option: number | null; duration_hours: number } }; scheduled_for: string; status: 'pending' | 'published' | 'cancelled'; created_at: string; }
export interface CreatorMonetization { id: string; user_id: string; is_enabled: boolean; upi_id: string | null; subscription_enabled: boolean; subscription_price: number | null; created_at: string; }
export interface UserPoints { id: string; user_id: string; points: number; level: number; updated_at: string; }
export interface PointsHistory { id: string; user_id: string; action: string; points: number; created_at: string; }
export interface UserBadge { id: string; user_id: string; badge_type: string; awarded_at: string; }
export interface Tip { id: string; creator_id: string; tipper_id: string; amount: number; message: string | null; created_at: string; tipper?: Profile; }

