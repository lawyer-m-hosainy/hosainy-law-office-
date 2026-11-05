# FEATURES_INVENTORY.md — جرد الوظائف الكامل

> تم التوليد تلقائياً بواسطة تحليل AST (ts-morph) بتاريخ 2026-11-04

## ملخص عام

| المقياس | القيمة |
|---|---|
| إجمالي العناصر التفاعلية | **731** |
| الصفحات / التبويبات | **30** |
| عناصر بها data-testid | **731** |
| عناصر بدون data-testid | **0** |

## عدد العناصر لكل صفحة

| الصفحة (Page) | الاسم بالعربي | العدد |
|---|---|---|
| executions | التنفيذات | 68 |
| case.executions | تبويب تنفيذات القضية | 63 |
| cases | قائمة القضايا | 58 |
| tasks | المهام | 55 |
| settings | الإعدادات | 43 |
| case.announcements | تبويب إعلانات القضية | 41 |
| finance | المالية | 39 |
| case.finance | تبويب مالية القضية | 38 |
| case.hearings | تبويب جلسات القضية | 38 |
| clients | الموكلين | 30 |
| announcements | الإعلانات والمحضرين | 28 |
| hearings | الجلسات | 27 |
| case.documents | تبويب مستندات القضية | 24 |
| case.tasks | تبويب مهام القضية | 24 |
| case | تفاصيل القضية | 20 |
| calendar-export | تصدير التقويم | 19 |
| dashboard | لوحة اليوم | 19 |
| calendar | التقويم | 17 |
| settings.backup | تبويب النسخ الاحتياطي | 15 |
| case.timeline | تبويب الخط الزمني | 12 |
| reports | التقارير | 10 |
| settings.security | تبويب الأمان | 8 |
| export | التصدير | 7 |
| trash | سلة المحذوفات | 7 |
| settings.audit | تبويب سجل التدقيق | 6 |
| search | البحث الشامل | 5 |
| header | الشريط العلوي | 4 |
| lock | شاشة القفل | 3 |
| app | التطبيق | 2 |
| sidebar | القائمة الجانبية | 1 |

---

## الجدول التفصيلي لكل صفحة

### التطبيق (`app`) — 2 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `app.main.retry` | زرار | `reload` | `-` | يعيد المحاولة / يحدّث البيانات |
| 2 | `app.main.handle-reset` | زرار | `handleReset` | `-` | يتفاعل مع العنصر حسب السياق |

### التصدير (`export`) — 7 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `export.main.set-is-open` | زرار | `setIsOpen` | `-` | يصدّر البيانات بالصيغة المطلوبة |
| 2 | `export.main.handle-export` | زرار | `handleExport` | `-` | يصدّر البيانات بالصيغة المطلوبة |
| 3 | `export.main.handle-export-2` | زرار | `handleExport` | `-` | يصدّر البيانات بالصيغة المطلوبة |
| 4 | `export.main.handle-open-file` | زرار | `handleOpenFile` | `-` | يصدّر البيانات بالصيغة المطلوبة |
| 5 | `export.main.on-api` | زرار | `onAPI` | `openDataDir` | يصدّر البيانات بالصيغة المطلوبة |
| 6 | `export.main.set-export-result` | زرار | `setExportResult` | `-` | يصدّر البيانات بالصيغة المطلوبة |
| 7 | `export.main.set-is-open-2` | div قابل للضغط | `setIsOpen` | `-` | يصدّر البيانات بالصيغة المطلوبة |

### الشريط العلوي (`header`) — 4 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `header.main.on-open-universal-search` | زرار | `onOpenUniversalSearch` | `-` | يبحث ويعرض النتائج المطابقة |
| 2 | `header.main.on-open-data-dir` | زرار | `onOpenDataDir` | `-` | يفتح مجلد بيانات البرنامج في المستكشف |
| 3 | `header.main.on-lock-app` | زرار | `onLockApp` | `-` | يقفل البرنامج بكلمة المرور |
| 4 | `header.main.on-open-quick-print` | زرار | `onOpenQuickPrint` | `-` | يولّد تقرير PDF قابل للطباعة |

### القائمة الجانبية (`sidebar`) — 1 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `sidebar.main.on-tab-change` | زرار | `onTabChange` | `-` | يغيّر التبويب أو الصفحة المعروضة |

### البحث الشامل (`search`) — 5 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `search.main.set-query` | زرار | `setQuery` | `-` | يبحث ويعرض النتائج المطابقة |
| 2 | `search.main.on-close` | زرار | `onClose` | `-` | يبحث ويعرض النتائج المطابقة |
| 3 | `search.main.set-selected-entity` | زرار | `setSelectedEntity` | `-` | يبحث ويعرض النتائج المطابقة |
| 4 | `search.main.handle-select-item` | div قابل للضغط | `handleSelectItem` | `-` | يبحث ويعرض النتائج المطابقة |
| 5 | `search.main.set-query-2` | حقل إدخال | `setQuery` | `-` | يبحث ويعرض النتائج المطابقة |

### شاشة القفل (`lock`) — 3 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `lock.main.set-show-password` | زرار | `setShowPassword` | `-` | يقفل البرنامج بكلمة المرور |
| 2 | `lock.main.button-2` | زرار إرسال | `-` | `-` | يقفل البرنامج بكلمة المرور |
| 3 | `lock.main.set-password` | حقل إدخال | `setPassword` | `-` | يقفل البرنامج بكلمة المرور |

### الإعلانات والمحضرين (`announcements`) — 28 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `announcements.main.handle-print` | زرار | `handlePrint` | `-` | يولّد تقرير PDF قابل للطباعة |
| 2 | `announcements.main.set-filter-status` | زرار | `setFilterStatus` | `-` | يفلتر البيانات المعروضة |
| 3 | `announcements.main.set-filter-status-2` | زرار | `setFilterStatus` | `-` | يفلتر البيانات المعروضة |
| 4 | `announcements.main.set-filter-status-3` | زرار | `setFilterStatus` | `-` | يفلتر البيانات المعروضة |
| 5 | `announcements.main.set-selected-office` | قائمة اختيار | `setSelectedOffice` | `-` | يفلتر البيانات المعروضة |
| 6 | `announcements.main.on-navigate-to-case` | زرار | `onNavigateToCase` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 7 | `announcements.main.handle-open-status-modal` | زرار | `handleOpenStatusModal` | `-` | يفتح النافذة أو العنصر |
| 8 | `announcements.main.handle-open-reattempt-modal` | زرار | `handleOpenReattemptModal` | `-` | يفتح النافذة أو العنصر |
| 9 | `announcements.main.handle-delete` | زرار | `handleDelete` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 10 | `announcements.main.set-status-modal-item` | زرار | `setStatusModalItem` | `-` | يتفاعل مع العنصر حسب السياق |
| 11 | `announcements.main.set-status-form` | قائمة اختيار | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 12 | `announcements.main.set-status-modal-item-2` | زرار | `setStatusModalItem` | `-` | يتفاعل مع العنصر حسب السياق |
| 13 | `announcements.main.button-13` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 14 | `announcements.main.set-reattempt-modal-item` | زرار | `setReattemptModalItem` | `-` | يتفاعل مع العنصر حسب السياق |
| 15 | `announcements.main.set-reattempt-modal-item-2` | زرار | `setReattemptModalItem` | `-` | يتفاعل مع العنصر حسب السياق |
| 16 | `announcements.main.button-16` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 17 | `announcements.main.set-search-query` | حقل إدخال | `setSearchQuery` | `-` | يبحث ويعرض النتائج المطابقة |
| 18 | `announcements.main.set-start-date` | حقل تاريخ | `setStartDate` | `-` | يدخل / يعدّل قيمة الحقل |
| 19 | `announcements.main.set-end-date` | حقل تاريخ | `setEndDate` | `-` | يدخل / يعدّل قيمة الحقل |
| 20 | `announcements.main.set-status-form-2` | حقل تاريخ | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 21 | `announcements.main.set-status-form-3` | حقل إدخال | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 22 | `announcements.main.set-status-form-4` | حقل نص | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `announcements.main.set-status-form-5` | حقل نص | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `announcements.main.set-reattempt-form` | حقل إدخال | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 25 | `announcements.main.set-reattempt-form-2` | حقل إدخال | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 26 | `announcements.main.set-reattempt-form-3` | حقل تاريخ | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 27 | `announcements.main.set-reattempt-form-4` | حقل رقمي | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 28 | `announcements.main.set-reattempt-form-5` | حقل نص | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |

### تصدير التقويم (`calendar-export`) — 19 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `calendar-export.main.on-close` | زرار | `onClose` | `-` | يصدّر التقويم كملف ICS |
| 2 | `calendar-export.main.button-2` | زرار | `applyPreset` | `-` | يصدّر التقويم كملف ICS |
| 3 | `calendar-export.main.onth` | زرار | `applyPreset` | `-` | يصدّر التقويم كملف ICS |
| 4 | `calendar-export.main.onth-2` | زرار | `applyPreset` | `-` | يصدّر التقويم كملف ICS |
| 5 | `calendar-export.main.onths` | زرار | `applyPreset` | `-` | يصدّر التقويم كملف ICS |
| 6 | `calendar-export.main.button-6` | زرار | `applyPreset` | `-` | يصدّر التقويم كملف ICS |
| 7 | `calendar-export.main.on-api` | زرار | `exportResult` | `openExportedFile` | يصدّر التقويم كملف ICS |
| 8 | `calendar-export.main.on-api-2` | زرار | `onAPI` | `openDataDir` | يصدّر التقويم كملف ICS |
| 9 | `calendar-export.main.handle-copy-today-summary` | زرار | `handleCopyTodaySummary` | `-` | يصدّر التقويم كملف ICS |
| 10 | `calendar-export.main.on-close-2` | زرار | `onClose` | `-` | يصدّر التقويم كملف ICS |
| 11 | `calendar-export.main.handle-export` | زرار | `handleExport` | `-` | يصدّر التقويم كملف ICS |
| 12 | `calendar-export.main.set-privacy-mode` | خانة اختيار | `setPrivacyMode` | `-` | يصدّر التقويم كملف ICS |
| 13 | `calendar-export.main.set-start-date` | حقل تاريخ | `setStartDate` | `-` | يصدّر التقويم كملف ICS |
| 14 | `calendar-export.main.set-end-date` | حقل تاريخ | `setEndDate` | `-` | يصدّر التقويم كملف ICS |
| 15 | `calendar-export.main.set-include-hearings` | خانة اختيار | `setIncludeHearings` | `-` | يصدّر التقويم كملف ICS |
| 16 | `calendar-export.main.set-include-tasks` | خانة اختيار | `setIncludeTasks` | `-` | يصدّر التقويم كملف ICS |
| 17 | `calendar-export.main.set-include-appeals` | خانة اختيار | `setIncludeAppeals` | `-` | يصدّر التقويم كملف ICS |
| 18 | `calendar-export.main.set-include-cheques` | خانة اختيار | `setIncludeCheques` | `-` | يصدّر التقويم كملف ICS |
| 19 | `calendar-export.main.set-include-poa-expiry` | خانة اختيار | `setIncludePoaExpiry` | `-` | يصدّر التقويم كملف ICS |

