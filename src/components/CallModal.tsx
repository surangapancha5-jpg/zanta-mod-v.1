import React, { useState, useEffect, useRef } from 'react';
import { CallData, User } from '../types';
import { getSocket } from '../services/socket';
import { startRingtone, stopRingtone } from '../utils/audio';
import { 
  Phone, Video, Mic, MicOff, VideoOff, PhoneOff, 
  Volume2, Maximize2, ShieldCheck, BadgeCheck 
} from 'lucide-react';

interface CallModalProps {
  callData: CallData;
  currentUser: User;
  onEndCall: (isMissed?: boolean) => void;
  onAcceptCall: () => void;
}

export default function CallModal({
  callData,
  currentUser,
  onEndCall,
  onAcceptCall,
}: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!callData.isVideo);
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<any>(null);

  // Play ringtone on incoming call or outgoing call ringing
  useEffect(() => {
    if (callData.status === 'ringing') {
      startRingtone();
    } else {
      stopRingtone();
    }

    return () => {
      stopRingtone();
    };
  }, [callData.status]);

  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callData.isVideo ? { facingMode: 'user' } : false,
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current && callData.isVideo) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        const socket = getSocket();
        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('call:signal', {
              toUserId: callData.otherUser._id,
              signal: { type: 'candidate', candidate: event.candidate }
            });
          }
        };

        if (socket) {
          socket.on('call:signal', async ({ signal }: any) => {
            if (!pc) return;
            try {
              if (signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('call:signal', {
                  toUserId: callData.otherUser._id,
                  signal: answer
                });
              } else if (signal.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
              } else if (signal.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
              }
            } catch (sigErr) {
              console.warn('Signaling error:', sigErr);
            }
          });
        }

        if (callData.isOutgoing && socket) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:signal', {
            toUserId: callData.otherUser._id,
            signal: offer
          });
        }

      } catch (err) {
        console.warn('Camera/Mic not available:', err);
      }
    }

    initMedia();

    return () => {
      active = false;
      stopRingtone();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callData.callId]);

  useEffect(() => {
    if (callData.status === 'connected') {
      stopRingtone();
      callTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callData.status]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleEnd = () => {
    stopRingtone();
    const wasMissed = callData.status !== 'connected';
    onEndCall(wasMissed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 select-none">
      <div className="w-full max-w-lg h-[80vh] max-h-[600px] bg-[#111b21] rounded-3xl overflow-hidden border border-[#222d34] flex flex-col relative shadow-2xl">
        
        <div className="flex-1 relative w-full h-full flex flex-col items-center justify-center bg-[#0b141a] overflow-hidden">
          
          {callData.isVideo && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          <div className="relative z-10 flex flex-col items-center text-center p-6">
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-white text-3xl font-bold shadow-2xl border-4 border-[#00a884]/40">
                {callData.otherUser.avatar ? (
                  <img src={callData.otherUser.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span>{callData.otherUser.displayName.charAt(0)}</span>
                )}
              </div>
              {callData.status !== 'connected' && (
                <div className="absolute inset-0 rounded-full border-4 border-[#00a884] animate-ping opacity-30" />
              )}
            </div>

            <div className="flex items-center gap-1.5 justify-center">
              <h3 className="text-xl font-bold text-[#e9edef]">{callData.otherUser.displayName}</h3>
              {callData.otherUser.hasVerifiedBadge && (
                <BadgeCheck className="w-5 h-5 text-[#00a884] fill-[#00a884]/20" />
              )}
            </div>
            
            <p className="text-sm font-medium text-[#00a884] mt-1">
              {callData.status === 'connected' ? (
                <span className="font-mono text-white text-base">{formatTimer(duration)}</span>
              ) : callData.isOutgoing ? (
                'Calling...'
              ) : (
                'zavi chats Incoming Call...'
              )}
            </p>

            <div className="flex items-center gap-1.5 text-xs text-[#8696a0] mt-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
              <span>zavi chats End-to-end encrypted call</span>
            </div>
          </div>

          {callData.isVideo && !isVideoOff && (
            <div className="absolute top-4 right-4 w-28 h-40 bg-black/80 rounded-2xl overflow-hidden border border-white/20 shadow-xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            </div>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="p-6 bg-[#202c33] flex items-center justify-around shrink-0 border-t border-[#2a3942]">
          
          {!callData.isOutgoing && callData.status === 'ringing' ? (
            <div className="flex items-center justify-center gap-8 w-full">
              <button
                onClick={handleEnd}
                className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={() => {
                  stopRingtone();
                  onAcceptCall();
                }}
                className="w-14 h-14 bg-[#00a884] hover:bg-[#02906f] text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer animate-bounce"
                title="Accept"
              >
                <Phone className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors cursor-pointer ${
                  isMuted ? 'bg-red-600/20 text-red-400' : 'bg-[#2a3942] text-[#e9edef] hover:bg-[#374248]'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {callData.isVideo && (
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-colors cursor-pointer ${
                    isVideoOff ? 'bg-red-600/20 text-red-400' : 'bg-[#2a3942] text-[#e9edef] hover:bg-[#374248]'
                  }`}
                  title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              <button
                onClick={handleEnd}
                className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
