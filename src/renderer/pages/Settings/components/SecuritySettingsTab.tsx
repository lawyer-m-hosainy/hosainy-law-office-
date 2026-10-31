import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useSecurityAndBackup } from '../../../hooks/useSecurityAndBackup';

export const SecuritySettingsTab: React.FC = () => {
  const {
    securitySettings,
    loading,
    setPassword,
    removePassword,
    lockApp,
    updateSettings,
  } = useSecurityAndBackup();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const hasPassword = Boolean(securitySettings?.has_password && securitySettings?.is_password_enabled === 1);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 4) {
      setStatusMsg({ text: 'كلمة المرور يجب أن لا تقل عن 4 خانات', isError: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ text: 'كلمة المرور وتأكيدها غير متطابقين', isError: true });
      return;
    }

    const res = await setPassword(newPassword, hasPassword ? currentPassword : undefined);
    if (res.success) {
      setStatusMsg({ text: 'تم حفظ كلمة المرور وتفعيل حماية البرنامج بنجاح!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMsg(null), 3000);
    } else {
      setStatusMsg({ text: res.error || 'تعذر حفظ كلمة المرور', isError: true });
    }
  };

  const handleRemovePassword = async () => {
    if (!currentPassword) {
      setStatusMsg({ text: 'يرجى إدخال كلمة المرور الحالية أولاً لإلغاء القفل', isError: true });
      return;
    }

    if (confirm('هل أنت متأكد من رغبتك في إلغاء قفل البرنامج بكلمة مرور؟')) {
      const res = await removePassword(currentPassword);
      if (res.success) {
        setStatusMsg({ text: 'تم إلغاء قفل البرنامج بنجاح' });
        setCurrentPassword('');
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ text: res.error || 'كلمة المرور غير صحيحة', isError: true });
      }
    }
  };

  const handleAutoLockChange = async (minutes: number) => {
    await updateSettings({ auto_lock_minutes: minutes });
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
        hasPassword
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            hasPassword ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {hasPassword ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold">
              {hasPassword ? 'حماية البرنامج مفعلة بكلمة مرور' : 'البرنامج غير محمي بكلمة مرور'}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              {hasPassword
                ? 'البيانات محمية محلياً بتشفير كلمة المرور عبر bcryptjs'
                : 'يمكن لأي شخص يستخدم هذا الحاسوب فتح البرنامج والاطلاع على الملفات'}
            </p>
          </div>
        </div>

        {hasPassword && (
          <button
            onClick={lockApp}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="قفل الشاشة فوراً لحين العودة"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>قفل الشاشة الآن</span>
          </button>
        )}
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
          statusMsg.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {statusMsg.isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Set / Change Password Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm text-slate-800">
              {hasPassword ? 'تغيير أو إلغاء كلمة المرور' : 'تعيين كلمة مرور جديدة للبرنامج'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPasswords ? 'إخفاء الحروف' : 'إظهار الحروف'}</span>
          </button>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-4 max-w-lg">
          {hasPassword && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور الحالية:
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {hasPassword ? 'كلمة المرور الجديدة:' : 'كلمة المرور:'}
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="اكتب كلمة مرور قوية (4 أحرف أو أرقام كحد أدنى)..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تأكيد كلمة المرور:
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد إدخال كلمة المرور للتأكيد..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{hasPassword ? 'حفظ كلمة المرور الجديدة' : 'تفعيل قفل البرنامج'}</span>
            </button>

            {hasPassword && (
              <button
                type="button"
                onClick={handleRemovePassword}
                disabled={loading || !currentPassword}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-colors disabled:opacity-50"
              >
                إلغاء قفل البرنامج
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Auto-Lock Settings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Clock className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800">القفل التلقائي عند الخمول</h3>
        </div>

        <div className="max-w-lg space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            يقوم البرنامج بقفل الشاشة تلقائياً إذا لم تلمس لوحة المفاتيح أو الفأرة لفترة محددة لحماية خصوصية الموكلين وقضاياهم.
          </p>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">قفل البرنامج تلقائياً بعد:</label>
            <select
              value={securitySettings?.auto_lock_minutes || 15}
              onChange={(e) => handleAutoLockChange(Number(e.target.value))}
              disabled={!hasPassword}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value={5}>5 دقائق</option>
              <option value={10}>10 دقائق</option>
              <option value={15}>15 دقيقة (الموصى به)</option>
              <option value={30}>30 دقيقة</option>
              <option value={60}>ساعة واحدة</option>
              <option value={0}>تعطيل القفل التلقائي</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
