import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import zlib from 'zlib';

describe('Security & Encryption Tests (الأمان والتشفير)', () => {
  describe('1. تشفير ومطابقة كلمة المرور عبر bcryptjs', () => {
    it('يقوم بتشفير كلمة المرور بمستوى ملحي آمن ويتحقق من صحتها', () => {
      const password = 'LawOffice@Master#2026';
      const hash = bcrypt.hashSync(password, 10);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')).toBe(true);

      // مطابقة كلمة المرور الصحيحة
      expect(bcrypt.compareSync(password, hash)).toBe(true);

      // رفض كلمة المرور الخاطئة
      expect(bcrypt.compareSync('WrongPassword', hash)).toBe(false);
      expect(bcrypt.compareSync('lawoffice@master#2026', hash)).toBe(false);
    });
  });

  describe('2. التشفير العسكري AES-256-GCM واشتقاق المفاتيح scrypt', () => {
    it('يشفر ويفك تشفير البيانات بنجاح مع التحقق من سلامة Auth Tag', () => {
      const secretData = JSON.stringify({
        office: 'مكتب المحامي للاختبار',
        casesCount: 150,
        privateNotes: 'معلومات سرية جداً للموكلين',
      });

      const compressed = zlib.gzipSync(Buffer.from(secretData, 'utf-8'));
      const passkey = 'SuperSecretEncryptionKey123!';

      // 1. التشفير
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);
      const key = crypto.scryptSync(passkey, salt, 32);

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
      const authTag = cipher.getAuthTag();

      expect(encrypted.length).toBeGreaterThan(0);
      expect(authTag.length).toBe(16);

      // 2. فك التشفير بمفتاح مطابق
      const derivedKey = crypto.scryptSync(passkey, salt, 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      const uncompressed = zlib.gunzipSync(decrypted).toString('utf-8');
      const parsed = JSON.parse(uncompressed);

      expect(parsed.office).toBe('مكتب المحامي للاختبار');
      expect(parsed.casesCount).toBe(150);
    });

    it('يفشل فك التشفير ويرفض البيانات إذا تم التلاعب بالـ Auth Tag أو كلمة المرور', () => {
      const data = Buffer.from('بيانات تجريبية هامة');
      const passkey = 'CorrectKey';
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);
      const key = crypto.scryptSync(passkey, salt, 32);

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      const authTag = cipher.getAuthTag();

      // محاولة فك التشفير بكلمة مرور خاطئة
      const wrongKey = crypto.scryptSync('WrongKey', salt, 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', wrongKey, iv);
      decipher.setAuthTag(authTag);

      expect(() => {
        Buffer.concat([decipher.update(encrypted), decipher.final()]);
      }).toThrow();
    });
  });
});
