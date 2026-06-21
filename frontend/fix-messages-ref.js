const fs = require('fs');

const paths = [
    'e:/biology/frontend/app/manager-dashboard/department/sale/service/biochemistry/project/[id]/page.tsx',
    'e:/biology/frontend/app/manager-dashboard/department/sale/service/drug-discovery/project/[id]/page.tsx',
    'e:/biology/frontend/app/manager-dashboard/department/sale/service/microbiology/project/[id]/page.tsx',
    'e:/biology/frontend/app/manager-dashboard/department/sale/service/molecular-biology/project/[id]/page.tsx',
    'e:/biology/frontend/app/manager-dashboard/department/sale/service/ngs/project/[id]/page.tsx',
    'e:/biology/frontend/app/manager-dashboard/department/sale/service/software-development/project/[id]/page.tsx'
];

paths.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('ref={messagesEndRef}')) {
        content = content.replace(
            /(<\/div>)\s*(<div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">)/,
            "    <div ref={messagesEndRef} />\n                        $1\n                        $2"
        );
        fs.writeFileSync(file, content);
        console.log('Fixed ref in', file);
    }
});
