'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, Save, Plus, Trash2, Edit, CreditCard, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';

interface ReceiptItem {
    sNo: number;
    description: string;
    hsn: string;
    qty: number;
    unit: string;
    rate: number;
    gstPercent: number;
    discount?: number;
    amount: number;
}

interface ReceiptData {
    receiptId: string;
    items?: ReceiptItem[];
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    baseAmount: number;
    gst: number;
    taxHandling: string;
    professionalFee?: {
        amount: number;
        vendorName?: string;
        description?: string;
    };
    memberCost: number;
    projectUniqueId: string;
    userDetails: {
        name: string;
        email: string;
        phone: string;
        uniqueId: string;
        branch?: string;
        gstin?: string;
        address?: string;
    };
    projectDetails: {
        title: string;
        description: string;
        quotation: string;
        department: string;
    };
    issuedAt: string;
    dueDate: string;
    issuedBy: string;
}

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    receiptData: ReceiptData;
    readOnly?: boolean;
    onSave?: (updatedData: ReceiptData) => Promise<void>;
    onPay?: (amount: number) => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, receiptData, readOnly = false, onSave, onPay }) => {
    const componentRef = useRef<HTMLDivElement>(null);
    const [editableData, setEditableData] = useState<ReceiptData>(receiptData);
    const [isEditMode, setIsEditMode] = useState(false); // Default to view mode, but allow toggle if not readOnly or if it's a preview

    useEffect(() => {
        if (receiptData) {
            const initialItems = [...(receiptData.items || [
                {
                    sNo: 1,
                    description: `${receiptData.projectDetails.title}\n${receiptData.projectDetails.description}`,
                    hsn: '9983', // Example SAC for R&D
                    qty: 1,
                    unit: 'Nos',
                    rate: (receiptData.baseAmount || 0) + (receiptData.memberCost || 0),
                    gstPercent: receiptData.gst || 18,
                    amount: (receiptData.baseAmount || 0) + (receiptData.memberCost || 0)
                }
            ])];

            // If it's a new receipt (no saved items) and there's a professional fee, add it as a separate item
            if (!receiptData.items && receiptData.professionalFee && receiptData.professionalFee.amount > 0) {
                initialItems.push({
                    sNo: initialItems.length + 1,
                    description: `Professional Fee ${receiptData.professionalFee.vendorName ? `(${receiptData.professionalFee.vendorName})` : ''}\n${receiptData.professionalFee.description || 'Service Remuneration'}`,
                    hsn: '9983',
                    qty: 1,
                    unit: 'Nos',
                    rate: receiptData.professionalFee.amount,
                    gstPercent: receiptData.gst || 18,
                    amount: receiptData.professionalFee.amount
                });
            }

            // Calculate total amount from items to ensure accuracy
            const totalFromItems = initialItems.reduce((sum, item) => sum + item.amount, 0);

            setEditableData({
                ...receiptData,
                items: initialItems,
                amount: receiptData.items ? receiptData.amount : totalFromItems // Use saved amount if items exist, otherwise use recalculated total
            });
        }
    }, [receiptData]);

    const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
        const newItems = [...(editableData.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalculate amount for the item
        if (field === 'qty' || field === 'rate' || field === 'gstPercent' || field === 'discount') {
            const rate = field === 'rate' ? Number(value) : newItems[index].rate;
            const qty = field === 'qty' ? Number(value) : newItems[index].qty;
            const base = rate * qty;
            const gst = base * (newItems[index].gstPercent / 100);
            const discount = newItems[index].discount || 0;
            newItems[index].amount = base + gst - discount;
        }

        const totalAmount = newItems.reduce((sum, item) => sum + item.amount, 0);
        setEditableData({ ...editableData, items: newItems, amount: totalAmount });
    };

    const addItem = () => {
        const nextSNo = (editableData.items?.length || 0) + 1;
        const newItem: ReceiptItem = {
            sNo: nextSNo,
            description: '',
            hsn: '9983',
            qty: 1,
            unit: 'Nos',
            rate: 0,
            gstPercent: 18,
            amount: 0
        };
        setEditableData({ ...editableData, items: [...(editableData.items || []), newItem] });
    };

    const removeItem = (index: number) => {
        const newItems = (editableData.items || []).filter((_, i) => i !== index);
        const totalAmount = newItems.reduce((sum, item) => sum + item.amount, 0);
        setEditableData({ ...editableData, items: newItems, amount: totalAmount });
    };

    const handleDownloadPDF = () => {
        const toastId = toast.loading('Generating Premium Invoice PDF...');
        try {
            const d = editableData;
            const JS_PDF = (jsPDF as any).jsPDF || jsPDF;
            const pdf = new JS_PDF('p', 'mm', 'a4');
            const PW = 210; // A4 width mm
            const M = 14;  // margin
            const CW = PW - M * 2; // content width
            let y = 0;

            // ── COLOR HELPERS ──────────────────────────────────────────
            const hex = (h: string) => {
                const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
                return [r, g, b] as [number, number, number];
            };
            const fill = (h: string) => pdf.setFillColor(...hex(h));
            const stroke = (h: string) => pdf.setDrawColor(...hex(h));
            const textColor = (h: string) => pdf.setTextColor(...hex(h));
            const font = (style: 'normal' | 'bold', size: number) => { pdf.setFontSize(size); pdf.setFont('helvetica', style); };

            // ── HEADER BAND ────────────────────────────────────────────
            fill('#f1f5f9'); stroke('#f1f5f9');
            pdf.rect(0, 0, PW, 52, 'FD');

            // Logo box
            fill('#0f172a'); stroke('#0f172a');
            pdf.rect(M, 8, 14, 14, 'FD');
            font('bold', 9); textColor('#ffffff');
            pdf.text('PCG', M + 2.5, 17);

            // Company name
            font('bold', 11); textColor('#0f172a');
            pdf.text('PCG', M + 16, 16);
            font('normal', 8); textColor('#64748b');
            pdf.text('Network', M + 16, 21);

            // INVOICE title (right)
            font('bold', 30); textColor('#0f172a');
            pdf.text('INVOICE', PW - M, 20, { align: 'right' });
            font('normal', 10); textColor('#64748b');
            const subtitle = d.remainingAmount === 0 ? 'Official Receipt' : 'Laboratory Services';
            pdf.text(subtitle, PW - M, 27, { align: 'right' });

            // Divider line
            stroke('#94a3b8');
            pdf.setLineWidth(0.5);
            pdf.line(M, 33, PW - M, 33);

            // Invoice number
            font('bold', 8); textColor('#0f172a');
            pdf.text(`INVOICE NUMBER: ${d.receiptId}`, PW / 2, 40, { align: 'center' });

            y = 58;

            // ── CLIENT & PROJECT INFO ──────────────────────────────────
            const col2x = M + CW / 2 + 4;
            const labelW = 36;

            const infoRow = (label: string, value: string, cx: number, cy: number) => {
                font('bold', 7.5); textColor('#0f172a');
                pdf.text(label.toUpperCase(), cx, cy);
                font('normal', 7.5); textColor('#475569');
                const lines = pdf.splitTextToSize(value || 'N/A', CW / 2 - labelW - 4);
                pdf.text(':', cx + labelW, cy);
                pdf.text(lines, cx + labelW + 3, cy);
                return cy + (lines.length * 5);
            };

            let leftY = y, rightY = y;
            leftY = infoRow('Client Name', d.userDetails.name, M, leftY) + 4;
            leftY = infoRow('Project Title', d.projectDetails.title, M, leftY) + 4;
            infoRow('Address', d.userDetails.address || 'N/A', M, leftY);

            rightY = infoRow('User ID', d.userDetails.uniqueId, col2x, rightY) + 4;
            rightY = infoRow('Date', new Date(d.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), col2x, rightY) + 4;
            infoRow('GSTIN', d.userDetails.gstin || 'Unregistered', col2x, rightY);

            y = Math.max(leftY, rightY) + 10;

            // ── SERVICE DETAILS TABLE HEADER ───────────────────────────
            font('bold', 9); textColor('#0f172a');
            pdf.text('SERVICE DETAILS', M, y);
            y += 5;

            // Table column widths
            const descW = CW - 25 - 35 - 35;
            const qtyW = 25, rateW = 35, totalW = 35;
            const col = { desc: M, qty: M + descW, rate: M + descW + qtyW, total: M + descW + qtyW + rateW };

            // Table header row
            fill('#e2e8f0'); stroke('#cbd5e1');
            pdf.setLineWidth(0.3);
            pdf.rect(M, y, CW, 9, 'FD');
            font('bold', 7.5); textColor('#0f172a');
            pdf.text('Description of Service', col.desc + 3, y + 6);
            pdf.text('Qty.', col.qty + 3, y + 6);
            pdf.text('Rate (₹)', col.rate + 3, y + 6);
            pdf.text('Total (₹)', col.total + 3, y + 6);
            y += 9;

            // Table rows
            const items = d.items || [];
            items.forEach((item, idx) => {
                const descLines = pdf.splitTextToSize(item.description || '', descW - 5);
                const rowH = Math.max(10, descLines.length * 5 + 4);

                // Alternate row background
                if (idx % 2 === 0) { fill('#ffffff'); } else { fill('#f8fafc'); }
                stroke('#e2e8f0');
                pdf.setLineWidth(0.2);
                pdf.rect(M, y, CW, rowH, 'FD');

                font('normal', 7.5); textColor('#334155');
                pdf.text(descLines, col.desc + 3, y + 5);
                pdf.text(String(item.qty || 1), col.qty + 3, y + 5);
                pdf.text(`Rs.${(item.rate || 0).toLocaleString('en-IN')}`, col.rate + 3, y + 5);
                font('bold', 7.5); textColor('#0f172a');
                pdf.text(`Rs.${(item.amount || 0).toLocaleString('en-IN')}`, col.total + 3, y + 5);
                y += rowH;
            });

            y += 10;

            // ── SUMMARY TABLE ──────────────────────────────────────────
            const sumX = M + CW * 0.55;
            const sumW = CW * 0.45;
            const summaryRow = (label: string, value: string, isBold: boolean, bgHex: string, fgHex: string) => {
                fill(bgHex); stroke('#e2e8f0');
                pdf.setLineWidth(0.2);
                pdf.rect(sumX, y, sumW, 8, 'FD');
                if (isBold) { font('bold', 8); } else { font('normal', 7.5); }
                textColor(fgHex);
                pdf.text(label, sumX + 3, y + 5.5);
                pdf.text(value, sumX + sumW - 3, y + 5.5, { align: 'right' });
                y += 8;
            };

            const subtotal = items.reduce((s, i) => s + (i.rate * i.qty), 0);
            const totalGst = items.reduce((s, i) => s + (i.rate * i.qty * i.gstPercent / 100), 0);

            summaryRow('Subtotal', `Rs.${subtotal.toLocaleString('en-IN')}`, false, '#f8fafc', '#475569');
            summaryRow('Tax Provision (GST)', `Rs.${totalGst.toLocaleString('en-IN')}`, false, '#f8fafc', '#475569');
            summaryRow('Total Amount Due', `Rs.${(d.amount || 0).toLocaleString('en-IN')}`, true, '#0f172a', '#ffffff');
            if (d.paidAmount > 0) {
                summaryRow('Verified Payment', `Rs.${d.paidAmount.toLocaleString('en-IN')}`, true, '#f0fdf4', '#059669');
            }

            y += 12;

            // ── TERMS ─────────────────────────────────────────────────
            font('bold', 8); textColor('#0f172a');
            pdf.text('Terms and Conditions:', M, y); y += 5;
            font('normal', 7); textColor('#64748b');
            ['Payment is due upon receipt of this invoice.', 'Late payments may incur additional transaction charges.', 'All disputes are subject to local jurisdiction.'].forEach(t => {
                pdf.text(`• ${t}`, M + 2, y); y += 4.5;
            });
            font('normal', 7.5); textColor('#475569');
            pdf.text(`Issued by: ${d.issuedBy || 'PCG Labs'}`, M, y); y += 5;

            // ── SIGNATURE ─────────────────────────────────────────────
            const sigX = PW - M - 55;
            font('bold', 9); textColor('#0f172a');
            pdf.text('Accounts Dept.', sigX + 27.5, y, { align: 'center' }); y += 4;
            stroke('#0f172a'); pdf.setLineWidth(0.4);
            pdf.line(sigX, y, sigX + 55, y); y += 4;
            font('bold', 7); textColor('#0f172a');
            pdf.text('AUTHORIZED SIGNER', sigX + 27.5, y, { align: 'center' });

            // ── FOOTER BAND ────────────────────────────────────────────
            const footerY = 287;
            fill('#e2e8f0'); stroke('#e2e8f0');
            pdf.rect(0, footerY, PW, 10, 'FD');
            font('normal', 7); textColor('#475569');
            pdf.text('www.pcglabs.com', M + 2, footerY + 6.5);
            pdf.text('contact@pcglabs.com', PW - M - 2, footerY + 6.5, { align: 'right' });

            // ── SAVE ──────────────────────────────────────────────────
            const fileName = `${d.remainingAmount === 0 ? 'Receipt' : 'Invoice'}_${d.receiptId}.pdf`;
            pdf.save(fileName);
            toast.success('Invoice exported successfully!', { id: toastId });
        } catch (error: any) {
            console.error('PDF generation error:', error);
            toast.error(`Export failed: ${error.message}`, { id: toastId });
        }
    };



    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const subtotal = editableData.items?.reduce((sum, item) => sum + (item.rate * item.qty), 0) || 0;
    const totalGst = editableData.items?.reduce((sum, item) => sum + (item.rate * item.qty * item.gstPercent / 100), 0) || 0;
    const totalDiscount = editableData.items?.reduce((sum, item) => sum + (item.discount || 0), 0) || 0;
    const finalTotal = editableData.amount;

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
            {/* Modal Content */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative print:shadow-none print:w-full print:max-w-none print:max-h-none print:overflow-visible">

                {/* Actions Header */}
                <div className="sticky top-0 bg-white z-20 p-4 border-b flex justify-between items-center shadow-sm print:hidden">
                    <div className="max-w-[1000px] mx-auto flex items-center justify-between gap-6 pointer-events-auto">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-5 bg-white text-slate-400 hover:text-rose-500 rounded-[1.5rem] transition-all duration-500 hover:scale-110 active:scale-95 shadow-xl hover:shadow-rose-100 border border-slate-100"
                            >
                                <X size={28} />
                            </button>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase italic border-l-4 border-rose-500 pl-4">Review Bill</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-5 mt-1 animate-pulse">Live Synchronization Active</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {!readOnly && (
                                <button
                                    onClick={() => setIsEditMode(!isEditMode)}
                                    className={`px-8 py-4 ${isEditMode ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-indigo-600 shadow-slate-100 border border-indigo-100'} rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-3`}
                                >
                                    <Edit size={16} />
                                    {isEditMode ? 'Exit Detail Edit' : 'Modify Descriptions'}
                                </button>
                            )}

                            <button
                                onClick={handleDownloadPDF}
                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center gap-3"
                            >
                                <Download size={16} />
                                Download Bill Matrix
                            </button>

                            {onPay && editableData.remainingAmount > 0 && !isEditMode && (
                                <button
                                    onClick={() => onPay(finalTotal)}
                                    className="px-10 py-5 bg-rose-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-rose-200 flex items-center gap-4 border-2 border-white/20"
                                >
                                    <CreditCard size={20} />
                                    Proceed to Payment workflow
                                </button>
                            )}

                            {isEditMode && onSave && (
                                <button
                                    onClick={() => onSave(editableData).then(() => setIsEditMode(false))}
                                    className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-200 flex items-center gap-4 border-2 border-white/20"
                                >
                                    <Save size={20} />
                                    Save Modifications
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Printable Area */}
                <div ref={componentRef} className="p-[20mm] bg-white text-slate-900 font-sans print:p-0" style={{ minHeight: '297mm', width: '210mm', margin: '0 auto' }}>

                    {/* Header Section - Fox Network style */}
                    <div className="bg-slate-100 -mx-[20mm] -mt-[20mm] p-12 pb-8 mb-10">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center shadow-xl">
                                    <span className="text-white text-2xl font-black italic">PCG</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 leading-none">PCG</h2>
                                    <p className="text-sm text-slate-500 font-medium">Network</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">INVOICE</h1>
                                <p className="text-xl italic text-slate-500 mt-2 font-medium">
                                    {editableData.remainingAmount === 0 ? 'Official Receipt' : 'Laboratory Services'}
                                </p>
                            </div>
                        </div>
                        <div className="h-[2px] bg-slate-400 mt-6 mb-4 w-full" />
                        <div className="text-center">
                            <p className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                                INVOICE NUMBER: {editableData.receiptId}
                            </p>
                        </div>
                    </div>

                    {/* Client & Connection Info */}
                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div className="space-y-4">
                            <div className="flex">
                                <span className="w-40 text-sm font-black text-slate-900 uppercase">Client Name</span>
                                <span className="text-sm font-black text-slate-900 mr-2">:</span>
                                <div className="flex-1">
                                    {isEditMode ? (
                                        <input
                                            className="w-full text-sm font-medium text-slate-600 bg-slate-50 border-none p-0 focus:ring-0"
                                            value={editableData.userDetails.name}
                                            onChange={(e) => setEditableData({ ...editableData, userDetails: { ...editableData.userDetails, name: e.target.value } })}
                                        />
                                    ) : (
                                        <span className="text-sm font-medium text-slate-600">{editableData.userDetails.name}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex">
                                <span className="w-40 text-sm font-black text-slate-900 uppercase">Project Title</span>
                                <span className="text-sm font-black text-slate-900 mr-2">:</span>
                                <div className="flex-1">
                                    {isEditMode ? (
                                        <input
                                            className="w-full text-sm font-medium text-slate-600 bg-slate-50 border-none p-0 focus:ring-0"
                                            value={editableData.projectDetails.title}
                                            onChange={(e) => setEditableData({ ...editableData, projectDetails: { ...editableData.projectDetails, title: e.target.value } })}
                                        />
                                    ) : (
                                        <span className="text-sm font-medium text-slate-600">{editableData.projectDetails.title}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex">
                                <span className="w-40 text-sm font-black text-slate-900 uppercase">Address</span>
                                <span className="text-sm font-black text-slate-900 mr-2">:</span>
                                <div className="flex-1">
                                    {isEditMode ? (
                                        <textarea
                                            className="w-full text-sm font-medium text-slate-600 bg-slate-50 border-none p-0 focus:ring-0 resize-none h-16"
                                            value={editableData.userDetails.address || ''}
                                            onChange={(e) => setEditableData({ ...editableData, userDetails: { ...editableData.userDetails, address: e.target.value } })}
                                        />
                                    ) : (
                                        <span className="text-sm font-medium text-slate-600">{editableData.userDetails.address || 'N/A'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex">
                                <span className="w-32 text-sm font-black text-slate-900 uppercase">User ID</span>
                                <span className="text-sm font-black text-slate-900 mr-2">:</span>
                                <span className="text-sm font-medium text-slate-600 font-mono tracking-tighter">{editableData.userDetails.uniqueId}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-sm font-black text-slate-900 uppercase">Date</span>
                                <span className="text-sm font-black text-slate-900 mr-2">:</span>
                                <span className="text-sm font-medium text-slate-600">
                                    {new Date(editableData.issuedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-sm font-black text-slate-900 uppercase">GSTIN</span>
                                <span className="text-sm font-black text-slate-900 mr-2">:</span>
                                <div className="flex-1">
                                    {isEditMode ? (
                                        <input
                                            className="w-full text-sm font-medium text-slate-600 bg-slate-50 border-none p-0 focus:ring-0"
                                            value={editableData.userDetails.gstin || ''}
                                            onChange={(e) => setEditableData({ ...editableData, userDetails: { ...editableData.userDetails, gstin: e.target.value } })}
                                            placeholder="Enter GSTIN..."
                                        />
                                    ) : (
                                        <span className="text-sm font-medium text-slate-600">{editableData.userDetails.gstin || 'Unregistered'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="mb-12">
                        <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight italic border-l-4 border-slate-900 pl-4">Service Details</h3>
                        <div className="border border-slate-200 rounded-sm overflow-hidden">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-200">
                                        <th className="px-6 py-4 border border-slate-300 text-left font-black text-slate-900">Description of Service</th>
                                        <th className="px-4 py-4 border border-slate-300 text-center font-black text-slate-900 w-20">Qty.</th>
                                        <th className="px-6 py-4 border border-slate-300 text-right font-black text-slate-900 w-32">Rate (₹)</th>
                                        <th className="px-6 py-4 border border-slate-300 text-right font-black text-slate-900 w-32">Total (₹)</th>
                                        {isEditMode && <th className="p-0 w-8 print:hidden"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(editableData.items || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 border border-slate-200">
                                                {isEditMode ? (
                                                    <textarea
                                                        className="w-full bg-slate-50 border-none focus:ring-0 p-0 text-sm font-medium text-slate-600 resize-none h-12"
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-slate-600 whitespace-pre-line leading-relaxed">{item.description}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 border border-slate-200 text-center">
                                                {isEditMode ? (
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-50 border-none focus:ring-0 p-0 text-center text-sm font-medium text-slate-600"
                                                        value={item.qty}
                                                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-slate-600">{item.qty}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 border border-slate-200 text-right">
                                                {isEditMode ? (
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-50 border-none focus:ring-0 p-0 text-right text-sm font-medium text-slate-600"
                                                        value={item.rate}
                                                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-slate-600">₹{item.rate.toLocaleString()}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 border border-slate-200 text-right">
                                                <span className="text-sm font-black text-slate-900">₹{item.amount.toLocaleString()}</span>
                                            </td>
                                            {isEditMode && (
                                                <td className="px-2 py-4 border border-slate-200 text-center print:hidden">
                                                    <button onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {isEditMode && (
                                        <tr className="print:hidden">
                                            <td colSpan={5} className="p-4 text-center bg-slate-50">
                                                <button onClick={addItem} className="text-xs font-black uppercase text-indigo-600 flex items-center gap-2 mx-auto">
                                                    <Plus size={14} /> Add Line Item
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="grid grid-cols-2 gap-20 mb-12">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-tighter">Payment Information</h4>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-600 italic">Financial Transmission Secure</p>
                                <p className="text-sm font-medium text-slate-600">Issued By: {receiptData.issuedBy}</p>
                            </div>

                            <div className="mt-8">
                                <h4 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-tighter">Terms and Conditions:</h4>
                                <ul className="text-xs text-slate-500 font-medium space-y-2 list-disc ml-4">
                                    <li>Payment is due upon receipt of this digital matrix.</li>
                                    <li>Late payments may incur additional transaction charges.</li>
                                    <li>All disputes are subject to local jurisdiction.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-0">
                            <div className="flex border-x border-t border-slate-200">
                                <span className="flex-1 px-6 py-3 bg-slate-50 font-black text-slate-900 text-right border-r border-slate-200">Subtotal</span>
                                <span className="w-40 px-6 py-3 text-right font-medium text-slate-600">₹{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex border-x border-y border-slate-200">
                                <span className="flex-1 px-6 py-4 bg-slate-50 font-black text-slate-900 text-right border-r border-slate-200">Tax Provision</span>
                                <span className="w-40 px-6 py-4 text-right font-medium text-slate-600">₹{totalGst.toLocaleString()}</span>
                            </div>
                            <div className="flex border border-slate-900 bg-slate-900 text-white">
                                <span className="flex-1 px-6 py-4 font-black uppercase tracking-widest text-right border-r border-white/20">Total Amount Due</span>
                                <span className="w-40 px-6 py-4 text-right font-black text-lg">₹{(finalTotal || 0).toLocaleString()}</span>
                            </div>
                            {editableData.paidAmount > 0 && (
                                <div className="flex border-x border-b border-slate-200">
                                    <span className="flex-1 px-6 py-3 bg-slate-100 font-black text-slate-500 text-right border-r border-slate-200 italic">Verified Payment</span>
                                    <span className="w-40 px-6 py-3 text-right font-black text-emerald-600 italic">₹{editableData.paidAmount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Signature Area */}
                    <div className="mt-20 flex justify-between items-end">
                        <div className="text-slate-400">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">PCG LABS GLOBAL TRANSMISSION</p>
                        </div>
                        <div className="text-center w-64">
                            <div className="font-serif italic text-4xl text-slate-900 mb-2" style={{ fontFamily: 'Dancing Script, cursive' }}>
                                Accounts Dept.
                            </div>
                            <div className="h-[2px] bg-slate-900 w-full mb-2" />
                            <p className="text-sm font-black text-slate-900 uppercase">Authorized Signer</p>
                        </div>
                    </div>

                    {/* Footer Bar - Fox mode */}
                    <div className="bg-slate-200 -mx-[20mm] -mb-[20mm] px-12 py-4 flex justify-between items-center mt-20">
                        <div className="flex items-center gap-2">
                            <Building size={14} className="text-slate-600" />
                            <span className="text-xs font-black text-slate-600">www.pcglabs.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard size={14} className="text-slate-600" />
                            <span className="text-xs font-black text-slate-600">contact@pcglabs.com</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
