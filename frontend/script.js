const fs = require('fs');
const path = require('path');

const srcPage = 'e:\\biology\\frontend\\app\\manager-dashboard\\department\\hr\\creation\\page.tsx';
const srcNewCreate = 'e:\\biology\\frontend\\app\\manager-dashboard\\department\\hr\\creation\\new-create\\page.tsx';

const destDir = 'e:\\biology\\frontend\\app\\super-admin-dashboard\\member-creation';
const destNewCreateDir = path.join(destDir, 'new-create');

fs.mkdirSync(destDir, { recursive: true });
fs.mkdirSync(destNewCreateDir, { recursive: true });

let pageContent = fs.readFileSync(srcPage, 'utf8');

// Adapt pageContent for super-admin
pageContent = pageContent.replace(
  /if \(!\['subadmin', 'manager', 'head'\]\.includes\(userRole\)\) \{/,
  "if (!['subadmin', 'superadmin'].includes(userRole)) {"
);

pageContent = pageContent.replace(
  /const isHRPersonnel = \.*?;\s+if \(normalizedSelected === 'human-resources'\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
  ""
); // Removing the complex HR restriction check because superadmin has access to everything

pageContent = pageContent.replace(
  /const getDashboardPrefix = \(\) => .*?;/,
  ""
);

pageContent = pageContent.replace(
  /const getCreateLink = \(\) => `\/\$\{getDashboardPrefix\(\)\}-dashboard\/department\/hr\/creation\/new-create`;/,
  "const getCreateLink = () => `/super-admin-dashboard/member-creation/new-create?dept=${getDeptSlug(selectedDepartment)}`;"
);

pageContent = pageContent.replace(
  /const getViewLink = \(id: string\) => `\/\$\{getDashboardPrefix\(\)\}-dashboard\/department\/\$\{getDeptSlug\(selectedDepartment\)\}\/creation\/\$\{id\}\/view`;/,
  "const getViewLink = (id: string) => `/super-admin-dashboard/member-creation/${id}/view`;"
);

pageContent = pageContent.replace(
  /const getEditLink = \(id: string\) => `\/\$\{getDashboardPrefix\(\)\}-dashboard\/department\/\$\{getDeptSlug\(selectedDepartment\)\}\/creation\/\$\{id\}\/edit`;/,
  "const getEditLink = (id: string) => `/super-admin-dashboard/member-creation/${id}/edit`;"
);

pageContent = pageContent.replace(
  /const role = currentUser\?\.role === 'subadmin' \? 'subadmin' : 'manager';\s+const dept = getDeptSlug\(selectedDepartment\);\s+const vPath = `\/\$\{role\}-dashboard\/department\/\$\{dept\}\/creation\/\$\{user\._id\}\/view`;\s+const ePath = `\/\$\{role\}-dashboard\/department\/\$\{dept\}\/creation\/\$\{user\._id\}\/edit`;/,
  "const vPath = `/super-admin-dashboard/member-creation/${user._id}/view`;\n                                const ePath = `/super-admin-dashboard/member-creation/${user._id}/edit`;"
);

fs.writeFileSync(path.join(destDir, 'page.tsx'), pageContent);

let newCreateContent = fs.readFileSync(srcNewCreate, 'utf8');

// Adapt newCreateContent for super-admin
newCreateContent = newCreateContent.replace(
  /import \{ useSearchParams \} from 'next\/navigation';/,
  ""
);
newCreateContent = newCreateContent.replace(
  /import \{ useRouter, useParams, usePathname \} from 'next\/navigation';/,
  "import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';"
);

newCreateContent = newCreateContent.replace(
  /const params = useParams\(\);/,
  "const params = useParams();\n  const searchParams = useSearchParams();"
);

// Remove the strict URL check
newCreateContent = newCreateContent.replace(
  /const segments = pathname\.split\('\/'\);[\s\S]*?console\.log\('Auth check passed:', \{ role: userRole, userDept, targetDept: trimmedFullTarget \}\);/m,
  `
      const urlDeptSlug = searchParams.get('dept') || '';
      let fullTargetDept = departmentMapping[urlDeptSlug] || urlDeptSlug || '';
      
      setTargetDepartment(fullTargetDept);
      setTargetSlug(urlDeptSlug);
`
);

// Allow access for superadmin
newCreateContent = newCreateContent.replace(
  /if \(!\['subadmin', 'manager', 'head'\]\.includes\(userRole\)\) \{/,
  "if (!['subadmin', 'superadmin'].includes(userRole)) {"
);

// Remove validation during submit
newCreateContent = newCreateContent.replace(
  /const normalizedTarget = normalizeDept\(trimmedTarget\);[\s\S]*?\}\s*\} catch \(error\)/,
  `
      } catch (error)`
);

// Make targetDepartment check optional since they can select it via the form
newCreateContent = newCreateContent.replace(
  /if \(!currentUser \|\| !targetDepartment \|\| !targetSlug\) \{/,
  "if (!currentUser) {"
);

newCreateContent = newCreateContent.replace(
  /const getPageTitle = \(\) => targetDepartment \? `Create \$\{targetDepartment\} Staff User` : 'Create Staff User';/,
  "const getPageTitle = () => 'Create Staff User';"
);

newCreateContent = newCreateContent.replace(
  /const getViewLink = \(id: string\) => `\/\$\{getDashboardPrefix\(\)\}-dashboard\/department\/\$\{targetSlug\}\/creation\/\$\{id\}\/view`;/,
  "const getViewLink = (id: string) => `/super-admin-dashboard/member-creation/${id}/view`;"
);
newCreateContent = newCreateContent.replace(
  /const getEditLink = \(id: string\) => `\/\$\{getDashboardPrefix\(\)\}-dashboard\/department\/\$\{targetSlug\}\/creation\/\$\{id\}\/edit`;/,
  "const getEditLink = (id: string) => `/super-admin-dashboard/member-creation/${id}/edit`;"
);

fs.writeFileSync(path.join(destNewCreateDir, 'page.tsx'), newCreateContent);
console.log('Done!');
