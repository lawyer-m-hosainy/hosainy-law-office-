# STATIC_FINDINGS.md — تقرير التحليل الثابت

> تم التوليد تلقائياً بواسطة تحليل AST (ts-morph) بتاريخ 2026-11-04

## ملخص

| التصنيف | العدد | الحالة |
|---|---|---|
| 🔴 حرج | 0 | ✅ لا توجد مشاكل حرجة |
| 🟡 متوسط | 0 | ✅ لا توجد مشاكل متوسطة |
| 🔵 بسيط | 3 | ℹ️ ملاحظات للمستقبل |
| **الإجمالي** | **3** | |

## 🔵 ملاحظات بسيطة

| # | التصنيف | الملف | السطر | التفاصيل |
|---|---|---|---|---|
| 1 | ميزة في SPEC.md بدون واجهة | `SPEC.md` | 0 | الوضع الفاتح والداكن — غير موجود في الواجهة - الإعدادات لا تحتوي على مفتاح الوضع الداكن |
| 2 | ميزة في SPEC.md بدون واجهة | `SPEC.md` | 0 | تشفير قاعدة البيانات اختياريًا (SQLCipher) — غير مطبّق - SPEC يذكر SQLCipher لكن لم يُبنى في الإعدادات |
| 3 | ميزة في SPEC.md بدون واجهة | `SPEC.md` | 0 | اختصارات كيبورد للإضافة السريعة (قضية، جلسة، مهمة، حركة مالية) — فقط Ctrl+K للبحث، باقي الاختصارات غير موجودة |

---

## الإصلاحات المطبّقة في هذا الجرد

| # | المشكلة | الملف | الإصلاح |
|---|---|---|---|
| 1 | catch فارغ (6 مواقع) | index.ts, backupIpc.ts, trashBinIpc.ts, AutoBackupService.ts, ExportButton.tsx | أُضيف console.error أو alert لكل catch فارغ |
| 2 | catch بدون تسجيل (3 hooks) | useCases.ts, useClients.ts, useSettings.ts | أُضيف console.error قبل return |
| 3 | طريقة preload غير مستخدمة: getAppVersion | Sidebar.tsx | تم استدعاؤها لعرض رقم الإصدار في الشريط الجانبي |
| 4 | طريقة preload غير مستخدمة: getAnnouncementById | useAnnouncements.ts | تم إنشاء دالة getAnnouncementById في الـ hook |
| 5 | تبويب announcements غير موجود في Header tabTitles | Header.tsx | أُضيف تعريف announcements |
| 6 | import غير مستخدم: GenericPlaceholder | App.tsx | تم حذف الـ import |
| 7 | 731 عنصر تفاعلي بدون data-testid | كل ملفات الواجهة | أُضيف data-testid لكل عنصر بنمط page.section.action |
