import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, User } from '../types';
import { 
  Phone, Video, Search, MoreVertical, Paperclip, Send, 
  Mic, Trash2, Check, CheckCheck, Play, Pause, 
  Sparkles, ExternalLink, Smile, ArrowLeft, 
  Music, Reply, Forward, Heart, SmilePlus, BadgeCheck,
  Download, Plus, PhoneMissed, AlertCircle, X, User as UserIcon
} from 'lucide-react';
import IosEmojiPicker from './IosEmojiPicker';
import { playSentSound } from '../utils/audio';
import { isSingleOrFewEmojis, getEmojiAnimationClass } from '../utils/emoji';

interface ChatAreaProps {
  chat: Chat | null;
  currentUser: User;
  messages: Message[];
  allChats: Chat[];
  onSendMessage: (data: {
    text: string;
    type?: 'text' | 'voice' | 'image' | 'sticker' | 'song';
    mediaUrl?: string;
    audioDuration?: number;
    replyTo?: { id: string; text: string; senderName: string } | null;
    isForwarded?: boolean;
    songMeta?: any;
  }) => Promise<void>;
  onStartCall: (isVideo: boolean) => void;
  onBackMobile: () => void;
  isTyping: boolean;
  onTypingChange: (isTyping: boolean) => void;
  isOtherOnline: boolean;
  customWallpaper?: string;
  onReactMessage: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string, mode: 'me' | 'everyone') => void;
  onSaveSticker: (stickerUrl: string) => void;
  onForwardMessage: (message: Message, targetChatId: string) => void;
  onOpenContactProfile: (userId: string) => void;
}

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍', '🔥'];

