const fs = require('fs');
const path = require('path');

// 定义 links.json 文件的路径（确保在 Actions 中路径正确）
const filePath = path.join(__dirname, '../json/links.json');

// 读取并更新文件
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }

    // 解析 JSON 数据
    let json = JSON.parse(data);

    // 更新 lastUpdated 字段
    json.lastUpdated = new Date().toISOString();

    // 将更新后的 JSON 写回文件
    fs.writeFile(filePath, JSON.stringify(json, null, 2), (err) => {
        if (err) {
            console.error('写入文件失败:', err);
        } else {
            console.log('links.json 文件已成功更新');
        }
    });
});
