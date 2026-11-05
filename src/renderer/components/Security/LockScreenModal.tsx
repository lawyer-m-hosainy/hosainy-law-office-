import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, Scale, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { OfficeSettings } from '../../../shared/types';

interface LockScreenModalProps {
  isOpen: boolean;
  settings: OfficeSettings | null;
  onUnlock: (password: string) => Promise<{ success: boolean; error?: string }>;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  isOpen,
  settings,
  onUnlock,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);
      const res = await onUnlock(password);
      setIsVerifying(false);

      if (!res.success) {
        setError(res.error || 'كلمة المرور غير صحيحة');
      } else {
        setPassword('');
      }
    } catch (err: any) {
      setIsVerifying(false);
      setError(err?.message || 'خطأ أثناء التحقق');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4 select-none">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Emblem & Title */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white mx-auto shadow-lg shadow-amber-900/30">
            <Lock className="w-8 h-8 text-amber-100" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {settings?.office_name || 'مكتب المحاماة والاستشارات القانونية'}
            </h2>
            <p className="text-xs text-amber-400 font-semibold mt-1">
              {settings?.lawyer_name ? `الأستاذ / ${settings.lawyer_name}` : 'إدارة مكتب المحاماة'}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>محمي بكلمة مرور مشفرة (bcryptjs)</span>
          </div>
        </div>

        {/* Lock Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="أدخل كلمة المرور لفك القفل..."
              autoFocus
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-center font-bold tracking-wider" data-testid="lock.main.set-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1" data-testid="lock.main.set-show-password"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-300 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || !password}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer" data-testid="lock.main.button-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>فك قفل البرنامج والدخول</span>
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-500">
          البيانات محلية 100% ومشفرة ومحمية بالكامل على جهازك
        </p>
      </div>
    </div>
  );
};
