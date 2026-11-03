import React, { useState, useEffect } from 'react';
import { User, Chat } from '../types';
import { X, Users, Radio, Check, Camera } from 'lucide-react';

interface NewGroupModalProps {
  currentUser: User;
  onClose: () => void;
  onGroupCreated: (chat: Chat) => void;
}

export default function NewGroupModal({
  currentUser,
  onClose,
  onGroupCreated,
}: NewGroupModalProps) {
  const [type, setType] = useState<'group' | 'channel'>('group');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const res = await fetch(`/api/users?currentUserId=${currentUser._id}`);
        const data = await res.json();
        setAvailableUsers(data.users || []);
      } catch (err) {
        console.error('Error fetching users for group:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [currentUser._id]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/chats/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          avatar,
          type,
          creatorId: currentUser._id,
          participantIds: selectedUserIds
        })
      });

      const data = await res.json();
      if (data.chat) {
        onGroupCreated(data.chat);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create group/channel:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] rounded-2xl border border-[#222d34] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34]">
          <h3 className="text-base font-semibold text-[#e9edef]">
            {type === 'group' ? 'New Group' : 'New Channel'}
          </h3>
          <button onClick={onClose} className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tab Toggle: Group vs Channel */}
        <div className="flex border-b border-[#222d34] bg-[#111b21]">
          <button
            type="button"
            onClick={() => setType('group')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
              type === 'group'
                ? 'border-[#00a884] text-[#00a884] bg-[#202c33]/40'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Group</span>
          </button>
          <button
            type="button"
            onClick={() => setType('channel')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
              type === 'channel'
                ? 'border-[#00a884] text-[#00a884] bg-[#202c33]/40'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Channel</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#202c33] border-2 border-[#2a3942] flex items-center justify-center text-white">
                {avatar ? (
                  <img src={avatar} alt="Group icon" className="w-full h-full object-cover" />
                ) : type === 'group' ? (
                  <Users className="w-8 h-8 text-[#8696a0]" />
                ) : (
                  <Radio className="w-8 h-8 text-[#8696a0]" />
                )}
              </div>
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full cursor-pointer transition-opacity">
                <Camera className="w-5 h-5 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            <div className="flex-1">
              <label className="block text-xs text-[#8696a0] mb-1">
                {type === 'group' ? 'Group Name' : 'Channel Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Friends & Family"
                className="w-full px-3 py-2 bg-[#202c33] text-[#e9edef] rounded-lg border border-[#2a3942] focus:border-[#00a884] focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8696a0] mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this for?"
              className="w-full px-3 py-2 bg-[#202c33] text-[#e9edef] rounded-lg border border-[#2a3942] focus:border-[#00a884] focus:outline-none text-sm"
            />
          </div>

          {/* Add Members Section */}
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-2">
              Add Members ({selectedUserIds.length} selected)
            </label>

            {loading ? (
              <p className="text-xs text-[#8696a0]">Loading members...</p>
            ) : availableUsers.length === 0 ? (
              <p className="text-xs text-[#8696a0]">No other registered users available.</p>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto divide-y divide-[#222d34]/40">
                {availableUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleUser(u._id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#00a884]/20' : 'hover:bg-[#202c33]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white text-xs font-bold">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{u.displayName.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-[#e9edef]">{u.displayName}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected ? 'bg-[#00a884] border-[#00a884] text-white' : 'border-[#8696a0]'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full py-2.5 bg-[#00a884] hover:bg-[#02906f] text-white font-medium rounded-lg shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating...' : type === 'group' ? 'Create Group' : 'Create Channel'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
