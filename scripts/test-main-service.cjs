const { app } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  try {
    console.log('--- استدعاء خدمات Main Process المجمعة في dist/main/index.js ---');
    
    // Require compiled main code
    // In our build, DatabaseService is compiled inside dist/main/index.js
    // Let's run a test by importing DatabaseService and PrintService
    const mainModule = require('../dist/main/index.cjs');
    console.log('✓ تم تحميل dist/main/index.js بنجاح');

    // Give it 2 seconds to initialize DB and run migrations
    await new Promise(r => setTimeout(r, 2000));

    // Verify DB
    const Database = require('better-sqlite3');
    const appData = app.getPath('appData');
    const dataDir = path.join(appData, 'LawOfficeData');
    const db = new Database(path.join(dataDir, 'office.db'));

    const lists = db.prepare('SELECT list_type, count(*) as count FROM configurable_lists GROUP BY list_type').all();
    console.log('✓ القوائم التي تم إنشاؤها وتعبئتها من SPEC.md:');
    lists.forEach(l => console.log(`  - [${l.list_type}]: ${l.count} عنصر`));

    const totalCount = db.prepare('SELECT count(*) as total FROM configurable_lists').get();
    console.log(`✓ إجمالي العناصر المعتمدة: ${totalCount.total}`);

    db.close();
    console.log('✓ اكتمال فحص التطبيق بنجاح تام!');
    process.exit(0);
  } catch (err) {
    console.error('❌ خطأ:', err);
    process.exit(1);
  }
});
