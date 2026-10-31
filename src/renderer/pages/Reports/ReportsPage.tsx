import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare,
  History,
  FileSpreadsheet,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  ConfigurableListItem,
  OfficeSettings,
  Case,
  Client,
  PrintResult,
  HearingWithCase,
  FinancialTransaction,
  GeneralFinancialStats,
  Task,
  ExecutionFile,
  ExecutionDetails,
  CaseDetails,
} from '../../../shared/types';
import { generateHearingRollHtml } from '../../services/hearingRollReportGenerator';
import { generateClientStatementHtml } from '../../services/clientStatementReportGenerator';
import { generateReceiptHtml } from '../../services/receiptReportGenerator';
import { generateCaseSheetHtml } from '../../services/caseReportGenerator';
import { generateAdjournmentsReportHtml } from '../../services/adjournmentsReportGenerator';
import { generateTasksReportHtml } from '../../services/tasksReportGenerator';
import { generateExecutionReportHtml } from '../../services/executionReportGenerator';
import { generateGeneralFinancialReportHtml } from '../../services/generalFinancialReportGenerator';
import { generateReportHtml } from '../../services/reportGenerator';
import { ExportButton } from '../../components/Common/ExportButton';

interface ReportsPageProps {
  settings: OfficeSettings | null;
  courtsList: ConfigurableListItem[];
  cases?: Case[];
  clients?: Client[];
  onNavigateToCase?: (caseId: number) => void;
}

type ReportType =
  | 'hearing_roll'
  | 'client_statement'
  | 'receipt'
  | 'case_file'
  | 'adjournments'
  | 'tasks_pen'
  | 'execution_file'
  | 'financial_general'
  | 'generic_table';

