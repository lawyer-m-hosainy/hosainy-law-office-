# تقرير الزحف الشامل والاختبار الآلي للواجهة (AUDIT_REPORT.md)

> تم التوليد آلياً بتاريخ: 2026-11-07

## 1. ملخص النتائج والتغطية الإجمالية

| المقياس | القيمة | النسبة |
|---|---|---|
| إجمالي عناصر الجرد (FEATURES_INVENTORY) | **731** | 100% |
| إجمالي العناصر المفحوصة في الزحف | **731** | **100.0%** |
| عناصر ناجحة تماماً (Pass) | **697** | 95.3% |
| عناصر مستثناة موثقة (Ignored) | **8** | 1.1% |
| أزرار خاملة بدون أثر (Dead Buttons) | **26** | 3.6% |
| عناصر واجهت أخطاء (Failures) | **0** | 0.0% |
| طلبات الشبكة الخارجية (Network Requests) | **0** | **0.0% (أوفلاين 100%)** |
| شاشات بيضاء أو ErrorBoundary | **0** | **0.0%** |

---

## 2. جدول الفحص لكل صفحة / تبويب

| الصفحة (Page) | الإجمالي | ناجح | خامل | مستثنى | فاشل | نسبة النجاح |
|---|---|---|---|---|---|---|
| `app` | 2 | 0 | 0 | 2 | 0 | 100% |
| `export` | 7 | 7 | 0 | 0 | 0 | 100% |
| `header` | 4 | 3 | 1 | 0 | 0 | 75% |
| `sidebar` | 1 | 1 | 0 | 0 | 0 | 100% |
| `search` | 5 | 5 | 0 | 0 | 0 | 100% |
| `lock` | 3 | 0 | 0 | 3 | 0 | 100% |
| `announcements` | 28 | 26 | 2 | 0 | 0 | 93% |
| `calendar-export` | 19 | 19 | 0 | 0 | 0 | 100% |
| `calendar` | 17 | 16 | 1 | 0 | 0 | 94% |
| `case` | 20 | 20 | 0 | 0 | 0 | 100% |
| `cases` | 58 | 58 | 0 | 0 | 0 | 100% |
| `clients` | 30 | 28 | 2 | 0 | 0 | 93% |
| `dashboard` | 19 | 18 | 1 | 0 | 0 | 95% |
| `executions` | 68 | 68 | 0 | 0 | 0 | 100% |
| `finance` | 39 | 35 | 4 | 0 | 0 | 90% |
| `hearings` | 27 | 23 | 4 | 0 | 0 | 85% |
| `reports` | 10 | 9 | 1 | 0 | 0 | 90% |
| `settings` | 43 | 40 | 2 | 1 | 0 | 95% |
| `tasks` | 55 | 53 | 2 | 0 | 0 | 96% |
| `trash` | 7 | 4 | 1 | 2 | 0 | 86% |
| `case.announcements` | 41 | 41 | 0 | 0 | 0 | 100% |
| `case.documents` | 24 | 23 | 1 | 0 | 0 | 96% |
| `case.executions` | 63 | 63 | 0 | 0 | 0 | 100% |
| `case.finance` | 38 | 38 | 0 | 0 | 0 | 100% |
| `case.hearings` | 38 | 38 | 0 | 0 | 0 | 100% |
| `case.tasks` | 24 | 24 | 0 | 0 | 0 | 100% |
| `case.timeline` | 12 | 10 | 2 | 0 | 0 | 83% |
| `settings.audit` | 6 | 6 | 0 | 0 | 0 | 100% |
| `settings.backup` | 15 | 13 | 2 | 0 | 0 | 87% |
| `settings.security` | 8 | 8 | 0 | 0 | 0 | 100% |

---

## 3. المشاكل مجمعة حسب السبب الجذري (Root Causes)

### السبب الجذري 1: لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت)

**عدد العناصر المتأثرة:** 26

| data-testid | الصفحة | نوع العنصر | النتيجة الفعلية |
|---|---|---|---|
| `dashboard.main.handle-print-today-roll` | `dashboard` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `clients.main.set-status-filter` | `clients` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `clients.main.handle-delete` | `clients` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `case.documents.tab.set-active-view` | `case.documents` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `case.timeline.tab.handle-print-timeline` | `case.timeline` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `case.timeline.tab.set-active-filter` | `case.timeline` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `hearings.main.handle-print-roll` | `hearings` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `hearings.main.handle-print-roll-2` | `hearings` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `hearings.main.handle-print-roll-3` | `hearings` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `hearings.main.set-date-filter-type` | `hearings` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `calendar.main.set-view-mode` | `calendar` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `finance.main.handle-print-general-report` | `finance` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `finance.main.load-finance-data` | `finance` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `finance.main.set-active-sub-tab` | `finance` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `finance.main.settings` | `finance` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `announcements.main.handle-print` | `announcements` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `announcements.main.set-filter-status` | `announcements` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `tasks.main.set-period-tab` | `tasks` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `tasks.main.set-view-mode` | `tasks` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `reports.main.set-selected-report` | `reports` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `trash.main.set-selected-type` | `trash` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `settings.main.set-active-tab` | `settings` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `settings.main.save-2` | `settings` | زرار إرسال | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `settings.backup.tab.handle-select-external-file` | `settings.backup` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `settings.backup.tab.handle-choose-custom-folder` | `settings.backup` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |
| `header.main.on-open-data-dir` | `header` | زرار | لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت) |

