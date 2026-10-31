import React from 'react';
import {
  Users,
  Briefcase,
  Gavel,
  Calendar,
  Coins,
  FileCheck2,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { NavigationTab } from '../../../shared/types';

interface GenericPlaceholderProps {
  tab: NavigationTab;
  onNavigateToSettings?: () => void;
}

const tabDetails: Record<
  string,
  { title: string; phase: string; icon: React.ComponentType<{ className?: string }>; description: string; features: string[] }
> = {
  clients: {
    title: 'سجل الموكلين والأطراف القانونية',
    phase: 'المرحلة 2',
    icon: Users,
    description: 'إدارة ملفات الموكلين (أفراد، شركات، جهات) وأرقام التوكيلات ومواعيد انتهائها والصفات القانونية.',
    features: [
      'تسجيل بيانات الموكل: الرقم القومي، السجل التجاري، أرقام الهواتف، والواتساب',
      'إدارة التوكيلات القضائية (عام / خاص / قضايا) وجهة التوثيق مع تنبيهات الانتهاء',
      'دعم صفة الأطراف والتمثيل القانوني (ولي طبيعي، وصي، وكيل عن شركة)',
      'سجل قضايا وحسابات كل موكل بضغطة زر واحدة',
    ],
  },
  cases: {
    title: 'مركز إدارة القضايا وملف الدعوى',
    phase: 'المرحلة 2',
    icon: Briefcase,
    description: 'مركز البرنامج المحوري: صفحة القضية الموحدة بتبويباتها السبعة المتكاملة.',
    features: [
      'البيانات الأساسية: المحكمة، الدائرة، رقم القضية، السنة القضائية، وموضوع الدعوى',
      'الخصوم والمحامين المقابلين وتصنيف الأهمية والدرجات (أول درجة، استئناف، نقض)',
      'تبويب الجلسات والتأجيلات والخط الزمني التراكمي',
      'حقول مخصصة لقضايا جنح الأحداث وبيانات الحدث والتدابير',
    ],
  },
  hearings: {
    title: 'إدارة الجلسات والتأجيلات ورول المحكمة',
    phase: 'المرحلة 3',
    icon: Gavel,
    description: 'الرول اليومي، القرارات القضائية، أسباب التأجيل، وحساب الجلسات القادمة تلقائيًا.',
    features: [
      'توليد رول الجلسات اليومي والأسبوعي المطبوع والمخصص لكل محكمة ودائرة',
      'تسجيل ما تم بالمعنى الدقيق وقرار المحكمة وتوليد الجلسة القادمة آلياً',
      'إحصائيات التأجيلات والخط الزمني (Timeline) وأكثر أسباب التأجيل تكراراً',
      'تنبيهات حالة "محجوز للحكم" وتتبع مواعيد النطق والطعن الاسترشادية',
    ],
  },
  calendar: {
    title: 'التقويم القضائي الموحد',
    phase: 'المرحلة 3',
    icon: Calendar,
    description: 'عرض تقويم شهري وأسبوعي ويومي لكافة جلسات المحاكم والمهام ومواعيد الطعن.',
    features: [
      'ألوان تمييزية واضحة لكل محكمة ونوع حدث',
      'ربط مباشر: الضغط على أي جلسة يفتح صفحة القضية فوراً',
      'مزامنة بصرية مع مواعيد انتهاء الطعون والشيكات والتوكيلات',
    ],
  },
  finance: {
    title: 'النظام المالي المكتبي وحسابات الموكلين',
    phase: 'المرحلة 4',
    icon: Coins,
    description: 'فصل دقيق بين الأتعاب، الرسوم القضائية، المصاريف، وحسابات التنفيذ مع حظر الحذف واستبداله بالقيود العكسية.',
    features: [
      'الأتعاب (مقطوع، على مراحل، بالجلسة) والأقساط المتفق عليها',
      'الرسوم القضائية ومصاريف الانتقالات والمأموريات والأمانات بدقة',
      'طباعة كشف حساب موكل رسمي وإيصالات قبض نقدية مرقمة آلياً',
      'تتبع الشيكات المؤجلة وحركات الوارد والمنصرف',
    ],
  },
  executions: {
    title: 'ملفات التنفيذ الجبري والأحكام',
    phase: 'المرحلة 5',
    icon: FileCheck2,
    description: 'إدارة ملفات السندات التنفيذية، قضاة التنفيذ، إجراءات الحجز، والبيع بالمزاد.',
    features: [
      'السندات التنفيذية (أحكام، أوامر أداء، شيكات، عقود موثقة)',
      'سجل إجراءات التنفيذ (إعلان، حجز تنفيذي، حجز ما للمدين لدى الغير، منع سفر)',
      'جلسات التنفيذ ومنازعاته والمبالغ المحصلة والمتبقية',
    ],
  },
  tasks: {
    title: 'إدارة المهام والمأموريات الإدارية',
    phase: 'المرحلة 6',
    icon: CheckSquare,
    description: 'مأموريات المحاكم والنيابة والشهر العقاري مع لوحة كانبان وقوالب مهام جاهزة.',
    features: [
      'قوالب تلقائية: قالب "قضية جديدة" وقالب "حكم صدر"',
      'عروض مرنة: قائمة، كانبان (Kanban)، وعرض مهام اليوم والمتأخرة',
      'قوائم فحص فرعية (Checklists) والتكليف للمساعدين أو الزملاء',
    ],
  },
};

export const GenericPlaceholder: React.FC<GenericPlaceholderProps> = ({ tab }) => {
  const info = tabDetails[tab] || {
    title: 'القسم قيد التطوير',
    phase: 'المرحلة القادمة',
    icon: Briefcase,
    description: '',
    features: [],
  };

  const Icon = info.icon;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <Icon className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
          <span>مجدول في خطة العمل: {info.phase}</span>
        </div>

        <h3 className="text-xl font-extrabold text-slate-800">
          {info.title}
        </h3>

        <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          {info.description}
        </p>

        <div className="mt-8 pt-6 border-t border-slate-100 text-right max-w-lg mx-auto">
          <h4 className="text-xs font-bold text-slate-700 mb-3">
            الميزات المخططة في هذا القسم (طبقاً لـ SPEC.md):
          </h4>
          <ul className="space-y-2">
            {info.features.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
