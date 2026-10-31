import React, { useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle, ExternalLink, X, FolderOpen } from 'lucide-react';
import { ExportResult } from '../../../shared/types';

interface ExportButtonProps {
  fileName: string;
  title: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  className?: string;
  buttonLabel?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  fileName,
  title,
  headers,
  rows,
  className = '',
  buttonLabel = 'تصدير البيانات',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      setIsOpen(false);

      const res = await window.electronAPI.exportTableData({
        fileName,
        title,
        headers,
        rows,
        format,
      });

      setExportResult(res);
      setIsExporting(false);

      if (!res.success) {
        alert(res.error || 'تعذر تصدير البيانات');
      }
    } catch (err: any) {
      setIsExporting(false);
      alert(`خطأ أثناء التصدير: ${err?.message}`);
    }
  };

  const handleOpenFile = async () => {
    if (exportResult?.filePath) {
      await window.electronAPI.openExportedFile(exportResult.filePath);
    }
  };

  return (
    <div className="relative inline-block text-right">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting || rows.length === 0}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors shadow-xs ${
          className ||
          'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 disabled:opacity-50'
        }`}
        title="تصدير بيانات الجدول إلى ملف Excel أو CSV"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
        <span>{isExporting ? 'جاري التصدير...' : buttonLabel}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
            <button
              onClick={() => handleExport('excel')}
              className="w-full text-right px-4 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>ملف Excel (.xls)</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                RTL
              </span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="w-full text-right px-4 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-900 font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                <span>ملف CSV (.csv)</span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                UTF-8
              </span>
            </button>
          </div>
        </>
      )}

      {/* Export Success Modal Notification */}
      {exportResult && exportResult.success && exportResult.filePath && (
        <div className="fixed bottom-4 left-6 z-50 max-w-md bg-white border border-emerald-300 rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-slate-800">تم تصدير البيانات بنجاح!</h5>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate dir-ltr text-right" title={exportResult.filePath}>
              {exportResult.filePath}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleOpenFile}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>فتح الملف الآن</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    await window.electronAPI.openDataDir();
                  } catch (e) {}
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold border border-slate-300 transition-colors"
              >
                <FolderOpen className="w-3 h-3 text-slate-600" />
                <span>مجلد التصدير</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => setExportResult(null)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
