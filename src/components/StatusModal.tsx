import React, { useState, useEffect, useRef } from 'react';
import { User, StatusUpdate, UserStatusGroup } from '../types';
import { 
  X, Plus, Camera, Type, Eye, ChevronLeft, ChevronRight, 
  Send, Sparkles, Clock, Check, Heart, MessageCircle, BadgeCheck, Smile 
} from 'lucide-react';
import IosEmojiPicker from './IosEmojiPicker';

interface StatusModalProps {
  currentUser: User;
  onClose: () => void;
  onStatusCreated: () => void;
}

const BG_COLORS = [
  '#128c7e', '#075e54', '#0d6efd', '#6f42c1', '#d63384', 
  '#dc3545', '#fd7e14', '#198754', '#202c33', '#000000'
];

const STATUS_REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '😍', '👍'];

export default function StatusModal({ currentUser, onClose, onStatusCreated }: StatusModalProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create_text' | 'create_image' | 'viewing'>('list');
  const [myStatuses, setMyStatuses] = useState<StatusUpdate[]>([]);
  const [recentGroups, setRecentGroups] = useState<UserStatusGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Status creation states
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Status viewer states
  const [activeGroup, setActiveGroup] = useState<UserStatusGroup | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [showViewersList, setShowViewersList] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const progressTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/status?userId=${currentUser._id}`);
      const data = await res.json();
      setMyStatuses(data.myStatuses || []);
      setRecentGroups(data.recentUpdates || []);
    } catch (err) {
      console.error('Error fetching statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [currentUser._id]);

  useEffect(() => {
    if (viewMode === 'viewing' && activeGroup && !showComments && !showViewersList) {
      const currentStatus = activeGroup.statuses[activeStatusIndex];
      if (currentStatus) {
        fetch(`/api/status/${currentStatus._id}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser._id, userName: currentUser.displayName })
        }).catch(() => {});
      }

      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      progressTimerRef.current = setTimeout(() => {
        handleNextStatus();
      }, 5000);
    }

    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [viewMode, activeGroup, activeStatusIndex, showComments, showViewersList]);

  const handleNextStatus = () => {
    if (!activeGroup) return;
    if (activeStatusIndex < activeGroup.statuses.length - 1) {
      setActiveStatusIndex((prev) => prev + 1);
    } else {
      const currentIndex = recentGroups.findIndex(g => g.userId === activeGroup.userId);
      if (currentIndex !== -1 && currentIndex < recentGroups.length - 1) {
        setActiveGroup(recentGroups[currentIndex + 1]);
        setActiveStatusIndex(0);
      } else {
        setViewMode('list');
      }
    }
  };

  const handlePrevStatus = () => {
    if (activeStatusIndex > 0) {
      setActiveStatusIndex((prev) => prev - 1);
    } else {
      setViewMode('list');
    }
  };

  const handleOpenViewer = (group: UserStatusGroup) => {
    setActiveGroup(group);
    setActiveStatusIndex(0);
    setShowViewersList(false);
    setShowComments(false);
    setViewMode('viewing');
  };

  const handleOpenMyViewer = () => {
    if (myStatuses.length === 0) {
      setViewMode('create_text');
      return;
    }
    setActiveGroup({
      userId: currentUser._id,
      userName: 'My status',
      userAvatar: currentUser.avatar,
      hasVerifiedBadge: currentUser.hasVerifiedBadge,
      statuses: myStatuses,
      allViewed: true,
      updatedAt: myStatuses[0]?.createdAt || ''
    });
    setActiveStatusIndex(0);
    setShowViewersList(false);
    setShowComments(false);
    setViewMode('viewing');
  };

  const handleReactStatus = async (emoji: string) => {
    if (!activeGroup) return;
    const currentStatus = activeGroup.statuses[activeStatusIndex];
    if (!currentStatus) return;

    try {
      const res = await fetch(`/api/status/${currentStatus._id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, emoji })
      });
      const data = await res.json();
      if (data.reactions) {
        currentStatus.reactions = data.reactions;
        setActiveGroup({ ...activeGroup });
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !commentInput.trim()) return;
    const currentStatus = activeGroup.statuses[activeStatusIndex];
    if (!currentStatus) return;

    const text = commentInput.trim();
    setCommentInput('');

    try {
      const res = await fetch(`/api/status/${currentStatus._id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          userName: currentUser.displayName,
          userAvatar: currentUser.avatar || '',
          text
        })
      });
      const data = await res.json();
      if (data.comment) {
        currentStatus.comments = [...(currentStatus.comments || []), data.comment];
        setActiveGroup({ ...activeGroup });
      }

      // Also create a direct message reply to the creator
      if (activeGroup.userId !== currentUser._id) {
        const directChatRes = await fetch('/api/chats/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentUserId: currentUser._id, targetUserId: activeGroup.userId })
        });
        const chatData = await directChatRes.json();
        if (chatData.chat) {
          await fetch(`/api/chats/${chatData.chat._id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: currentUser._id,
              senderName: currentUser.displayName,
              text: `Replied to your status: "${text}"`,
              type: 'text'
            })
          });
        }
      }
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  const handleCreateTextStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          userName: currentUser.displayName,
          userAvatar: currentUser.avatar || '',
          hasVerifiedBadge: currentUser.hasVerifiedBadge,
          type: 'text',
          content: textContent.trim(),
          background: selectedBg
        })
      });

      if (res.ok) {
        setTextContent('');
        setViewMode('list');
        fetchStatuses();
        onStatusCreated();
      }
    } catch (err) {
      console.error('Failed to create status:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageFile(reader.result as string);
      setViewMode('create_image');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateImageStatus = async () => {
    if (!imageFile) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          userName: currentUser.displayName,
          userAvatar: currentUser.avatar || '',
          hasVerifiedBadge: currentUser.hasVerifiedBadge,
          type: 'image',
          content: imageFile,
          caption: imageCaption.trim()
        })
      });

      if (res.ok) {
        setImageFile(null);
        setImageCaption('');
        setViewMode('list');
        fetchStatuses();
        onStatusCreated();
      }
    } catch (err) {
      console.error('Failed to upload image status:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = activeGroup?.statuses[activeStatusIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 select-none">
      <div className="w-full max-w-lg h-[90vh] max-h-[680px] bg-[#111b21] rounded-3xl overflow-hidden border border-[#222d34] flex flex-col shadow-2xl relative">
        
        {/* VIEWING STATUS (Stories Player) */}
        {viewMode === 'viewing' && activeGroup && (
          <div className="w-full h-full flex flex-col relative select-none">
            {/* Progress Bars */}
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
              {activeGroup.statuses.map((s, idx) => (
                <div key={s._id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${
                      idx < activeStatusIndex
                        ? 'w-full'
                        : idx === activeStatusIndex
                        ? 'w-full animate-[progress_5s_linear]'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* User Info Bar */}
            <div className="absolute top-7 left-4 right-4 z-30 flex items-center justify-between text-white drop-shadow">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-sm font-bold border border-white/40">
                  {activeGroup.userAvatar ? (
                    <img src={activeGroup.userAvatar} alt={activeGroup.userName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{activeGroup.userName.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-sm font-semibold leading-tight">{activeGroup.userName}</h4>
                    {activeGroup.hasVerifiedBadge && (
                      <BadgeCheck className="w-3.5 h-3.5 text-[#00a884] fill-[#00a884]/20" />
                    )}
                  </div>
                  <span className="text-[11px] text-white/80">
                    {new Date(currentStatus?.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 text-white/80 hover:text-white rounded-full bg-black/30 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Content */}
            {currentStatus?.type === 'image' ? (
              <div className="flex-1 w-full h-full relative flex items-center justify-center bg-black">
                <img
                  src={currentStatus.content}
                  alt="Status"
                  className="w-full h-full object-contain"
                />
                {currentStatus.caption && (
                  <div className="absolute bottom-20 left-4 right-4 text-center bg-black/60 backdrop-blur-sm p-3 rounded-xl text-white text-sm">
                    {currentStatus.caption}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex-1 w-full h-full flex items-center justify-center p-8 text-center"
                style={{ backgroundColor: currentStatus?.background || '#128c7e' }}
              >
                <p className="text-2xl md:text-3xl font-medium text-white break-words max-w-sm drop-shadow-md leading-relaxed">
                  {currentStatus?.content}
                </p>
              </div>
            )}

            {/* Navigation Click Zones */}
            <div onClick={handlePrevStatus} className="absolute left-0 top-16 bottom-20 w-1/3 cursor-pointer z-20" />
            <div onClick={handleNextStatus} className="absolute right-0 top-16 bottom-20 w-1/3 cursor-pointer z-20" />

            {/* Bottom Actions Bar (Likes, Comments & Views) */}
            <div className="absolute bottom-3 left-4 right-4 z-30 flex items-center justify-between">
              
              {/* If my status, show viewers */}
              {activeGroup.userId === currentUser._id ? (
                <button
                  onClick={() => setShowViewersList(!showViewersList)}
                  className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white text-xs flex items-center gap-2 hover:bg-black/80 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#00a884]" />
                  <span>{currentStatus?.viewers?.length || 0} views</span>
                </button>
              ) : (
                /* Viewer Reactions & Comment Bar */
                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full">
                    {STATUS_REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReactStatus(emoji)}
                        className="text-lg hover:scale-130 transition-transform cursor-pointer px-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowComments(!showComments)}
                    className="p-2.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 cursor-pointer ml-auto"
                    title="Reply to status"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Comments Popup Drawer */}
            {showComments && (
              <div className="absolute inset-x-0 bottom-0 max-h-[70%] bg-[#111b21] rounded-t-3xl p-4 z-40 border-t border-[#222d34] flex flex-col shadow-2xl animate-in slide-in-from-bottom">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-[#e9edef] flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#00a884]" />
                    <span>Comments & Replies ({currentStatus?.comments?.length || 0})</span>
                  </h4>
                  <button onClick={() => setShowComments(false)} className="text-[#8696a0] hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                  {(currentStatus?.comments || []).length === 0 ? (
                    <p className="text-xs text-[#8696a0] text-center py-4">No comments yet. Send a reply!</p>
                  ) : (
                    currentStatus?.comments?.map((c) => (
                      <div key={c.id} className="p-2.5 bg-[#202c33] rounded-xl text-xs">
                        <span className="font-semibold text-[#00a884]">{c.userName}</span>
                        <p className="text-[#e9edef] mt-0.5">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Reply to this status..."
                    className="flex-1 bg-[#202c33] text-xs text-[#e9edef] px-3 py-2 rounded-xl focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#00a884] text-white rounded-xl cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Viewers Modal */}
            {showViewersList && (
              <div className="absolute inset-x-0 bottom-0 max-h-[60%] bg-[#111b21] rounded-t-3xl p-4 z-40 border-t border-[#222d34] overflow-y-auto animate-in slide-in-from-bottom">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-[#e9edef] flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#00a884]" />
                    <span>Viewed by ({currentStatus?.viewers?.length || 0})</span>
                  </h4>
                  <button onClick={() => setShowViewersList(false)} className="text-[#8696a0] hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {currentStatus?.viewers?.length === 0 ? (
                  <p className="text-xs text-[#8696a0] text-center py-4">No views yet.</p>
                ) : (
                  <div className="divide-y divide-[#222d34]">
                    {currentStatus?.viewers?.map((v, i) => (
                      <div key={i} className="py-2 flex items-center justify-between text-xs">
                        <span className="text-[#e9edef] font-medium">{v.userName}</span>
                        <span className="text-[#8696a0]">
                          {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CREATE TEXT STATUS */}
        {viewMode === 'create_text' && (
          <form
            onSubmit={handleCreateTextStatus}
            className="w-full h-full flex flex-col p-6 transition-colors"
            style={{ backgroundColor: selectedBg }}
          >
            <div className="flex items-center justify-between text-white mb-4">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2 bg-black/20 hover:bg-black/40 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-semibold tracking-wide uppercase">New Text Status</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-full cursor-pointer transition-colors ${showEmojiPicker ? 'bg-black text-[#00a884]' : 'bg-black/20 hover:bg-black/40 text-white'}`}
                  title="iOS Emoji Picker"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={submitting || !textContent.trim()}
                  className="p-2 bg-[#00a884] hover:bg-[#02906f] text-white rounded-full shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type a status..."
                maxLength={300}
                className="w-full bg-transparent text-white text-2xl md:text-3xl font-medium text-center placeholder-white/50 focus:outline-none resize-none leading-relaxed"
                rows={5}
                autoFocus
              />

              {showEmojiPicker && (
                <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center shadow-2xl animate-in zoom-in-95">
                  <IosEmojiPicker
                    onSelectEmoji={(emoji) => setTextContent(prev => prev + emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 py-3 overflow-x-auto">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedBg(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    selectedBg === c ? 'scale-125 border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </form>
        )}

        {/* CREATE IMAGE STATUS */}
        {viewMode === 'create_image' && imageFile && (
          <div className="w-full h-full flex flex-col bg-black">
            <div className="p-4 flex items-center justify-between text-white z-10">
              <button
                onClick={() => { setImageFile(null); setViewMode('list'); }}
                className="p-2 bg-black/40 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-semibold uppercase">Send Photo Status</span>
              <button
                onClick={handleCreateImageStatus}
                disabled={submitting}
                className="p-2 bg-[#00a884] hover:bg-[#02906f] text-white rounded-full shadow-lg cursor-pointer"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              <img src={imageFile} alt="Preview" className="max-h-[60vh] object-contain rounded-2xl" />
            </div>

            <div className="p-4 bg-[#111b21] flex items-center gap-2">
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Add a caption..."
                className="flex-1 bg-[#202c33] text-sm text-[#e9edef] px-4 py-2.5 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STATUS LIST */}
        {viewMode === 'list' && (
          <div className="w-full h-full flex flex-col">
            <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34]">
              <h3 className="text-base font-bold text-[#e9edef]">Status Updates</h3>
              <button
                onClick={onClose}
                className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {/* My Status */}
              <div className="flex items-center justify-between p-3 bg-[#202c33] rounded-2xl border border-[#2a3942]">
                <div 
                  onClick={handleOpenMyViewer}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white font-semibold border-2 border-[#00a884]">
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                      ) : (
                        <span>{currentUser.displayName.charAt(0)}</span>
                      )}
                    </div>
                    {myStatuses.length === 0 && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#00a884] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        +
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">My status</h4>
                    <p className="text-xs text-[#8696a0]">
                      {myStatuses.length > 0
                        ? `${myStatuses.length} updates • Tap to view`
                        : 'Tap to add status update'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setViewMode('create_text')}
                    className="p-2.5 bg-[#2a3942] hover:bg-[#374248] text-[#e9edef] rounded-full transition-colors cursor-pointer"
                    title="Write text status"
                  >
                    <Type className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelected}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-[#00a884] hover:bg-[#02906f] text-white rounded-full transition-colors cursor-pointer shadow"
                    title="Upload photo status"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Recent Updates */}
              <div>
                <h4 className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-3">
                  Recent updates ({recentGroups.length})
                </h4>

                {recentGroups.length === 0 ? (
                  <div className="p-6 text-center text-[#8696a0] text-xs bg-[#202c33]/40 rounded-2xl">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-[#8696a0]" />
                    <p>No recent status updates from your contacts.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentGroups.map((group) => (
                      <div
                        key={group.userId}
                        onClick={() => handleOpenViewer(group)}
                        className="flex items-center gap-3 p-2.5 hover:bg-[#202c33] rounded-2xl cursor-pointer transition-colors"
                      >
                        <div className={`w-12 h-12 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white font-semibold border-2 ${
                          group.allViewed ? 'border-[#8696a0]' : 'border-[#00a884]'
                        }`}>
                          {group.userAvatar ? (
                            <img src={group.userAvatar} alt={group.userName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{group.userName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="text-sm font-semibold text-[#e9edef] truncate">{group.userName}</h4>
                            {group.hasVerifiedBadge && (
                              <BadgeCheck className="w-3.5 h-3.5 text-[#00a884] fill-[#00a884]/20" />
                            )}
                          </div>
                          <span className="text-xs text-[#8696a0]">
                            {new Date(group.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
