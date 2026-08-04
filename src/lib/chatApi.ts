import { supabase } from './supabase';
import type { Conversation, ChatMessage, Profile, ConversationParticipant } from './types';

/**
 * Fetch all conversations for the current user, with participants, last message,
 * and unread count.
 */
export async function fetchConversations(): Promise<Conversation[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];

  // Get conversation IDs the user participates in
  const { data: myParts, error: pErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', me.user.id);
  if (pErr || !myParts || myParts.length === 0) return [];

  const convIds = myParts.map((p) => p.conversation_id);
  const lastReadMap = new Map(myParts.map((p) => [p.conversation_id, p.last_read_at]));

  // Fetch conversations
  const { data: convs, error: cErr } = await supabase
    .from('conversations')
    .select('*')
    .in('id', convIds)
    .order('created_at', { ascending: false });
  if (cErr || !convs) return [];

  // Fetch all participants for these conversations
  const { data: allParts } = await supabase
    .from('conversation_participants')
    .select('*')
    .in('conversation_id', convIds);

  // Fetch profiles for all participants
  const allUserIds = [...new Set((allParts || []).map((p) => p.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', allUserIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  // Group participants by conversation
  const partsByConv = new Map<string, ConversationParticipant[]>();
  (allParts || []).forEach((p) => {
    const cp: ConversationParticipant = {
      ...p,
      profile: profileMap.get(p.user_id),
    };
    if (!partsByConv.has(p.conversation_id)) partsByConv.set(p.conversation_id, []);
    partsByConv.get(p.conversation_id)!.push(cp);
  });

  // Fetch last message for each conversation
  const { data: lastMessages } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })
    .limit(100);

  const lastMsgMap = new Map<string, ChatMessage>();
  (lastMessages || []).forEach((m) => {
    if (!lastMsgMap.has(m.conversation_id)) {
      lastMsgMap.set(m.conversation_id, { ...m, sender: profileMap.get(m.sender_id) });
    }
  });

  // Compute unread counts
  const result: Conversation[] = [];
  for (const conv of convs) {
    const parts = partsByConv.get(conv.id) || [];
    const lastMsg = lastMsgMap.get(conv.id) || null;
    const lastRead = lastReadMap.get(conv.id) || new Date(0).toISOString();
    const unread = (lastMessages || []).filter(
      (m) => m.conversation_id === conv.id && m.sender_id !== me.user.id && m.created_at > lastRead,
    ).length;

    result.push({
      ...conv,
      participants: parts,
      last_message: lastMsg,
      unread_count: unread,
    });
  }

  // Sort by last message time (most recent first)
  result.sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at;
    const bTime = b.last_message?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return result;
}

/**
 * Fetch messages for a conversation.
 */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];

  const userIds = [...new Set(data.map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));

  // Fetch read receipts
  const { data: reads } = await supabase
    .from('message_reads')
    .select('message_id, user_id')
    .in(
      'message_id',
      data.map((m) => m.id),
    );
  const readByMap = new Map<string, string[]>();
  (reads || []).forEach((r) => {
    if (!readByMap.has(r.message_id)) readByMap.set(r.message_id, []);
    readByMap.get(r.message_id)!.push(r.user_id);
  });

  // Build reply-to map
  const replyIds = data.filter((m) => m.reply_to_message_id).map((m) => m.reply_to_message_id as string);
  const replyMap = new Map<string, ChatMessage>();
  if (replyIds.length > 0) {
    const { data: replyMsgs } = await supabase
      .from('messages')
      .select('*')
      .in('id', replyIds);
    (replyMsgs || []).forEach((m) => {
      replyMap.set(m.id, { ...m, sender: profileMap.get(m.sender_id) });
    });
  }

  return data.map((m) => ({
    ...m,
    sender: profileMap.get(m.sender_id),
    reply_to: m.reply_to_message_id ? replyMap.get(m.reply_to_message_id) || null : null,
    read_by: readByMap.get(m.id) || [],
  })) as ChatMessage[];
}

/**
 * Send a message.
 */
