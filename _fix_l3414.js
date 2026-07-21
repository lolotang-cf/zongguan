const fs = require('fs');
let content = fs.readFileSync('public/js/app.js', 'utf-8');
let lines = content.split('\n');

// L3414 (0-indexed 3413) - 讲师库
let l = lines[3413];

const part1 = 'id="zg_btn_7"> 导入</button>';
const idx1 = l.indexOf(part1) + part1.length;

const dupe = '导入</button>';
const idx2_second = l.indexOf(dupe, idx1 + 50);

if (idx2_second >= 0) {
  const keep_before = l.substring(0, idx1);
  const keep_after = l.substring(idx2_second + dupe.length);
  lines[3413] = keep_before + keep_after;
  console.log('L3414 已清理重复导入按钮');
  console.log('新尾部60字符:', lines[3413].slice(-60));
} else {
  console.log('未找到重复导入按钮');
  process.exit(1);
}

fs.writeFileSync('public/js/app.js', lines.join('\n'), 'utf-8');
console.log('保存成功');
