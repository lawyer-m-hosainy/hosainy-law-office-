// src/shared/tafqit.ts: تحويل المبالغ المالية الرقمية إلى كلمات باللغة العربية (التفقيط)

const ONES: string[] = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const ONES_FEMININE: string[] = ['', 'واحدة', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع'];
const TEENS: string[] = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS: string[] = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS: string[] = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertUnderThousand(num: number): string {
  if (num === 0) return '';

  const h = Math.floor(num / 100);
  const remainder = num % 100;
  const parts: string[] = [];

  if (h > 0) {
    parts.push(HUNDREDS[h]);
  }

  if (remainder > 0) {
    if (remainder < 10) {
      parts.push(ONES[remainder]);
    } else if (remainder < 20) {
      parts.push(TEENS[remainder - 10]);
    } else {
      const o = remainder % 10;
      const t = Math.floor(remainder / 10);
      if (o > 0) {
        parts.push(`${ONES[o]} و${TENS[t]}`);
      } else {
        parts.push(TENS[t]);
      }
    }
  }

  return parts.join(' و');
}

export function tafqit(amount: number, currency = 'جنيه مصري', subCurrency = 'قرش'): string {
  if (amount === 0 || isNaN(amount)) return `صفر ${currency}`;

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const integerPart = Math.floor(absAmount);
  const fractionPart = Math.round((absAmount - integerPart) * 100);

  const parts: string[] = [];

  // Billions (مليار)
  const billions = Math.floor(integerPart / 1000000000);
  const remBillions = integerPart % 1000000000;

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(`${convertUnderThousand(billions)} مليارات`);
    else parts.push(`${convertUnderThousand(billions)} مليار`);
  }

  // Millions (مليون)
  const millions = Math.floor(remBillions / 1000000);
  const remMillions = remBillions % 1000000;

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertUnderThousand(millions)} ملايين`);
    else parts.push(`${convertUnderThousand(millions)} مليون`);
  }

  // Thousands (ألف)
  const thousands = Math.floor(remMillions / 1000);
  const underThousand = remMillions % 1000;

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertUnderThousand(thousands)} آلاف`);
    else parts.push(`${convertUnderThousand(thousands)} ألف`);
  }

  // Under thousand
  if (underThousand > 0) {
    parts.push(convertUnderThousand(underThousand));
  }

  let text = parts.join(' و');
  if (text.trim() === '') text = 'صفر';

  let result = `فقط ${text} ${currency}`;

  // Fractions (قروش)
  if (fractionPart > 0) {
    result += ` و${convertUnderThousand(fractionPart)} ${subCurrency}`;
  }

  result += ' لا غير';

  if (isNegative) {
    result = `سالب (${result})`;
  }

  return result;
}
