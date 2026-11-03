import React, { useState, useMemo } from 'react';
import { Search, Clock, Smile, Users, Heart, Coffee, Car, Trophy, Lightbulb, Flag, X } from 'lucide-react';

interface IosEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: Smile,
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇',
      '🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝',
      '🤑','🤗','🫣','🤭','🫢','🤫','🫡','🤔','💭','🤐','🤨','😐','😑','😶',
      '🫥','😏','😒','🙄','😬','🤥','🫨','😌','😔','😪','🤤','😴','😷','🤒',
      '🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','😵‍💫','🤯','🤠','🥳','🥸','😎',
      '🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦',
      '😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱',
      '😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','🤖'
    ]
  },
  {
    id: 'people',
    name: 'People & Gestures',
    icon: Users,
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞',
      '🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊',
      '🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾',
      '🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄',
      '👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','👮','🕵️',
      '🧑‍⚕️','🧑‍🎓','🧑‍🏫','🧑‍⚖️','🧑‍🌾','🧑‍🍳','🧑‍🔧','🧑‍🏭','🧑‍💼','🧑‍🔬','🧑‍💻','🧑‍🎤','🧑‍🎨','🧑‍✈️'
    ]
  },
  {
    id: 'hearts',
    name: 'Hearts & Symbols',
    icon: Heart,
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕',
      '💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯',
      '🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
      '♑','♒','♓','🆔','📳','📴','🔞','🔕','🔇','🔈','🔉','🔊','🔔','📣',
      '📢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🎯','🎲','🎱','🔮','🪄','🧿',
      '✨','⭐','🌟','💫','⚡','💥','🔥','💯','💢','💤','🎉','🎊','🎈','🎁'
    ]
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Coffee,
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭',
      '🍍','🥥','🥝','🍅','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄',
      '🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🥞','🧇','🥓',
      '🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔',
      '🥗','🥘','🫕','🍲','🥣','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍣',
      '🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯',
      '🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥤','🧋'
    ]
  },
  {
    id: 'activity',
    name: 'Activities & Sports',
    icon: Trophy,
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒',
      '🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹',
      '🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️',
      '🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅',
      '🎖️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎸'
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Nature',
    icon: Car,
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜',
      '🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚂','🚆','🚇','🚊','🚉','✈️','🛫',
      '🛬','🛸','🚀','🚁','🚤','⛴️','🚢','🏝️','🏖️','🏔️','🌋','🏕️','🏠','🏡',
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸',
      '🐵','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛',
      '🦋','🐌','🐞','🌸','🌹','🌺','🌻','🌼','🌷','🌱','🌲','🌳','🌴','🌵'
    ]
  },
  {
    id: 'objects',
    name: 'Objects & Flags',
    icon: Lightbulb,
    emojis: [
      '🇱🇰','🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏴‍☠️','🇺🇸','🇬🇧','🇮🇳','🇦🇺','🇨🇦','🇯🇵',
      '📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🕹️','💾','💿','📷','📸','📹','🎥',
      '📞','☎️','📟','📠','📺','📻','🎙️','⏱️','⏲️','⏰','🕰️','💡','🔦','🕯️',
      '💰','💵','💸','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🔩','⚙️'
    ]
  }
];

export default function IosEmojiPicker({ onSelectEmoji, onClose }: IosEmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [search, setSearch] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zavi_recent_emojis');
      return saved ? JSON.parse(saved) : ['❤️', '😂', '🔥', '😍', '👍', '🙏', '🥺', '🎉'];
    } catch {
      return ['❤️', '😂', '🔥', '😍', '👍', '🙏'];
    }
  });

  const handleEmojiClick = (emoji: string) => {
    // Update recent emojis
    const nextRecent = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 18);
    setRecentEmojis(nextRecent);
    try {
      localStorage.setItem('zavi_recent_emojis', JSON.stringify(nextRecent));
    } catch {}

    onSelectEmoji(emoji);
  };

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    const allList: string[] = [];
    EMOJI_CATEGORIES.forEach((cat) => {
      cat.emojis.forEach((e) => {
        if (!allList.includes(e)) allList.push(e);
      });
    });
    // Return all emojis or filter
    return allList;
  }, [search]);

  return (
    <div className="w-80 sm:w-96 bg-[#182229]/95 backdrop-blur-xl border border-[#2a3942] rounded-3xl shadow-2xl flex flex-col overflow-hidden select-none animate-in zoom-in-95 duration-150 z-50">
      
      {/* Search & Header */}
      <div className="p-3 border-b border-[#222d34] flex items-center gap-2">
        <div className="flex-1 relative flex items-center bg-[#202c33] rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884]">
          <Search className="w-4 h-4 text-[#8696a0] mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji..."
            className="w-full bg-transparent text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text',sans-serif]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-[#8696a0] hover:text-white p-0.5">
              ✕
            </button>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-white rounded-full">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Icons Bar */}
      {!search && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#111b21] border-b border-[#222d34] overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory('recent')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeCategory === 'recent' ? 'text-[#00a884] bg-[#202c33]' : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            title="Recently Used"
          >
            <Clock className="w-4 h-4" />
          </button>
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive ? 'text-[#00a884] bg-[#202c33]' : 'text-[#8696a0] hover:text-[#e9edef]'
                }`}
                title={cat.name}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emojis Grid Scroll Area */}
      <div className="h-64 overflow-y-auto p-3 scrollbar-thin">
        {search ? (
          <div>
            <h4 className="text-[11px] font-semibold text-[#8696a0] mb-2 uppercase tracking-wider">
              Search Results
            </h4>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 text-center">
              {filteredEmojis?.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-2xl hover:scale-130 active:scale-95 transition-transform rounded-xl hover:bg-[#202c33] cursor-pointer leading-none ios-emoji"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : activeCategory === 'recent' ? (
          <div>
            <h4 className="text-[11px] font-semibold text-[#8696a0] mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00a884]" />
              <span>Recently Used</span>
            </h4>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 text-center">
              {recentEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-2xl hover:scale-130 active:scale-95 transition-transform rounded-xl hover:bg-[#202c33] cursor-pointer leading-none ios-emoji"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {EMOJI_CATEGORIES.filter((c) => c.id === activeCategory).map((cat) => (
              <div key={cat.id}>
                <h4 className="text-[11px] font-semibold text-[#8696a0] mb-2 uppercase tracking-wider">
                  {cat.name}
                </h4>
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 text-center">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-2xl hover:scale-130 active:scale-95 transition-transform rounded-xl hover:bg-[#202c33] cursor-pointer leading-none ios-emoji"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
