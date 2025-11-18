/**
 * 清理数据库中的重复卡片
 * 使用方法：node scripts/clean-duplicates.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { detectDuplicates } = require('../utils/urlNormalizer');

const dbPath = path.join(__dirname, '../database/nav.db');
const db = new sqlite3.Database(dbPath);

// Promisify database operations
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

async function cleanDuplicates() {
  console.log('🔍 开始检测重复卡片...\n');

  try {
    // 1. 获取所有卡片
    const cards = await dbAll('SELECT * FROM cards ORDER BY id');
    console.log(`📊 共找到 ${cards.length} 张卡片`);

    // 2. 检测重复
    const duplicateGroups = detectDuplicates(cards);
    
    if (duplicateGroups.length === 0) {
      console.log('\n✅ 太棒了！没有发现重复卡片');
      db.close();
      return;
    }

    console.log(`\n⚠️  发现 ${duplicateGroups.length} 组重复`);
    
    let totalDuplicates = 0;
    duplicateGroups.forEach((group, index) => {
      totalDuplicates += group.duplicates.length;
      console.log(`\n📦 重复组 ${index + 1}:`);
      console.log(`   保留: [ID: ${group.original.id}] ${group.original.title}`);
      console.log(`   URL: ${group.original.url}`);
      console.log(`   重复项 (${group.duplicates.length} 张):`);
      group.duplicates.forEach(dup => {
        console.log(`     - [ID: ${dup.id}] ${dup.title}`);
      });
    });

    console.log(`\n🗑️  将删除 ${totalDuplicates} 张重复卡片\n`);

    // 3. 开始删除
    const allDuplicateIds = duplicateGroups.flatMap(group => 
      group.duplicates.map(d => d.id)
    );

    if (allDuplicateIds.length > 0) {
      const placeholders = allDuplicateIds.map(() => '?').join(',');
      await dbRun(`DELETE FROM cards WHERE id IN (${placeholders})`, allDuplicateIds);
      
      console.log(`✅ 成功删除 ${allDuplicateIds.length} 张重复卡片！`);
      console.log(`\n删除的卡片 ID: ${allDuplicateIds.join(', ')}`);
    }

    // 4. 验证结果
    const remainingCards = await dbAll('SELECT * FROM cards');
    console.log(`\n📊 清理后剩余 ${remainingCards.length} 张卡片`);

    // 5. 再次检测确认
    const checkAgain = detectDuplicates(remainingCards);
    if (checkAgain.length === 0) {
      console.log('✅ 验证通过：所有重复已清理\n');
    } else {
      console.log(`⚠️  警告：仍有 ${checkAgain.length} 组重复\n`);
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// 运行清理
console.log('='.repeat(60));
console.log('   数据库卡片去重工具');
console.log('='.repeat(60));
console.log('');

cleanDuplicates()
  .then(() => {
    console.log('🎉 清理完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 清理失败:', error);
    process.exit(1);
  });
