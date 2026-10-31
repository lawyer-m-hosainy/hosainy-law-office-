import React, { useState } from 'react';
import {
  Printer,
  Eye,
  FileDown,
  FileText,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Gavel,
  Coins,
  Shield,
  Layers,
} from 'lucide-react';
import {
  ConfigurableListItem,
  OfficeSettings,
  PrintResult,
} from '../../../shared/types';
import { generateReportHtml } from '../../services/reportGenerator';

interface ReportsPageProps {
  settings: OfficeSettings | null;
  courtsList: ConfigurableListItem[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  settings,
  courtsList,
}) => {
  const [landscape, setLandscape] = useState(false);
  const [printingStatus, setPrintingStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate test report HTML
  const getTestReportHtml = () => {
    if (!settings) return '';

    const activeCourts = courtsList.filter((c) => c.is_active === 1);
    const tableHeaders = ['م', 'اسم المحكمة / الهيئة القضائية', 'الدرجة القضائية', 'حالة القيد'];
    const tableRows = activeCourts.map((court, idx) => [
      idx + 1,
      court.name,
      court.name.includes('نقض')
        ? 'محكمة عليا'
        : court.name.includes('استئناف') || court.name.includes('مجلس الدولة')
        ? 'درجة ثانية'
        : 'درجة أولى / نيابة',
      'معتمدة ومفعلة',
    ]);

    return generateReportHtml({
      settings,
      title: 'تقرير تجريبي موحّد - بيان الهيئات والمحاكم المعتمدة',
      subtitle: 'فحص جاهزية خدمة الطباعة الموحدة والتصدير بصيغة PDF باللغة العربية (RTL)',
      landscape,
      tableHeaders,
      tableRows,
      notes: 'تم توليد هذا التقرير التجريبي لاختبار خدمة الطباعة الموحدة الموصوفة في RULES.md مع مراعاة المقاس الرسمي A4 والترويسة والخط العربي Cairo.',
    });
  };

  const handleAction = async (action: 'preview' | 'print' | 'pdf') => {
    try {
      setIsProcessing(true);
      setPrintingStatus({ message: 'جاري تجهيز التقرير في الخلفية...' });

      const htmlContent = getTestReportHtml();
      const res: PrintResult = await window.electronAPI.executePrint({
        htmlContent,
        title: 'تقرير_تجريبي_المحاكم',
        landscape,
        action,
        suggestedFileName: `تقرير_المحاكم_المعتمدة_${new Date().toISOString().slice(0, 10)}.pdf`,
      });

      setIsProcessing(false);

      if (res.success) {
        if (action === 'pdf' && res.pdfPath) {
          setPrintingStatus({ message: `تم حفظ ملف الـ PDF بنجاح في:\n${res.pdfPath}` });
        } else if (action === 'print') {
          setPrintingStatus({ message: 'تم إرسال أمر الطباعة بنجاح!' });
        } else {
          setPrintingStatus({ message: 'تم فتح نافذة المعاينة قبل الطباعة!' });
        }
      } else {
        setPrintingStatus({ message: res.error || 'تم إلغاء العملية أو حدث خطأ', isError: true });
      }
    } catch (err: any) {
      setIsProcessing(false);
      setPrintingStatus({ message: `خطأ أثناء الطباعة: ${err?.message}`, isError: true });
    }
  };

  const upcomingReports = [
    { id: 1, title: 'رول الجلسات اليومي / الأسبوعي', icon: Gavel, desc: 'رول المحكمة والدائرة ورقم الرول والمطلوب ومكان الملاحظات' },
    { id: 2, title: 'كشف حساب الموكل الشامل', icon: Coins, desc: 'الأتعاب المتفق عليها والمسدد والمتبقي وتفصيل الرسوم والمصاريف' },
    { id: 3, title: 'إيصال استلام نقدية رسمي', icon: FileText, desc: 'سند قبض بترقيم تلقائي وبيان الصفة وطريقة الدفع' },
    { id: 4, title: 'ملف القضية المتكامل', icon: Layers, desc: 'البيانات الأساسية، الأطراف، جدول الجلسات، والملخص المالي' },
    { id: 5, title: 'قائمة المهام والمأموريات', icon: Calendar, desc: 'مأموريات اليوم والأسبوع بخانات للتأشير بالقلم بعد الإنجاز' },
    { id: 6, title: 'ملف إجراءات التنفيذ', icon: Shield, desc: 'السند التنفيذي، المحاضر، الحجوزات، والمبالغ المحصلة' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Unified Print Service Control Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-800">
                خدمة الطباعة الموحدة (Unified Print Service)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              خدمة مركزية في الـ Main Process تتكفل بتوليد التقارير وتنسيقها ومعاينتها وحفظها كملفات PDF رسمية
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Landscape Toggle */}
            <button
              onClick={() => setLandscape(!landscape)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                landscape
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title="تغيير اتجاه الصفحة بين الرأسي والأفقي للجداول العريضة"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{landscape ? 'صفحة عريضة (أفقي)' : 'صفحة طولية (رأسي)'}</span>
            </button>

            {/* Preview Button */}
            <button
              disabled={isProcessing}
              onClick={() => handleAction('preview')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span>معاينة قبل الطباعة</span>
            </button>

            {/* Direct Print Button */}
            <button
              disabled={isProcessing}
              onClick={() => handleAction('print')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة مباشرة</span>
            </button>

            {/* Save PDF Button */}
            <button
              disabled={isProcessing}
              onClick={() => handleAction('pdf')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>حفظ PDF</span>
            </button>
          </div>
        </div>

        {printingStatus && (
          <div
            className={`p-3.5 mb-6 rounded-lg text-sm font-semibold flex items-start gap-2.5 whitespace-pre-line ${
              printingStatus.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {printingStatus.isError ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
            )}
            <span>{printingStatus.message}</span>
          </div>
        )}

        {/* Live Preview Frame Container */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">
              معاينة حية للقالب الموحد (Live A4 Preview)
            </span>
            <span className="text-[11px] text-slate-400">
              مطابق 100% لمخرجات الطابعة وملفات الـ PDF
            </span>
          </div>

          <div className="border border-slate-300 rounded-xl bg-slate-200/60 p-4 md:p-8 flex justify-center overflow-auto max-h-[600px]">
            <div
              className={`bg-white shadow-2xl p-8 border border-slate-300 rounded-sm transition-all duration-300 ${
                landscape ? 'w-[900px] min-h-[550px]' : 'w-[680px] min-h-[850px]'
              }`}
            >
              {/* Rendered Live HTML Preview */}
              <iframe
                title="معاينة التقرير"
                srcDoc={getTestReportHtml()}
                className="w-full h-full min-h-[750px] border-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Reports Suite */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <h4 className="text-sm font-bold text-slate-800 mb-1">
          باقة التقارير الرسمية الموحدة (مجهزة للربط في المراحل التالية)
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          وفقًا لقواعد RULES.md، جميع هذه التقارير تُبنى على نفس خدمة وقالب الطباعة الموحد دون تكرار للأكواد
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingReports.map((report) => {
            const Icon = report.icon;
            return (
              <div
                key={report.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">{report.title}</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{report.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
