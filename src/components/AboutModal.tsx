import React from 'react';
import { X, ShieldCheck, Phone, User, CheckCircle2, BadgeCheck } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

const APP_LOGO = 'https://cdn.imagetourls.com/uploads/tyImg/Y6a8BZUa.png';

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-[#111b21] rounded-3xl border border-[#222d34] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34]">
          <h3 className="text-base font-semibold text-[#e9edef]">App Info & Developer</h3>
          <button onClick={onClose} className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Body */}
        <div className="p-6 text-center space-y-5">
          
          {/* Logo */}
          <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg p-2.5">
            <img src={APP_LOGO} alt="zavi chats" className="w-full h-full object-contain" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-xl font-bold text-[#e9edef]">zavi chats</h2>
              <BadgeCheck className="w-5 h-5 text-[#00a884] fill-[#00a884]/20" />
            </div>
            <p className="text-xs text-[#8696a0] mt-1 font-mono">Version 1.0.0 (Production Release)</p>
          </div>

          {/* Developer Details */}
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#8696a0] block uppercase tracking-wider font-semibold">
                  Developer & Creator
                </span>
                <span className="text-sm font-bold text-[#e9edef] flex items-center gap-1">
                  Suranga Chamith
                  <BadgeCheck className="w-4 h-4 text-[#00a884] inline fill-[#00a884]/20" />
                </span>
              </div>
            </div>

            <div className="h-px bg-[#2a3942]" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-[#8696a0] block uppercase tracking-wider font-semibold">
                    Developer Contact
                  </span>
                  <a
                    href="tel:94760879639"
                    className="text-sm font-mono font-bold text-[#00a884] hover:underline"
                  >
                    +94 76 087 9639
                  </a>
                </div>
              </div>

              <a
                href="tel:94760879639"
                className="px-3.5 py-1.5 bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-semibold rounded-xl shadow transition-colors"
              >
                Call
              </a>
            </div>
          </div>

          {/* Features highlight */}
          <div className="text-xs text-[#8696a0] space-y-1.5 text-left bg-[#182229] p-3.5 rounded-2xl border border-[#222d34]">
            <div className="flex items-center gap-2 text-[#e9edef]">
              <CheckCircle2 className="w-4 h-4 text-[#00a884] shrink-0" />
              <span>Real-time private messaging with double blue ticks</span>
            </div>
            <div className="flex items-center gap-2 text-[#e9edef]">
              <CheckCircle2 className="w-4 h-4 text-[#00a884] shrink-0" />
              <span>Private Zanta AI Companion & Song Bot (YouTube MP3)</span>
            </div>
            <div className="flex items-center gap-2 text-[#e9edef]">
              <CheckCircle2 className="w-4 h-4 text-[#00a884] shrink-0" />
              <span>Custom Photo Stickers & Reactions</span>
            </div>
            <div className="flex items-center gap-2 text-[#e9edef]">
              <CheckCircle2 className="w-4 h-4 text-[#00a884] shrink-0" />
              <span>Voice notes, Live Calls with Missed Call Log Box</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-[#8696a0] pt-2">
            <ShieldCheck className="w-4 h-4 text-[#00a884]" />
            <span>zavi chats • Privacy Protected & Verified Platform</span>
          </div>
        </div>

      </div>
    </div>
  );
}
