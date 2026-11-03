export interface User {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  phone: string;
  avatar?: string;
  about?: string;
  isVerified: boolean;
  hasVerifiedBadge?: boolean;
  developerId?: string;
  pinnedChatIds?: string[];
  customWallpaper?: string;
  savedStickers?: string[];
  savedContacts?: Record<string, string>; // targetUserId -> custom saved name
  isOnline?: boolean;
  lastActive?: string;
  createdAt?: string;
}

export type ChatType = 'direct' | 'group' | 'channel' | 'ai' | 'news' | 'songbot';

export interface Chat {
  _id: string;
  type: ChatType;
  participants: string[];
  name: string;
  avatar?: string;
  description?: string;
  creatorId?: string;
  hasVerifiedBadge?: boolean;
  lastMessage?: Message | null;
  unreadCounts?: Record<string, number>;
  otherUser?: Partial<User> & { savedName?: string };
  createdAt?: string;
  updatedAt?: string;
  isPinned?: boolean;
}

export type MessageType = 'text' | 'image' | 'voice' | 'audio' | 'sticker' | 'news' | 'song' | 'call_log';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type: MessageType;
  mediaUrl?: string;
  audioDuration?: number;
  timestamp: string;
  status: MessageStatus;
  readBy?: string[];
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
  isForwarded?: boolean;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  deletedFor?: string[]; // list of userIds who deleted for themselves
  isDeletedForEveryone?: boolean;
  newsMeta?: {
    title: string;
    image: string;
    link: string;
    time: string;
  };
  songMeta?: {
    title: string;
    mp3Url: string;
    thumbnail?: string;
    duration?: string;
  };
  callMeta?: {
    type: 'voice' | 'video';
    isMissed: boolean;
    callerName: string;
    duration?: number;
  };
}

export interface StatusComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface StatusUpdate {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  hasVerifiedBadge?: boolean;
  type: 'text' | 'image';
  content: string;
  caption?: string;
  background?: string;
  font?: string;
  createdAt: string;
  expiresAt: string;
  viewers?: Array<{
    userId: string;
    userName: string;
    viewedAt: string;
  }>;
  reactions?: Record<string, string[]>; // emoji -> userIds
  comments?: StatusComment[];
}

export interface UserStatusGroup {
  userId: string;
  userName: string;
  userAvatar?: string;
  hasVerifiedBadge?: boolean;
  statuses: StatusUpdate[];
  allViewed: boolean;
  updatedAt: string;
}

export interface CallData {
  active: boolean;
  callId: string;
  otherUser: {
    _id: string;
    displayName: string;
    avatar?: string;
    hasVerifiedBadge?: boolean;
  };
  isVideo: boolean;
  isOutgoing: boolean;
  status: 'calling' | 'ringing' | 'connected' | 'ended';
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export interface CallLogItem {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  duration?: number;
}
