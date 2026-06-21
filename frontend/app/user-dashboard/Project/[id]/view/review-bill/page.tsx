'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import {
    ArrowLeft,
    Printer,
    Download,
    CreditCard,
    ShieldCheck,
    FileText,
    Clock,
    User,
    Building,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';

interface DecodedToken {
    sub?: string;
    id?: string;
    role: string;
    department: string;
    exp: number;
    name?: string;
}

interface ReceiptItem {
    sNo: number;
    description: string;
    hsn: string;
    qty: number;
    unit: string;
    rate: number;
    gstPercent: number;
    amount: number;
}

interface ProjectData {
    _id: string;
    uniqueId: string;
    department: string;
    category: string;
    paymentStatus: string;
    quotedAmount: number;
    baseAmount: number;
    gst: number;
    memberCost: number;
    paymentDetails: {
        title: string;
        projectDescription: string;
        detailedQuotation: string;
        dueDate: string;
        amount: number;
        paidAmount: number;
    };
    userId: {
        name: string;
        email: string;
        uniqueId: string;
    };
    formData?: {
        address?: string;
    };
    receipt?: {
        data: any;
        generatedAt: string;
    };
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

export default function ReviewBillPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;
    const billRef = useRef<HTMLDivElement>(null);

    const [user, setUser] = useState<{ role: string; id: string } | null>(null);
    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentOption, setPaymentOption] = useState<'partial' | 'full'>('full');
    const [isOfficial, setIsOfficial] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/Login/Signin'); return; }
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const official = urlParams.get('official') === 'true';
            setIsOfficial(official);
            if (official) setPaymentOption('full');

            const decoded: DecodedToken = jwtDecode(token);
            setUser({ role: decoded.role, id: decoded.id || decoded.sub || '' });
            fetchProjectData(token);
        } catch (e) {
            router.push('/Login/Signin');
        }
    }, [projectId]);

    const fetchProjectData = async (token: string) => {
        try {
            const res = await fetch(`${API_BASE}/${projectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setProject(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch project');
            }
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const amountInWords = (num: number) => {
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        const inWords = (n: number): string => {
            if (n < 20) return a[n];
            if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
            if (n < 1000) return inWords(Math.floor(n / 100)) + 'hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
            return '';
        };
        const convert = (n: number): string => {
            if (n === 0) return 'zero';
            let str = '';
            if (n >= 10000000) { str += inWords(Math.floor(n / 10000000)) + 'crore '; n %= 10000000; }
            if (n >= 100000) { str += inWords(Math.floor(n / 100000)) + 'lakh '; n %= 100000; }
            if (n >= 1000) { str += inWords(Math.floor(n / 1000)) + 'thousand '; n %= 1000; }
            if (n > 0) { str += inWords(n); }
            return str.trim();
        };
        return `Rupees ${convert(Math.floor(num))} Only`.toUpperCase();
    };

    const handleDownloadPDF = () => {
        if (!project) return;
        const toastId = toast.loading('Generating Premium Invoice PDF...');
        try {
            const isFullPaid = project?.paymentStatus === 'Full Paid' || (project?.paymentDetails && project.paymentDetails.amount > 0 && project.paymentDetails.paidAmount >= project.paymentDetails.amount);
            const isPartialPaid = project?.paymentStatus === '50% Paid' || project?.paymentStatus === 'Official Receipt Issued' || (project?.paymentDetails && project.paymentDetails.paidAmount > 0 && !isFullPaid);
            const docTitle = isFullPaid ? 'BILL' : (isPartialPaid || isOfficial ? 'RECEIPT' : 'PROFORMA');
            
            const JS_PDF = (jsPDF as any).jsPDF || jsPDF;
            const pdf = new JS_PDF('p', 'mm', 'a4');
            const PW = 210;
            const PH = 297;
            const M = 14;
            const CW = PW - M * 2;
            const col2x = M + CW / 2 + 4;
            let y = 0;

            const d = displayData;
            const docPrefix = docTitle === 'BILL' ? 'BIL' : (docTitle === 'RECEIPT' ? 'REC' : 'PRO');
            const invoiceNum = d?.receiptId || `${docPrefix}-${project.uniqueId}`;

            const hex = (h: string): [number, number, number] => [
                parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)
            ];
            const fill = (h: string) => pdf.setFillColor(...hex(h));
            const stroke = (h: string) => pdf.setDrawColor(...hex(h));
            const tc = (h: string) => pdf.setTextColor(...hex(h));
            const font = (style: 'normal' | 'bold' | 'italic', size: number) => { pdf.setFontSize(size); pdf.setFont('helvetica', style); };

            // HEADER
            font('bold', 28); tc('#000000'); pdf.text(docTitle, M, 25);
            font('bold', 10); pdf.text(`${docTitle === 'PROFORMA' ? 'Proforma' : 'Receipt'} number: ${invoiceNum}`, M, 33);
            font('bold', 10); pdf.text(`${docTitle === 'PROFORMA' ? 'Date of issue' : 'Date of purchase'}: ${new Date(d?.issuedAt || project.receipt?.generatedAt || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, M, 39);

            y = 55;

            // ADDRESSES
            font('bold', 12); tc('#000000'); pdf.text('PCG Laboratory Services', M, y);
            font('bold', 12); pdf.text('Bill By', col2x, y);
            y += 6;
            font('normal', 10); tc('#333333');
            const companyAddr = pdf.splitTextToSize('No 34/2, Research Plaza, Tech Corridor, Bangalore, KA 560103\ncontact@pcglabs.com', CW / 2 - 10);
            pdf.text(companyAddr, M, y);
            
            const clientInfo = pdf.splitTextToSize(`${d?.userDetails?.name || project.userId.name}\nAddress: ${d?.userDetails?.address || project.formData?.address || 'N/A'}\n${d?.userDetails?.email || project.userId.email}`, CW / 2 - 10);
            pdf.text(clientInfo, col2x, y);
            
            y = Math.max(y + companyAddr.length * 5, y + clientInfo.length * 5) + 15;

            // SERVICE TABLE (Matching Image)
            const rowH = 10;
            fill('#EED671'); stroke('#000000'); pdf.setLineWidth(0.5); 
            pdf.rect(M, y, CW, rowH, 'FD'); // Table Header
            
            font('bold', 10); tc('#000000');
            pdf.text('Item', M + 5, y + 6.5);
            pdf.text('Quantity', M + CW - 75, y + 6.5, { align: 'center' });
            pdf.text('Unit Price', M + CW - 45, y + 6.5, { align: 'center' });
            pdf.text('Total', M + CW - 15, y + 6.5, { align: 'center' });
            y += rowH;

            const pdfItems = d?.items?.length ? d.items : [
                { description: project.paymentDetails?.title || project.category, qty: 1, rate: subtotal, amount: subtotal }
            ];

            font('normal', 10);
            pdfItems.forEach((item: any) => {
                const ni = normalizeItem(item);
                const descLines = pdf.splitTextToSize(ni.description, CW - 90);
                const h = Math.max(rowH, descLines.length * 5 + 4);
                
                stroke('#000000'); pdf.rect(M, y, CW, h, 'D'); // Border
                pdf.line(M + CW - 90, y, M + CW - 90, y + h); // Col dividers
                pdf.line(M + CW - 60, y, M + CW - 60, y + h);
                pdf.line(M + CW - 30, y, M + CW - 30, y + h);

                pdf.text(descLines, M + 5, y + 6.5);
                pdf.text(String(ni.qty).padStart(2, '0'), M + CW - 75, y + 6.5, { align: 'center' });
                pdf.text(`Rs. ${ni.rate.toLocaleString('en-IN')}`, M + CW - 45, y + 6.5, { align: 'center' });
                pdf.text(`Rs. ${ni.amount.toLocaleString('en-IN')}`, M + CW - 15, y + 6.5, { align: 'center' });
                y += h;
            });

            // "NOTHING FOLLOWS"
            pdf.setFont('helvetica', 'italic'); tc('#ff0000');
            pdf.text('- nothing follows -', PW / 2, y + 5, { align: 'center' });
            y += 15;

            // FINANCIAL SUMMARY
            font('normal', 10); tc('#000000');
            pdf.text(`Subtotal: Rs. ${subtotal.toLocaleString('en-IN')}`, M, y); y += 6;
            font('bold', 10); pdf.text('Additional Charges', M, y); y += 6;
            font('normal', 10); pdf.text(`Tax (${gstRate}%): Rs. ${gstAmount.toLocaleString('en-IN')}`, M, y); y += 8;
            font('bold', 12); pdf.text(`Total: Rs. ${totalAmount.toLocaleString('en-IN')}`, M, y);
            
            if (d?.paidAmount > 0) {
                y += 8;
                font('bold', 10); tc('#059669');
                pdf.text(`Paid: Rs. ${d.paidAmount.toLocaleString('en-IN')}`, M, y);
            }

            // WATERMARK
            pdf.setGState(new (pdf as any).GState({ opacity: 0.03 }));
            pdf.saveGraphicsState();
            pdf.setDrawColor(0);
            // Simulating a simple watermark icon relative to labs
            pdf.circle(PW / 2, PH / 2, 40, 'S');
            pdf.restoreGraphicsState();

            // FOOTER
            fill('#e2e8f0'); stroke('#e2e8f0'); pdf.rect(0, 287, PW, 10, 'FD');
            font('normal', 7); tc('#475569');
            pdf.text('www.pcglabs.com', M + 2, 293.5);
            pdf.text('contact@pcglabs.com', PW - M - 2, 293.5, { align: 'right' });

            pdf.save(`${docTitle}_${project.uniqueId}.pdf`);
            toast.success('Invoice exported successfully!', { id: toastId });
        } catch (error: any) {
            console.error('PDF Export Error:', error);
            toast.error(`Export failed: ${error.message}`, { id: toastId });
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing Financial Matrix</p>
        </div>
    );

    if (error || !project) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
            <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Unauthorized Or Not Found</h2>
            <p className="text-slate-500 mb-8 max-w-md">{error || 'The requested financial document is not accessible at this time.'}</p>
            <Link href={`/user-dashboard/Project/${projectId}/view`} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all">
                Return to Protocol
            </Link>
        </div>
    );

    const isPartial = paymentOption === 'partial';

    // CRITICAL FIX: Always use saved receipt data if manager has saved modifications.
    // isOfficial only controls UI labels (Receipt vs Proforma) and payment button visibility.
    const displayData = project.receipt?.data || null;
    // Determine if this is an official receipt context
    const hasReceipt = !!project.receipt?.data;


    const isFullPaidState = project?.paymentStatus === 'Full Paid' || (project?.paymentDetails?.amount > 0 && project?.paymentDetails?.paidAmount >= project.paymentDetails.amount);
    const isPartialPaidState = project?.paymentStatus === '50% Paid' || project?.paymentStatus === 'Official Receipt Issued' || (project?.paymentDetails?.paidAmount > 0 && !isFullPaidState);
    const documentTitle = isFullPaidState ? 'BILL' : (isPartialPaidState || isOfficial ? 'RECEIPT' : 'PROFORMA');

    const totalAmount = (displayData
        ? displayData.amount
        : (isPartial
            ? (project.paymentDetails?.amount || (project.baseAmount ? project.baseAmount * (1 + (project.gst || 18) / 100) : 0)) / 2
            : (project.paymentDetails?.amount || (project.baseAmount ? project.baseAmount * (1 + (project.gst || 18) / 100) : 0)))) || 0;

    const gstRate = displayData ? (displayData.gst || 18) : (project.gst || 18);
    const subtotal = (displayData
        ? (displayData.items?.reduce((sum: number, item: any) => sum + (item.rate * item.qty), 0) ?? (totalAmount / (1 + gstRate / 100)))
        : (totalAmount / (1 + gstRate / 100))) || 0;

    const gstAmount = (displayData
        ? (displayData.items?.reduce((sum: number, item: any) => sum + (item.rate * item.qty * item.gstPercent / 100), 0) ?? (totalAmount - subtotal))
        : (totalAmount - subtotal)) || 0;

    // Use manager-modified receipt items if available, fall back to project data
    const items = (displayData?.items?.length ? displayData.items : null) || [
        {
            description: project.paymentDetails?.title || project.category,
            detailedDescription: isPartial
                ? `50% Mobilization Fees: ${project.paymentDetails?.projectDescription || 'Advance payment for project initialization.'}`
                : (project.paymentDetails?.projectDescription || 'Detailed service specification as confirmed by department manager.'),
            qty: 1,
            rate: subtotal,
            amount: subtotal
        }
    ];
    // Normalize item fields — receipt items use 'description'; fallback items use 'detailedDescription'
    const normalizeItem = (item: any) => ({
        description: item.description || item.detailedDescription || '',
        detailedDescription: item.detailedDescription || item.description || '',
        qty: item.qty || 1,
        rate: item.rate ?? item.amount,
        amount: item.amount ?? item.rate,
    });

    const isReadOnly = user?.role === 'user';

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <Toaster position="top-right" />

            {/* Navigation Bar */}
            <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <Link
                    href={`/user-dashboard/Project/${projectId}/view`}
                    className="flex items-center gap-3 text-slate-400 hover:text-indigo-600 transition-all group"
                >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="font-black uppercase tracking-widest text-[10px]">Project Transmission</span>
                </Link>

                <div className="flex items-center gap-4">
                    {!isOfficial && (
                        <Link
                            href={`/user-dashboard/Project/${projectId}/view?pay=true&type=${paymentOption}`}
                            className="flex items-center gap-3 px-8 py-3 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 italic border-2 border-white/20"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Proceed to Payment</span>
                        </Link>
                    )}
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl shadow-slate-200"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export {documentTitle}</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Printer className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto mt-12 px-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">

                    {/* Sidebar Info */}
                    <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-32 h-fit">
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">Verified Matrix</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                {isOfficial
                                    ? "This is your official tax invoice generated after fund verification."
                                    : "This document reflects the quoted amounts and service specifications confirmed by the Sales Division."}
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-slate-400">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Valid for 15 Days</span>
                                </div>
                                <div className="flex items-center gap-3 text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Secure Transmission</span>
                                </div>
                            </div>

                            {!isOfficial && (
                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Distribution</p>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                        <button
                                            onClick={() => setPaymentOption('partial')}
                                            className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isPartial ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            50% ADVANCE
                                        </button>
                                        <button
                                            onClick={() => setPaymentOption('full')}
                                            className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!isPartial ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            FULL PAY
                                        </button>
                                    </div>
                                    <p className="mt-3 text-[8px] text-slate-400 font-bold leading-tight italic">
                                        {isPartial ? 'Showing only the 50% mobilization amount due today.' : 'Showing the total project value for final authorization.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {isReadOnly && (
                            <div className="bg-indigo-900 text-white rounded-[2rem] p-8 shadow-xl shadow-indigo-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                <h3 className="text-lg font-black mb-4 relative z-10">Read Only Mode</h3>
                                <p className="text-xs text-indigo-200 font-medium leading-relaxed relative z-10">Protocols restrict manual modification of financial documents for your account level. Contact support for adjustments.</p>
                            </div>
                        )}
                    </div>

                    {/* Main Bill Container */}
                    <div className="lg:col-span-3">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white shadow-2xl overflow-hidden border border-slate-200"
                        >
                            <div ref={billRef} id="bill-matrix-content" className="bg-white min-h-[1122px] p-16 relative">
                                {/* Watermark Background */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                                    <ShieldCheck size={600} className="text-slate-900" />
                                </div>

                                <div className="relative z-10">
                                    {/* Header Section (Matching Image) */}
                                    <div className="mb-12">
                                        <h1 className="text-5xl font-bold text-black mb-6">{documentTitle}</h1>
                                        <div className="space-y-1">
                                            <p className="text-lg font-bold text-black">
                                                {documentTitle === 'PROFORMA' ? 'Proforma' : 'Receipt'} number: <span className="font-medium text-slate-700">{displayData?.receiptId || `${documentTitle === 'BILL' ? 'BIL' : (documentTitle === 'RECEIPT' ? 'REC' : 'PRO')}-${project.uniqueId}`}</span>
                                            </p>
                                            <p className="text-lg font-bold text-black">
                                                {documentTitle === 'PROFORMA' ? 'Date of issue' : 'Date of purchase'}: <span className="font-medium text-slate-700">{new Date(displayData?.issuedAt || project.receipt?.generatedAt || new Date()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Entity Info (Two Columns) */}
                                    <div className="grid grid-cols-2 gap-12 mb-16">
                                        <div>
                                            <h2 className="text-2xl font-bold text-black mb-3">PCG Laboratory Services</h2>
                                            <div className="text-slate-600 space-y-1 text-lg leading-relaxed">
                                                <p>No 34/2, Research Plaza, Tech Corridor</p>
                                                <p>Bangalore, KA 560103</p>
                                                <p>contact@pcglabs.com</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-black mb-3">Bill By</h2>
                                            <div className="text-slate-600 space-y-1 text-lg leading-relaxed">
                                                <p>{displayData?.userDetails?.name || project.userId.name}</p>
                                                <p>Address: {displayData?.userDetails?.address || project.formData?.address || 'Operational Address Not Defined'}</p>
                                                <p>{displayData?.userDetails?.email || project.userId.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table Section (Matching Image: Gold Header, Solid Borders) */}
                                    <div className="mb-4">
                                        <table className="w-full border-collapse border-[1.5px] border-black text-lg">
                                            <thead>
                                                <tr className="bg-[#EED671]">
                                                    <th className="border-[1.5px] border-black px-6 py-4 text-left font-bold text-black">Item</th>
                                                    <th className="border-[1.5px] border-black px-6 py-4 text-center font-bold text-black w-32">Quantity</th>
                                                    <th className="border-[1.5px] border-black px-6 py-4 text-center font-bold text-black w-40">Unit Price</th>
                                                    <th className="border-[1.5px] border-black px-6 py-4 text-center font-bold text-black w-40">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item: any, idx: number) => {
                                                    const ni = normalizeItem(item);
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="border-[1.5px] border-black px-6 py-4 text-black font-medium">{ni.description}</td>
                                                            <td className="border-[1.5px] border-black px-6 py-4 text-center text-black">{String(ni.qty).padStart(2, '0')}</td>
                                                            <td className="border-[1.5px] border-black px-6 py-4 text-center text-black">₹{ni.rate.toLocaleString()}</td>
                                                            <td className="border-[1.5px] border-black px-6 py-4 text-center text-black font-bold">₹{ni.amount.toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <div className="text-center mt-2">
                                            <span className="text-red-500 italic text-sm">- nothing follows -</span>
                                        </div>
                                    </div>

                                    {/* Summary & Charges */}
                                    <div className="space-y-2 mb-12">
                                        <p className="text-lg font-medium text-black">Subtotal: ₹{subtotal.toLocaleString()}</p>
                                        <h3 className="text-xl font-bold text-black pt-2">Additional Charges</h3>
                                        <p className="text-lg font-medium text-black">Tax ({gstRate}%): ₹{gstAmount.toLocaleString()}</p>
                                        <p className="text-2xl font-bold text-black pt-4">Total: ₹{totalAmount.toLocaleString()}</p>
                                        {displayData?.paidAmount > 0 && (
                                            <p className="text-xl font-bold text-emerald-600">Paid: ₹{displayData.paidAmount.toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
