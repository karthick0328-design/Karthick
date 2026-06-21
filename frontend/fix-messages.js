const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ?
            walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const baseDir = path.join(__dirname, 'app/manager-dashboard/department/sale/service');

walkDir(baseDir, file => {
    if (file.endsWith('project\\[id]\\page.tsx') || file.endsWith('project\\[id]/page.tsx') || file.replace(/\\/g, '/').endsWith('project/[id]/page.tsx')) {
        let content = fs.readFileSync(file, 'utf8');

        // 4. Add the ref dom block
        if (!content.includes('ref={messagesEndRef}')) {
            content = content.replace(
                "                            )}\n                        </div>\n                        <div className=\"p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl\">",
                "                            )}\n                            <div ref={messagesEndRef} />\n                        </div>\n                        <div className=\"p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl\">"
            );
            fs.writeFileSync(file, content);
            console.log('Processed ref update', file);
        }
    }
});
