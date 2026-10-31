/**
 * دالة تطبيع النصوص العربية لتسهيل البحث الشامل
 * تدعم توحيد الهمزات، الياء والألف المقصورة، التاء المربوطة والهاء، وإزالة التشكيل والتطويل
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .toString()
    // إزالة التشكيل (الحركات: الفتحة، الضمة، الكسرة، التنوين، الشدة، السكون)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // إزالة التطويل (الكشيدة)
    .replace(/\u0640/g, '')
    // توحيد الألف بكافة أشكالها (أ، إ، آ، ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // توحيد الياء والألف المقصورة (ى -> ي)
    .replace(/ى/g, 'ي')
    // توحيد التاء المربوطة والهاء في أواخر الكلمات (ة -> ه)
    .replace(/ة/g, 'ه')
    // توحيد الواو المهموزة والياء المهموزة
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // إزالة الفراغات المزدوجة وتحويل لحروف صغيرة
    .trim()
    .toLowerCase();
}

/**
 * فحص ما إذا كان النص يحتوي على عبارة البحث بعد تطبيع الاثنين
 */
export function arabicIncludes(target: string | null | undefined, query: string | null | undefined): boolean {
  if (!query) return true;
  if (!target) return false;
  return normalizeArabic(target).includes(normalizeArabic(query));
}