export const ReportsPage: React.FC<ReportsPageProps> = ({
  settings,
  courtsList,
  cases = [],
  clients = [],
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('hearing_roll');
  const [landscape, setLandscape] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [printingStatus, setPrintingStatus] = useState<{ message: string; isError?: boolean } | null>(null);

  // Filter States for Specific Reports
  const [selectedCaseId, setSelectedCaseId] = useState<number | ''>('');
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [selectedCourt, setSelectedCourt] = useState<string>('الكل');
  const [dateRangeType, setDateRangeType] = useState<'today' | 'tomorrow' | 'week' | 'all'>('today');
  const [genericTableType, setGenericTableType] = useState<'cases' | 'clients' | 'hearings' | 'tasks'>('cases');

  // Loaded Data for Reports
  const [hearingsData, setHearingsData] = useState<HearingWithCase[]>([]);
  const [tasksData, setTasksData] = useState<Task[]>([]);
  const [finTxsData, setFinTxsData] = useState<FinancialTransaction[]>([]);
  const [finStatsData, setFinStatsData] = useState<GeneralFinancialStats | null>(null);
  const [selectedCaseDetails, setSelectedCaseDetails] = useState<CaseDetails | null>(null);
  const [executionDetails, setExecutionDetails] = useState<ExecutionDetails | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Set default case / client if available
  useEffect(() => {
    if (cases.length > 0 && selectedCaseId === '') {
      setSelectedCaseId(cases[0].id);
    }
    if (clients.length > 0 && selectedClientId === '') {
      setSelectedClientId(clients[0].id);
    }
  }, [cases, clients]);

  // Load relevant data whenever selectedReport or parameters change
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!settings) return;
      setLoadingData(true);

      try {
        if (selectedReport === 'hearing_roll' || selectedReport === 'adjournments') {
          let dateParam: string | undefined;
          const today = new Date().toISOString().slice(0, 10);
          if (dateRangeType === 'today') {
            dateParam = today;
          } else if (dateRangeType === 'tomorrow') {
            const tom = new Date();
            tom.setDate(tom.getDate() + 1);
            dateParam = tom.toISOString().slice(0, 10);
          }

          const roll = await window.electronAPI.getHearingRoll({
            date: dateParam,
            court: selectedCourt !== 'الكل' ? selectedCourt : undefined,
          });
          if (isMounted) setHearingsData(roll || []);
        } else if (selectedReport === 'tasks_pen') {
          const tasks = await window.electronAPI.getTasks();
          if (isMounted) setTasksData(tasks || []);
        } else if (selectedReport === 'financial_general') {
          const [txs, stats] = await Promise.all([
            window.electronAPI.getFinancialTransactions(),
            window.electronAPI.getGeneralFinancialStats(),
          ]);
          if (isMounted) {
            setFinTxsData(txs || []);
            setFinStatsData(stats || null);
          }
        } else if (selectedReport === 'case_file' && selectedCaseId) {
          const cDetails = await window.electronAPI.getCaseById(Number(selectedCaseId));
          if (isMounted) setSelectedCaseDetails(cDetails || null);
        } else if (selectedReport === 'receipt') {
          const txs = await window.electronAPI.getFinancialTransactions();
          if (isMounted) setFinTxsData(txs || []);
        } else if (selectedReport === 'client_statement' && (selectedClientId || selectedCaseId)) {
          const txs = await window.electronAPI.getFinancialTransactions({
            clientId: selectedClientId ? Number(selectedClientId) : undefined,
            caseId: selectedCaseId ? Number(selectedCaseId) : undefined,
          });
          if (isMounted) setFinTxsData(txs || []);
        } else if (selectedReport === 'execution_file') {
          const files = await window.electronAPI.getExecutionFiles();
          if (files && files.length > 0) {
            const fDetails = await window.electronAPI.getExecutionFileById(files[0].id);
            if (isMounted) setExecutionDetails(fDetails || null);
          }
        }
      } catch (err) {
        console.error('Error fetching report data:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedReport, selectedCaseId, selectedClientId, selectedCourt, dateRangeType]);

  // Generate Current Report HTML
  const currentReportHtml = useMemo(() => {
    if (!settings) return '';

    try {
      switch (selectedReport) {
        case 'hearing_roll':
          return generateHearingRollHtml(
            hearingsData,
            settings,
            dateRangeType === 'today'
              ? 'جلسات اليوم'
              : dateRangeType === 'tomorrow'
              ? 'جلسات الغد'
              : 'كافة الجلسات'
          );

        case 'adjournments':
          return generateAdjournmentsReportHtml(
            hearingsData,
            settings,
            'تقرير وتحليل أسباب تأجيل الجلسات',
            `المحكمة: ${selectedCourt} • عدد الجلسات المؤجلة: ${
              hearingsData.filter((h) => h.adjournment_reason).length
            }`
          );

        case 'client_statement': {
          const clientObj = clients.find((c) => c.id === Number(selectedClientId));
          const caseObj = cases.find((c) => c.id === Number(selectedCaseId));
          return generateClientStatementHtml({
            client: clientObj,
            caseItem: caseObj,
            transactions: finTxsData,
            settings,
          });
        }

        case 'receipt': {
          const latestTx = finTxsData[0] || {
            id: 1,
            receipt_number: 'REC-2026-0001',
            transaction_date: new Date().toISOString().slice(0, 10),
            direction: 'inflow',
            category: 'أتعاب',
            transaction_type: 'دفعة أتعاب',
            amount: 5000,
            payment_method: 'نقدي',
            description: 'استلام دفعة مقدم أتعاب المحاماة',
            client_name: clients[0]?.name || 'اسم الموكل',
          };
          return generateReceiptHtml(latestTx as any, settings);
        }

        case 'case_file': {
          if (selectedCaseDetails) {
            return generateCaseSheetHtml(selectedCaseDetails, settings);
          }
          return '<div style="font-family: Cairo; text-align:center; padding: 50px;">يرجى اختيار قضية من القائمة أعلاه</div>';
        }

        case 'tasks_pen':
          return generateTasksReportHtml(
            tasksData,
            settings,
            'قائمة المهام والمأموريات للنزول الميداني'
          );

        case 'execution_file': {
          if (executionDetails) {
            return generateExecutionReportHtml(executionDetails, settings);
          }
          return '<div style="font-family: Cairo; text-align:center; padding: 50px;">لا توجد ملفات تنفيذ مسجلة</div>';
        }

        case 'financial_general': {
          return generateGeneralFinancialReportHtml({
            stats: finStatsData || {
              total_inflow: 0,
              total_outflow: 0,
              net_income: 0,
              fees_inflow: 0,
              court_expenses: 0,
              office_expenses: 0,
              execution_inflow: 0,
              active_cheques_count: 0,
              active_cheques_total: 0,
            },
            transactions: finTxsData,
            settings,
            periodName: 'التقرير المالي العام للمكتب',
          });
        }

        case 'generic_table': {
          if (genericTableType === 'cases') {
            const tableHeaders = ['م', 'رقم القضية', 'السنة', 'المحكمة', 'الدائرة', 'نوع الدعوى', 'الحالة'];
            const tableRows = cases.map((c, i) => [
              i + 1,
              c.case_number,
              c.case_year,
              c.court_name,
              c.court_circuit || '-',
              c.case_type,
              c.status,
            ]);
            return generateReportHtml({
              settings,
              title: 'جدول ملفات القضايا والدعاوى المقيدة بالمكتب',
              landscape,
              tableHeaders,
              tableRows,
            });
          } else if (genericTableType === 'clients') {
            const tableHeaders = ['م', 'اسم الموكل', 'النوع', 'الهاتف', 'رقم التوكيل', 'مكتب التوثيق'];
            const tableRows = clients.map((cl, i) => [
              i + 1,
              cl.name,
              cl.client_type === 'individual' ? 'فرد' : 'شركة',
              cl.phone || '-',
              cl.poa_number || '-',
              cl.poa_issuing_office || '-',
            ]);
            return generateReportHtml({
              settings,
              title: 'سجل الموكلين والتوكيلات القضائية',
              landscape,
              tableHeaders,
              tableRows,
            });
          }
          return '';
        }

        default:
          return '';
      }
    } catch (e: any) {
      return `<div style="color: red; padding: 20px;">خطأ أثناء توليد التقرير: ${e?.message}</div>`;
    }
  }, [
    selectedReport,
    settings,
    hearingsData,
    tasksData,
    finTxsData,
    finStatsData,
    selectedCaseDetails,
    executionDetails,
    genericTableType,
    landscape,
    dateRangeType,
    selectedCourt,
    selectedClientId,
    selectedCaseId,
    clients,
    cases,
  ]);

  // Handle Print Action
  const handleAction = async (action: 'preview' | 'print' | 'pdf') => {
    try {
      setIsProcessing(true);
      setPrintingStatus({ message: 'جاري تجهيز التقرير ومعالجته في الخلفية...' });

      const res: PrintResult = await window.electronAPI.executePrint({
        htmlContent: currentReportHtml,
        title: `تقرير_${selectedReport}_${new Date().toISOString().slice(0, 10)}`,
        landscape,
        action,
        suggestedFileName: `تقرير_${selectedReport}_${new Date().toISOString().slice(0, 10)}.pdf`,
      });

      setIsProcessing(false);

      if (res.success) {
        if (action === 'pdf' && res.pdfPath) {
          setPrintingStatus({ message: `تم حفظ ملف الـ PDF بنجاح في:\n${res.pdfPath}` });
        } else if (action === 'print') {
          setPrintingStatus({ message: 'تم إرسال أمر الطباعة إلى الطابعة بنجاح!' });
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

  const reportCards = [
    { id: 'hearing_roll', title: '1. رول الجلسات اليومي والفترة', icon: Gavel, desc: 'رول المحكمة والدائرة ورقم الرول والمطلوب ومكان الملاحظات' },
    { id: 'client_statement', title: '2. كشف حساب الموكل الشامل', icon: Coins, desc: 'الأتعاب المتفق عليها والمسدد والمتبقي وتفصيل الرسوم والمصاريف' },
    { id: 'receipt', title: '3. إيصال استلام نقدية مرقم', icon: FileText, desc: 'سند قبض رسمي بترقيم تسلسلي تلقائي والتفقيط بالعربية' },
    { id: 'case_file', title: '4. ملف القضية الكامل', icon: Layers, desc: 'البيانات الأساسية، الأطراف، جدول الجلسات، والملخص المالي' },
    { id: 'adjournments', title: '5. تقرير أسباب التأجيلات', icon: History, desc: 'حصر تفصيلي لجلسات التأجيل وأسبابها وأثرها الإجرائي' },
    { id: 'tasks_pen', title: '6. قائمة المهام للنزول الميداني', icon: CheckSquare, desc: 'مهام اليوم والأسبوع بخانات مربعة [ ] للتأشير بالقلم الجاف' },
    { id: 'execution_file', title: '7. ملف إجراءات التنفيذ الجبري', icon: Shield, desc: 'السند التنفيذي، المحاضر، الحجوزات، والمبالغ المحصلة' },
    { id: 'financial_general', title: '8. التقرير المالي العام للمكتب', icon: FileSpreadsheet, desc: 'تقرير الإيرادات والمصروفات وصافي الدخل وأرصدة الموكلين' },
    { id: 'generic_table', title: '9. طباعة وتصدير أي جدول عام', icon: Printer, desc: 'طباعة رسمية لأي جدول ظاهر على الشاشة وتصديره فوراً' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 9 Reports Selector Strip */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Printer className="w-4 h-4 text-amber-600" />
          <span>منظومة التقارير الرسمية الموحدة (المعتمدة في RULES.md)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {reportCards.map((rc) => {
            const Icon = rc.icon;
            const isSelected = selectedReport === rc.id;
            return (
              <button
                key={rc.id}
                onClick={() => setSelectedReport(rc.id as ReportType)}
                className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-slate-800'} truncate`}>
                    {rc.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{rc.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Toolbar & Report Parameters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-800">
                {reportCards.find((r) => r.id === selectedReport)?.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              جاهز للمعاينة الفورية والطباعة وحفظ PDF بمقاس A4 رسمي وترويسة المكتب
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLandscape(!landscape)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                landscape
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{landscape ? 'أفقي (عريض)' : 'رأسي (طولي)'}</span>
            </button>

            <button
              disabled={isProcessing}
              onClick={() => handleAction('preview')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span>معاينة قبل الطباعة</span>
            </button>

            <button
              disabled={isProcessing}
              onClick={() => handleAction('print')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة مباشرة</span>
            </button>

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

        {/* Dynamic Filters depending on Report Type */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {(selectedReport === 'hearing_roll' || selectedReport === 'adjournments') && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">الفترة:</span>
                <select
                  value={dateRangeType}
                  onChange={(e) => setDateRangeType(e.target.value as any)}
                  className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                >
                  <option value="today">جلسات اليوم</option>
                  <option value="tomorrow">جلسات الغد</option>
                  <option value="all">كافة الجلسات المقيدة</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">المحكمة:</span>
                <select
                  value={selectedCourt}
                  onChange={(e) => setSelectedCourt(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                >
                  <option value="الكل">كل المحاكم</option>
                  {courtsList.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {(selectedReport === 'client_statement' || selectedReport === 'case_file') && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">اختر القضية:</span>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value ? Number(e.target.value) : '')}
                className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold max-w-xs"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    قضية {c.case_number} لسنة {c.case_year} ({c.court_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedReport === 'client_statement' && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">أو اختر الموكل:</span>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : '')}
                className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold max-w-xs"
              >
                {clients.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedReport === 'generic_table' && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">اختر الجدول المطلوب طباعته:</span>
              <select
                value={genericTableType}
                onChange={(e) => setGenericTableType(e.target.value as any)}
                className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
              >
                <option value="cases">جدول القضايا ({cases.length})</option>
                <option value="clients">جدول الموكلين ({clients.length})</option>
              </select>
            </div>
          )}
        </div>

        {printingStatus && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-start gap-2 whitespace-pre-line ${
              printingStatus.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {printingStatus.isError ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            )}
            <span>{printingStatus.message}</span>
          </div>
        )}

        {/* Live A4 Preview Frame */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">
              معاينة حية دقيقة للتقرير (Live Preview)
            </span>
            <span className="text-[11px] text-slate-400">
              مطابق 100% لمخرجات الطابعة وملف PDF بأبعاد A4 وخط Cairo المعتمد
            </span>
          </div>

          <div className="border border-slate-300 rounded-xl bg-slate-200/60 p-4 md:p-8 flex justify-center overflow-auto max-h-[650px]">
            {loadingData ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <span className="text-xs font-semibold">جاري تحضير بيانات التقرير...</span>
              </div>
            ) : (
              <div
                className={`bg-white shadow-2xl p-6 border border-slate-300 rounded-sm transition-all duration-300 ${
                  landscape ? 'w-[920px] min-h-[580px]' : 'w-[700px] min-h-[850px]'
                }`}
              >
                <iframe
                  title="معاينة التقرير"
                  srcDoc={currentReportHtml}
                  className="w-full h-full min-h-[750px] border-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
