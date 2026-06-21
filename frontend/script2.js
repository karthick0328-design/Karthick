const fs = require('fs');
const path = require('path');

const newCreatePath = 'e:\\biology\\frontend\\app\\super-admin-dashboard\\member-creation\\new-create\\page.tsx';
const targetPath = 'e:\\biology\\frontend\\app\\super-admin-dashboard\\member-creation\\page.tsx';

let content = fs.readFileSync(newCreatePath, 'utf8');

// The working flow is the multi-step form. We need to update UI to Violet/Slate.
// Replace blue-600 -> violet-600, blue-500 -> violet-500, etc.

content = content.replace(/blue-600/g, 'violet-600');
content = content.replace(/blue-500/g, 'violet-500');
content = content.replace(/blue-100/g, 'violet-100');
content = content.replace(/blue-50/g, 'violet-50');
content = content.replace(/text-gray-/g, 'text-slate-');
content = content.replace(/bg-gray-/g, 'bg-slate-');
content = content.replace(/border-gray-/g, 'border-slate-');

content = content.replace(/from-green-50 to-emerald-100\/50/g, 'from-violet-50 to-slate-50');
content = content.replace(/border-green-200\/60/g, 'border-violet-100');
content = content.replace(/bg-green-500/g, 'bg-emerald-500'); // keep success icons emerald
content = content.replace(/text-green-900/g, 'text-slate-900');
content = content.replace(/text-green-700/g, 'text-slate-500');
content = content.replace(/text-green-800/g, 'text-slate-700');

// Fix text-white from overriding
// Modify the getPageTitle
content = content.replace(
  /const getPageTitle = \(\) => 'Create Staff User';/,
  "const getPageTitle = () => 'New Member Creation';"
);

content = content.replace(
  /const getDashboardPrefix = \(\) => \{[\s\S]*?\};/,
  "const getDashboardPrefix = () => 'super-admin';"
);

// We need to bypass the specific department validation since Super Admins can assign any department.
content = content.replace(
  /const urlDeptSlug = searchParams.get\('dept'\) \|\| '';[\s\S]*?setTargetSlug\(urlDeptSlug\);/,
  ""
);

content = content.replace(
  /if \(!currentUser \|\| !targetDepartment \|\| !targetSlug\) \{/,
  "if (!currentUser) {"
);

content = content.replace(
  /targetDepartment: targetDepartment, \/\/ Reset to target for quick re-create \(full name\)/,
  "department: '',"
);

// Make department required for ALL roles, because Super Admin creates users from scratch and must pick a department.
content = content.replace(
  /department\?: string;\s+\/\/ Optional for non-subadmin/,
  "department: string;"
);

// In validation step 2:
content = content.replace(
  /if \(formData\.role === 'subadmin'\) \{\s+if \(!formData\.department\) stepErrors\.department = 'Department is required';\s+\} else \{\s+const hasDeptOrService = formData\.department \|\| formData\.service;\s+if \(!hasDeptOrService\) stepErrors\.departmentOrService = 'Department or service is required';\s+\}/,
  "if (!formData.department) stepErrors.department = 'Department is required';\n      if (formData.role !== 'subadmin' && !formData.service && !formData.department) { stepErrors.departmentOrService = 'Department or service is required'; }"
);

// Form Select for Department
content = content.replace(
  /Department \{formData\.role === 'subadmin' \? '\*' : '\(Pre-filled for this creation\)'\}/,
  "Department *"
);

content = content.replace(
  /required=\{formData\.role === 'subadmin'\}/,
  "required={true}"
);

// Change "Create Staff User" heading to use Violet/Slate design
content = content.replace(
  /bg-gradient-to-br from-slate-50 to-violet-50\/30/,
  "bg-slate-50"
);

// Add the distinct dark mode header block styling typical of this app
content = content.replace(
  /<h2 className="text-3xl font-bold text-slate-900 mb-2">[\s\S]*?<\/p>\s+<\/div>/,
  `<div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-100 mb-4">
                      <Sparkles size={12} className="text-violet-400" />
                      <span>Personnel Setup</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                      {getPageTitle()}
                    </h2>
                    <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">
                      Step {activeStep + 1} of {steps.length}: {steps[activeStep].title}
                    </p>
                  </div>`
);

// Save directly to the member-creation/page.tsx
fs.writeFileSync(targetPath, content);

// Also remove the new-create folder to clean up
fs.rmSync(path.join(path.dirname(targetPath), 'new-create'), { recursive: true, force: true });

console.log('Done transforming to Violet/Slate super admin UI!');
