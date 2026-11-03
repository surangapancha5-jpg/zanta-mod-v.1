import React, { useState, useMemo } from 'react';
import { User, Chat, CallLogItem } from '../types';
import { 
  Search, Pin, Check, CheckCheck, MessageSquarePlus, 
  Users, Radio, Phone, Settings, Sparkles, Newspaper, 
  MoreVertical, Filter, PinOff, Info, LogOut, Music,
  BadgeCheck, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenStatusModal: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onLogout: () => void;
  onTogglePin: (chatId: string) => void;
  activeTab: 'chats' | 'status' | 'channels' | 'calls';
  setActiveTab: (tab: 'chats' | 'status' | 'channels' | 'calls') => void;
  hasUnviewedStatus: boolean;
  onlineUserIds: Set<string>;
  callLogs: CallLogItem[];
  onStartCallWithUser: (targetUserId: string, targetUserName: string, isVideo: boolean) => void;
  onOpenContactProfile: (userId: string) => void;
}

const APP_LOGO = 'https://cdn.imagetourls.com/uploads/tyImg/Y6a8BZUa.png';

export default function Sidebar({
  currentUser,
  chats,
  activeChatId,
  onSelectChat,
  onOpenNewChat,
  onOpenNewGroup,
  onOpenStatusModal,
  onOpenSettings,
  onOpenAbout,
  onLogout,
  onTogglePin,
  activeTab,
  setActiveTab,
  hasUnviewedStatus,
  onlineUserIds,
  callLogs,
  onStartCallWithUser,
  onOpenContactProfile
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'pinned' | 'groups'>('all');
  const [menuOpen, setMenuOpen] = useState(false);

  const pinnedSet = useMemo(() => new Set(currentUser.pinnedChatIds || []), [currentUser.pinnedChatIds]);

  const filteredChats = useMemo(() => {
    let result = chats;

    if (activeTab === 'channels') {
      result = result.filter(c => c.type === 'channel' || c.type === 'news');
    } else if (activeTab === 'chats') {
      result = result.filter(c => c.type !== 'channel');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const lastMsgMatch = c.lastMessage?.text?.toLowerCase().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        return nameMatch || lastMsgMatch || descMatch;
      });
    }

    if (filterType === 'unread') {
      result = result.filter(c => (c.unreadCounts?.[currentUser._id] || 0) > 0);
    } else if (filterType === 'pinned') {
      result = result.filter(c => pinnedSet.has(c._id));
    } else if (filterType === 'groups') {
      result = result.filter(c => c.type === 'group');
    }

    const pinned: Chat[] = [];
    const unpinned: Chat[] = [];

    result.forEach(c => {
      if (pinnedSet.has(c._id)) {
        pinned.push(c);
      } else {
        unpinned.push(c);
      }
    });

    const getTimestamp = (c: Chat) => {
      if (c.lastMessage?.timestamp) return new Date(c.lastMessage.timestamp).getTime();
      if (c.updatedAt) return new Date(c.updatedAt).getTime();
      return 0;
    };

    pinned.sort((a, b) => getTimestamp(b) - getTimestamp(a));
    unpinned.sort((a, b) => getTimestamp(b) - getTimestamp(a));

    return [...pinned, ...unpinned];
  }, [chats, activeTab, searchQuery, filterType, pinnedSet, currentUser._id]);

  const formatChatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.avatar) return chat.avatar;
    if (chat.type === 'ai') return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
    if (chat.type === 'songbot') return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80';
    if (chat.type === 'news') return 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80';
    if (chat.type === 'channel') return 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&auto=format&fit=crop&q=80';
    return null;
  };

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] h-full bg-[#111b21] border-r border-[#222d34] flex flex-col shrink-0 select-none relative z-20">
      
      {/* Top Header */}
      <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0">
        <div 
          onClick={onOpenSettings}
          className="flex items-center gap-3 cursor-pointer group"
          title="Profile & Settings"
        >
          <div className="relative">
            <div className={`w-10 h-10 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white font-semibold text-sm border-2 ${hasUnviewedStatus ? 'border-[#00a884]' : 'border-transparent'}`}>
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{currentUser.displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {hasUnviewedStatus && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-sm font-semibold text-[#e9edef] group-hover:text-[#00a884] transition-colors leading-tight truncate max-w-[130px]">
                {currentUser.displayName}
              </h1>
              {currentUser.hasVerifiedBadge && (
                <span title="Verified Developer"><BadgeCheck className="w-4 h-4 text-[#00a884] shrink-0 fill-[#00a884]/20" /></span>
              )}
            </div>
            <span className="text-[11px] text-[#00a884] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" />
              Online
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 text-[#aebac1]">
          <button
            onClick={onOpenStatusModal}
            className="p-2 hover:bg-[#374248] rounded-full transition-colors cursor-pointer relative"
            title="Status"
          >
            <Radio className="w-5 h-5 text-[#aebac1] hover:text-[#00a884]" />
            {hasUnviewedStatus && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00a884] rounded-full ring-2 ring-[#202c33]" />
            )}
          </button>

          <button
            onClick={onOpenNewChat}
            className="p-2 hover:bg-[#374248] rounded-full transition-colors cursor-pointer"
            title="New Chat"
          >
            <MessageSquarePlus className="w-5 h-5 text-[#aebac1] hover:text-[#00a884]" />
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-[#374248] rounded-full transition-colors cursor-pointer"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 w-52 bg-[#233138] rounded-lg shadow-2xl py-2 z-40 border border-[#2f3b43] text-sm text-[#d1d7db] animate-in fade-in duration-150">
                  <button
                    onClick={() => { setMenuOpen(false); onOpenNewGroup(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#8696a0]" />
                    <span>New Group</span>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onOpenNewGroup(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <Radio className="w-4 h-4 text-[#8696a0]" />
                    <span>New Channel</span>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onOpenSettings(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-[#8696a0]" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onOpenAbout(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-[#8696a0]" />
                    <span>App Info & Developer</span>
                  </button>
                  <div className="h-px bg-[#2f3b43] my-1" />
                  <button
                    onClick={() => { setMenuOpen(false); onLogout(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#182229] text-red-400 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Real-time Search Bar */}
      {activeTab !== 'calls' && (
        <div className="p-2.5 bg-[#111b21] border-b border-[#222d34]">
          <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884]">
            <Search className="w-4 h-4 text-[#8696a0] shrink-0 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active chats and channels..."
              className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#8696a0] hover:text-[#e9edef] p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-none py-0.5">
            {(['all', 'unread', 'pinned', 'groups'] as const).map((chip) => (
              <button
                key={chip}
                onClick={() => setFilterType(chip)}
                className={`text-xs px-3 py-1 rounded-full capitalize font-medium transition-colors shrink-0 cursor-pointer ${
                  filterType === chip
                    ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: Call Box (Calls History) or Chats List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/40">
        
        {/* CALL BOX TAB */}
        {activeTab === 'calls' ? (
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Call Box History</h3>
              <span className="text-[11px] text-[#00a884] font-medium">{callLogs.length} calls</span>
            </div>

            {callLogs.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] text-xs">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No call history yet.</p>
                <p className="mt-1 text-[11px]">Audio and video calls will appear here.</p>
              </div>
            ) : (
              callLogs.map((log) => {
                const isMissed = log.direction === 'missed';
                return (
                  <div
                    key={log.id}
                    className="p-3 hover:bg-[#202c33] rounded-xl flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2a3942] overflow-hidden flex items-center justify-center font-bold text-white text-sm">
                        {log.otherUserAvatar ? (
                          <img src={log.otherUserAvatar} alt={log.otherUserName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{log.otherUserName.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h4 className={`text-sm font-semibold ${isMissed ? 'text-red-400' : 'text-[#e9edef]'}`}>
                          {log.otherUserName}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-[#8696a0] mt-0.5">
                          {log.direction === 'missed' ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-red-400" />
                          ) : log.direction === 'incoming' ? (
                            <PhoneIncoming className="w-3.5 h-3.5 text-[#00a884]" />
                          ) : (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-[#53bdeb]" />
                          )}
                          <span>{formatChatTime(log.timestamp)}</span>
                          {log.duration ? <span>• {log.duration}s</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onStartCallWithUser(log.otherUserId, log.otherUserName, false)}
                        className="p-2 text-[#00a884] hover:bg-[#2a3942] rounded-full cursor-pointer"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onStartCallWithUser(log.otherUserId, log.otherUserName, true)}
                        className="p-2 text-[#00a884] hover:bg-[#2a3942] rounded-full cursor-pointer"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-[#8696a0] text-sm">
            <p>කිසිදු චැට් එකක් හමු නොවීය.</p>
            <p className="text-xs mt-1 text-[#8696a0]/80">No chats found. Start a new chat below.</p>
            <button
              onClick={onOpenNewChat}
              className="mt-4 px-4 py-2 bg-[#00a884] hover:bg-[#02906f] text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
            >
              New Chat
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isPinned = pinnedSet.has(chat._id);
            const isSelected = activeChatId === chat._id;
            const unread = chat.unreadCounts?.[currentUser._id] || 0;
            const avatarUrl = getChatAvatar(chat);

            const otherParticipantId = chat.type === 'direct' 
              ? chat.participants.find(p => p !== currentUser._id) 
              : null;
            const isOtherOnline = otherParticipantId ? onlineUserIds.has(otherParticipantId) : false;

            return (
              <div
                key={chat._id}
                onClick={() => onSelectChat(chat)}
                className={`relative group px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                }`}
              >
                {/* Chat Avatar */}
                <div 
                  className="relative shrink-0 hover:scale-105 transition-transform"
                  onClick={(e) => {
                    if (otherParticipantId) {
                      e.stopPropagation();
                      onOpenContactProfile(otherParticipantId);
                    }
                  }}
                  title={otherParticipantId ? "View contact details & save" : undefined}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white font-semibold">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={chat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{chat.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {isOtherOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full ring-2 ring-[#111b21]" />
                  )}
                  {chat.type === 'ai' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#00a884] rounded-full flex items-center justify-center text-[9px] text-white shadow">
                      <Sparkles className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {chat.type === 'songbot' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-[9px] text-white shadow">
                      <Music className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {chat.type === 'news' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[9px] text-white shadow">
                      <Newspaper className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Chat Meta Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-sm font-semibold text-[#e9edef] truncate">
                        {chat.name}
                      </h3>
                      {chat.hasVerifiedBadge && (
                        <span title="Verified Channel/User"><BadgeCheck className="w-3.5 h-3.5 text-[#00a884] shrink-0 fill-[#00a884]/20" /></span>
                      )}
                      {chat.type === 'ai' && (
                        <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.2 rounded font-bold uppercase">
                          AI
                        </span>
                      )}
                      {chat.type === 'songbot' && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.2 rounded font-bold uppercase">
                          Song Bot
                        </span>
                      )}
                      {chat.type === 'news' && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded font-bold uppercase">
                          News
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#8696a0] shrink-0 font-normal">
                      {formatChatTime(chat.lastMessage?.timestamp || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-xs text-[#8696a0]">
                    <div className="flex items-center gap-1 truncate min-w-0">
                      {chat.lastMessage?.senderId === currentUser._id && (
                        chat.lastMessage?.status === 'read' ? (
                          <CheckCheck className="w-4 h-4 text-[#53bdeb] shrink-0" />
                        ) : chat.lastMessage?.status === 'delivered' ? (
                          <CheckCheck className="w-4 h-4 text-[#8696a0] shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-[#8696a0] shrink-0" />
                        )
                      )}
                      <p className="truncate">
                        {chat.lastMessage ? (
                          chat.lastMessage.type === 'voice' ? '🎤 Voice message' :
                          chat.lastMessage.type === 'image' ? '📷 Photo' :
                          chat.lastMessage.type === 'sticker' ? '🎨 Sticker' :
                          chat.lastMessage.type === 'song' ? '🎵 Song MP3' :
                          chat.lastMessage.callMeta?.isMissed ? '📞 Missed call' :
                          chat.lastMessage.text
                        ) : (
                          chat.description || 'Tap to chat'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPinned && (
                        <Pin className="w-3.5 h-3.5 text-[#8696a0] rotate-45" />
                      )}

                      {unread > 0 && (
                        <span className="min-w-5 h-5 px-1.5 bg-[#00a884] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                          {unread}
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(chat._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#374248] rounded text-[#8696a0] hover:text-[#e9edef] transition-opacity cursor-pointer"
                        title={isPinned ? 'Unpin chat' : 'Pin chat to top'}
                      >
                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ergonomic Bottom Action Bar */}
      <footer className="h-[62px] bg-[#202c33] border-t border-[#222d34] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center justify-around flex-1">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'chats' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            title="Chats"
          >
            <MessageSquarePlus className="w-5 h-5" />
            <span className="text-[10px] font-medium">Chats</span>
          </button>

          {/* Status button directly opens status modal per user feedback */}
          <button
            onClick={() => {
              setActiveTab('status');
              onOpenStatusModal();
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'status' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            title="Updates & Status"
          >
            <div className="relative">
              <Radio className="w-5 h-5" />
              {hasUnviewedStatus && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00a884] rounded-full" />
              )}
            </div>
            <span className="text-[10px] font-medium">Status</span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'channels' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            title="Channels & News"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">Channels</span>
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'calls' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            title="Call Box"
          >
            <Phone className="w-5 h-5" />
            <span className="text-[10px] font-medium">Calls</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[#8696a0] hover:text-[#e9edef] transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={onOpenNewChat}
          className="w-11 h-11 bg-[#00a884] hover:bg-[#02906f] text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ml-2 shrink-0"
          title="New Chat"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>
      </footer>
    </aside>
  );
}
