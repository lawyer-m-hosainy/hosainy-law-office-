import { FinancialTransaction, OfficeSettings } from '../../shared/types';
import { tafqit } from '../../shared/tafqit';

export function generateReceiptHtml(
  tx: FinancialTransaction,
  settings: OfficeSettings
): string {
  const amountTafqit = tafqit(tx.amount);
  const isReversal = tx.is_reversed === 1 || Boolean(tx.reversal_of_id);

  const chequeInfo = tx.cheque_details 
    ? `بموجب شيك رقم (${tx.cheque_details.cheque_number}) مسحوب على بنك (${tx.cheque_details.bank_name}) استحقاق ${tx.cheque_details.due_date}`
    : '';

  const renderSingleVoucher = (voucherTypeTitle: string) => `
    <div class="receipt-box ${isReversal ? 'reversal-border' : ''}">
      <div class="receipt-header">
        <div class="header-right">
          <div class="office-name">${settings.office_name || 'مكتب المحاماة'}</div>
          <div class="lawyer-name">${settings.lawyer_name || ''}</div>
          <div class="lawyer-title">${settings.lawyer_title || 'محامٍ بالنقض والدستورية العليا'}</div>
        </div>
        <div class="header-center">
          ${settings.logo_path
            ? `<img class="logo-img" src="${settings.logo_path}" alt="الشعار" />`
            : `<div class="emblem">⚖️</div>`}
          <div class="voucher-title ${isReversal ? 'reversal-title' : ''}">
            ${isReversal ? 'إيصال قيد تسوية عكسي' : (tx.direction === 'وارد' ? 'إيصال استلام نقدية' : 'إذن صرف نقدي')}
          </div>
          <div class="voucher-copy-tag">(${voucherTypeTitle})</div>
        </div>
        <div class="header-left">
          <div class="receipt-num-box">
            <span class="num-lbl">رقم الإيصال:</span>
            <span class="num-val">${tx.receipt_number}</span>
          </div>
          <div class="receipt-date"><strong>التاريخ:</strong> ${tx.transaction_date}</div>
          ${settings.phone ? `<div><strong>هاتف:</strong> ${settings.phone}</div>` : ''}
        </div>
      </div>

      <div class="amount-banner">
        <div class="amount-number">
          ${tx.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} <span style="font-size: 10pt;">ج.م</span>
        </div>
        <div class="amount-words">
          ${amountTafqit}
        </div>
      </div>

      <div class="receipt-body">
        <div class="body-row">
          <span class="lbl">${tx.direction === 'وارد' ? 'استلمنا من السيد / السادة:' : 'صُرف إلى السيد / السادة:'}</span>
          <span class="val highlight">${tx.client_name || 'السيد الموكل'}</span>
        </div>

        <div class="body-row">
          <span class="lbl">وذلك سداد وقيمة:</span>
          <span class="val">${tx.category} — ${tx.transaction_type} (${tx.description})</span>
        </div>

        ${tx.case_number ? `
          <div class="body-row">
            <span class="lbl">الخاص بالقضية رقم:</span>
            <span class="val font-bold">
              ${tx.case_number} لسنة ${tx.case_year || ''} — محكمة ${tx.court_name || ''}
            </span>
          </div>
        ` : ''}

        <div class="body-row">
          <span class="lbl">طريقة الدفع:</span>
          <span class="val">
            <strong>${tx.payment_method}</strong>
            ${chequeInfo ? ` | ${chequeInfo}` : ''}
          </span>
        </div>

        ${tx.notes ? `
          <div class="body-row">
            <span class="lbl">ملاحظات:</span>
            <span class="val text-muted">${tx.notes}</span>
          </div>
        ` : ''}
      </div>

      <div class="receipt-footer">
        <div class="sig-box">
          <div>توقيع المستلم / المحاسب</div>
          <div class="sig-space"></div>
        </div>
        <div class="sig-box">
          <div>توقيع المودع / العميل</div>
          <div class="sig-space"></div>
        </div>
        <div class="sig-box">
          <div>خاتم واعتماد المكتب</div>
          <div class="sig-space"></div>
        </div>
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>إيصال مالي - ${tx.receipt_number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      direction: rtl;
    }

    .receipt-box {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 18px;
      background: #ffffff;
      position: relative;
    }

    .reversal-border {
      border-color: #dc2626 !important;
      background: #fffafa !important;
    }

    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .header-right {
      flex: 1.2;
      text-align: right;
    }

    .office-name {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .lawyer-name {
      font-size: 10.5pt;
      font-weight: 700;
      color: #b45309;
      margin: 1px 0;
    }

    .lawyer-title {
      font-size: 8pt;
      color: #475569;
    }

    .header-center {
      text-align: center;
      flex: 1;
    }

    .emblem {
      font-size: 24pt;
      line-height: 1;
    }

    .logo-img {
      max-width: 50px;
      max-height: 50px;
      object-fit: contain;
    }

    .voucher-title {
      font-size: 12pt;
      font-weight: 800;
      color: #1e293b;
      margin-top: 2px;
    }

    .reversal-title {
      color: #dc2626 !important;
    }

    .voucher-copy-tag {
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 600;
    }

    .header-left {
      flex: 1;
      text-align: left;
      font-size: 8.5pt;
    }

    .receipt-num-box {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 3px 8px;
      margin-bottom: 3px;
    }

    .num-val {
      font-family: monospace;
      font-weight: 800;
      color: #0369a1;
      font-size: 10pt;
    }

    .amount-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 12px;
    }

    .amount-number {
      font-size: 14pt;
      font-weight: 900;
      color: #0f172a;
      direction: ltr;
    }

    .amount-words {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e293b;
    }

    .receipt-body {
      margin-bottom: 14px;
      font-size: 9.5pt;
      space-y: 6px;
    }

    .body-row {
      display: flex;
      margin-bottom: 6px;
      border-bottom: 1px dotted #e2e8f0;
      padding-bottom: 3px;
    }

    .lbl {
      width: 170px;
      color: #475569;
      font-weight: 600;
      flex-shrink: 0;
    }

    .val {
      flex: 1;
      color: #0f172a;
    }

    .highlight {
      font-weight: 800;
      font-size: 10.5pt;
      color: #0f172a;
    }

    .text-muted {
      color: #64748b;
      font-size: 8.5pt;
    }

    .receipt-footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 8.5pt;
    }

    .sig-box {
      text-align: center;
      width: 170px;
    }

    .sig-space {
      height: 35px;
    }

    .cut-line {
      text-align: center;
      margin: 10px 0;
      color: #94a3b8;
      font-size: 8pt;
      border-top: 1px dashed #cbd5e1;
      padding-top: 4px;
      position: relative;
    }
  </style>
</head>
<body>
  <!-- Upper copy: Client Copy -->
  ${renderSingleVoucher('أصل يُسلّم للمودع / العميل')}

  <div class="cut-line">
    ✂ ----------------- خط قطع — نسخة أرشيف المكتب المعتمدة ----------------- ✂
  </div>

  <!-- Lower copy: Office Archive Copy -->
  ${renderSingleVoucher('صورة محفوظة بأرشيف حسابات المكتب')}
</body>
</html>
  `;
}
