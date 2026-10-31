import { describe, it, expect } from 'vitest';
import {
  normalizeArabicText,
  matchesArabicSearch,
  matchesCaseSearch,
} from '../../src/shared/arabicUtils';

describe('Search and Arabic Normalization Tests (تطبيع النصوص العربية ومحرك البحث)', () => {
  describe('1. تطبيع الهمزات والألفات (أ/ا/إ/آ/ٱ)', () => {
    it('يوحد كافة أشكال الألف إلى ألف مجردة (ا)', () => {
      expect(normalizeArabicText('أحمد')).toBe('احمد');
      expect(normalizeArabicText('إبراهيم')).toBe('ابراهيم');
      expect(normalizeArabicText('آمال')).toBe('امال');
      expect(normalizeArabicText('ٱستئناف')).toBe('استيناف');
    });

    it('يطابق البحث حتى لو اختلفت كتابة الهمزة', () => {
      expect(matchesArabicSearch('أحمد محمد إبراهيم', 'احمد')).toBe(true);
      expect(matchesArabicSearch('احمد محمد ابراهيم', 'إبراهيم')).toBe(true);
      expect(matchesArabicSearch('دعوى استئناف', 'ٱستئناف')).toBe(true);
    });
  });

  describe('2. تطبيع التاء المربوطة والهاء (ة/ه)', () => {
    it('يوحد التاء المربوطة والهاء إلى هاء (ه)', () => {
      expect(normalizeArabicText('محكمة')).toBe('محكمه');
      expect(normalizeArabicText('قضايا')).toBe('قضايا');
      expect(normalizeArabicText('جنحة')).toBe('جنحه');
    });

    it('يطابق البحث بغض النظر عن كتابة النقطتين على التاء', () => {
      expect(matchesArabicSearch('محكمة شمال القاهرة الابتدائية', 'محكمه')).toBe(true);
      expect(matchesArabicSearch('محكمه جنوب الجيزه', 'محكمة')).toBe(true);
      expect(matchesArabicSearch('جنحة شيك بدون رصيد', 'جنحه')).toBe(true);
    });
  });

  describe('3. تطبيع الياء والألف المقصورة والهمزة على نبرة (ى/ي/ئ)', () => {
    it('يوحد الألف المقصورة والهمزة على نبرة إلى ياء (ي)', () => {
      expect(normalizeArabicText('مصطفى')).toBe('مصطفي');
      expect(normalizeArabicText('دعوى')).toBe('دعوي');
      expect(normalizeArabicText('قائم')).toBe('قايم');
    });

    it('يطابق البحث بين الياء والألف المقصورة', () => {
      expect(matchesArabicSearch('المستشار مصطفى السيد', 'مصطفي')).toBe(true);
      expect(matchesArabicSearch('علي محمود', 'على')).toBe(true);
      expect(matchesArabicSearch('دعوى صحة ونفاذ', 'دعوي')).toBe(true);
    });
  });

  describe('4. إزالة التشكيل والكشيدة والتطويل', () => {
    it('يزيل الفتحة، الضمة، الكسرة، التنوين، الشدة، والسكون والتطويل تماماً', () => {
      const formatted = 'مَحْكَمَةُ ٱسْتِئْنَافِ القَـــاهِرَةِ المُوَقَّرَةِ';
      expect(normalizeArabicText(formatted)).toBe('محكمه استيناف القاهره الموقره');
    });

    it('يطابق النص المشكّل بالبحث غير المشكّل والعكس', () => {
      expect(matchesArabicSearch('مُحَمَّد أَحْمَد', 'محمد')).toBe(true);
      expect(matchesArabicSearch('محمد احمد', 'مُحَمَّد')).toBe(true);
      expect(matchesArabicSearch('شِـــــيْك بَنْكِيّ', 'شيك')).toBe(true);
    });
  });

  describe('5. تطبيع الأرقام المشرقية (٠-٩) والأرقام الإنجليزية (0-9)', () => {
    it('يحول الأرقام المشرقية إلى أرقام قياسية موحدة', () => {
      expect(normalizeArabicText('٢٠٢٦')).toBe('2026');
      expect(normalizeArabicText('رقم ١٠٥٠')).toBe('رقم 1050');
      expect(normalizeArabicText('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
    });

    it('يطابق البحث عند إدخال الأرقام بأي من الطريقتين', () => {
      expect(matchesArabicSearch('قضية رقم 1050 لسنة 2026', '١٠٥٠')).toBe(true);
      expect(matchesArabicSearch('قضية رقم ١٠٥٠ لسنة ٢٠٢٦', '1050')).toBe(true);
      expect(matchesArabicSearch('توكيل رقم 4500 قضايا', '٤٥٠٠')).toBe(true);
    });
  });

  describe('6. البحث بالاسم الناقص وبرقم القضية والسنة', () => {
    it('يعثر على الموكل عند إدخال مقطع من اسمه فقط', () => {
      const clientName = 'أحمد محمد عبد الرحمن الشناوي';
      expect(matchesArabicSearch(clientName, 'الشناوي')).toBe(true);
      expect(matchesArabicSearch(clientName, 'عبد الرحمن')).toBe(true);
      expect(matchesArabicSearch(clientName, 'محمد')).toBe(true);

      // حالات حدية
      expect(normalizeArabicText(null)).toBe('');
      expect(normalizeArabicText(undefined)).toBe('');
      expect(matchesArabicSearch(null, 'test')).toBe(false);
      expect(matchesArabicSearch('target', '')).toBe(true);
    });

    it('يطابق القضية بالرقم المجرد، أو الرقم والسنة، أو الصيغ المركبة', () => {
      const caseItem = {
        case_number: '1050',
        case_year: 2026,
        subject: 'دعوى صحة ونفاذ عقد بيع شقة',
        court_name: 'محكمة شمال القاهرة الابتدائية',
      };

      // بالرقم
      expect(matchesCaseSearch(caseItem, '1050')).toBe(true);
      expect(matchesCaseSearch(caseItem, '١٠٥٠')).toBe(true);

      // بالسنة
      expect(matchesCaseSearch(caseItem, '2026')).toBe(true);
      expect(matchesCaseSearch(caseItem, '٢٠٢٦')).toBe(true);

      // بالرقم والسنة معاً
      expect(matchesCaseSearch(caseItem, '1050/2026')).toBe(true);
      expect(matchesCaseSearch(caseItem, '١٠٥٠/٢٠٢٦')).toBe(true);
      expect(matchesCaseSearch(caseItem, '1050 لسنة 2026')).toBe(true);
      expect(matchesCaseSearch(caseItem, '١٠٥٠ لسنه ٢٠٢٦')).toBe(true);

      // بموضوع الدعوى أو المحكمة
      expect(matchesCaseSearch(caseItem, 'صحة ونفاذ')).toBe(true);
      expect(matchesCaseSearch(caseItem, 'شمال القاهره')).toBe(true);

      // استعلام فارغ
      expect(matchesCaseSearch(caseItem, '')).toBe(true);
    });
  });
});