export default function ChatArea({
  chat,
  currentUser,
  messages,
  allChats,
  onSendMessage,
  onStartCall,
  onBackMobile,
  isTyping,
  onTypingChange,
  isOtherOnline,
  customWallpaper,
  onReactMessage,
  onDeleteMessage,
  onSaveSticker,
  onForwardMessage,
  onOpenContactProfile,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [searchInChat, setSearchInChat] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSearchingSong, setIsSearchingSong] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [reactionPickerForMessageId, setReactionPickerForMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const longPressTimerRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTypingChange(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false);
    }, 1500);
  };

  const handleEmojiClick = (emoji: string) => {
    if (reactionPickerForMessageId) {
      onReactMessage(reactionPickerForMessageId, emoji);
      setReactionPickerForMessageId(null);
      setActiveReactionMessageId(null);
    } else {
      setInputText((prev) => prev + emoji);
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !chat) return;

    const text = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    onTypingChange(false);
    playSentSound();

    const replyData = replyingTo ? {
      id: replyingTo._id,
      text: replyingTo.text,
      senderName: replyingTo.senderName
    } : null;
    setReplyingTo(null);

    // 1. Song Bot Search
    if (chat.type === 'songbot' || text.startsWith('.song ')) {
      await onSendMessage({ text, type: 'text', replyTo: replyData });
      setIsSearchingSong(true);
      try {
        const query = text.startsWith('.song ') ? text.replace(/^\.song\s*/i, '') : text;
        const res = await fetch('/api/song/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await res.json();
        if (data.song) {
          await onSendMessage({
            text: `🎵 ${data.song.title}`,
            type: 'song',
            songMeta: data.song
          });
        }
      } catch (songErr) {
        console.error('Song search failed:', songErr);
      } finally {
        setIsSearchingSong(false);
      }
      return;
    }

    // 2. Normal text message
    await onSendMessage({ text, type: 'text', replyTo: replyData });

    // 3. Zanta AI response
    if (chat.type === 'ai') {
      try {
        const res = await fetch('/api/ai/zanta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text })
        });
        const data = await res.json();
        if (data.reply) {
          await fetch(`/api/chats/${chat._id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: 'zanta_ai',
              senderName: 'Zanta AI',
              senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
              text: data.reply,
              type: 'text'
            })
          });
        }
      } catch (err) {
        console.error('Failed to get Zanta AI response:', err);
      }
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone permission required for voice notes.');
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !chat) return;

    const duration = recordingDuration;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        playSentSound();
        await onSendMessage({
          text: 'Voice note',
          type: 'voice',
          mediaUrl: base64Audio,
          audioDuration: duration || 1
        });
      };
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const togglePlayAudio = (messageId: string, url: string) => {
    if (playingAudioId === messageId) {
      currentAudioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (currentAudioRef.current) currentAudioRef.current.pause();
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      setPlayingAudioId(messageId);

      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(err => {
        console.error('Audio play error:', err);
        setPlayingAudioId(null);
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Img = reader.result as string;
      playSentSound();
      await onSendMessage({
        text: 'Photo',
        type: 'image',
        mediaUrl: base64Img
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Sticker = reader.result as string;
      onSaveSticker(base64Sticker);
      playSentSound();
      await onSendMessage({
        text: 'Sticker',
        type: 'sticker',
        mediaUrl: base64Sticker
      });
      setShowStickerPicker(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Long Press Event Handlers for Mobile Reaction Panel
  const handleTouchStart = (messageId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveReactionMessageId(messageId);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredMessages = showSearch && searchInChat
    ? messages.filter((m) => m.text?.toLowerCase().includes(searchInChat.toLowerCase()))
    : messages;

  const isChannelReadOnly = chat?.type === 'channel' && chat.creatorId !== currentUser._id;
  const isNewsReadOnly = chat?.type === 'news';

  const otherParticipantId = chat?.type === 'direct' 
    ? chat.participants.find(p => p !== currentUser._id) 
    : null;

  if (!chat) {
    return (
      <main className="flex-1 h-full bg-[#222e35] hidden md:flex flex-col items-center justify-center p-8 text-center border-b-[6px] border-[#00a884]">
        <div className="w-48 h-48 mb-6 flex items-center justify-center p-4 bg-white/5 rounded-full backdrop-blur-sm">
          <img src="https://cdn.imagetourls.com/uploads/tyImg/Y6a8BZUa.png" alt="zavi chats" className="w-36 h-36 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-[#e9edef] mb-2 tracking-wide">zavi chats v1.0.0</h2>
        <p className="text-sm text-[#8696a0] max-w-md leading-relaxed">
          සජීවීව පණිවිඩ හුවමාරු කරන්න, ඇමතුම් ලබාගන්න, ස්ටේටස් බලන්න සහ Zanta AI හා Song Bot භාවිත කරන්න.
        </p>
        <div className="flex items-center gap-2 text-xs text-[#8696a0] mt-8 bg-[#182229] px-4 py-1.5 rounded-full border border-[#2a3942]">
          <span className="w-2 h-2 rounded-full bg-[#00a884]" />
          <span>End-to-end encrypted private messaging</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full flex flex-col bg-[#0b141a] relative z-10 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]">
      
      {/* Header */}
      <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34]">
        <div 
          onClick={() => {
            if (otherParticipantId) {
              onOpenContactProfile(otherParticipantId);
            }
          }}
          className="flex items-center gap-3 min-w-0 cursor-pointer group"
          title="Click to view contact profile details"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBackMobile();
            }}
            className="md:hidden p-1.5 -ml-2 text-[#aebac1] hover:text-white rounded-full cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white font-semibold text-sm group-hover:ring-2 group-hover:ring-[#00a884] transition-all">
              {chat.avatar ? (
                <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
              ) : (
                <span>{chat.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {isOtherOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full ring-2 ring-[#202c33]" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-[#e9edef] group-hover:text-[#00a884] transition-colors truncate">
                {chat.name}
              </h2>
              {chat.hasVerifiedBadge && (
                <span title="Verified"><BadgeCheck className="w-4 h-4 text-[#00a884] shrink-0 fill-[#00a884]/20" /></span>
              )}
              {chat.type === 'ai' && (
                <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.2 rounded font-bold uppercase">AI</span>
              )}
              {chat.type === 'songbot' && (
                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.2 rounded font-bold uppercase">Song Bot</span>
              )}
              {chat.type === 'news' && (
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded font-bold uppercase">News</span>
              )}
            </div>
            <p className="text-[11px] text-[#8696a0] truncate">
              {isTyping ? (
                <span className="text-[#00a884] font-medium animate-pulse">typing...</span>
              ) : chat.type === 'ai' ? (
                'Zanta AI • Always Online'
              ) : chat.type === 'songbot' ? (
                'YouTube MP3 Bot • Type .song <name>'
              ) : chat.type === 'news' ? (
                'Hiru News Broadcast • Updates every 20m'
              ) : isOtherOnline ? (
                <span className="text-[#00a884]">online</span>
              ) : (
                'offline'
              )}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 text-[#aebac1]">
          {chat.type === 'direct' && (
            <>
              <button
                onClick={() => onStartCall(false)}
                className="p-2 hover:bg-[#374248] rounded-full transition-colors cursor-pointer hover:text-[#00a884]"
                title="Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={() => onStartCall(true)}
                className="p-2 hover:bg-[#374248] rounded-full transition-colors cursor-pointer hover:text-[#00a884]"
                title="Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-[#374248] rounded-full transition-colors cursor-pointer"
            title="Search in chat"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="bg-[#111b21] p-2 border-b border-[#222d34] flex items-center gap-2">
          <input
            type="text"
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-[#202c33] text-sm text-[#e9edef] px-3 py-1.5 rounded-lg focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => { setShowSearch(false); setSearchInChat(''); }}
            className="text-xs text-[#8696a0] hover:text-[#e9edef] px-2 py-1"
          >
            Close
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3 wa-doodle-bg"
        style={customWallpaper ? { backgroundImage: `url(${customWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {/* Security Banner */}
        <div className="flex justify-center my-2">
          <div className="bg-[#182229]/90 border border-[#2a3942] rounded-lg px-4 py-1.5 text-center max-w-sm shadow">
            <p className="text-[11px] text-[#ffd279] flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffd279]" />
              zavi chats end-to-end encrypted • Private conversation
            </p>
          </div>
        </div>

        {/* Messages List */}
        {filteredMessages.map((msg) => {
          const isMine = msg.senderId === currentUser._id;
          const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isMenuOpen = activeMessageMenuId === msg._id;
          const isReactionOpen = activeReactionMessageId === msg._id;
          const isOnlyEmoji = msg.type === 'text' && isSingleOrFewEmojis(msg.text);
          const emojiAnimClass = isOnlyEmoji ? getEmojiAnimationClass(msg.text) : '';

          return (
            <div
              key={msg._id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'} group relative`}
              onTouchStart={() => handleTouchStart(msg._id)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              onMouseDown={() => handleTouchStart(msg._id)}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                setActiveReactionMessageId(msg._id);
              }}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm relative shadow-md transition-all ${
                  isOnlyEmoji 
                    ? 'bg-transparent shadow-none px-1 py-1' 
                    : isMine
                    ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                    : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                }`}
              >
                {/* Forwarded Header */}
                {msg.isForwarded && (
                  <div className="flex items-center gap-1 text-[11px] text-[#8696a0] italic mb-1">
                    <Forward className="w-3 h-3" />
                    <span>Forwarded</span>
                  </div>
                )}

                {/* Sender Name in Group */}
                {!isMine && chat.type === 'group' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenContactProfile(msg.senderId);
                    }}
                    className="text-[11px] font-semibold text-[#53bdeb] mb-0.5 hover:underline cursor-pointer block text-left"
                    title="View contact details"
                  >
                    {msg.senderName}
                  </button>
                )}

                {/* Quoted / Reply Preview */}
                {msg.replyTo && (
                  <div className="mb-2 p-2 bg-black/20 rounded-lg border-l-4 border-[#00a884] text-xs">
                    <span className="font-semibold text-[#00a884] block">{msg.replyTo.senderName}</span>
                    <span className="text-[#8696a0] line-clamp-1">{msg.replyTo.text}</span>
                  </div>
                )}

                {/* Call Log Message Card */}
                {msg.callMeta ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                      <PhoneMissed className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-400">
                        {msg.callMeta.isMissed ? `Missed ${msg.callMeta.type} call` : `${msg.callMeta.type} call`}
                      </h4>
                      <p className="text-xs text-[#8696a0]">Tap to call back</p>
                    </div>
                    <button
                      onClick={() => onStartCall(msg.callMeta?.type === 'video')}
                      className="ml-auto px-3 py-1 bg-[#00a884] text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Call
                    </button>
                  </div>
                ) : msg.songMeta ? (
                  /* YouTube Song MP3 Card */
                  <div className="space-y-2 max-w-sm">
                    {msg.songMeta.thumbnail && (
                      <img
                        src={msg.songMeta.thumbnail}
                        alt={msg.songMeta.title}
                        className="w-full h-40 object-cover rounded-xl"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <Music className="w-5 h-5 text-purple-400 shrink-0" />
                      <h4 className="font-bold text-sm text-[#e9edef] truncate">{msg.songMeta.title}</h4>
                    </div>
                    
                    <div className="p-2 bg-black/30 rounded-xl flex items-center gap-3">
                      <button
                        onClick={() => togglePlayAudio(msg._id, msg.songMeta?.mp3Url || '')}
                        className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white flex items-center justify-center cursor-pointer shadow"
                      >
                        {playingAudioId === msg._id ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                      </button>
                      <span className="text-xs text-[#8696a0] font-mono">{msg.songMeta?.duration || '3:30'}</span>
                      <a
                        href={msg.songMeta?.mp3Url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={`${msg.songMeta?.title || 'song'}.mp3`}
                        className="ml-auto p-2 bg-[#2a3942] hover:bg-[#374248] rounded-full text-white cursor-pointer"
                        title="Download MP3"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : msg.type === 'sticker' && msg.mediaUrl ? (
                  /* Custom Sticker */
                  <div className="relative group/sticker">
                    <img
                      src={msg.mediaUrl}
                      alt="Sticker"
                      className="w-36 h-36 object-contain cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onSaveSticker(msg.mediaUrl!)}
                      title="Click to save sticker"
                    />
                    <button
                      onClick={() => onSaveSticker(msg.mediaUrl!)}
                      className="absolute bottom-1 right-1 opacity-0 group-hover/sticker:opacity-100 bg-black/70 hover:bg-black text-white text-[10px] px-2 py-1 rounded-md transition-opacity cursor-pointer"
                    >
                      Save Sticker
                    </button>
                  </div>
                ) : msg.type === 'news' && msg.newsMeta ? (
                  /* News Card */
                  <div className="space-y-2 max-w-sm">
                    {msg.newsMeta.image && (
                      <img
                        src={msg.newsMeta.image}
                        alt="News"
                        className="w-full h-44 object-cover rounded-xl"
                      />
                    )}
                    <h4 className="font-bold text-sm text-[#e9edef] leading-snug">
                      {msg.newsMeta.title}
                    </h4>
                    <p className="text-xs text-[#d1d7db] leading-relaxed">
                      {msg.text}
                    </p>
                    <a
                      href={msg.newsMeta.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#53bdeb] hover:underline pt-1"
                    >
                      <span>සම්පූර්ණ පුවත බලන්න (Read more)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : msg.type === 'image' && msg.mediaUrl ? (
                  <div className="space-y-1">
                    <img
                      src={msg.mediaUrl}
                      alt="Shared photo"
                      className="max-h-72 w-full object-cover rounded-xl cursor-pointer hover:opacity-95"
                      onClick={() => window.open(msg.mediaUrl, '_blank')}
                    />
                    {msg.text && msg.text !== 'Photo' && <p className="pt-1">{msg.text}</p>}
                  </div>
                ) : msg.type === 'voice' && msg.mediaUrl ? (
                  /* Voice Note */
                  <div className="flex items-center gap-3 py-1 min-w-[200px]">
                    <button
                      onClick={() => togglePlayAudio(msg._id, msg.mediaUrl!)}
                      className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#02906f] flex items-center justify-center text-white shrink-0 cursor-pointer shadow"
                    >
                      {playingAudioId === msg._id ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 flex items-center gap-0.5 h-6">
                      {[18, 24, 12, 28, 16, 22, 30, 14, 26, 12, 20, 15, 24, 18, 10, 22, 16].map((h, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all ${
                            playingAudioId === msg._id ? 'bg-[#53bdeb] animate-pulse' : 'bg-[#8696a0]'
                          }`}
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>

                    <div className="text-[11px] text-[#8696a0] font-mono shrink-0">
                      {formatSeconds(msg.audioDuration || 0)}
                    </div>
                  </div>
                ) : isOnlyEmoji ? (
                  /* ANIMATED SINGLE / FEW EMOJIS */
                  <div className="text-center py-1">
                    <span className={`${emojiAnimClass} select-none`}>
                      {msg.text}
                    </span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed break-words">
                    {msg.text}
                  </p>
                )}

                {/* Timestamp & Read Receipt Double Blue Ticks */}
                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isOnlyEmoji ? 'text-white/60 bg-black/40 px-2 py-0.5 rounded-full w-fit ml-auto' : 'text-[#8696a0]'}`}>
                  <span>{time}</span>
                  {isMine && (
                    msg.status === 'read' ? (
                      <span title="Read (Double blue ticks)"><CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /></span>
                    ) : msg.status === 'delivered' ? (
                      <span title="Delivered (Double grey ticks)"><CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" /></span>
                    ) : (
                      <span title="Sent (Single grey tick)"><Check className="w-3.5 h-3.5 text-[#8696a0]" /></span>
                    )
                  )}
                </div>

                {/* VISUALIZE ACTIVE REACTIONS BENEATH MESSAGE BUBBLE */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 -mb-1 animate-in fade-in zoom-in-95">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                      const hasReacted = userIds.includes(currentUser._id);
                      return (
                        <button
                          key={emoji}
                          onClick={() => onReactMessage(msg._id, emoji)}
                          className={`text-xs px-2 py-0.5 rounded-full bg-[#111b21] border flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-sm hover:scale-105 ${
                            hasReacted ? 'border-[#00a884] ring-1 ring-[#00a884] text-white' : 'border-[#2a3942] text-[#e9edef]'
                          }`}
                          title={hasReacted ? "Click to remove reaction" : "Click to react"}
                        >
                          <span className="hover:scale-125 transition-transform">{emoji}</span>
                          <span className="text-[10px] text-[#8696a0] font-mono">{userIds.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* FLOATING REACTION PANEL TRIGGERED BY HOVER OR LONG PRESS */}
                {(isReactionOpen || activeMessageMenuId === msg._id) && (
                  <div className="absolute -top-12 left-0 right-0 z-30 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="bg-[#1f2c34] border border-[#2a3942] rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-2xl backdrop-blur-md">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            onReactMessage(msg._id, emoji);
                            setActiveReactionMessageId(null);
                          }}
                          className="text-lg hover:scale-135 transition-transform cursor-pointer p-0.5 active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                      {/* Plus Button to open full iOS Emoji Picker */}
                      <button
                        onClick={() => {
                          setReactionPickerForMessageId(msg._id);
                          setShowEmojiPicker(true);
                        }}
                        className="p-1 text-[#8696a0] hover:text-[#00a884] rounded-full cursor-pointer hover:bg-[#2a3942]"
                        title="More iOS emojis"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Action Icons Bar (Desktop Hover) */}
                <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#182229]/95 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-[#2a3942] shadow-xl z-10">
                  <button
                    onClick={() => setActiveReactionMessageId(isReactionOpen ? null : msg._id)}
                    className="p-1 text-[#8696a0] hover:text-[#00a884] cursor-pointer"
                    title="React"
                  >
                    <SmilePlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="p-1 text-[#8696a0] hover:text-white cursor-pointer"
                    title="Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setForwardingMessage(msg)}
                    className="p-1 text-[#8696a0] hover:text-white cursor-pointer"
                    title="Forward"
                  >
                    <Forward className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveMessageMenuId(isMenuOpen ? null : msg._id)}
                    className="p-1 text-[#8696a0] hover:text-white cursor-pointer"
                    title="More"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Context Menu for Deleting */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-8 bg-[#233138] border border-[#2a3942] rounded-xl shadow-2xl py-1 z-30 text-xs w-40">
                    <button
                      onClick={() => {
                        onDeleteMessage(msg._id, 'me');
                        setActiveMessageMenuId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#182229] text-[#e9edef] cursor-pointer"
                    >
                      Delete for me
                    </button>
                    {isMine && (
                      <button
                        onClick={() => {
                          onDeleteMessage(msg._id, 'everyone');
                          setActiveMessageMenuId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#182229] text-red-400 cursor-pointer"
                      >
                        Delete for everyone
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {isSearchingSong && (
          <div className="flex justify-start">
            <div className="bg-[#202c33] text-[#e9edef] rounded-xl px-4 py-2 text-xs flex items-center gap-2 shadow">
              <Music className="w-4 h-4 text-purple-400 animate-spin" />
              <span>Song Bot is searching YouTube for MP3...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="bg-[#182229] px-4 py-2 border-t border-[#222d34] flex items-center justify-between">
          <div className="border-l-4 border-[#00a884] pl-3 min-w-0">
            <span className="text-xs font-semibold text-[#00a884]">{replyingTo.senderName}</span>
            <p className="text-xs text-[#8696a0] truncate">{replyingTo.text}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 text-[#8696a0] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full native iOS Emoji Picker Drawer */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-2 z-40 shadow-2xl animate-in zoom-in-95">
          <IosEmojiPicker
            onSelectEmoji={handleEmojiClick}
            onClose={() => {
              setShowEmojiPicker(false);
              setReactionPickerForMessageId(null);
            }}
          />
        </div>
      )}

      {/* Message Input Bar */}
      {isChannelReadOnly ? (
        <div className="h-[62px] bg-[#202c33] px-4 flex items-center justify-center text-xs text-[#8696a0] border-t border-[#222d34]">
          <AlertCircle className="w-4 h-4 mr-2 text-[#00a884]" />
          <span>Only the channel creator can send messages in this channel.</span>
        </div>
      ) : isNewsReadOnly ? (
        <div className="h-[62px] bg-[#202c33] px-4 flex items-center justify-center text-xs text-[#8696a0] border-t border-[#222d34]">
          <AlertCircle className="w-4 h-4 mr-2 text-red-400" />
          <span>News channel is read-only. Updates are published automatically every 20 minutes.</span>
        </div>
      ) : (
        <footer className="h-[62px] bg-[#202c33] px-3 flex items-center gap-2 shrink-0 border-t border-[#222d34] relative">
          
          {/* Stickers Drawer */}
          {showStickerPicker && (
            <div className="absolute bottom-16 left-2 w-72 bg-[#182229] border border-[#2a3942] rounded-2xl shadow-2xl p-3 z-30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#e9edef]">My Stickers</span>
                <label className="text-[11px] bg-[#00a884] hover:bg-[#02906f] text-white px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  <span>Custom Sticker</span>
                  <input type="file" accept="image/*" ref={stickerInputRef} onChange={handleStickerUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {(currentUser.savedStickers || []).length === 0 ? (
                  <p className="col-span-3 text-center text-xs text-[#8696a0] py-4">No stickers saved. Tap &apos;Custom Sticker&apos; to create one from a photo!</p>
                ) : (
                  currentUser.savedStickers?.map((stk, i) => (
                    <img
                      key={i}
                      src={stk}
                      alt="Sticker"
                      onClick={() => {
                        onSendMessage({ text: 'Sticker', type: 'sticker', mediaUrl: stk });
                        setShowStickerPicker(false);
                      }}
                      className="w-16 h-16 object-contain cursor-pointer hover:scale-110 transition-transform p-1 rounded-lg hover:bg-[#2a3942]"
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {isRecording ? (
            <div className="flex-1 flex items-center justify-between bg-[#111b21] px-4 py-2 rounded-xl border border-red-500/30">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono text-red-400 font-bold">
                  {formatSeconds(recordingDuration)}
                </span>
                <span className="text-xs text-[#8696a0]">Recording audio...</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-2 text-[#8696a0] hover:text-red-400 rounded-full cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={stopAndSendRecording}
                  className="w-9 h-9 bg-[#00a884] hover:bg-[#02906f] text-white rounded-full flex items-center justify-center cursor-pointer shadow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Photo Attachment */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full cursor-pointer"
                title="Send Photo"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* iOS Emoji Picker Button */}
              <button
                type="button"
                onClick={() => {
                  setReactionPickerForMessageId(null);
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowStickerPicker(false);
                }}
                className={`p-2 rounded-full cursor-pointer transition-colors ${showEmojiPicker ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#00a884]'}`}
                title="iOS Emoji Picker"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Custom Stickers drawer button */}
              <button
                type="button"
                onClick={() => {
                  setShowStickerPicker(!showStickerPicker);
                  setShowEmojiPicker(false);
                }}
                className={`p-2 rounded-full cursor-pointer transition-colors ${showStickerPicker ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#00a884]'}`}
                title="Custom Stickers"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={chat.type === 'songbot' ? "Type song name or .song <name>..." : "Type a message..."}
                  className="w-full bg-[#2a3942] text-sm text-[#e9edef] placeholder-[#8696a0] px-4 py-2.5 rounded-lg focus:outline-none"
                />
              </form>

              {inputText.trim() ? (
                <button
                  type="button"
                  onClick={() => handleSendText()}
                  className="w-10 h-10 bg-[#00a884] hover:bg-[#02906f] text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-10 h-10 bg-[#00a884] hover:bg-[#02906f] text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95 shrink-0"
                  title="Record Voice Note"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </footer>
      )}

      {/* Forward Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111b21] rounded-2xl border border-[#222d34] overflow-hidden shadow-2xl">
            <header className="p-3 bg-[#202c33] flex items-center justify-between border-b border-[#222d34]">
              <h3 className="text-sm font-semibold text-[#e9edef]">Forward Message to...</h3>
              <button onClick={() => setForwardingMessage(null)} className="p-1 text-[#8696a0] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-2 max-h-60 overflow-y-auto space-y-1">
              {allChats.filter(c => c._id !== chat._id).map((c) => (
                <button
                  key={c._id}
                  onClick={() => {
                    onForwardMessage(forwardingMessage, c._id);
                    setForwardingMessage(null);
                  }}
                  className="w-full p-2.5 hover:bg-[#202c33] rounded-xl flex items-center gap-3 text-left transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-white text-xs">
                    {c.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-[#e9edef] truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
