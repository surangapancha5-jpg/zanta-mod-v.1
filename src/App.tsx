import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Chat, Message, CallData, CallLogItem } from './types';
import { initSocket, getSocket, disconnectSocket } from './services/socket';
import { playMessageSound } from './utils/audio';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuthModal from './components/AuthModal';
import NewChatModal from './components/NewChatModal';
import NewGroupModal from './components/NewGroupModal';
import StatusModal from './components/StatusModal';
import SettingsModal from './components/SettingsModal';
import AboutModal from './components/AboutModal';
import CallModal from './components/CallModal';
import ContactProfileModal from './components/ContactProfileModal';
import { Bell, X, CheckCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'channels' | 'calls'>('chats');
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);

  // In-app Notification Banner
  const [inAppNotice, setInAppNotice] = useState<{ senderName: string; text: string; chatId: string } | null>(null);

  // Modals state
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [hasUnviewedStatus, setHasUnviewedStatus] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Calling state
  const [callData, setCallData] = useState<CallData | null>(null);

  const activeChatRef = useRef<Chat | null>(null);
  activeChatRef.current = activeChat;
  const currentLoadingChatIdRef = useRef<string | null>(null);

  // 1. Restore User Session on mount
  useEffect(() => {
    async function checkAuth() {
      const storedUserId = localStorage.getItem('zavi_user_id') || localStorage.getItem('whatsapp_user_id');
      if (storedUserId) {
        try {
          const res = await fetch(`/api/users/${storedUserId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setCurrentUser(data.user);
            }
          } else {
            localStorage.removeItem('zavi_user_id');
            localStorage.removeItem('whatsapp_user_id');
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
        }
      }
      setLoadingUser(false);
    }
    checkAuth();
  }, []);

  // 2. Fetch Call History
  const fetchCallLogs = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/calls?userId=${userId}`);
      const data = await res.json();
      setCallLogs(data.calls || []);
    } catch (err) {
      console.error('Error fetching call logs:', err);
    }
  }, []);

  // 3. Load User's Chats (Strictly isolate Zanta AI & Song Bot per user)
  const fetchChats = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/chats?userId=${userId}`);
      const data = await res.json();
      let chatList: Chat[] = data.chats || [];

      // STRICT PRIVACY: Private Zanta AI per user
      const userAiChatId = `chat_ai_${userId}`;
      const hasAiChat = chatList.some(c => c._id === userAiChatId || c.type === 'ai');

      if (!hasAiChat) {
        chatList.unshift({
          _id: userAiChatId,
          type: 'ai',
          name: 'Zanta AI',
          avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          description: 'Verified Private AI Companion',
          participants: [userId],
          hasVerifiedBadge: true,
          lastMessage: {
            _id: 'm_ai_init',
            chatId: userAiChatId,
            senderId: 'zanta_ai',
            senderName: 'Zanta AI',
            text: 'හායි! මම Zanta AI. මගේ නම Zanta AI. මට ඔබට උදව් කළ හැක්කේ කෙසේද? (Hi, I am Zanta AI. Private AI assistant!)',
            type: 'text',
            timestamp: new Date().toISOString(),
            status: 'read'
          },
          updatedAt: new Date().toISOString()
        });
      }

      // Song Bot per user
      const userSongChatId = `chat_songbot_${userId}`;
      const hasSongChat = chatList.some(c => c._id === userSongChatId || c.type === 'songbot');

      if (!hasSongChat) {
        chatList.splice(1, 0, {
          _id: userSongChatId,
          type: 'songbot',
          name: 'Song Bot',
          avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
          description: 'YouTube MP3 Bot • Send .song <name>',
          participants: [userId],
          hasVerifiedBadge: true,
          lastMessage: {
            _id: 'm_song_init',
            chatId: userSongChatId,
            senderId: 'songbot',
            senderName: 'Song Bot',
            text: 'ඕනෑම සිංදුවක නම හෝ .song <name> ලබාදෙන්න. MP3 ලබාගත හැක.',
            type: 'text',
            timestamp: new Date().toISOString(),
            status: 'read'
          },
          updatedAt: new Date().toISOString()
        });
      }

      // Verified Zanta News broadcast channel
      const hasNewsChat = chatList.some(c => c.type === 'news');
      if (!hasNewsChat) {
        chatList.splice(2, 0, {
          _id: 'chat_zanta_news',
          type: 'news',
          name: 'Zanta News',
          avatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
          description: 'Hiru News Official Broadcast Channel',
          participants: [userId],
          hasVerifiedBadge: true,
          lastMessage: {
            _id: 'm_news_init',
            chatId: 'chat_zanta_news',
            senderId: 'zanta_news',
            senderName: 'Zanta News',
            text: 'නවතම පුවත් විනාඩි 20කට වරක් ස්වයංක්‍රීයව මෙහි සජීවීව පළවේ.',
            type: 'text',
            timestamp: new Date().toISOString(),
            status: 'read'
          },
          updatedAt: new Date().toISOString()
        });
      }

      setChats(chatList);
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  }, []);

  // 4. Socket.io Event Handling
  useEffect(() => {
    if (!currentUser) return;

    const socket = initSocket(currentUser._id);

    fetchChats(currentUser._id);
    fetchCallLogs(currentUser._id);

    // Online status
    socket.on('user:status_change', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    // In-app notification for new message
    socket.on('notification:new_message', ({ chatId, senderName, text }: any) => {
      if (activeChatRef.current?._id !== chatId) {
        playMessageSound();
        setInAppNotice({ senderName, text, chatId });
        setTimeout(() => setInAppNotice(null), 4000);
      }
    });

    // New message event
    socket.on('message:new', (msg: Message) => {
      if (activeChatRef.current && activeChatRef.current._id === msg.chatId) {
        setMessages((prev) => [...prev, msg]);

        if (msg.senderId !== currentUser._id) {
          playMessageSound();
          fetch(`/api/chats/${msg.chatId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id })
          }).catch(() => {});
        }
      }

      // Update chats list lastMessage
      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c._id === msg.chatId) {
            const isCurrentChat = activeChatRef.current?._id === msg.chatId;
            const currentUnread = c.unreadCounts?.[currentUser._id] || 0;
            return {
              ...c,
              lastMessage: msg,
              updatedAt: msg.timestamp,
              unreadCounts: {
                ...c.unreadCounts,
                [currentUser._id]: isCurrentChat || msg.senderId === currentUser._id ? 0 : currentUnread + 1
              }
            };
          }
          return c;
        });
      });
    });

    // Real-time Read Receipts
    socket.on('message:read_receipt', ({ chatId, readByUserId }: { chatId: string; readByUserId: string }) => {
      if (readByUserId !== currentUser._id) {
        setMessages((prev) =>
          prev.map((m) => (m.chatId === chatId ? { ...m, status: 'read' } : m))
        );
        setChats((prevChats) =>
          prevChats.map((c) =>
            c._id === chatId && c.lastMessage
              ? { ...c, lastMessage: { ...c.lastMessage, status: 'read' } }
              : c
          )
        );
      }
    });

    // Message Reactions
    socket.on('message:reaction', ({ messageId, reactions }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    // Message Deleted for Everyone
    socket.on('message:deleted_everyone', ({ messageId }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeletedForEveryone: true, text: 'This message was deleted', mediaUrl: '', songMeta: undefined }
            : m
        )
      );
    });

    // Typing indicators
    socket.on('chat:typing', ({ chatId, userId, isTyping: typing }: any) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId && userId !== currentUser._id) {
        setIsTyping(typing);
      }
    });

    // Incoming Call
    socket.on('call:incoming', ({ fromUser, isVideo, callId }: any) => {
      setCallData({
        active: true,
        callId,
        otherUser: fromUser,
        isVideo,
        isOutgoing: false,
        status: 'ringing',
        isMuted: false,
        isVideoEnabled: isVideo
      });
    });

    socket.on('call:accepted', () => {
      setCallData((prev) => (prev ? { ...prev, status: 'connected' } : null));
    });

    socket.on('call:rejected', () => {
      setCallData(null);
    });

    socket.on('call:ended', ({ isMissed }: any) => {
      if (isMissed && callData) {
        fetchCallLogs(currentUser._id);
      }
      setCallData(null);
    });

    socket.on('status:new', () => {
      setHasUnviewedStatus(true);
    });

    return () => {
      socket.off('user:status_change');
      socket.off('notification:new_message');
      socket.off('message:new');
      socket.off('message:read_receipt');
      socket.off('message:reaction');
      socket.off('message:deleted_everyone');
      socket.off('chat:typing');
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('status:new');
    };
  }, [currentUser, fetchChats, fetchCallLogs]);

  // 5. Select Chat and load messages
  const handleSelectChat = async (chat: Chat) => {
    currentLoadingChatIdRef.current = chat._id;
    setActiveChat(chat);
    setMessages([]); // IMMEDIATELY clear previous chat messages
    setIsTyping(false);

    const socket = getSocket();
    if (socket) {
      if (activeChat) socket.emit('chat:leave', activeChat._id);
      socket.emit('chat:join', chat._id);
    }

    if (currentUser) {
      setChats((prev) =>
        prev.map((c) =>
          c._id === chat._id
            ? { ...c, unreadCounts: { ...c.unreadCounts, [currentUser._id]: 0 } }
            : c
        )
      );

      fetch(`/api/chats/${chat._id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id })
      }).catch(() => {});
    }

    if (chat.type === 'news') {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        if (currentLoadingChatIdRef.current !== chat._id) return;
        const newsItems = data.news || [];
        const formattedMessages: Message[] = newsItems.slice(0, 30).map((item: any) => ({
          _id: item.id,
          chatId: chat._id,
          senderId: 'zanta_news',
          senderName: 'Zanta News',
          text: item.description || item.title,
          type: 'news' as const,
          timestamp: item.timestamp || new Date().toISOString(),
          status: 'read' as const,
          newsMeta: {
            title: item.title,
            image: item.image,
            link: item.link,
            time: item.time
          }
        }));
        setMessages(formattedMessages);
        return;
      } catch (err) {
        console.error('Error fetching live news:', err);
      }
    }

    try {
      const res = await fetch(`/api/chats/${chat._id}/messages?userId=${currentUser?._id}`);
      const data = await res.json();
      if (currentLoadingChatIdRef.current !== chat._id) return; // Prevent race conditions
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleContactNameUpdated = (targetUserId: string, newSavedName: string) => {
    setCurrentUser(prev => prev ? {
      ...prev,
      savedContacts: { ...(prev.savedContacts || {}), [targetUserId]: newSavedName }
    } : null);

    setChats(prevChats => prevChats.map(c => {
      if (c.type === 'direct' && c.participants.includes(targetUserId)) {
        return {
          ...c,
          name: newSavedName || c.name,
          otherUser: c.otherUser ? { ...c.otherUser, savedName: newSavedName } : undefined
        };
      }
      return c;
    }));

    if (activeChatRef.current && activeChatRef.current.participants.includes(targetUserId)) {
      setActiveChat(prev => prev ? { ...prev, name: newSavedName || prev.name } : null);
    }
  };

  // 6. Send Message
  const handleSendMessage = async (msgData: {
    text: string;
    type?: 'text' | 'voice' | 'image' | 'sticker' | 'song';
    mediaUrl?: string;
    audioDuration?: number;
    replyTo?: { id: string; text: string; senderName: string } | null;
    isForwarded?: boolean;
    songMeta?: any;
  }) => {
    if (!currentUser || !activeChat) return;

    const payload = {
      senderId: currentUser._id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatar || '',
      text: msgData.text,
      type: msgData.type || 'text',
      mediaUrl: msgData.mediaUrl,
      audioDuration: msgData.audioDuration,
      replyTo: msgData.replyTo,
      isForwarded: msgData.isForwarded,
      songMeta: msgData.songMeta
    };

    try {
      const res = await fetch(`/api/chats/${activeChat._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // 7. Message Reactions
  const handleReactMessage = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, emoji })
      });
    } catch (err) {
      console.error('React error:', err);
    }
  };

  // 8. Delete Message (For me or everyone)
  const handleDeleteMessage = async (messageId: string, mode: 'me' | 'everyone') => {
    if (!currentUser) return;
    try {
      await fetch(`/api/messages/${messageId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, mode })
      });

      if (mode === 'me') {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  // 9. Save Sticker to User Pack
  const handleSaveSticker = async (stickerUrl: string) => {
    if (!currentUser) return;
    const currentStickers = currentUser.savedStickers || [];
    if (currentStickers.includes(stickerUrl)) return;

    const updated = [stickerUrl, ...currentStickers];
    setCurrentUser((prev) => (prev ? { ...prev, savedStickers: updated } : null));

    try {
      await fetch(`/api/users/${currentUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedStickers: updated })
      });
    } catch (err) {
      console.error('Save sticker error:', err);
    }
  };

  // 10. Forward Message
  const handleForwardMessage = async (message: Message, targetChatId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/chats/${targetChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser._id,
          senderName: currentUser.displayName,
          senderAvatar: currentUser.avatar || '',
          text: message.text,
          type: message.type,
          mediaUrl: message.mediaUrl,
          audioDuration: message.audioDuration,
          songMeta: message.songMeta,
          isForwarded: true
        })
      });
      fetchChats(currentUser._id);
    } catch (err) {
      console.error('Forward error:', err);
    }
  };

  // 11. Pin / Unpin Important Chat
  const handleTogglePin = async (chatId: string) => {
    if (!currentUser) return;

    const currentPins = currentUser.pinnedChatIds || [];
    let updatedPins: string[];

    if (currentPins.includes(chatId)) {
      updatedPins = currentPins.filter((id) => id !== chatId);
    } else {
      updatedPins = [chatId, ...currentPins];
    }

    setCurrentUser((prev) => (prev ? { ...prev, pinnedChatIds: updatedPins } : null));

    try {
      await fetch(`/api/users/${currentUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinnedChatIds: updatedPins })
      });
    } catch (err) {
      console.error('Failed to persist pinned chat:', err);
    }
  };

  // 12. Live Call Handlers
  const handleStartCall = (isVideo: boolean) => {
    if (!currentUser || !activeChat) return;
    const otherUserId = activeChat.participants.find((p) => p !== currentUser._id);
    if (!otherUserId) return;

    initiateCallWithUser(otherUserId, activeChat.name, isVideo, activeChat.avatar);
  };

  const initiateCallWithUser = (targetUserId: string, targetName: string, isVideo: boolean, avatar?: string) => {
    if (!currentUser) return;
    const callId = `call_${Date.now()}`;
    const newCallData: CallData = {
      active: true,
      callId,
      otherUser: {
        _id: targetUserId,
        displayName: targetName,
        avatar
      },
      isVideo,
      isOutgoing: true,
      status: 'calling',
      isMuted: false,
      isVideoEnabled: isVideo
    };

    setCallData(newCallData);

    const socket = getSocket();
    if (socket) {
      socket.emit('call:start', {
        toUserId: targetUserId,
        fromUser: {
          _id: currentUser._id,
          displayName: currentUser.displayName,
          avatar: currentUser.avatar,
          hasVerifiedBadge: currentUser.hasVerifiedBadge
        },
        isVideo,
        callId
      });
    }
  };

  const handleAcceptCall = () => {
    if (!callData) return;
    setCallData((prev) => (prev ? { ...prev, status: 'connected' } : null));
    const socket = getSocket();
    if (socket) {
      socket.emit('call:accept', {
        toUserId: callData.otherUser._id,
        callId: callData.callId
      });
    }
  };

  const handleEndCall = async (wasMissed = false) => {
    if (!callData || !currentUser) {
      setCallData(null);
      return;
    }

    const socket = getSocket();
    if (socket) {
      socket.emit('call:end', {
        toUserId: callData.otherUser._id,
        callId: callData.callId,
        isMissed: wasMissed
      });
    }

    // Save call log
    await fetch('/api/calls/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser._id,
        otherUserId: callData.otherUser._id,
        otherUserName: callData.otherUser.displayName,
        otherUserAvatar: callData.otherUser.avatar,
        type: callData.isVideo ? 'video' : 'voice',
        direction: wasMissed ? 'missed' : callData.isOutgoing ? 'outgoing' : 'incoming',
        duration: 0
      })
    }).catch(() => {});

    // If missed, send a missed call message into the chat so recipient sees it immediately!
    if (wasMissed && activeChat) {
      await fetch(`/api/chats/${activeChat._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser._id,
          senderName: currentUser.displayName,
          text: `Missed ${callData.isVideo ? 'video' : 'voice'} call`,
          type: 'call_log',
          callMeta: {
            type: callData.isVideo ? 'video' : 'voice',
            isMissed: true,
            callerName: currentUser.displayName
          }
        })
      }).catch(() => {});
    }

    fetchCallLogs(currentUser._id);
    setCallData(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('zavi_user_id');
    localStorage.removeItem('zavi_user_email');
    localStorage.removeItem('whatsapp_user_id');
    disconnectSocket();
    setCurrentUser(null);
    setActiveChat(null);
    setMessages([]);
  };

  if (loadingUser) {
    return (
      <div className="h-full w-full bg-[#111b21] flex flex-col items-center justify-center text-[#e9edef] select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-3 animate-pulse mb-4 shadow-xl">
          <img src="https://cdn.imagetourls.com/uploads/tyImg/Y6a8BZUa.png" alt="zavi chats" className="w-full h-full object-contain" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-[#e9edef]">zavi chats v1.0.0 Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  const otherParticipantId = activeChat && activeChat.type === 'direct'
    ? activeChat.participants.find((p) => p !== currentUser._id)
    : null;
  const isOtherOnline = otherParticipantId ? onlineUserIds.has(otherParticipantId) : false;

  return (
    <div className="h-full w-full flex bg-[#0c1317] overflow-hidden relative font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]">
      
      {/* Top Notification Toast for incoming messages */}
      {inAppNotice && (
        <div 
          onClick={() => {
            const target = chats.find(c => c._id === inAppNotice.chatId);
            if (target) handleSelectChat(target);
            setInAppNotice(null);
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#202c33]/95 backdrop-blur-md border border-[#00a884] rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 cursor-pointer animate-in slide-in-from-top max-w-sm w-full"
        >
          <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-[#00a884] truncate">{inAppNotice.senderName}</h4>
            <p className="text-xs text-[#e9edef] truncate">{inAppNotice.text}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setInAppNotice(null); }}
            className="text-[#8696a0] hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div className={`h-full ${activeChat ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        <Sidebar
          currentUser={currentUser}
          chats={chats}
          activeChatId={activeChat?._id || null}
          onSelectChat={handleSelectChat}
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenNewGroup={() => setShowNewGroup(true)}
          onOpenStatusModal={() => setShowStatusModal(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAbout={() => setShowAbout(true)}
          onLogout={handleLogout}
          onTogglePin={handleTogglePin}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hasUnviewedStatus={hasUnviewedStatus}
          onlineUserIds={onlineUserIds}
          callLogs={callLogs}
          onStartCallWithUser={(userId, name, isVideo) => initiateCallWithUser(userId, name, isVideo)}
          onOpenContactProfile={(userId) => setSelectedContactId(userId)}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 h-full ${!activeChat ? 'hidden md:flex' : 'flex w-full'}`}>
        <ChatArea
          chat={activeChat}
          currentUser={currentUser}
          messages={messages}
          allChats={chats}
          onSendMessage={handleSendMessage}
          onStartCall={handleStartCall}
          onBackMobile={() => setActiveChat(null)}
          isTyping={isTyping}
          onTypingChange={(typing) => {
            if (activeChat) {
              const socket = getSocket();
              socket?.emit('chat:typing', {
                chatId: activeChat._id,
                userId: currentUser._id,
                userName: currentUser.displayName,
                isTyping: typing
              });
            }
          }}
          isOtherOnline={isOtherOnline}
          customWallpaper={currentUser.customWallpaper}
          onReactMessage={handleReactMessage}
          onDeleteMessage={handleDeleteMessage}
          onSaveSticker={handleSaveSticker}
          onForwardMessage={handleForwardMessage}
          onOpenContactProfile={(userId) => setSelectedContactId(userId)}
        />
      </div>

      {/* Modals */}
      {showNewChat && (
        <NewChatModal
          currentUser={currentUser}
          onClose={() => setShowNewChat(false)}
          onChatSelected={(chat) => {
            fetchChats(currentUser._id);
            handleSelectChat(chat);
          }}
          onOpenNewGroup={() => setShowNewGroup(true)}
        />
      )}

      {showNewGroup && (
        <NewGroupModal
          currentUser={currentUser}
          onClose={() => setShowNewGroup(false)}
          onGroupCreated={(chat) => {
            fetchChats(currentUser._id);
            handleSelectChat(chat);
          }}
        />
      )}

      {showStatusModal && (
        <StatusModal
          currentUser={currentUser}
          onClose={() => setShowStatusModal(false)}
          onStatusCreated={() => {
            setHasUnviewedStatus(true);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setShowSettings(false)}
          onUpdateUser={(updated) => {
            setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
          }}
        />
      )}

      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}

      {callData && (
        <CallModal
          callData={callData}
          currentUser={currentUser}
          onEndCall={handleEndCall}
          onAcceptCall={handleAcceptCall}
        />
      )}

      {selectedContactId && (
        <ContactProfileModal
          targetUserId={selectedContactId}
          currentUserId={currentUser._id}
          onClose={() => setSelectedContactId(null)}
          onStartCall={(isVideo) => {
            const contactId = selectedContactId;
            setSelectedContactId(null);
            const targetChat = chats.find(c => c.type === 'direct' && c.participants.includes(contactId));
            initiateCallWithUser(contactId, targetChat?.name || 'Contact', isVideo, targetChat?.avatar);
          }}
          onOpenStatusViewer={() => {
            setSelectedContactId(null);
            setShowStatusModal(true);
          }}
          onContactNameUpdated={handleContactNameUpdated}
        />
      )}

    </div>
  );
}
