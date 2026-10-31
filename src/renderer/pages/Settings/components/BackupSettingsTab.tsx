import React, { useState } from 'react';
import {
  Archive,
  HardDrive,
  FolderOpen,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Calendar,
  Save,
  Download,
  Shield,
  FileCheck,
  Loader2,
  X,
  Upload,
} from 'lucide-react';
import { useSecurityAndBackup } from '../../../hooks/useSecurityAndBackup';
import { BackupFileInfo } from '../../../../shared/types';

export const BackupSettingsTab: React.FC = () => {
  const {
    securitySettings,
    backupsList,
    loading,
    createBackup,
    selectBackupDir,
    restoreBackup,
    updateSettings,
  } = useSecurityAndBackup();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [encryptNewBackup, setEncryptNewBackup] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Restore Modal State
  const [restoreTargetFile, setRestoreTargetFile] = useState<BackupFileInfo | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Handle Manual Backup
  const handleStartBackup = async () => {
    if (encryptNewBackup && !backupPassword) {
      alert('يرجى كتابة كلمة مرور لتشفير النسخة الاحتياطية');
      return;
    }

    setIsCreateModalOpen(false);
    setStatusMsg({ text: 'جاري إنشاء النسخة الاحتياطية وتجميع قاعدة البيانات والمرفقات...' });

    const res = await createBackup({
      encrypt: encryptNewBackup,
      password: encryptNewBackup ? backupPassword : '',
    });

    if (res.success) {
      setStatusMsg({ text: `تم إنشاء النسخة الاحتياطية بنجاح في:\n${res.backupPath}` });
      setBackupPassword('');
      setEncryptNewBackup(false);
    } else {
      setStatusMsg({ text: res.error || 'فشل إنشاء النسخة الاحتياطية', isError: true });
    }
  };

  // Handle Select Custom Folder
  const handleChooseCustomFolder = async () => {
    const selected = await selectBackupDir();
    if (selected) {
      setStatusMsg({ text: `تم تعيين مجلد النسخ الاحتياطي: ${selected}` });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // Handle Restore
  const handleConfirmRestore = async () => {
    if (!restoreTargetFile) return;

    if (restoreTargetFile.isEncrypted && !restorePassword) {
      alert('هذه النسخة مشفرة، يرجى إدخال كلمة المرور لفك التشفير');
      return;
    }

    try {
      setIsRestoring(true);
      const res = await restoreBackup(restoreTargetFile.filePath, restorePassword);
      setIsRestoring(false);
      setRestoreTargetFile(null);
      setRestorePassword('');

      if (res.success) {
        alert(res.message || 'تمت استعادة النسخة الاحتياطية بنجاح!');
        window.location.reload();
      } else {
        alert(`تعذرت الاستعادة: ${res.error}`);
      }
    } catch (err: any) {
      setIsRestoring(false);
      alert(`خطأ: ${err?.message}`);
    }
  };

  // Select external file to restore
  const handleSelectExternalFile = async () => {
    const filePath = await window.electronAPI.selectBackupFileToRestore();
    if (filePath) {
      const isEnc = filePath.endsWith('.enc');
      setRestoreTargetFile({
        fileName: filePath.split(/[\\/]/).pop() || '',
        filePath,
        sizeBytes: 0,
        createdAt: new Date().toISOString(),
        isEncrypted: isEnc,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-800">
              النسخ الاحتياطي الشامل (قاعدة البيانات والمرفقات)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            نسخ متكامل ومؤمن يشمل ملف قاعدة البيانات بالكامل مع تفريغ الـ WAL، وكافة مرفقات القضايا بروابطها ومستنداتها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>إنشاء نسخة احتياطية فورية</span>
          </button>

          <button
            onClick={handleSelectExternalFile}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>استعادة من ملف خارجي...</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-start gap-2 whitespace-pre-line ${
            statusMsg.isError
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {statusMsg.isError ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Automatic Backup Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-sm text-slate-800">إعدادات النسخ الاحتياطي التلقائي الدوري</h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={securitySettings?.auto_backup_enabled === 1}
              onChange={(e) => updateSettings({ auto_backup_enabled: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">تفعيل النسخ الدوري التلقائي</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">دورية النسخ التلقائي:</label>
            <select
              value={securitySettings?.auto_backup_frequency || 'daily'}
              onChange={(e) => updateSettings({ auto_backup_frequency: e.target.value as any })}
              disabled={securitySettings?.auto_backup_enabled !== 1}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="daily">يومياً عند بدء العمل (الموصى به)</option>
              <option value="weekly">أسبوعياً</option>
              <option value="monthly">شهرياً</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">مجلد حفظ النسخ المخصص:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={securitySettings?.backup_custom_path || 'المجلد الافتراضي (LawOfficeData/backups)'}
                className="flex-1 p-2 bg-slate-100 border border-slate-300 rounded-lg font-mono text-[11px] text-slate-600 truncate dir-ltr text-right"
              />
              <button
                type="button"
                onClick={handleChooseCustomFolder}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold flex items-center gap-1 flex-shrink-0"
                title="اختيار فلاشة أو قرص صلب خارجي"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>تغيير</span>
              </button>
            </div>
          </div>
        </div>

        {securitySettings?.last_backup_date && (
          <div className="pt-2 text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>آخر نسخة احتياطية ناجحة تمت في: {securitySettings.last_backup_date}</span>
          </div>
        )}
      </div>

      {/* Backups History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-700" />
            <h4 className="font-bold text-sm text-slate-800">
              النسخ الاحتياطية المتوفرة على القرص ({backupsList.length})
            </h4>
          </div>
        </div>

        {backupsList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            لم يتم إنشاء أي نسخ احتياطية حتى الآن؛ انقر على زر "إنشاء نسخة احتياطية فورية" بالأعلى لحفظ نسخة آمنة من بياناتك.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">اسم ملف النسخة</th>
                  <th className="p-3">الحجم</th>
                  <th className="p-3">تاريخ الإنشاء</th>
                  <th className="p-3 text-center">التشفير</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupsList.map((bk, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-bold text-slate-800 font-mono flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate max-w-md">{bk.fileName}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-600 font-semibold">
                      {(bk.sizeBytes / (1024 * 1024)).toFixed(2)} م.ب
                    </td>
                    <td className="p-3 text-slate-500 font-mono">
                      {bk.createdAt.slice(0, 10)}
                    </td>
                    <td className="p-3 text-center">
                      {bk.isEncrypted ? (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>مشفرة AES-256</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          قياسية
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setRestoreTargetFile(bk)}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-colors mx-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استعادة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">إنشاء نسخة احتياطية كاملة</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                سيتم أخذ لقطة كاملة متزامنة لقاعدة البيانات (SQLite) مع نسخ كافة المرفقات في ملف أرشيف واحد.
              </p>

              <label className="flex items-center gap-2 cursor-pointer p-3 bg-purple-50 rounded-xl border border-purple-200">
                <input
                  type="checkbox"
                  checked={encryptNewBackup}
                  onChange={(e) => setEncryptNewBackup(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-purple-300"
                />
                <div>
                  <span className="font-bold text-purple-900 block">
                    تشفير النسخة الاحتياطية بكلمة سر (AES-256-GCM)
                  </span>
                  <span className="text-[11px] text-purple-700 block mt-0.5">
                    حماية أمنية عسكرية لا يمكن فتحها أو استعادتها بدون كلمة السر
                  </span>
                </div>
              </label>

              {encryptNewBackup && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    كلمة مرور تشفير النسخة:
                  </label>
                  <input
                    type="password"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    placeholder="اكتب كلمة مرور النسخة..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleStartBackup}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                بدء النسخ الاحتياطي الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreTargetFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-700" />
              <h3 className="font-bold text-sm text-amber-900">تأكيد استعادة النسخة الاحتياطية</h3>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 leading-relaxed font-semibold">
                ⚠️ <strong>تحذير صريح:</strong> استعادة النسخة الاحتياطية ستستبدل قاعدة البيانات والمرفقات الحالية بالكامل بالبيانات الموجودة في هذه النسخة!
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">الملف المراد استعادته:</span>
                <span className="font-bold text-slate-900 font-mono block break-all">
                  {restoreTargetFile.fileName}
                </span>
              </div>

              {restoreTargetFile.isEncrypted && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    أدخل كلمة مرور فك تشفير النسخة:
                  </label>
                  <input
                    type="password"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    placeholder="كلمة مرور النسخة المشفرة..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => {
                  setRestoreTargetFile(null);
                  setRestorePassword('');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الاستعادة...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>تأكيد الاستعادة واستبدال البيانات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