### التقويم (`calendar`) — 17 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `calendar.main.set-view-mode` | زرار | `setViewMode` | `-` | يتفاعل مع العنصر حسب السياق |
| 2 | `calendar.main.set-view-mode-2` | زرار | `setViewMode` | `-` | يتفاعل مع العنصر حسب السياق |
| 3 | `calendar.main.set-view-mode-3` | زرار | `setViewMode` | `-` | يتفاعل مع العنصر حسب السياق |
| 4 | `calendar.main.handle-prev` | زرار | `handlePrev` | `-` | يتفاعل مع العنصر حسب السياق |
| 5 | `calendar.main.handle-today` | زرار | `handleToday` | `-` | يتفاعل مع العنصر حسب السياق |
| 6 | `calendar.main.handle-next` | زرار | `handleNext` | `-` | يتفاعل مع العنصر حسب السياق |
| 7 | `calendar.main.handle-copy-today-summary` | زرار | `handleCopyTodaySummary` | `-` | يتفاعل مع العنصر حسب السياق |
| 8 | `calendar.main.set-is-export-modal-open` | زرار | `setIsExportModalOpen` | `-` | يصدّر التقويم كملف ICS |
| 9 | `calendar.main.set-selected-day-date` | div قابل للضغط | `setSelectedDayDate` | `-` | يفلتر البيانات المعروضة |
| 10 | `calendar.main.set-selected-hearing` | div قابل للضغط | `on` | `-` | يفلتر البيانات المعروضة |
| 11 | `calendar.main.set-selected-hearing-2` | div قابل للضغط | `setSelectedHearing` | `-` | يفلتر البيانات المعروضة |
| 12 | `calendar.main.set-selected-hearing-3` | زرار | `setSelectedHearing` | `-` | يفلتر البيانات المعروضة |
| 13 | `calendar.main.on-navigate-to-case` | زرار | `onNavigateToCase` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 14 | `calendar.main.set-selected-hearing-4` | زرار | `setSelectedHearing` | `-` | يفلتر البيانات المعروضة |
| 15 | `calendar.main.set-selected-hearing-5` | زرار | `setSelectedHearing` | `-` | يفلتر البيانات المعروضة |
| 16 | `calendar.main.set-selected-hearing-6` | زرار | `onst` | `-` | يفلتر البيانات المعروضة |
| 17 | `calendar.main.set-selected-day-date-2` | حقل تاريخ | `setSelectedDayDate` | `-` | يفلتر البيانات المعروضة |

### تفاصيل القضية (`case`) — 20 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `case.main.on-back` | زرار | `onBack` | `-` | يتفاعل مع العنصر حسب السياق |
| 2 | `case.main.on-back-2` | زرار | `onBack` | `-` | يتفاعل مع العنصر حسب السياق |
| 3 | `case.main.handle-print-case-sheet` | زرار | `handlePrintCaseSheet` | `-` | يولّد تقرير PDF قابل للطباعة |
| 4 | `case.main.handle-print-case-sheet-2` | زرار | `handlePrintCaseSheet` | `-` | يولّد تقرير PDF قابل للطباعة |
| 5 | `case.main.handle-print-case-sheet-3` | زرار | `handlePrintCaseSheet` | `-` | يولّد تقرير PDF قابل للطباعة |
| 6 | `case.main.handle-open-edit-modal` | زرار | `handleOpenEditModal` | `-` | يفتح نافذة تعديل العنصر |
| 7 | `case.main.set-active-tab` | زرار | `setActiveTab` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 8 | `case.main.set-is-edit-modal-open` | زرار | `setIsEditModalOpen` | `-` | يفتح نافذة تعديل العنصر |
| 9 | `case.main.set-edit-form-data` | قائمة اختيار | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 10 | `case.main.set-edit-form-data-2` | قائمة اختيار | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 11 | `case.main.set-edit-form-data-3` | قائمة اختيار | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 12 | `case.main.set-edit-form-data-4` | قائمة اختيار | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 13 | `case.main.set-is-edit-modal-open-2` | زرار | `setIsEditModalOpen` | `-` | يفتح نافذة تعديل العنصر |
| 14 | `case.main.button-14` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 15 | `case.main.set-edit-form-data-5` | حقل إدخال | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 16 | `case.main.set-edit-form-data-6` | حقل رقمي | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 17 | `case.main.set-edit-form-data-7` | حقل إدخال | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 18 | `case.main.set-edit-form-data-8` | حقل إدخال | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 19 | `case.main.set-edit-form-data-9` | حقل إدخال | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |
| 20 | `case.main.set-edit-form-data-10` | حقل نص | `setEditFormData` | `-` | يفتح نافذة تعديل العنصر |

### قائمة القضايا (`cases`) — 58 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `cases.main.handle-open-add-modal` | زرار | `handleOpenAddModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 2 | `cases.main.set-status-filter` | قائمة اختيار | `setStatusFilter` | `-` | يفلتر البيانات المعروضة |
| 3 | `cases.main.set-court-filter` | قائمة اختيار | `setCourtFilter` | `-` | يفلتر البيانات المعروضة |
| 4 | `cases.main.set-type-filter` | قائمة اختيار | `setTypeFilter` | `-` | يفلتر البيانات المعروضة |
| 5 | `cases.main.set-priority-filter` | قائمة اختيار | `setPriorityFilter` | `-` | يفلتر البيانات المعروضة |
| 6 | `cases.main.on-open-case-details` | div قابل للضغط | `onOpenCaseDetails` | `-` | يفتح النافذة أو العنصر |
| 7 | `cases.main.handle-delete` | زرار | `handleDelete` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 8 | `cases.main.set-page-size` | قائمة اختيار | `setPageSize` | `-` | يدخل / يعدّل قيمة الحقل |
| 9 | `cases.main.set-current-page` | زرار | `setCurrentPage` | `-` | يتفاعل مع العنصر حسب السياق |
| 10 | `cases.main.set-current-page-2` | زرار | `setCurrentPage` | `-` | يتفاعل مع العنصر حسب السياق |
| 11 | `cases.main.set-current-page-3` | زرار | `setCurrentPage` | `-` | يتفاعل مع العنصر حسب السياق |
| 12 | `cases.main.set-current-page-4` | زرار | `setCurrentPage` | `-` | يتفاعل مع العنصر حسب السياق |
| 13 | `cases.main.set-current-page-5` | زرار | `setCurrentPage` | `-` | يتفاعل مع العنصر حسب السياق |
| 14 | `cases.main.set-is-add-modal-open` | زرار | `setIsAddModalOpen` | `-` | يفتح نافذة إضافة قضية جديدة |
| 15 | `cases.main.set-form-data` | قائمة اختيار | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 16 | `cases.main.handle-case-type-change` | قائمة اختيار | `handleCaseTypeChange` | `-` | يدخل / يعدّل قيمة الحقل |
| 17 | `cases.main.set-form-data-2` | قائمة اختيار | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 18 | `cases.main.set-form-data-3` | قائمة اختيار | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 19 | `cases.main.set-form-data-4` | قائمة اختيار | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 20 | `cases.main.set-is-quick-add-client-modal-open` | زرار | `setIsQuickAddClientModalOpen` | `-` | يفتح نافذة إضافة موكل جديد |
| 21 | `cases.main.handle-add-client-to-case` | زرار | `handleAddClientToCase` | `-` | يفتح نافذة إضافة موكل جديد |
| 22 | `cases.main.set-form-data-5` | قائمة اختيار | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `cases.main.set-form-data-6` | قائمة اختيار | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `cases.main.handle-remove-client-from-case` | زرار | `handleRemoveClientFromCase` | `-` | يتفاعل مع العنصر حسب السياق |
| 25 | `cases.main.handle-add-opponent-to-case` | زرار | `handleAddOpponentToCase` | `-` | يفتح نافذة إضافة قضية جديدة |
| 26 | `cases.main.handle-remove-opponent-from-case` | زرار | `handleRemoveOpponentFromCase` | `-` | يتفاعل مع العنصر حسب السياق |
| 27 | `cases.main.set-form-data-7` | قائمة اختيار | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 28 | `cases.main.set-is-add-modal-open-2` | زرار | `setIsAddModalOpen` | `-` | يفتح نافذة إضافة قضية جديدة |
| 29 | `cases.main.button-29` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 30 | `cases.main.set-is-quick-add-client-modal-open-2` | زرار | `setIsQuickAddClientModalOpen` | `-` | يفتح نافذة إضافة موكل جديد |
| 31 | `cases.main.set-is-quick-add-client-modal-open-3` | زرار | `setIsQuickAddClientModalOpen` | `-` | يفتح نافذة إضافة موكل جديد |
| 32 | `cases.main.button-32` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 33 | `cases.main.set-search-query` | حقل إدخال | `setSearchQuery` | `-` | يبحث ويعرض النتائج المطابقة |
| 34 | `cases.main.set-form-data-8` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 35 | `cases.main.set-form-data-9` | حقل رقمي | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 36 | `cases.main.set-form-data-10` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 37 | `cases.main.set-form-data-11` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 38 | `cases.main.set-form-data-12` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 39 | `cases.main.set-form-data-13` | حقل تاريخ | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 40 | `cases.main.set-form-data-14` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 41 | `cases.main.set-form-data-15` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 42 | `cases.main.set-form-data-16` | حقل نص | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 43 | `cases.main.set-form-data-17` | حقل نص | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 44 | `cases.main.set-form-data-18` | حقل إدخال | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 45 | `cases.main.set-form-data-19` | حقل إدخال | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 46 | `cases.main.set-form-data-20` | حقل إدخال | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 47 | `cases.main.set-form-data-21` | حقل إدخال | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 48 | `cases.main.set-form-data-22` | خانة اختيار | `setFormData` | `-` | يتفاعل مع العنصر حسب السياق |
| 49 | `cases.main.set-form-data-23` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 50 | `cases.main.set-form-data-24` | حقل رقمي | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 51 | `cases.main.set-form-data-25` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 52 | `cases.main.set-form-data-26` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 53 | `cases.main.set-form-data-27` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 54 | `cases.main.set-form-data-28` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 55 | `cases.main.set-form-data-29` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 56 | `cases.main.set-form-data-30` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 57 | `cases.main.set-quick-client-name` | حقل إدخال | `setQuickClientName` | `-` | يدخل / يعدّل قيمة الحقل |
| 58 | `cases.main.set-quick-client-phone` | حقل إدخال | `setQuickClientPhone` | `-` | يدخل / يعدّل قيمة الحقل |

