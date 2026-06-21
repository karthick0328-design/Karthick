const fs = require('fs');
const path = require('path');

const baseDir = 'e:/biology/frontend/app/employee-dashboard/service';
const files = [
    'biochemistry/seniority/junior/attendance/page.tsx',
    'biochemistry/seniority/senior/attendance/page.tsx',
    'drug-discovery/seniority/junior/attendance/page.tsx',
    'drug-discovery/seniority/senior/attendance/page.tsx',
    'microbiology/seniority/junior/attendance/page.tsx',
    'microbiology/seniority/senior/attendance/page.tsx',
    'molecular-biology/seniority/junior/attendance/page.tsx',
    'molecular-biology/seniority/senior/attendance/page.tsx',
    'ngs/seniority/junior/attendance/page.tsx',
    'ngs/seniority/senior/attendance/page.tsx',
    'software-development/seniority/junior/attendance/page.tsx',
    'software-development/seniority/senior/attendance/page.tsx'
];

const template = (service, seniority) => {
    const serviceName = service.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    const seniorityName = seniority.charAt(0).toUpperCase() + seniority.slice(1);
    const componentName = serviceName.replace(/\s+/g, '') + seniorityName + 'AttendancePage';

    return "'use client';\n" +
        "import AttendanceWidget from '@/app/Compontent/AttendanceWidget';\n" +
        "import LeaveRequestWidget from '@/app/Compontent/LeaveRequestWidget';\n" +
        "import { useRouter } from 'next/navigation';\n" +
        "import { ArrowLeft, Clock, Calendar as CalendarIcon } from 'lucide-react';\n" +
        "\n" +
        "const " + componentName + " = () => {\n" +
        "    const router = useRouter();\n" +
        "\n" +
        "    return (\n" +
        "        <div className=\"space-y-8 pb-12\">\n" +
        "            {/* Header Section */}\n" +
        "            <div className=\"flex flex-col md:flex-row md:items-center justify-between gap-4\">\n" +
        "                <div>\n" +
        "                    <button\n" +
        "                        onClick={() => router.back()}\n" +
        "                        className=\"flex items-center gap-2 mb-4 text-slate-500 hover:text-slate-900 transition-colors group text-sm font-medium\"\n" +
        "                    >\n" +
        "                        <ArrowLeft size={16} />\n" +
        "                        <span>Back to Dashboard</span>\n" +
        "                    </button>\n" +
        "                    <h1 className=\"text-3xl font-bold text-slate-900 flex items-center gap-3\">\n" +
        "                        <div className=\"p-2 bg-emerald-100 rounded-xl text-emerald-600\">\n" +
        "                            <Clock size={28} />\n" +
        "                        </div>\n" +
        "                        " + serviceName + " " + seniorityName + " Attendance\n" +
        "                    </h1>\n" +
        "                    <p className=\"text-slate-500 mt-2 max-w-2xl font-medium\">\n" +
        "                        Track your daily attendance and manage your leave requests through our portal. \n" +
        "                        Your records are automatically synchronized with the HR system.\n" +
        "                    </p>\n" +
        "                </div>\n" +
        "\n" +
        "                <div className=\"flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm\">\n" +
        "                    <div className=\"p-2.5 bg-slate-100 rounded-xl text-slate-600\">\n" +
        "                        <CalendarIcon size={20} />\n" +
        "                    </div>\n" +
        "                    <div>\n" +
        "                        <p className=\"text-[10px] text-slate-400 uppercase tracking-widest font-bold\">Current Date</p>\n" +
        "                        <p className=\"text-slate-900 font-bold\">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>\n" +
        "                    </div>\n" +
        "                </div>\n" +
        "            </div>\n" +
        "\n" +
        "            {/* Widgets Grid */}\n" +
        "            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-8\">\n" +
        "                <AttendanceWidget variant=\"card\" />\n" +
        "                <LeaveRequestWidget variant=\"card\" />\n" +
        "            </div>\n" +
        "\n" +
        "            {/* Working Hours Info */}\n" +
        "            <div className=\"p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-4\">\n" +
        "                <div className=\"w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm\">\n" +
        "                    <Clock size={20} />\n" +
        "                </div>\n" +
        "                <div>\n" +
        "                    <h4 className=\"font-bold text-indigo-900 text-sm\">Standard Working Hours</h4>\n" +
        "                    <p className=\"text-indigo-600/80 text-xs font-medium\">09:00 AM - 06:00 PM (Monday to Friday)</p>\n" +
        "                </div>\n" +
        "            </div>\n" +
        "        </div>\n" +
        "    );\n" +
        "};\n" +
        "\n" +
        "export default " + componentName + ";\n";
};

files.forEach(file => {
    const parts = file.split('/');
    const service = parts[0];
    const seniority = parts[2];
    const content = template(service, seniority);
    const fullPath = path.join(baseDir, file);
    fs.writeFileSync(fullPath, content);
    console.log('Updated ' + fullPath);
});