export async function sendMessage(
  conversationId: string,
  content: string | null,
  mediaUrl: string | null = null,
  replyToId?: string,
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content,
      media_url: mediaUrl,
      reply_to_message_id: replyToId || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

/**
 * Mark messages as read by inserting message_reads for all messages in the
 * conversation not sent by the user. Also updates last_read_at.
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;

  // Update last_read_at
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', me.user.id);

  // Mark unread messages as read
  const { data: msgs } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .neq('sender_id', me.user.id);

  if (!msgs || msgs.length === 0) return;

  // Check which are already read
  const { data: existingReads } = await supabase
    .from('message_reads')
    .select('message_id')
    .eq('user_id', me.user.id)
    .in('message_id', msgs.map((m) => m.id));
  const alreadyRead = new Set((existingReads || []).map((r) => r.message_id));
  const toRead = msgs.filter((m) => !alreadyRead.has(m.id));
  if (toRead.length === 0) return;

  await supabase.from('message_reads').insert(
    toRead.map((m) => ({ message_id: m.id, user_id: me.user.id })),
  );
}

/**
 * Soft delete a message (only own).
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString(), content: null, media_url: null })
    .eq('id', messageId);
}

/**
 * Create or find a 1:1 conversation between the current user and another user.
 */
export async function createDirectConversation(otherUserId: string): Promise<string | null> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return null;

  // Check if a 1:1 conversation already exists between these two users
  const { data: myConvs } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', me.user.id);

  if (myConvs && myConvs.length > 0) {
    const myConvIds = myConvs.map((c) => c.conversation_id);
    const { data: otherConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', myConvIds);

    if (otherConvs && otherConvs.length > 0) {
      // Check if any of these are 1:1 (not group)
      for (const oc of otherConvs) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('is_group')
          .eq('id', oc.conversation_id)
          .maybeSingle();
        if (conv && !conv.is_group) {
          return oc.conversation_id;
        }
      }
    }
  }

  // Create new conversation
  const { data: conv, error: cErr } = await supabase
    .from('conversations')
    .insert({ is_group: false })
    .select('id')
    .single();
  if (cErr || !conv) return null;

  // Add both participants
  await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: me.user.id, is_admin: false },
    { conversation_id: conv.id, user_id: otherUserId, is_admin: false },
  ]);

  return conv.id;
}

/**
 * Create a group conversation.
 */
export async function createGroupConversation(
  groupName: string,
  groupAvatar: string | null,
  memberIds: string[],
): Promise<string | null> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return null;

  const { data: conv, error: cErr } = await supabase
    .from('conversations')
    .insert({ is_group: true, group_name: groupName, group_avatar: groupAvatar })
    .select('id')
    .single();
  if (cErr || !conv) return null;

  const participants = [
    { conversation_id: conv.id, user_id: me.user.id, is_admin: true },
    ...memberIds.map((id) => ({ conversation_id: conv.id, user_id: id, is_admin: false })),
  ];
  await supabase.from('conversation_participants').insert(participants);

  return conv.id;
}

/**
 * Fetch followers/following for the New Chat modal.
 */
export async function fetchConnections(): Promise<Profile[]> {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];

  // Get people I follow + people who follow me (union)
  const [{ data: following }, { data: followers }] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', me.user.id),
    supabase.from('follows').select('follower_id').eq('following_id', me.user.id),
  ]);

  const ids = new Set<string>();
  (following || []).forEach((f) => ids.add(f.following_id));
  (followers || []).forEach((f) => ids.add(f.follower_id));
  ids.add(me.user.id); // exclude self

  if (ids.size === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [...ids])
    .neq('id', me.user.id);
  return (profiles || []) as Profile[];
}

/**
 * Upload a chat image to the post-media bucket (reuse existing bucket).
 */
export async function uploadChatImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `chat-media/${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('post-media').upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('post-media').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Subscribe to new messages in a conversation via Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  conversationId: string,
  onNew: (message: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const msg = payload.new as ChatMessage;
        // Fetch sender profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', msg.sender_id)
          .maybeSingle();
        onNew({ ...msg, sender: profile as Profile });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to typing indicators for a conversation.
 * Uses a broadcast channel — call onTyping when the other user is typing.
 */
export function subscribeToTyping(
  conversationId: string,
  userId: string,
  onTyping: (typingUserId: string | null) => void,
): { sendTyping: () => void; unsubscribe: () => void } {
  const channel = supabase.channel(`typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      onTyping(payload.payload?.user_id as string);
    })
    .on('broadcast', { event: 'stop_typing' }, () => {
      onTyping(null);
    })
    .subscribe();

  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  const sendTyping = () => {
    channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId } });
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      channel.send({ type: 'broadcast', event: 'stop_typing', payload: {} });
    }, 2000);
  };

  const unsubscribe = () => {
    if (typingTimeout) clearTimeout(typingTimeout);
    supabase.removeChannel(channel);
  };

  return { sendTyping, unsubscribe };
}

/**
 * Subscribe to online presence for a conversation.
 */
export function subscribeToPresence(
  conversationId: string,
  userId: string,
  onPresenceChange: (onlineUserIds: Set<string>) => void,
): () => void {
  const channel = supabase.channel(`presence:${conversationId}`, {
    config: { presence: { key: userId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const onlineIds = new Set<string>();
      Object.values(state).forEach((arr) => {
        arr.forEach((p: Record<string, unknown>) => {
          if (p.user_id) onlineIds.add(p.user_id as string);
        });
      });
      onPresenceChange(onlineIds);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId });
      }
    });

  return () => {
    channel.untrack();
    supabase.removeChannel(channel);
  };
}
