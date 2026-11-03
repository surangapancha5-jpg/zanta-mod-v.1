import React, { useState, useEffect } from 'react';
import { User, Chat } from '../types';
import { X, Search, UserPlus, Users, Sparkles, MessageCircle } from 'lucide-react';

interface NewChatModalProps {
  currentUser: User;
  onClose: () => void;
  onChatSelected: (chat: Chat) => void;
  onOpenNewGroup: () => void;
}

export default function NewChatModal({
  currentUser,
  onClose,
  onChatSelected,
  onOpenNewGroup,
}: NewChatModalProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const res = await fetch(`/api/users?currentUserId=${currentUser._id}&q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchUsers, 200);
    return () => clearTimeout(timer);
  }, [search, currentUser._id]);

  const handleStartChat = async (targetUser: User) => {
    setCreating(true);
    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser._id,
          targetUserId: targetUser._id
        })
      });

      const data = await res.json();
      if (data.chat) {
        onChatSelected(data.chat);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] rounded-2xl border border-[#222d34] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34]">
          <h3 className="text-base font-semibold text-[#e9edef]">New Chat</h3>
          <button onClick={onClose} className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Search */}
        <div className="p-3 bg-[#111b21] border-b border-[#222d34]">
          <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-[#8696a0] mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search real contacts by name, email, or phone..."
              className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* New Group & Channel Shortcuts */}
        <div className="p-2 bg-[#111b21] border-b border-[#222d34] space-y-1">
          <button
            onClick={() => { onClose(); onOpenNewGroup(); }}
            className="w-full p-2.5 hover:bg-[#202c33] rounded-xl flex items-center gap-3 text-left transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#e9edef]">New Group</h4>
              <p className="text-xs text-[#8696a0]">Create a group with registered members</p>
            </div>
          </button>
        </div>

        {/* Real Users List */}
        <div className="flex-1 overflow-y-auto p-2">
          <h4 className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider px-3 py-2">
            Real Registered Users ({users.length})
          </h4>

          {loading ? (
            <div className="p-8 text-center text-[#8696a0]">
              <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading registered users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-[#8696a0] text-xs">
              <p>කිසිදු ලියාපදිංචි පරිශීලකයෙකු හමු නොවීය.</p>
              <p className="mt-1">No registered users found matching &quot;{search}&quot;</p>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((u) => (
                <div
                  key={u._id}
                  onClick={() => handleStartChat(u)}
                  className="flex items-center gap-3 p-2.5 hover:bg-[#202c33] rounded-xl cursor-pointer transition-colors"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white font-semibold shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{u.displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#e9edef] truncate">{u.displayName}</h4>
                    <p className="text-xs text-[#8696a0] truncate">{u.about || u.phone}</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-[#00a884] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