### الموكلين (`clients`) — 30 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `clients.main.set-status-filter` | زرار | `setStatusFilter` | `-` | يفلتر البيانات المعروضة |
| 2 | `clients.main.set-status-filter-2` | زرار | `setStatusFilter` | `-` | يفلتر البيانات المعروضة |
| 3 | `clients.main.set-status-filter-3` | زرار | `setStatusFilter` | `-` | يفلتر البيانات المعروضة |
| 4 | `clients.main.handle-open-add-modal` | زرار | `handleOpenAddModal` | `-` | يفتح نافذة إضافة موكل جديد |
| 5 | `clients.main.handle-view-client-details` | زرار | `handleViewClientDetails` | `-` | يتفاعل مع العنصر حسب السياق |
| 6 | `clients.main.handle-open-edit-modal` | زرار | `handleOpenEditModal` | `-` | يفتح نافذة تعديل العنصر |
| 7 | `clients.main.handle-archive-toggle` | زرار | `handleArchiveToggle` | `-` | يبدّل الحالة (تفعيل/تعطيل) |
| 8 | `clients.main.handle-delete` | زرار | `handleDelete` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 9 | `clients.main.set-is-modal-open` | زرار | `setIsModalOpen` | `-` | يفتح النافذة أو العنصر |
| 10 | `clients.main.set-form-data` | قائمة اختيار | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 11 | `clients.main.set-form-data-2` | قائمة اختيار | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 12 | `clients.main.set-form-data-3` | قائمة اختيار | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 13 | `clients.main.set-is-modal-open-2` | زرار | `setIsModalOpen` | `-` | يفتح النافذة أو العنصر |
| 14 | `clients.main.button-14` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 15 | `clients.main.set-selected-client-for-view` | زرار | `setSelectedClientForView` | `-` | يفلتر البيانات المعروضة |
| 16 | `clients.main.set-selected-client-for-view-2` | زرار | `setSelectedClientForView` | `-` | يفلتر البيانات المعروضة |
| 17 | `clients.main.set-search-query` | حقل إدخال | `setSearchQuery` | `-` | يبحث ويعرض النتائج المطابقة |
| 18 | `clients.main.set-form-data-4` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 19 | `clients.main.set-form-data-5` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 20 | `clients.main.set-form-data-6` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 21 | `clients.main.set-form-data-7` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 22 | `clients.main.set-form-data-8` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `clients.main.set-form-data-9` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `clients.main.set-form-data-10` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 25 | `clients.main.set-form-data-11` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 26 | `clients.main.set-form-data-12` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 27 | `clients.main.set-form-data-13` | حقل تاريخ | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 28 | `clients.main.set-form-data-14` | حقل تاريخ | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 29 | `clients.main.set-form-data-15` | حقل إدخال | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |
| 30 | `clients.main.set-form-data-16` | حقل نص | `setFormData` | `-` | يدخل / يعدّل قيمة الحقل |

### لوحة اليوم (`dashboard`) — 19 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `dashboard.main.handle-print-today-roll` | زرار | `handlePrintTodayRoll` | `-` | يولّد رول الجلسات PDF للطباعة |
| 2 | `dashboard.main.on-navigate` | زرار | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 3 | `dashboard.main.on-navigate-2` | زرار | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 4 | `dashboard.main.on-navigate-3` | زرار | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 5 | `dashboard.main.on-navigate-4` | div قابل للضغط | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 6 | `dashboard.main.on-navigate-5` | div قابل للضغط | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 7 | `dashboard.main.on-navigate-6` | زرار | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 8 | `dashboard.main.handle-open-case` | div قابل للضغط | `handleOpenCase` | `-` | يفتح النافذة أو العنصر |
| 9 | `dashboard.main.handle-print-today-roll-2` | زرار | `handlePrintTodayRoll` | `-` | يولّد رول الجلسات PDF للطباعة |
| 10 | `dashboard.main.handle-print-today-roll-3` | زرار | `handlePrintTodayRoll` | `-` | يولّد رول الجلسات PDF للطباعة |
| 11 | `dashboard.main.on-navigate-7` | زرار | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 12 | `dashboard.main.handle-open-case-2` | زرار | `handleOpenCase` | `-` | يفتح النافذة أو العنصر |
| 13 | `dashboard.main.on-navigate-8` | زرار | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 14 | `dashboard.main.on-navigate-9` | زرار | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 15 | `dashboard.main.on-api` | زرار | `onAPI` | `updateTask` | يتفاعل مع العنصر حسب السياق |
| 16 | `dashboard.main.handle-open-case-3` | زرار | `handleOpenCase` | `-` | يفتح النافذة أو العنصر |
| 17 | `dashboard.main.handle-open-case-4` | زرار | `handleOpenCase` | `-` | يفتح النافذة أو العنصر |
| 18 | `dashboard.main.on-navigate-10` | زرار | `onNavigate` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 19 | `dashboard.main.on-open-data-dir` | زرار | `onOpenDataDir` | `-` | يفتح مجلد بيانات البرنامج في المستكشف |

