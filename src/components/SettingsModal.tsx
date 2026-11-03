import React, { useState } from 'react';
import { User } from '../types';
import { 
  X, Camera, User as UserIcon, Info, Image as ImageIcon, 
  Check, Save, Sparkles, Moon, Sun, Palette, Smartphone 
} from 'lucide-react';

interface SettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onUpdateUser: (updatedData: Partial<User>) => void;
}

const PRESET_WALLPAPERS = [
  { id: '', name: 'WhatsApp Classic Doodle', color: '#0b141a' },
  { id: 'solid_teal', name: 'Emerald Teal', color: '#0c2420' },
  { id: 'solid_navy', name: 'Midnight Navy', color: '#0b192c' },
  { id: 'solid_graphite', name: 'Dark Graphite', color: '#161b22' },
  { id: 'solid_purple', name: 'Deep Violet', color: '#1a102f' },
  { id: 'solid_slate', name: 'Dark Slate', color: '#1f2937' },
];

export default function SettingsModal({
  currentUser,
  onClose,
  onUpdateUser,
}: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [about, setAbout] = useState(currentUser.about || 'Hey there! I am using WhatsApp.');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [customWallpaper, setCustomWallpaper] = useState(currentUser.customWallpaper || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleDpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCustomWallpaper(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch(`/api/users/${currentUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          about: about.trim(),
          avatar,
          customWallpaper
        })
      });

      if (res.ok) {
        onUpdateUser({
          displayName: displayName.trim(),
          about: about.trim(),
          avatar,
          customWallpaper
        });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] rounded-2xl border border-[#222d34] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34]">
          <h3 className="text-base font-semibold text-[#e9edef]">Profile & Chat Settings</h3>
          <button onClick={onClose} className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Profile DP Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-[#202c33] border-4 border-[#2a3942] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {avatar ? (
                  <img src={avatar} alt="Profile DP" className="w-full h-full object-cover" />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <label 
                className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs"
                title="Change Profile Photo"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span>CHANGE DP</span>
                <input type="file" accept="image/*" onChange={handleDpUpload} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-[#8696a0] mt-2">Tap photo to upload custom DP from your device</p>
          </div>

          {/* User Display Name */}
          <div>
            <label className="block text-xs font-semibold text-[#00a884] uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-9 pr-3 py-2 bg-[#202c33] text-[#e9edef] rounded-lg border border-[#2a3942] focus:border-[#00a884] focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* About Status */}
          <div>
            <label className="block text-xs font-semibold text-[#00a884] uppercase tracking-wider mb-1.5">
              About
            </label>
            <div className="relative">
              <Info className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
              <input
                type="text"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Hey there! I am using WhatsApp."
                className="w-full pl-9 pr-3 py-2 bg-[#202c33] text-[#e9edef] rounded-lg border border-[#2a3942] focus:border-[#00a884] focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Custom Chat Wallpaper Section */}
          <div className="pt-2 border-t border-[#222d34]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4" />
                <span>Chat Wallpaper</span>
              </label>

              {/* Upload Wallpaper from device */}
              <label className="text-xs bg-[#2a3942] hover:bg-[#374248] text-[#e9edef] px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                <Smartphone className="w-3.5 h-3.5 text-[#00a884]" />
                <span>Upload from phone</span>
                <input type="file" accept="image/*" onChange={handleWallpaperUpload} className="hidden" />
              </label>
            </div>

            {/* Custom image preview if uploaded */}
            {customWallpaper && (
              <div className="relative mb-3 h-20 rounded-xl overflow-hidden border border-[#00a884]">
                <img src={customWallpaper} alt="Custom Wallpaper" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCustomWallpaper('')}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full text-xs"
                >
                  ✕ Remove
                </button>
              </div>
            )}

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-2">
              {PRESET_WALLPAPERS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => setCustomWallpaper(wp.id)}
                  className={`h-14 rounded-lg border p-1 text-left flex flex-col justify-end transition-all cursor-pointer ${
                    customWallpaper === wp.id ? 'border-[#00a884] ring-2 ring-[#00a884]/40' : 'border-[#2a3942]'
                  }`}
                  style={{ backgroundColor: wp.color }}
                >
                  <span className="text-[10px] text-white/90 font-medium truncate block bg-black/40 px-1 rounded">
                    {wp.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#00a884] hover:bg-[#02906f] text-white font-medium rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
