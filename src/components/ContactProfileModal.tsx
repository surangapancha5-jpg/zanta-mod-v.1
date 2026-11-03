import React, { useState, useEffect } from 'react';
import { User, StatusUpdate } from '../types';
import { 
  X, Phone, Video, MessageSquare, Edit3, Check, 
  BadgeCheck, Info, Mail, AtSign, Radio, Clock, ShieldCheck 
} from 'lucide-react';

interface ContactProfileModalProps {
  targetUserId: string;
  currentUserId: string;
  onClose: () => void;
  onStartCall: (isVideo: boolean) => void;
  onOpenStatusViewer?: (statuses: StatusUpdate[], userName: string, userAvatar?: string) => void;
  onContactNameUpdated: (targetUserId: string, newSavedName: string) => void;
}

export default function ContactProfileModal({
  targetUserId,
  currentUserId,
  onClose,
  onStartCall,
  onOpenStatusViewer,
  onContactNameUpdated,
}: ContactProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [statuses, setStatuses] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savedNameInput, setSavedNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showFullDp, setShowFullDp] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${targetUserId}/details?requesterId=${currentUserId}`);
        const data = await res.json();
        if (data.user) {
          setProfile(data.user);
          setSavedNameInput(data.user.savedName || data.user.displayName || '');
          setStatuses(data.statuses || []);
        }
      } catch (err) {
        console.error('Error fetching contact details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (targetUserId) {
      fetchDetails();
    }
  }, [targetUserId, currentUserId]);

  const handleSaveContactName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const res = await fetch(`/api/users/${currentUserId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          savedName: savedNameInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev: any) => ({ ...prev, savedName: data.savedName }));
        setIsEditingName(false);
        onContactNameUpdated(targetUserId, data.savedName);
      }
    } catch (err) {
      console.error('Failed to save contact name:', err);
    } finally {
      setSavingName(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-[#111b21] rounded-3xl p-8 border border-[#222d34] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-[#8696a0]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const displayName = profile.savedName || profile.displayName || profile.username;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 select-none">
      <div className="w-full max-w-md bg-[#111b21] rounded-3xl border border-[#222d34] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34]">
          <h3 className="text-sm font-semibold text-[#e9edef]">Contact Info</h3>
          <button onClick={onClose} className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center">
            <div 
              onClick={() => profile.avatar && setShowFullDp(true)}
              className="relative cursor-pointer group mb-3"
              title="Click to view full photo"
            >
              <div className={`w-28 h-28 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 ${statuses.length > 0 ? 'border-[#00a884]' : 'border-[#2a3942]'}`}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {statuses.length > 0 && (
                <span className="absolute bottom-1 right-1 w-6 h-6 bg-[#00a884] rounded-full border-2 border-[#111b21] flex items-center justify-center text-[10px] text-white font-bold" title="Has active status updates">
                  <Radio className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Name & Saved Name */}
            {isEditingName ? (
              <form onSubmit={handleSaveContactName} className="flex items-center gap-2 w-full max-w-xs mb-1">
                <input
                  type="text"
                  required
                  value={savedNameInput}
                  onChange={(e) => setSavedNameInput(e.target.value)}
                  placeholder="Enter custom contact name..."
                  className="flex-1 px-3 py-1.5 bg-[#202c33] text-sm text-[#e9edef] rounded-xl border border-[#00a884] focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={savingName}
                  className="p-2 bg-[#00a884] text-white rounded-xl cursor-pointer"
                  title="Save name"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-2 bg-[#2a3942] text-[#8696a0] hover:text-white rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-[#e9edef] flex items-center gap-1.5">
                  <span>{displayName}</span>
                  {profile.hasVerifiedBadge && (
                    <span title="Verified Account">
                      <BadgeCheck className="w-5 h-5 text-[#00a884] fill-[#00a884]/20" />
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-[#202c33] transition-colors cursor-pointer"
                  title="Save or edit custom contact name"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Original username subtitle if saved under custom name */}
            {profile.savedName && profile.savedName !== profile.displayName && (
              <span className="text-xs text-[#8696a0]">
                Original: {profile.displayName} (@{profile.username})
              </span>
            )}

            <p className="text-xs text-[#00a884] font-medium mt-1">{profile.phone}</p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-4 py-2 border-y border-[#222d34]">
            <button
              onClick={() => onStartCall(false)}
              className="flex-1 py-2.5 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Phone className="w-4 h-4 text-[#00a884]" />
              <span className="text-[11px] font-medium">Audio Call</span>
            </button>

            <button
              onClick={() => onStartCall(true)}
              className="flex-1 py-2.5 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Video className="w-4 h-4 text-[#00a884]" />
              <span className="text-[11px] font-medium">Video Call</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#00a884]" />
              <span className="text-[11px] font-medium">Message</span>
            </button>
          </div>

          {/* Active Status Updates Preview */}
          {statuses.length > 0 && (
            <div className="bg-[#202c33] p-3.5 rounded-2xl border border-[#2a3942]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#00a884] uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Active Status ({statuses.length})</span>
                </span>
                <span className="text-[11px] text-[#8696a0]">Expires in 24h</span>
              </div>

              <div 
                onClick={() => onOpenStatusViewer?.(statuses, displayName, profile.avatar)}
                className="p-2.5 bg-[#182229] hover:bg-[#1f2c34] rounded-xl flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[#00a884] overflow-hidden flex items-center justify-center bg-[#2a3942] text-xs font-bold text-white">
                    {statuses[0]?.type === 'image' ? (
                      <img src={statuses[0].content} alt="Status thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <span>Aa</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-[#e9edef]">
                      {statuses[0]?.type === 'text' ? statuses[0].content : statuses[0]?.caption || 'Photo status'}
                    </h4>
                    <span className="text-[10px] text-[#8696a0]">
                      {new Date(statuses[0]?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[#00a884] font-medium">View</span>
              </div>
            </div>
          )}

          {/* Account Details Cards */}
          <div className="space-y-2.5 text-xs">
            {/* About / Bio */}
            <div className="bg-[#202c33] p-3.5 rounded-2xl border border-[#2a3942]">
              <span className="text-[11px] font-semibold text-[#8696a0] block uppercase tracking-wider mb-1">
                About & Status
              </span>
              <p className="text-sm text-[#e9edef] leading-relaxed">
                {profile.about || 'Hey there! I am using zavi chats.'}
              </p>
            </div>

            {/* Contact Details */}
            <div className="bg-[#202c33] p-3.5 rounded-2xl border border-[#2a3942] space-y-2.5">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#8696a0]" />
                <div>
                  <span className="text-[10px] text-[#8696a0] block">Phone Number</span>
                  <span className="text-xs font-mono font-medium text-[#e9edef]">{profile.phone}</span>
                </div>
              </div>

              <div className="h-px bg-[#2a3942]" />

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#8696a0]" />
                <div>
                  <span className="text-[10px] text-[#8696a0] block">Email Address</span>
                  <span className="text-xs font-medium text-[#e9edef]">{profile.email}</span>
                </div>
              </div>

              <div className="h-px bg-[#2a3942]" />

              <div className="flex items-center gap-3">
                <AtSign className="w-4 h-4 text-[#8696a0]" />
                <div>
                  <span className="text-[10px] text-[#8696a0] block">Username</span>
                  <span className="text-xs font-medium text-[#e9edef]">@{profile.username}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-[#8696a0] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
            <span>zavi chats verified user profile</span>
          </div>

        </div>

      </div>

      {/* Full DP Zoom Lightbox */}
      {showFullDp && profile.avatar && (
        <div 
          onClick={() => setShowFullDp(false)}
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={profile.avatar} alt={displayName} className="max-h-[85vh] max-w-[90vw] object-contain rounded-3xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