### التنفيذات (`executions`) — 68 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `executions.main.set-selected-deed-type` | قائمة اختيار | `setSelectedDeedType` | `-` | يفلتر البيانات المعروضة |
| 2 | `executions.main.set-selected-status` | قائمة اختيار | `setSelectedStatus` | `-` | يفلتر البيانات المعروضة |
| 3 | `executions.main.set-selected-case-link` | قائمة اختيار | `setSelectedCaseLink` | `-` | يفلتر البيانات المعروضة |
| 4 | `executions.main.set-new-file-form` | زرار | `setNewFileForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 5 | `executions.main.set-selected-file-id` | div قابل للضغط | `setSelectedFileId` | `-` | يفلتر البيانات المعروضة |
| 6 | `executions.main.handle-print` | زرار | `handlePrint` | `-` | يولّد تقرير PDF قابل للطباعة |
| 7 | `executions.main.on-navigate-to-case` | زرار | `onNavigateToCase` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 8 | `executions.main.set-selected-file-id-2` | زرار | `onfirm` | `-` | يفلتر البيانات المعروضة |
| 9 | `executions.main.set-detail-tab` | زرار | `setDetailTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 10 | `executions.main.set-detail-tab-2` | زرار | `setDetailTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 11 | `executions.main.set-detail-tab-3` | زرار | `setDetailTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 12 | `executions.main.set-detail-tab-4` | زرار | `setDetailTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 13 | `executions.main.set-detail-tab-5` | زرار | `setDetailTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 14 | `executions.main.set-is-action-modal-open` | زرار | `setIsActionModalOpen` | `-` | يفتح النافذة أو العنصر |
| 15 | `executions.main.set-hearing-form` | زرار | `setHearingForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 16 | `executions.main.set-selected-hearing-to-outcome` | زرار | `setSelectedHearingToOutcome` | `-` | يفلتر البيانات المعروضة |
| 17 | `executions.main.set-payment-form` | زرار | `setPaymentForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 18 | `executions.main.set-settlement-form` | زرار | `setSettlementForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 19 | `executions.main.handle-case-selection` | قائمة اختيار | `handleCaseSelection` | `-` | يفلتر البيانات المعروضة |
| 20 | `executions.main.set-new-file-form-2` | قائمة اختيار | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 21 | `executions.main.set-is-new-file-modal-open` | زرار | `setIsNewFileModalOpen` | `-` | يفتح الملف المحدد |
| 22 | `executions.main.open` | زرار إرسال | `-` | `-` | يفتح النافذة أو العنصر |
| 23 | `executions.main.set-action-form` | قائمة اختيار | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `executions.main.set-action-form-2` | قائمة اختيار | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 25 | `executions.main.set-is-action-modal-open-2` | زرار | `setIsActionModalOpen` | `-` | يفتح النافذة أو العنصر |
| 26 | `executions.main.save` | زرار إرسال | `-` | `-` | يحفظ البيانات ويُظهر رسالة نجاح |
| 27 | `executions.main.set-is-hearing-modal-open` | زرار | `setIsHearingModalOpen` | `-` | يفتح النافذة أو العنصر |
| 28 | `executions.main.save-2` | زرار إرسال | `-` | `-` | يحفظ البيانات ويُظهر رسالة نجاح |
| 29 | `executions.main.set-hearing-outcome-form` | قائمة اختيار | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 30 | `executions.main.set-is-hearing-outcome-modal-open` | زرار | `setIsHearingOutcomeModalOpen` | `-` | يفتح النافذة أو العنصر |
| 31 | `executions.main.save-3` | زرار إرسال | `-` | `-` | يحفظ البيانات ويُظهر رسالة نجاح |
| 32 | `executions.main.set-payment-form-2` | قائمة اختيار | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 33 | `executions.main.set-payment-form-3` | قائمة اختيار | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 34 | `executions.main.set-is-payment-modal-open` | زرار | `setIsPaymentModalOpen` | `-` | يفتح النافذة أو العنصر |
| 35 | `executions.main.save-4` | زرار إرسال | `-` | `-` | يحفظ البيانات ويُظهر رسالة نجاح |
| 36 | `executions.main.set-is-settlement-modal-open` | زرار | `setIsSettlementModalOpen` | `-` | يفتح النافذة أو العنصر |
| 37 | `executions.main.button-37` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 38 | `executions.main.set-search-query` | حقل إدخال | `setSearchQuery` | `-` | يبحث ويعرض النتائج المطابقة |
| 39 | `executions.main.set-new-file-form-3` | حقل إدخال | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 40 | `executions.main.set-new-file-form-4` | حقل رقمي | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 41 | `executions.main.set-new-file-form-5` | حقل إدخال | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 42 | `executions.main.set-new-file-form-6` | حقل إدخال | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 43 | `executions.main.set-new-file-form-7` | حقل إدخال | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 44 | `executions.main.set-new-file-form-8` | حقل إدخال | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 45 | `executions.main.set-new-file-form-9` | حقل إدخال | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 46 | `executions.main.set-new-file-form-10` | حقل رقمي | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 47 | `executions.main.set-new-file-form-11` | حقل تاريخ | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 48 | `executions.main.set-new-file-form-12` | حقل نص | `setNewFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 49 | `executions.main.set-action-form-3` | حقل تاريخ | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 50 | `executions.main.set-action-form-4` | حقل إدخال | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 51 | `executions.main.set-action-form-5` | حقل رقمي | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 52 | `executions.main.set-action-form-6` | حقل إدخال | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 53 | `executions.main.set-action-form-7` | حقل نص | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 54 | `executions.main.set-hearing-form-2` | حقل تاريخ | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 55 | `executions.main.set-hearing-form-3` | حقل وقت | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 56 | `executions.main.set-hearing-form-4` | حقل إدخال | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 57 | `executions.main.set-hearing-form-5` | حقل إدخال | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 58 | `executions.main.set-hearing-form-6` | حقل إدخال | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 59 | `executions.main.set-hearing-form-7` | حقل نص | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 60 | `executions.main.set-hearing-outcome-form-2` | حقل إدخال | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 61 | `executions.main.set-hearing-outcome-form-3` | حقل نص | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 62 | `executions.main.set-hearing-outcome-form-4` | حقل إدخال | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 63 | `executions.main.set-hearing-outcome-form-5` | حقل تاريخ | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 64 | `executions.main.set-payment-form-4` | حقل رقمي | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 65 | `executions.main.set-payment-form-5` | حقل إدخال | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 66 | `executions.main.set-payment-form-6` | حقل إدخال | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 67 | `executions.main.set-settlement-form-2` | حقل تاريخ | `setSettlementForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 68 | `executions.main.set-settlement-form-3` | حقل نص | `setSettlementForm` | `-` | يدخل / يعدّل قيمة الحقل |

### المالية (`finance`) — 39 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `finance.main.handle-print-general-report` | زرار | `handlePrintGeneralReport` | `-` | يولّد تقرير PDF قابل للطباعة |
| 2 | `finance.main.set-show-add-tx-modal` | زرار | `setShowAddTxModal` | `-` | يفتح نافذة إضافة حركة مالية |
| 3 | `finance.main.load-finance-data` | زرار | `loadFinanceData` | `-` | يتفاعل مع العنصر حسب السياق |
| 4 | `finance.main.set-active-sub-tab` | زرار | `setActiveSubTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 5 | `finance.main.set-active-sub-tab-2` | زرار | `setActiveSubTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 6 | `finance.main.set-active-sub-tab-3` | زرار | `setActiveSubTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 7 | `finance.main.set-period-filter` | زرار | `setPeriodFilter` | `-` | يفلتر البيانات المعروضة |
| 8 | `finance.main.set-selected-category` | قائمة اختيار | `setSelectedCategory` | `-` | يفلتر البيانات المعروضة |
| 9 | `finance.main.set-selected-direction` | قائمة اختيار | `setSelectedDirection` | `-` | يفلتر البيانات المعروضة |
| 10 | `finance.main.set-selected-method` | قائمة اختيار | `setSelectedMethod` | `-` | يفلتر البيانات المعروضة |
| 11 | `finance.main.on-navigate-to-case` | زرار | `onNavigateToCase` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 12 | `finance.main.handle-print-receipt` | زرار | `handlePrintReceipt` | `-` | يولّد إيصال استلام نقدية مرقم PDF |
| 13 | `finance.main.set-selected-tx-to-reverse` | زرار | `setSelectedTxToReverse` | `-` | يفلتر البيانات المعروضة |
| 14 | `finance.main.set-cheque-status-filter` | زرار | `setChequeStatusFilter` | `-` | يفلتر البيانات المعروضة |
| 15 | `finance.main.handle-collect-cheque` | زرار | `handleCollectCheque` | `-` | يحصّل الشيك ويحدّث الحالة |
| 16 | `finance.main.handle-bounce-cheque` | زرار | `handleBounceCheque` | `-` | يسجّل ارتداد الشيك |
| 17 | `finance.main.set-selected-client-id` | قائمة اختيار | `setSelectedClientId` | `-` | يفلتر البيانات المعروضة |
| 18 | `finance.main.settings` | زرار | `onst` | `executePrint` | يتفاعل مع العنصر حسب السياق |
| 19 | `finance.main.set-show-add-tx-modal-2` | زرار | `setShowAddTxModal` | `-` | يفتح نافذة إضافة حركة مالية |
| 20 | `finance.main.set-tx-form` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 21 | `finance.main.set-tx-form-2` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 22 | `finance.main.set-tx-form-3` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `finance.main.set-tx-form-4` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `finance.main.set-tx-form-5` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 25 | `finance.main.set-show-add-tx-modal-3` | زرار | `setShowAddTxModal` | `-` | يفتح نافذة إضافة حركة مالية |
| 26 | `finance.main.save` | زرار إرسال | `-` | `-` | يحفظ البيانات ويُظهر رسالة نجاح |
| 27 | `finance.main.set-show-reverse-modal` | زرار | `setShowReverseModal` | `-` | يتفاعل مع العنصر حسب السياق |
| 28 | `finance.main.cancel` | زرار إرسال | `-` | `-` | يغلق النافذة بدون حفظ |
| 29 | `finance.main.set-search-query` | حقل إدخال | `setSearchQuery` | `-` | يبحث ويعرض النتائج المطابقة |
| 30 | `finance.main.set-tx-form-6` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 31 | `finance.main.set-tx-form-7` | حقل رقمي | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 32 | `finance.main.set-tx-form-8` | حقل تاريخ | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 33 | `finance.main.set-tx-form-9` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 34 | `finance.main.set-tx-form-10` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 35 | `finance.main.set-tx-form-11` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 36 | `finance.main.set-tx-form-12` | حقل تاريخ | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 37 | `finance.main.set-tx-form-13` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 38 | `finance.main.set-tx-form-14` | خانة اختيار | `setTxForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 39 | `finance.main.set-reverse-reason` | حقل إدخال | `setReverseReason` | `-` | يدخل / يعدّل قيمة الحقل |

### الجلسات (`hearings`) — 27 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `hearings.main.handle-print-roll` | زرار | `handlePrintRoll` | `-` | يولّد رول الجلسات PDF للطباعة |
| 2 | `hearings.main.handle-print-roll-2` | زرار | `handlePrintRoll` | `-` | يولّد رول الجلسات PDF للطباعة |
| 3 | `hearings.main.handle-print-roll-3` | زرار | `handlePrintRoll` | `-` | يولّد رول الجلسات PDF للطباعة |
| 4 | `hearings.main.load-roll` | زرار | `loadRoll` | `-` | يتفاعل مع العنصر حسب السياق |
| 5 | `hearings.main.set-date-filter-type` | زرار | `setDateFilterType` | `-` | يفلتر البيانات المعروضة |
| 6 | `hearings.main.set-selected-court` | قائمة اختيار | `setSelectedCourt` | `-` | يفلتر البيانات المعروضة |
| 7 | `hearings.main.set-selected-status` | قائمة اختيار | `setSelectedStatus` | `-` | يفلتر البيانات المعروضة |
| 8 | `hearings.main.on-navigate-to-case` | زرار | `onNavigateToCase` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 9 | `hearings.main.handle-open-outcome` | زرار | `handleOpenOutcome` | `-` | يفتح النافذة أو العنصر |
| 10 | `hearings.main.set-show-outcome-modal` | زرار | `setShowOutcomeModal` | `-` | يتفاعل مع العنصر حسب السياق |
| 11 | `hearings.main.set-outcome-form` | زرار | `setOutcomeForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 12 | `hearings.main.set-outcome-form-2` | قائمة اختيار | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 13 | `hearings.main.set-outcome-form-3` | قائمة اختيار | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 14 | `hearings.main.set-show-outcome-modal-2` | زرار | `setShowOutcomeModal` | `-` | يتفاعل مع العنصر حسب السياق |
| 15 | `hearings.main.save` | زرار إرسال | `-` | `-` | يحفظ بيانات الجلسة ويولّد الجلسة القادمة تلقائياً |
| 16 | `hearings.main.set-specific-date` | حقل تاريخ | `setSpecificDate` | `-` | يدخل / يعدّل قيمة الحقل |
| 17 | `hearings.main.set-start-date` | حقل تاريخ | `setStartDate` | `-` | يدخل / يعدّل قيمة الحقل |
| 18 | `hearings.main.set-end-date` | حقل تاريخ | `setEndDate` | `-` | يدخل / يعدّل قيمة الحقل |
| 19 | `hearings.main.set-court-circuit-query` | حقل إدخال | `setCourtCircuitQuery` | `-` | يدخل / يعدّل قيمة الحقل |
| 20 | `hearings.main.set-outcome-form-4` | حقل إدخال | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 21 | `hearings.main.set-outcome-form-5` | حقل نص | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 22 | `hearings.main.set-outcome-form-6` | حقل إدخال | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `hearings.main.set-outcome-form-7` | حقل إدخال | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `hearings.main.set-outcome-form-8` | خانة اختيار | `onst` | `-` | يتفاعل مع العنصر حسب السياق |
| 25 | `hearings.main.set-outcome-form-9` | حقل تاريخ | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 26 | `hearings.main.set-outcome-form-10` | حقل إدخال | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 27 | `hearings.main.set-outcome-form-11` | حقل تاريخ | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |

### التقارير (`reports`) — 10 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `reports.main.set-selected-report` | زرار | `setSelectedReport` | `-` | يفلتر البيانات المعروضة |
| 2 | `reports.main.set-landscape` | زرار | `setLandscape` | `-` | يتفاعل مع العنصر حسب السياق |
| 3 | `reports.main.handle-action` | زرار | `handleAction` | `-` | يتفاعل مع العنصر حسب السياق |
| 4 | `reports.main.handle-action-2` | زرار | `handleAction` | `-` | يتفاعل مع العنصر حسب السياق |
| 5 | `reports.main.handle-action-3` | زرار | `handleAction` | `-` | يتفاعل مع العنصر حسب السياق |
| 6 | `reports.main.set-date-range-type` | قائمة اختيار | `setDateRangeType` | `-` | يدخل / يعدّل قيمة الحقل |
| 7 | `reports.main.set-selected-court` | قائمة اختيار | `setSelectedCourt` | `-` | يفلتر البيانات المعروضة |
| 8 | `reports.main.set-selected-case-id` | قائمة اختيار | `setSelectedCaseId` | `-` | يفلتر البيانات المعروضة |
| 9 | `reports.main.set-selected-client-id` | قائمة اختيار | `setSelectedClientId` | `-` | يفلتر البيانات المعروضة |
| 10 | `reports.main.set-generic-table-type` | قائمة اختيار | `setGenericTableType` | `-` | يدخل / يعدّل قيمة الحقل |

