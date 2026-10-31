/**
 * arabicUtils.ts: أدوات معالجة وتطبيع النصوص والبحث باللغة العربية
 * معايير SPEC.md: توحيد الألفات، الهاء والتاء المربوطة، الياء والألف المقصورة، وإزالة التشكيل والتطويل.
 */

/**
 * تطبيع النص العربي لإجراء مطابقة دقيقة ومرنة في البحث
 */
export function normalizeArabicText(text: string | null | undefined): string {
  if (!text) return '';

  let normalized = text.toString();

  // 1. إزالة حركات التشكيل (Tashkeel)
  // النطاق من \u064B إلى \u065F يشمل التنوين والحركات والشدة والسكون بالإضافة للألف الخنجرية \u0670
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');

  // 2. إزالة التطويل والكشيدة (Tatweel)
  normalized = normalized.replace(/\u0640/g, '');

  // 3. توحيد أشكال الألف (أ / إ / آ / ٱ -> ا)
  normalized = normalized.replace(/[أإآٱ]/g, 'ا');

  // 4. توحيد الياء والألف المقصورة والهمزة على نبرة (ى / ي / ئ -> ي)
  normalized = normalized.replace(/[ىئ]/g, 'ي');

  // 5. توحيد التاء المربوطة والهاء (ة -> ه)
  normalized = normalized.replace(/ة/g, 'ه');

  // 6. توحيد الواو المهموزة (ؤ -> و)
  normalized = normalized.replace(/ؤ/g, 'و');

  // 7. توحيد الأرقام المشرقية والعربية إلى أرقام قياسية (٠-٩ -> 0-9)
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replace(new RegExp(easternDigits[i], 'g'), String(i));
  }

  // 8. تحويل الأحرف اللاتينية إلى أحرف صغيرة وإزالة المسافات الزائدة
  normalized = normalized.toLowerCase().trim();

  return normalized;
}

/**
 * فحص ما إذا كان النص المستهدف يحتوي على نص الاستعلام مع تطبيع الطرفين
 */
export function matchesArabicSearch(target: string | null | undefined, query: string): boolean {
  if (!query) return true;
  if (!target) return false;

  const normTarget = normalizeArabicText(target);
  const normQuery = normalizeArabicText(query);

  return normTarget.includes(normQuery);
}

/**
 * مطابقة البحث عن القضايا برقم القضية والسنة أو اسم المحكمة أو الموضوع
 */
export function matchesCaseSearch(
  caseItem: { case_number?: string | number; case_year?: string | number; subject?: string; court_name?: string },
  query: string
): boolean {
  if (!query) return true;
  const normQuery = normalizeArabicText(query);

  const num = normalizeArabicText(caseItem.case_number?.toString());
  const year = normalizeArabicText(caseItem.case_year?.toString());
  const combo1 = `${num}/${year}`;
  const combo2 = `${num} لسنه ${year}`;
  const subject = normalizeArabicText(caseItem.subject);
  const court = normalizeArabicText(caseItem.court_name);

  return (
    combo1.includes(normQuery) ||
    combo2.includes(normQuery) ||
    num.includes(normQuery) ||
    year.includes(normQuery) ||
    subject.includes(normQuery) ||
    court.includes(normQuery)
  );
}

export const arabicIncludes = matchesArabicSearch;
export const normalizeArabic = normalizeArabicText;

