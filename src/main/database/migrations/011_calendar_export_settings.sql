-- 011_calendar_export_settings.sql: إعدادات تصدير التقويم ووضع الخصوصية وتنبيهات VALARM
ALTER TABLE office_settings ADD COLUMN calendar_privacy_mode INTEGER NOT NULL DEFAULT 1;
ALTER TABLE office_settings ADD COLUMN calendar_alarm_triggers TEXT NOT NULL DEFAULT '1d,1h';