### الإعدادات (`settings`) — 43 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `settings.main.set-active-tab` | زرار | `setActiveTab` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 2 | `settings.main.set-active-tab-2` | زرار | `setActiveTab` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 3 | `settings.main.set-active-tab-3` | زرار | `setActiveTab` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 4 | `settings.main.set-active-tab-4` | زرار | `setActiveTab` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 5 | `settings.main.set-active-tab-5` | زرار | `setActiveTab` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 6 | `settings.main.set-active-tab-6` | زرار | `setActiveTab` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 7 | `settings.main.set-active-tab-7` | زرار | `setActiveTab` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 8 | `settings.main.save` | زرار إرسال | `-` | `-` | يحفظ الإعدادات المعدّلة |
| 9 | `settings.main.handle-pick-logo` | زرار | `handlePickLogo` | `-` | يتفاعل مع العنصر حسب السياق |
| 10 | `settings.main.handle-open-folder` | زرار | `handleOpenFolder` | `-` | يفتح النافذة أو العنصر |
| 11 | `settings.main.handle-relocate-folder` | زرار | `handleRelocateFolder` | `-` | يتفاعل مع العنصر حسب السياق |
| 12 | `settings.main.set-selected-list-type` | زرار | `setSelectedListType` | `-` | يفلتر البيانات المعروضة |
| 13 | `settings.main.handle-reset-list` | زرار | `handleResetList` | `-` | يتفاعل مع العنصر حسب السياق |
| 14 | `settings.main.add` | زرار إرسال | `-` | `-` | يفتح نافذة إضافة عنصر جديد |
| 15 | `settings.main.handle-save-edit-item` | زرار | `handleSaveEditItem` | `-` | يحفظ الإعدادات المعدّلة |
| 16 | `settings.main.set-editing-item-id` | زرار | `setEditingItemId` | `-` | يفتح نافذة تعديل العنصر |
| 17 | `settings.main.handle-toggle-active` | زرار | `handleToggleActive` | `-` | يبدّل الحالة (تفعيل/تعطيل) |
| 18 | `settings.main.set-editing-item-id-2` | زرار | `setEditingItemId` | `-` | يفتح نافذة تعديل العنصر |
| 19 | `settings.main.handle-delete-item` | زرار | `handleDeleteItem` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 20 | `settings.main.save-2` | زرار إرسال | `-` | `-` | يحفظ الإعدادات المعدّلة |
| 21 | `settings.main.set-office-form` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 22 | `settings.main.set-office-form-2` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `settings.main.set-office-form-3` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `settings.main.set-office-form-4` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 25 | `settings.main.set-office-form-5` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 26 | `settings.main.set-office-form-6` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 27 | `settings.main.set-office-form-7` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 28 | `settings.main.set-office-form-8` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 29 | `settings.main.set-office-form-9` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 30 | `settings.main.set-office-form-10` | حقل نص | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 31 | `settings.main.set-new-item-name` | حقل إدخال | `setNewItemName` | `-` | يدخل / يعدّل قيمة الحقل |
| 32 | `settings.main.set-list-search` | حقل إدخال | `setListSearch` | `-` | يبحث ويعرض النتائج المطابقة |
| 33 | `settings.main.set-editing-item-name` | حقل إدخال | `setEditingItemName` | `-` | يفتح نافذة تعديل العنصر |
| 34 | `settings.main.set-office-form-11` | حقل رقمي | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 35 | `settings.main.set-office-form-12` | حقل رقمي | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 36 | `settings.main.set-office-form-13` | حقل رقمي | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 37 | `settings.main.set-office-form-14` | حقل رقمي | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 38 | `settings.main.set-office-form-15` | حقل رقمي | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 39 | `settings.main.set-office-form-16` | حقل رقمي | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 40 | `settings.main.set-office-form-17` | حقل رقمي | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 41 | `settings.main.set-office-form-18` | حقل رقمي | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 42 | `settings.main.set-office-form-19` | خانة اختيار | `setOfficeForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 43 | `settings.main.set-office-form-20` | حقل إدخال | `setOfficeForm` | `-` | يدخل / يعدّل قيمة الحقل |

### المهام (`tasks`) — 55 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `tasks.main.set-period-tab` | زرار | `setPeriodTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 2 | `tasks.main.set-period-tab-2` | زرار | `setPeriodTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 3 | `tasks.main.set-period-tab-3` | زرار | `setPeriodTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 4 | `tasks.main.set-period-tab-4` | زرار | `setPeriodTab` | `-` | يتفاعل مع العنصر حسب السياق |
| 5 | `tasks.main.set-view-mode` | زرار | `setViewMode` | `-` | يتفاعل مع العنصر حسب السياق |
| 6 | `tasks.main.set-view-mode-2` | زرار | `setViewMode` | `-` | يتفاعل مع العنصر حسب السياق |
| 7 | `tasks.main.set-view-mode-3` | زرار | `setViewMode` | `-` | يتفاعل مع العنصر حسب السياق |
| 8 | `tasks.main.handle-print-tasks` | زرار | `handlePrintTasks` | `-` | يولّد تقرير PDF قابل للطباعة |
| 9 | `tasks.main.set-is-manage-templates-modal-open` | زرار | `setIsManageTemplatesModalOpen` | `-` | يفتح النافذة أو العنصر |
| 10 | `tasks.main.set-is-apply-template-modal-open` | زرار | `setIsApplyTemplateModalOpen` | `-` | يفتح النافذة أو العنصر |
| 11 | `tasks.main.set-is-new-task-modal-open` | زرار | `setIsNewTaskModalOpen` | `-` | يفتح النافذة أو العنصر |
| 12 | `tasks.main.set-selected-category` | قائمة اختيار | `setSelectedCategory` | `-` | يفلتر البيانات المعروضة |
| 13 | `tasks.main.set-selected-priority` | قائمة اختيار | `setSelectedPriority` | `-` | يفلتر البيانات المعروضة |
| 14 | `tasks.main.set-selected-status` | قائمة اختيار | `setSelectedStatus` | `-` | يفلتر البيانات المعروضة |
| 15 | `tasks.main.handle-toggle-task-status` | زرار | `handleToggleTaskStatus` | `-` | يبدّل الحالة (تفعيل/تعطيل) |
| 16 | `tasks.main.on-navigate-to-case` | زرار | `onNavigateToCase` | `-` | يغيّر التبويب أو الصفحة المعروضة |
| 17 | `tasks.main.onfirm` | زرار | `onfirm` | `-` | يتفاعل مع العنصر حسب السياق |
| 18 | `tasks.main.handle-move-kanban` | زرار | `handleMoveKanban` | `-` | يتفاعل مع العنصر حسب السياق |
| 19 | `tasks.main.handle-move-kanban-2` | زرار | `handleMoveKanban` | `-` | يتفاعل مع العنصر حسب السياق |
| 20 | `tasks.main.handle-move-kanban-3` | زرار | `handleMoveKanban` | `-` | يتفاعل مع العنصر حسب السياق |
| 21 | `tasks.main.set-selected-calendar-day` | div قابل للضغط | `setSelectedCalendarDay` | `-` | يفلتر البيانات المعروضة |
| 22 | `tasks.main.set-task-form` | قائمة اختيار | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `tasks.main.set-task-form-2` | قائمة اختيار | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `tasks.main.set-task-form-3` | قائمة اختيار | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 25 | `tasks.main.set-task-form-4` | قائمة اختيار | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 26 | `tasks.main.set-task-form-5` | قائمة اختيار | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 27 | `tasks.main.set-is-new-task-modal-open-2` | زرار | `setIsNewTaskModalOpen` | `-` | يفتح النافذة أو العنصر |
| 28 | `tasks.main.add` | زرار إرسال | `-` | `-` | يفتح نافذة إضافة مهمة جديدة |
| 29 | `tasks.main.set-apply-template-form` | قائمة اختيار | `setApplyTemplateForm` | `-` | يطبّق قالب المهام على القضية |
| 30 | `tasks.main.set-apply-template-form-2` | قائمة اختيار | `setApplyTemplateForm` | `-` | يطبّق قالب المهام على القضية |
| 31 | `tasks.main.set-is-apply-template-modal-open-2` | زرار | `setIsApplyTemplateModalOpen` | `-` | يفتح النافذة أو العنصر |
| 32 | `tasks.main.apply` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 33 | `tasks.main.set-is-create-template-modal-open` | زرار | `setIsCreateTemplateModalOpen` | `-` | يفتح نافذة إضافة مهمة جديدة |
| 34 | `tasks.main.onfirm-2` | زرار | `onfirm` | `-` | يتفاعل مع العنصر حسب السياق |
| 35 | `tasks.main.set-is-manage-templates-modal-open-2` | زرار | `setIsManageTemplatesModalOpen` | `-` | يفتح النافذة أو العنصر |
| 36 | `tasks.main.set-custom-template-form` | زرار | `setCustomTemplateForm` | `-` | يطبّق قالب المهام على القضية |
| 37 | `tasks.main.set-custom-template-form-2` | زرار | `setCustomTemplateForm` | `-` | يطبّق قالب المهام على القضية |
| 38 | `tasks.main.set-custom-template-form-3` | قائمة اختيار | `onst` | `-` | يطبّق قالب المهام على القضية |
| 39 | `tasks.main.set-custom-template-form-4` | قائمة اختيار | `onst` | `-` | يطبّق قالب المهام على القضية |
| 40 | `tasks.main.set-is-create-template-modal-open-2` | زرار | `setIsCreateTemplateModalOpen` | `-` | يفتح نافذة إضافة مهمة جديدة |
| 41 | `tasks.main.save` | زرار إرسال | `-` | `-` | يحفظ البيانات ويُظهر رسالة نجاح |
| 42 | `tasks.main.set-search-query` | حقل إدخال | `setSearchQuery` | `-` | يبحث ويعرض النتائج المطابقة |
| 43 | `tasks.main.toggle-checklist-item` | خانة اختيار | `toggleChecklistItem` | `-` | يبدّل الحالة (تفعيل/تعطيل) |
| 44 | `tasks.main.set-task-form-6` | حقل إدخال | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 45 | `tasks.main.set-task-form-7` | حقل نص | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 46 | `tasks.main.set-task-form-8` | حقل تاريخ | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 47 | `tasks.main.set-task-form-9` | حقل وقت | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 48 | `tasks.main.set-task-form-10` | حقل إدخال | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 49 | `tasks.main.set-task-form-11` | حقل نص | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 50 | `tasks.main.set-apply-template-form-3` | حقل تاريخ | `setApplyTemplateForm` | `-` | يطبّق قالب المهام على القضية |
| 51 | `tasks.main.set-apply-template-form-4` | حقل إدخال | `setApplyTemplateForm` | `-` | يطبّق قالب المهام على القضية |
| 52 | `tasks.main.set-custom-template-form-5` | حقل إدخال | `setCustomTemplateForm` | `-` | يطبّق قالب المهام على القضية |
| 53 | `tasks.main.set-custom-template-form-6` | حقل إدخال | `setCustomTemplateForm` | `-` | يطبّق قالب المهام على القضية |
| 54 | `tasks.main.set-custom-template-form-7` | حقل إدخال | `onst` | `-` | يطبّق قالب المهام على القضية |
| 55 | `tasks.main.set-custom-template-form-8` | حقل رقمي | `onst` | `-` | يطبّق قالب المهام على القضية |

### سلة المحذوفات (`trash`) — 7 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `trash.main.handle-empty-all` | زرار | `handleEmptyAll` | `-` | يفرّغ سلة المحذوفات نهائياً بعد تأكيد |
| 2 | `trash.main.load-trash` | زرار | `loadTrash` | `-` | يتفاعل مع العنصر حسب السياق |
| 3 | `trash.main.set-selected-type` | زرار | `setSelectedType` | `-` | يفلتر البيانات المعروضة |
| 4 | `trash.main.set-status-message` | زرار | `setStatusMessage` | `-` | يتفاعل مع العنصر حسب السياق |
| 5 | `trash.main.handle-restore` | زرار | `handleRestore` | `-` | يستعيد قاعدة البيانات من نسخة احتياطية |
| 6 | `trash.main.handle-delete-permanent` | زرار | `handleDeletePermanent` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 7 | `trash.main.set-search-query` | حقل إدخال | `setSearchQuery` | `-` | يبحث ويعرض النتائج المطابقة |

