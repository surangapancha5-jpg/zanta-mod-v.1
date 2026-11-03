import React, { useState } from 'react';
import { User } from '../types';
import { Lock, ShieldCheck, Mail, Phone, User as UserIcon, ArrowRight, CheckCircle2, AlertCircle, BadgeCheck } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

const APP_LOGO = 'https://cdn.imagetourls.com/uploads/tyImg/Y6a8BZUa.png';

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);

  const validateForm = () => {
    if (!username.trim() || username.trim().length < 2) {
      setError('කරුණාකර වලංගු නමක් ඇතුළත් කරන්න (Username must be at least 2 characters).');
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
    if (!emailRegex.test(email.trim())) {
      setError('කරුණාකර නිවැරදි ඊමේල් ලිපිනයක් ඇතුළත් කරන්න (Enter a valid email address).');
      return false;
    }

    const fakeDomains = ['test.com', 'fake.com', 'example.com', 'tempmail.com', 'trashmail.com', '10minutemail.com', 'mailinator.com', 'abc.com'];
    const domain = email.trim().toLowerCase().split('@')[1];
    if (fakeDomains.includes(domain)) {
      setError('තාවකාලික හෝ ව්‍යාජ ඊමේල් ලිපින භාවිත කළ නොහැක (Disposable or fake emails are not allowed).');
      return false;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('කරුණාකර වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (Valid phone number e.g. 0760264995 or +94760264995).');
      return false;
    }

    const digitsOnly = cleanPhone.replace(/\+/, '');
    if (/^(.)\1+$/.test(digitsOnly) || digitsOnly === '1234567890' || digitsOnly === '0123456789') {
      setError('ව්‍යාජ දුරකථන අංක භාවිත කළ නොහැක (Fake/sequential phone numbers are rejected).');
      return false;
    }

    setError(null);
    return true;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request OTP');
      }

      setOtpInfo(data.message);
      if (data.debugOtp) {
        setReceivedOtp(data.debugOtp);
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('කරුණාකර ඉලක්කම් 6 ක OTP කේතය සම්පූර්ණයෙන් ඇතුළත් කරන්න (Enter full 6-digit OTP).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: fullOtp
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      localStorage.setItem('zavi_user_id', data.user._id);
      localStorage.setItem('zavi_user_email', data.user.email);

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFillReceivedOtp = () => {
    if (receivedOtp && receivedOtp.length === 6) {
      setOtp(receivedOtp.split(''));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b141a]/95 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-[#00a884] p-6 text-center text-white relative">
          <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-md p-2">
            <img src={APP_LOGO} alt="zavi chats logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-xl font-bold tracking-wide">zavi chats</h2>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono">v1.0.0</span>
          </div>
          <p className="text-white/80 text-xs mt-1">ආරක්ෂිත සත්‍ය පරිශීලක සත්‍යාපනය (Real Secure Login)</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 'info' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
                  ඔබගේ නම (Username / Display Name)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. suranga_mods or Suranga Chamith"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#202c33] text-[#e9edef] rounded-lg border border-[#2a3942] focus:border-[#00a884] focus:outline-none text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
                  සත්‍ය ඊමේල් ලිපිනය (Real Email Address)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. zantaxmd@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#202c33] text-[#e9edef] rounded-lg border border-[#2a3942] focus:border-[#00a884] focus:outline-none text-sm transition-colors"
                  />
                </div>
                <p className="text-[11px] text-[#8696a0] mt-1">බොරු ඊමේල් ලිපින ස්වයංක්‍රීයව ප්‍රතික්ෂේප වේ.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
                  දුරකථන අංකය (Phone Number)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0760264995 or +94760264995"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#202c33] text-[#e9edef] rounded-lg border border-[#2a3942] focus:border-[#00a884] focus:outline-none text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#00a884] hover:bg-[#02906f] text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>OTP කේතය ලබාගන්න (Continue)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#8696a0] pt-2">
                <Lock className="w-3.5 h-3.5 text-[#00a884]" />
                <span>End-to-end encrypted & verified account storage</span>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-[#00a884]/20 rounded-full flex items-center justify-center text-[#00a884]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#e9edef]">OTP සත්‍යාපනය (Verify Code)</h3>
                <p className="text-xs text-[#8696a0] mt-1">
                  කේතය <span className="text-[#00a884] font-medium">{email}</span> වෙත නිකුත් කර ඇත.
                </p>
              </div>

              {/* Instant Verification Code Card */}
              {receivedOtp && (
                <div className="p-3 bg-[#202c33] border border-[#00a884]/40 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#8696a0] block">zavi chats Security Code:</span>
                    <span className="text-lg font-mono tracking-widest text-[#00a884] font-bold">
                      {receivedOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillReceivedOtp}
                    className="text-xs bg-[#00a884] hover:bg-[#02906f] text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    ස්වයංක්‍රීයව පුරවන්න (Auto Fill)
                  </button>
                </div>
              )}

              {/* 6 Digit Input Boxes */}
              <div className="flex justify-center gap-2 py-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-11 h-12 text-center text-xl font-bold bg-[#202c33] text-[#e9edef] rounded-lg border border-[#2a3942] focus:border-[#00a884] focus:outline-none transition-colors"
                  />
                ))}
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-3 bg-[#00a884] hover:bg-[#02906f] text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>සත්‍යාපනය කර පිවිසෙන්න (Verify & Log in)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="w-full py-2 text-xs text-[#8696a0] hover:text-[#e9edef] transition-colors cursor-pointer"
                >
                  විස්තර වෙනස් කරන්න (Change info)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
