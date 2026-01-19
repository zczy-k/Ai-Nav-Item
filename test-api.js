const http = require('http');

const testType = process.argv[2] || 'all';

if (testType === 'sub') {
  const subMenuId = process.argv[3] || '3';
  const url = `http://localhost:3000/api/cards/5?subMenuId=${subMenuId}`;
  console.log('Testing:', url);
  
  http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('Cards found:', json.length);
        json.forEach(card => {
          console.log(`  - ${card.title} (menu_id: ${card.menu_id}, sub_menu_id: ${card.sub_menu_id})`);
        });
      } catch (e) {
        console.log('Response:', data);
      }
    });
  }).on('error', (e) => console.error('Error:', e.message));
} else {
  const url = 'http://localhost:3000/api/cards';
  console.log('Testing:', url);
  
  http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('Categories:');
        Object.entries(json.cardsByCategory).forEach(([key, cards]) => {
          console.log(`  ${key}: ${cards.length} cards`);
          cards.slice(0, 2).forEach(card => {
            console.log(`    - ${card.title}`);
          });
        });
      } catch (e) {
        console.log('Response:', data.substring(0, 500));
      }
    });
  }).on('error', (e) => console.error('Error:', e.message));
}