### تبويب إعلانات القضية (`case.announcements`) — 41 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `case.announcements.tab.handle-print` | زرار | `handlePrint` | `-` | يولّد تقرير PDF قابل للطباعة |
| 2 | `case.announcements.tab.handle-open-add-modal` | زرار | `handleOpenAddModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 3 | `case.announcements.tab.handle-open-add-modal-2` | زرار | `handleOpenAddModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 4 | `case.announcements.tab.handle-open-status-modal` | زرار | `handleOpenStatusModal` | `-` | يفتح النافذة أو العنصر |
| 5 | `case.announcements.tab.handle-delete` | زرار | `handleDelete` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 6 | `case.announcements.tab.handle-open-status-modal-2` | زرار | `handleOpenStatusModal` | `-` | يفتح النافذة أو العنصر |
| 7 | `case.announcements.tab.handle-delete-2` | زرار | `handleDelete` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 8 | `case.announcements.tab.handle-open-reattempt-modal` | زرار | `handleOpenReattemptModal` | `-` | يفتح النافذة أو العنصر |
| 9 | `case.announcements.tab.set-is-add-modal-open` | زرار | `setIsAddModalOpen` | `-` | يفتح نافذة إضافة قضية جديدة |
| 10 | `case.announcements.tab.set-add-form` | قائمة اختيار | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 11 | `case.announcements.tab.handle-select-party` | قائمة اختيار | `handleSelectParty` | `-` | يفلتر البيانات المعروضة |
| 12 | `case.announcements.tab.set-add-form-2` | قائمة اختيار | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 13 | `case.announcements.tab.set-is-add-modal-open-2` | زرار | `setIsAddModalOpen` | `-` | يفتح نافذة إضافة قضية جديدة |
| 14 | `case.announcements.tab.button-14` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 15 | `case.announcements.tab.set-is-status-modal-open` | زرار | `setIsStatusModalOpen` | `-` | يفتح النافذة أو العنصر |
| 16 | `case.announcements.tab.set-status-form` | قائمة اختيار | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 17 | `case.announcements.tab.set-is-status-modal-open-2` | زرار | `setIsStatusModalOpen` | `-` | يفتح النافذة أو العنصر |
| 18 | `case.announcements.tab.button-18` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 19 | `case.announcements.tab.set-is-reattempt-modal-open` | زرار | `setIsReattemptModalOpen` | `-` | يفتح النافذة أو العنصر |
| 20 | `case.announcements.tab.set-reattempt-form` | قائمة اختيار | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 21 | `case.announcements.tab.set-is-reattempt-modal-open-2` | زرار | `setIsReattemptModalOpen` | `-` | يفتح النافذة أو العنصر |
| 22 | `case.announcements.tab.button-22` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 23 | `case.announcements.tab.set-add-form-3` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 24 | `case.announcements.tab.set-add-form-4` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 25 | `case.announcements.tab.set-add-form-5` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 26 | `case.announcements.tab.set-add-form-6` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 27 | `case.announcements.tab.set-add-form-7` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 28 | `case.announcements.tab.set-add-form-8` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 29 | `case.announcements.tab.set-add-form-9` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 30 | `case.announcements.tab.set-add-form-10` | حقل تاريخ | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 31 | `case.announcements.tab.set-add-form-11` | حقل رقمي | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 32 | `case.announcements.tab.set-add-form-12` | حقل نص | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 33 | `case.announcements.tab.set-status-form-2` | حقل تاريخ | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 34 | `case.announcements.tab.set-status-form-3` | حقل إدخال | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 35 | `case.announcements.tab.set-status-form-4` | حقل نص | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 36 | `case.announcements.tab.set-status-form-5` | حقل نص | `setStatusForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 37 | `case.announcements.tab.set-reattempt-form-2` | حقل إدخال | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 38 | `case.announcements.tab.set-reattempt-form-3` | حقل إدخال | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 39 | `case.announcements.tab.set-reattempt-form-4` | حقل تاريخ | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 40 | `case.announcements.tab.set-reattempt-form-5` | حقل رقمي | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 41 | `case.announcements.tab.set-reattempt-form-6` | حقل نص | `setReattemptForm` | `-` | يدخل / يعدّل قيمة الحقل |

### تبويب مستندات القضية (`case.documents`) — 24 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `case.documents.tab.set-active-view` | زرار | `setActiveView` | `-` | يتفاعل مع العنصر حسب السياق |
| 2 | `case.documents.tab.set-active-view-2` | زرار | `setActiveView` | `-` | يتفاعل مع العنصر حسب السياق |
| 3 | `case.documents.tab.set-is-attach-modal-open` | زرار | `setIsAttachModalOpen` | `-` | يفتح النافذة أو العنصر |
| 4 | `case.documents.tab.handle-print-inventory` | زرار | `handlePrintInventory` | `-` | يولّد تقرير PDF قابل للطباعة |
| 5 | `case.documents.tab.set-selected-category` | قائمة اختيار | `setSelectedCategory` | `-` | يفلتر البيانات المعروضة |
| 6 | `case.documents.tab.set-is-attach-modal-open-2` | زرار | `setIsAttachModalOpen` | `-` | يفتح النافذة أو العنصر |
| 7 | `case.documents.tab.open-document` | زرار | `openDocument` | `-` | يفتح النافذة أو العنصر |
| 8 | `case.documents.tab.view` | زرار | `showInFolder` | `-` | يتفاعل مع العنصر حسب السياق |
| 9 | `case.documents.tab.handle-open-edit` | زرار | `handleOpenEdit` | `-` | يفتح نافذة تعديل العنصر |
| 10 | `case.documents.tab.nav-trash` | زرار | `moveToTrash` | `-` | يتفاعل مع العنصر حسب السياق |
| 11 | `case.documents.tab.recover` | زرار | `restoreDocument` | `-` | يستعيد قاعدة البيانات من نسخة احتياطية |
| 12 | `case.documents.tab.onfirm` | زرار | `onfirm` | `-` | يتفاعل مع العنصر حسب السياق |
| 13 | `case.documents.tab.set-is-attach-modal-open-3` | زرار | `setIsAttachModalOpen` | `-` | يفتح النافذة أو العنصر |
| 14 | `case.documents.tab.set-attach-category` | قائمة اختيار | `setAttachCategory` | `-` | يدخل / يعدّل قيمة الحقل |
| 15 | `case.documents.tab.set-is-attach-modal-open-4` | زرار | `setIsAttachModalOpen` | `-` | يفتح النافذة أو العنصر |
| 16 | `case.documents.tab.handle-attach-submit` | زرار | `handleAttachSubmit` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 17 | `case.documents.tab.set-editing-doc` | زرار | `setEditingDoc` | `-` | يفتح نافذة تعديل العنصر |
| 18 | `case.documents.tab.set-edit-category` | قائمة اختيار | `setEditCategory` | `-` | يفتح نافذة تعديل العنصر |
| 19 | `case.documents.tab.set-editing-doc-2` | زرار | `setEditingDoc` | `-` | يفتح نافذة تعديل العنصر |
| 20 | `case.documents.tab.handle-save-edit` | زرار | `handleSaveEdit` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 21 | `case.documents.tab.set-search-query` | حقل إدخال | `setSearchQuery` | `-` | يبحث ويعرض النتائج المطابقة |
| 22 | `case.documents.tab.set-attach-description` | حقل نص | `setAttachDescription` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `case.documents.tab.set-edit-title` | حقل إدخال | `setEditTitle` | `-` | يفتح نافذة تعديل العنصر |
| 24 | `case.documents.tab.set-edit-description` | حقل نص | `setEditDescription` | `-` | يفتح نافذة تعديل العنصر |

### تبويب تنفيذات القضية (`case.executions`) — 63 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `case.executions.tab.set-is-new-file-modal-open` | زرار | `setIsNewFileModalOpen` | `-` | يفتح الملف المحدد |
| 2 | `case.executions.tab.set-is-new-file-modal-open-2` | زرار | `setIsNewFileModalOpen` | `-` | يفتح الملف المحدد |
| 3 | `case.executions.tab.set-selected-file-id` | div قابل للضغط | `setSelectedFileId` | `-` | يفلتر البيانات المعروضة |
| 4 | `case.executions.tab.handle-print-file` | زرار | `handlePrintFile` | `-` | يولّد تقرير PDF قابل للطباعة |
| 5 | `case.executions.tab.set-is-payment-modal-open` | زرار | `setIsPaymentModalOpen` | `-` | يفتح النافذة أو العنصر |
| 6 | `case.executions.tab.set-is-action-modal-open` | زرار | `setIsActionModalOpen` | `-` | يفتح النافذة أو العنصر |
| 7 | `case.executions.tab.set-is-hearing-modal-open` | زرار | `setIsHearingModalOpen` | `-` | يفتح النافذة أو العنصر |
| 8 | `case.executions.tab.set-is-settlement-modal-open` | زرار | `setIsSettlementModalOpen` | `-` | يفتح النافذة أو العنصر |
| 9 | `case.executions.tab.set-is-action-modal-open-2` | زرار | `setIsActionModalOpen` | `-` | يفتح النافذة أو العنصر |
| 10 | `case.executions.tab.onfirm` | زرار | `onfirm` | `-` | يتفاعل مع العنصر حسب السياق |
| 11 | `case.executions.tab.set-is-hearing-modal-open-2` | زرار | `setIsHearingModalOpen` | `-` | يفتح النافذة أو العنصر |
| 12 | `case.executions.tab.set-selected-hearing-to-outcome` | زرار | `setSelectedHearingToOutcome` | `-` | يفلتر البيانات المعروضة |
| 13 | `case.executions.tab.set-is-payment-modal-open-2` | زرار | `setIsPaymentModalOpen` | `-` | يفتح النافذة أو العنصر |
| 14 | `case.executions.tab.set-file-form` | قائمة اختيار | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 15 | `case.executions.tab.set-is-new-file-modal-open-3` | زرار | `setIsNewFileModalOpen` | `-` | يفتح الملف المحدد |
| 16 | `case.executions.tab.open` | زرار إرسال | `-` | `-` | يفتح النافذة أو العنصر |
| 17 | `case.executions.tab.set-action-form` | قائمة اختيار | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 18 | `case.executions.tab.set-action-form-2` | قائمة اختيار | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 19 | `case.executions.tab.set-is-action-modal-open-3` | زرار | `setIsActionModalOpen` | `-` | يفتح النافذة أو العنصر |
| 20 | `case.executions.tab.save` | زرار إرسال | `-` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 21 | `case.executions.tab.set-is-hearing-modal-open-3` | زرار | `setIsHearingModalOpen` | `-` | يفتح النافذة أو العنصر |
| 22 | `case.executions.tab.add` | زرار إرسال | `-` | `-` | يفتح نافذة إضافة قضية جديدة |
| 23 | `case.executions.tab.set-hearing-outcome-form` | قائمة اختيار | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `case.executions.tab.set-is-hearing-outcome-modal-open` | زرار | `setIsHearingOutcomeModalOpen` | `-` | يفتح النافذة أو العنصر |
| 25 | `case.executions.tab.save-2` | زرار إرسال | `-` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 26 | `case.executions.tab.set-payment-form` | قائمة اختيار | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 27 | `case.executions.tab.set-payment-form-2` | قائمة اختيار | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 28 | `case.executions.tab.set-is-payment-modal-open-3` | زرار | `setIsPaymentModalOpen` | `-` | يفتح النافذة أو العنصر |
| 29 | `case.executions.tab.save-3` | زرار إرسال | `-` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 30 | `case.executions.tab.set-is-settlement-modal-open-2` | زرار | `setIsSettlementModalOpen` | `-` | يفتح النافذة أو العنصر |
| 31 | `case.executions.tab.button-31` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 32 | `case.executions.tab.set-file-form-2` | حقل إدخال | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 33 | `case.executions.tab.set-file-form-3` | حقل رقمي | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 34 | `case.executions.tab.set-file-form-4` | حقل إدخال | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 35 | `case.executions.tab.set-file-form-5` | حقل إدخال | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 36 | `case.executions.tab.set-file-form-6` | حقل إدخال | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 37 | `case.executions.tab.set-file-form-7` | حقل إدخال | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 38 | `case.executions.tab.set-file-form-8` | حقل إدخال | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 39 | `case.executions.tab.set-file-form-9` | حقل رقمي | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 40 | `case.executions.tab.set-file-form-10` | حقل تاريخ | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 41 | `case.executions.tab.set-file-form-11` | حقل نص | `setFileForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 42 | `case.executions.tab.set-action-form-3` | حقل تاريخ | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 43 | `case.executions.tab.set-action-form-4` | حقل إدخال | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 44 | `case.executions.tab.set-action-form-5` | حقل إدخال | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 45 | `case.executions.tab.set-action-form-6` | حقل إدخال | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 46 | `case.executions.tab.set-action-form-7` | حقل رقمي | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 47 | `case.executions.tab.set-action-form-8` | حقل نص | `setActionForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 48 | `case.executions.tab.set-hearing-form` | حقل تاريخ | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 49 | `case.executions.tab.set-hearing-form-2` | حقل وقت | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 50 | `case.executions.tab.set-hearing-form-3` | حقل إدخال | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 51 | `case.executions.tab.set-hearing-form-4` | حقل إدخال | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 52 | `case.executions.tab.set-hearing-form-5` | حقل إدخال | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 53 | `case.executions.tab.set-hearing-form-6` | حقل نص | `setHearingForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 54 | `case.executions.tab.set-hearing-outcome-form-2` | حقل إدخال | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 55 | `case.executions.tab.set-hearing-outcome-form-3` | حقل نص | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 56 | `case.executions.tab.set-hearing-outcome-form-4` | حقل إدخال | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 57 | `case.executions.tab.set-hearing-outcome-form-5` | حقل تاريخ | `setHearingOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 58 | `case.executions.tab.set-payment-form-3` | حقل رقمي | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 59 | `case.executions.tab.set-payment-form-4` | حقل إدخال | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 60 | `case.executions.tab.set-payment-form-5` | حقل إدخال | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 61 | `case.executions.tab.set-payment-form-6` | حقل إدخال | `setPaymentForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 62 | `case.executions.tab.set-settlement-form` | حقل تاريخ | `setSettlementForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 63 | `case.executions.tab.set-settlement-form-2` | حقل نص | `setSettlementForm` | `-` | يدخل / يعدّل قيمة الحقل |

### تبويب مالية القضية (`case.finance`) — 38 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `case.finance.tab.handle-print-statement` | زرار | `handlePrintStatement` | `-` | يولّد كشف حساب موكل PDF |
| 2 | `case.finance.tab.handle-open-agreement-modal` | زرار | `handleOpenAgreementModal` | `-` | يفتح النافذة أو العنصر |
| 3 | `case.finance.tab.set-show-add-tx-modal` | زرار | `setShowAddTxModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 4 | `case.finance.tab.set-active-category-filter` | زرار | `setActiveCategoryFilter` | `-` | يفلتر البيانات المعروضة |
| 5 | `case.finance.tab.handle-print-receipt` | زرار | `handlePrintReceipt` | `-` | يولّد إيصال استلام نقدية مرقم PDF |
| 6 | `case.finance.tab.set-selected-tx-to-reverse` | زرار | `setSelectedTxToReverse` | `-` | يفلتر البيانات المعروضة |
| 7 | `case.finance.tab.set-show-add-tx-modal-2` | زرار | `setShowAddTxModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 8 | `case.finance.tab.set-tx-form` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 9 | `case.finance.tab.set-tx-form-2` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 10 | `case.finance.tab.set-tx-form-3` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 11 | `case.finance.tab.set-tx-form-4` | قائمة اختيار | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 12 | `case.finance.tab.set-show-add-tx-modal-3` | زرار | `setShowAddTxModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 13 | `case.finance.tab.save` | زرار إرسال | `-` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 14 | `case.finance.tab.set-show-agreement-modal` | زرار | `setShowAgreementModal` | `-` | يتفاعل مع العنصر حسب السياق |
| 15 | `case.finance.tab.set-agreement-form` | قائمة اختيار | `setAgreementForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 16 | `case.finance.tab.set-agreement-form-2` | زرار | `setAgreementForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 17 | `case.finance.tab.set-agreement-form-3` | زرار | `onst` | `-` | يتفاعل مع العنصر حسب السياق |
| 18 | `case.finance.tab.set-show-agreement-modal-2` | زرار | `setShowAgreementModal` | `-` | يتفاعل مع العنصر حسب السياق |
| 19 | `case.finance.tab.save-2` | زرار إرسال | `-` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 20 | `case.finance.tab.set-show-reverse-modal` | زرار | `setShowReverseModal` | `-` | يتفاعل مع العنصر حسب السياق |
| 21 | `case.finance.tab.cancel` | زرار إرسال | `-` | `-` | يغلق النافذة بدون حفظ |
| 22 | `case.finance.tab.set-tx-form-5` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `case.finance.tab.set-tx-form-6` | حقل رقمي | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 24 | `case.finance.tab.set-tx-form-7` | حقل تاريخ | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 25 | `case.finance.tab.set-tx-form-8` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 26 | `case.finance.tab.set-tx-form-9` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 27 | `case.finance.tab.set-tx-form-10` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 28 | `case.finance.tab.set-tx-form-11` | حقل تاريخ | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 29 | `case.finance.tab.set-tx-form-12` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 30 | `case.finance.tab.set-tx-form-13` | حقل إدخال | `setTxForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 31 | `case.finance.tab.set-tx-form-14` | خانة اختيار | `setTxForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 32 | `case.finance.tab.set-agreement-form-4` | حقل رقمي | `setAgreementForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 33 | `case.finance.tab.set-agreement-form-5` | حقل رقمي | `setAgreementForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 34 | `case.finance.tab.set-agreement-form-6` | حقل إدخال | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 35 | `case.finance.tab.set-agreement-form-7` | حقل رقمي | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 36 | `case.finance.tab.set-agreement-form-8` | حقل تاريخ | `onst` | `-` | يدخل / يعدّل قيمة الحقل |
| 37 | `case.finance.tab.set-agreement-form-9` | حقل نص | `setAgreementForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 38 | `case.finance.tab.set-reverse-reason` | حقل إدخال | `setReverseReason` | `-` | يدخل / يعدّل قيمة الحقل |

### تبويب جلسات القضية (`case.hearings`) — 38 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `case.hearings.tab.handle-print-timeline-report` | زرار | `handlePrintTimelineReport` | `-` | يولّد تقرير PDF قابل للطباعة |
| 2 | `case.hearings.tab.set-show-add-modal` | زرار | `setShowAddModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 3 | `case.hearings.tab.handle-open-outcome-modal` | زرار | `handleOpenOutcomeModal` | `-` | يفتح النافذة أو العنصر |
| 4 | `case.hearings.tab.handle-delete-hearing` | زرار | `handleDeleteHearing` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 5 | `case.hearings.tab.handle-open-outcome-modal-2` | زرار | `handleOpenOutcomeModal` | `-` | يفتح النافذة أو العنصر |
| 6 | `case.hearings.tab.handle-appeal-type-change` | قائمة اختيار | `handleAppealTypeChange` | `-` | يدخل / يعدّل قيمة الحقل |
| 7 | `case.hearings.tab.set-appeal-form` | قائمة اختيار | `setAppealForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 8 | `case.hearings.tab.save` | زرار إرسال | `-` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 9 | `case.hearings.tab.handle-toggle-appeal-filed` | زرار | `handleToggleAppealFiled` | `-` | يبدّل الحالة (تفعيل/تعطيل) |
| 10 | `case.hearings.tab.handle-delete-appeal-deadline` | زرار | `handleDeleteAppealDeadline` | `-` | ينقل العنصر لسلة المحذوفات بعد تأكيد |
| 11 | `case.hearings.tab.set-show-add-modal-2` | زرار | `setShowAddModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 12 | `case.hearings.tab.set-show-add-modal-3` | زرار | `setShowAddModal` | `-` | يفتح نافذة إضافة قضية جديدة |
| 13 | `case.hearings.tab.add` | زرار إرسال | `-` | `-` | يفتح نافذة إضافة قضية جديدة |
| 14 | `case.hearings.tab.set-show-outcome-modal` | زرار | `setShowOutcomeModal` | `-` | يتفاعل مع العنصر حسب السياق |
| 15 | `case.hearings.tab.set-outcome-form` | زرار | `setOutcomeForm` | `-` | يتفاعل مع العنصر حسب السياق |
| 16 | `case.hearings.tab.set-outcome-form-2` | قائمة اختيار | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 17 | `case.hearings.tab.set-outcome-form-3` | قائمة اختيار | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 18 | `case.hearings.tab.set-show-outcome-modal-2` | زرار | `setShowOutcomeModal` | `-` | يتفاعل مع العنصر حسب السياق |
| 19 | `case.hearings.tab.save-2` | زرار إرسال | `-` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 20 | `case.hearings.tab.set-appeal-form-2` | حقل تاريخ | `setAppealForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 21 | `case.hearings.tab.set-appeal-form-3` | حقل تاريخ | `setAppealForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 22 | `case.hearings.tab.set-appeal-form-4` | حقل رقمي | `setAppealForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `case.hearings.tab.set-add-form` | حقل تاريخ | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 24 | `case.hearings.tab.set-add-form-2` | حقل وقت | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 25 | `case.hearings.tab.set-add-form-3` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 26 | `case.hearings.tab.set-add-form-4` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 27 | `case.hearings.tab.set-add-form-5` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 28 | `case.hearings.tab.set-add-form-6` | حقل رقمي | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 29 | `case.hearings.tab.set-add-form-7` | حقل إدخال | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 30 | `case.hearings.tab.set-add-form-8` | حقل نص | `setAddForm` | `-` | يفتح نافذة إضافة قضية جديدة |
| 31 | `case.hearings.tab.set-outcome-form-4` | حقل إدخال | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 32 | `case.hearings.tab.set-outcome-form-5` | حقل نص | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 33 | `case.hearings.tab.set-outcome-form-6` | حقل إدخال | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 34 | `case.hearings.tab.set-outcome-form-7` | حقل إدخال | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 35 | `case.hearings.tab.set-outcome-form-8` | خانة اختيار | `onst` | `-` | يتفاعل مع العنصر حسب السياق |
| 36 | `case.hearings.tab.set-outcome-form-9` | حقل تاريخ | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 37 | `case.hearings.tab.set-outcome-form-10` | حقل إدخال | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 38 | `case.hearings.tab.set-outcome-form-11` | حقل تاريخ | `setOutcomeForm` | `-` | يدخل / يعدّل قيمة الحقل |

### تبويب مهام القضية (`case.tasks`) — 24 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `case.tasks.tab.handle-print-tasks` | زرار | `handlePrintTasks` | `-` | يولّد تقرير PDF قابل للطباعة |
| 2 | `case.tasks.tab.set-is-apply-template-modal-open` | زرار | `setIsApplyTemplateModalOpen` | `-` | يفتح النافذة أو العنصر |
| 3 | `case.tasks.tab.set-is-new-task-modal-open` | زرار | `setIsNewTaskModalOpen` | `-` | يفتح النافذة أو العنصر |
| 4 | `case.tasks.tab.set-is-apply-template-modal-open-2` | زرار | `setIsApplyTemplateModalOpen` | `-` | يفتح النافذة أو العنصر |
| 5 | `case.tasks.tab.set-is-new-task-modal-open-2` | زرار | `setIsNewTaskModalOpen` | `-` | يفتح النافذة أو العنصر |
| 6 | `case.tasks.tab.handle-toggle-task-status` | زرار | `handleToggleTaskStatus` | `-` | يبدّل الحالة (تفعيل/تعطيل) |
| 7 | `case.tasks.tab.onfirm` | زرار | `onfirm` | `-` | يتفاعل مع العنصر حسب السياق |
| 8 | `case.tasks.tab.set-task-form` | قائمة اختيار | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 9 | `case.tasks.tab.set-task-form-2` | قائمة اختيار | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 10 | `case.tasks.tab.set-is-new-task-modal-open-3` | زرار | `setIsNewTaskModalOpen` | `-` | يفتح النافذة أو العنصر |
| 11 | `case.tasks.tab.add` | زرار إرسال | `-` | `-` | يفتح نافذة إضافة قضية جديدة |
| 12 | `case.tasks.tab.set-selected-template-id` | قائمة اختيار | `setSelectedTemplateId` | `-` | يفلتر البيانات المعروضة |
| 13 | `case.tasks.tab.set-is-apply-template-modal-open-3` | زرار | `setIsApplyTemplateModalOpen` | `-` | يفتح النافذة أو العنصر |
| 14 | `case.tasks.tab.apply` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 15 | `case.tasks.tab.toggle-checklist-item` | خانة اختيار | `toggleChecklistItem` | `-` | يبدّل الحالة (تفعيل/تعطيل) |
| 16 | `case.tasks.tab.set-task-form-3` | حقل إدخال | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 17 | `case.tasks.tab.set-task-form-4` | حقل نص | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 18 | `case.tasks.tab.set-task-form-5` | حقل تاريخ | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 19 | `case.tasks.tab.set-task-form-6` | حقل وقت | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 20 | `case.tasks.tab.set-task-form-7` | حقل إدخال | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 21 | `case.tasks.tab.set-task-form-8` | حقل إدخال | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 22 | `case.tasks.tab.set-task-form-9` | حقل نص | `setTaskForm` | `-` | يدخل / يعدّل قيمة الحقل |
| 23 | `case.tasks.tab.set-template-base-date` | حقل تاريخ | `setTemplateBaseDate` | `-` | يطبّق قالب المهام على القضية |
| 24 | `case.tasks.tab.set-template-assigned-to` | حقل إدخال | `setTemplateAssignedTo` | `-` | يطبّق قالب المهام على القضية |

### تبويب الخط الزمني (`case.timeline`) — 12 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `case.timeline.tab.set-editing-note` | زرار | `setEditingNote` | `-` | يفتح نافذة تعديل العنصر |
| 2 | `case.timeline.tab.handle-open-edit` | زرار | `handleOpenEdit` | `-` | يفتح نافذة تعديل العنصر |
| 3 | `case.timeline.tab.onfirm` | زرار | `onfirm` | `-` | يتفاعل مع العنصر حسب السياق |
| 4 | `case.timeline.tab.handle-print-timeline` | زرار | `handlePrintTimeline` | `-` | يولّد تقرير PDF قابل للطباعة |
| 5 | `case.timeline.tab.set-active-filter` | زرار | `setActiveFilter` | `-` | يفلتر البيانات المعروضة |
| 6 | `case.timeline.tab.set-is-add-note-modal-open` | زرار | `setIsAddNoteModalOpen` | `-` | يفتح نافذة إضافة قضية جديدة |
| 7 | `case.timeline.tab.set-note-category` | قائمة اختيار | `setNoteCategory` | `-` | يدخل / يعدّل قيمة الحقل |
| 8 | `case.timeline.tab.set-is-add-note-modal-open-2` | زرار | `setIsAddNoteModalOpen` | `-` | يفتح نافذة إضافة قضية جديدة |
| 9 | `case.timeline.tab.handle-save-note` | زرار | `handleSaveNote` | `-` | يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح |
| 10 | `case.timeline.tab.set-note-title` | حقل إدخال | `setNoteTitle` | `-` | يدخل / يعدّل قيمة الحقل |
| 11 | `case.timeline.tab.set-note-content` | حقل نص | `setNoteContent` | `-` | يدخل / يعدّل قيمة الحقل |
| 12 | `case.timeline.tab.set-note-is-pinned` | خانة اختيار | `setNoteIsPinned` | `-` | يتفاعل مع العنصر حسب السياق |

### تبويب سجل التدقيق (`settings.audit`) — 6 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `settings.audit.tab.handle-apply-filter` | زرار | `handleApplyFilter` | `-` | يفلتر البيانات المعروضة |
| 2 | `settings.audit.tab.set-action-type` | قائمة اختيار | `setActionType` | `-` | يدخل / يعدّل قيمة الحقل |
| 3 | `settings.audit.tab.set-entity-type` | قائمة اختيار | `setEntityType` | `-` | يدخل / يعدّل قيمة الحقل |
| 4 | `settings.audit.tab.handle-apply-filter-2` | زرار | `handleApplyFilter` | `-` | يفلتر البيانات المعروضة |
| 5 | `settings.audit.tab.set-start-date` | حقل تاريخ | `setStartDate` | `-` | يدخل / يعدّل قيمة الحقل |
| 6 | `settings.audit.tab.set-end-date` | حقل تاريخ | `setEndDate` | `-` | يدخل / يعدّل قيمة الحقل |

### تبويب النسخ الاحتياطي (`settings.backup`) — 15 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `settings.backup.tab.set-is-create-modal-open` | زرار | `setIsCreateModalOpen` | `-` | يفتح نافذة إضافة عنصر جديد |
| 2 | `settings.backup.tab.handle-select-external-file` | زرار | `handleSelectExternalFile` | `-` | ينشئ نسخة احتياطية كاملة |
| 3 | `settings.backup.tab.settings` | قائمة اختيار | `Settings` | `-` | ينشئ نسخة احتياطية كاملة |
| 4 | `settings.backup.tab.handle-choose-custom-folder` | زرار | `handleChooseCustomFolder` | `-` | ينشئ نسخة احتياطية كاملة |
| 5 | `settings.backup.tab.set-restore-target-file` | زرار | `setRestoreTargetFile` | `-` | ينشئ نسخة احتياطية كاملة |
| 6 | `settings.backup.tab.set-is-create-modal-open-2` | زرار | `setIsCreateModalOpen` | `-` | يفتح نافذة إضافة عنصر جديد |
| 7 | `settings.backup.tab.set-is-create-modal-open-3` | زرار | `setIsCreateModalOpen` | `-` | يفتح نافذة إضافة عنصر جديد |
| 8 | `settings.backup.tab.handle-start-backup` | زرار | `handleStartBackup` | `-` | ينشئ نسخة احتياطية كاملة |
| 9 | `settings.backup.tab.set-restore-target-file-2` | زرار | `setRestoreTargetFile` | `-` | ينشئ نسخة احتياطية كاملة |
| 10 | `settings.backup.tab.handle-confirm-restore` | زرار | `handleConfirmRestore` | `-` | ينشئ نسخة احتياطية كاملة |
| 11 | `settings.backup.tab.settings-2` | خانة اختيار | `Settings` | `-` | ينشئ نسخة احتياطية كاملة |
| 12 | `settings.backup.tab.input-text` | حقل إدخال | `-` | `-` | ينشئ نسخة احتياطية كاملة |
| 13 | `settings.backup.tab.set-encrypt-new-backup` | خانة اختيار | `setEncryptNewBackup` | `-` | ينشئ نسخة احتياطية كاملة |
| 14 | `settings.backup.tab.set-backup-password` | حقل كلمة مرور | `setBackupPassword` | `-` | ينشئ نسخة احتياطية كاملة |
| 15 | `settings.backup.tab.set-restore-password` | حقل كلمة مرور | `setRestorePassword` | `-` | ينشئ نسخة احتياطية كاملة |

### تبويب الأمان (`settings.security`) — 8 عنصر

| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |
|---|---|---|---|---|---|
| 1 | `settings.security.tab.lock` | زرار | `lockApp` | `-` | يقفل البرنامج بكلمة المرور |
| 2 | `settings.security.tab.set-show-passwords` | زرار | `setShowPasswords` | `-` | يتفاعل مع العنصر حسب السياق |
| 3 | `settings.security.tab.button-3` | زرار إرسال | `-` | `-` | يتفاعل مع العنصر حسب السياق |
| 4 | `settings.security.tab.handle-remove-password` | زرار | `handleRemovePassword` | `-` | يتفاعل مع العنصر حسب السياق |
| 5 | `settings.security.tab.handle-auto-lock-change` | قائمة اختيار | `handleAutoLockChange` | `-` | يقفل البرنامج بكلمة المرور |
| 6 | `settings.security.tab.set-current-password` | حقل إدخال | `setCurrentPassword` | `-` | يدخل / يعدّل قيمة الحقل |
| 7 | `settings.security.tab.set-new-password` | حقل إدخال | `setNewPassword` | `-` | يدخل / يعدّل قيمة الحقل |
| 8 | `settings.security.tab.set-confirm-password` | حقل إدخال | `setConfirmPassword` | `-` | يدخل / يعدّل قيمة الحقل |

