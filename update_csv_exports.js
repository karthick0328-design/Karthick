// Script to batch update all TL service pages with validateURL import and blob URL sanitization
const filesToUpdate = [
    'e:/biology/frontend/app/tl-dashboard/service/software-development/page.tsx',
    'e:/biology/frontend/app/tl-dashboard/service/molecular-biology/page.tsx',
    'e:/biology/frontend/app/tl-dashboard/service/drug-discovery/page.tsx',
    'e:/biology/frontend/app/tl-dashboard/service/microbiology/page.tsx',
    'e:/biology/frontend/app/tl-dashboard/service/biochemistry/page.tsx'
];

// All these files need:
// 1. Import validateURL from '@/lib/validation';
// 2. Change: link.setAttribute('href', url);
//    To: link.setAttribute('href', validateURL(url));

console.log('Files to update:', filesToUpdate);
console.log('Manual update required - see instructions below');
