'use client';

import React from 'react';
import { X, Palette, Type, Layout, Check, RotateCcw, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ThemeCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: 'HiringSection' | 'AdvertisementsSection';
}

export default function ThemeCustomizationModal({ isOpen, onClose, section }: ThemeCustomizationModalProps) {
  const [formData, setFormData] = React.useState({
    primaryColor: '#611B9B',
    secondaryColor: '#FFD100',
    accentColor: '#FFFFFF',
    fontFamily: "'Inter', sans-serif",
    backgroundPattern: 'Dots',
    cardStyle: 'Curved'
  });
  const [loading, setLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);

  React.useEffect(() => {
    if (isOpen) {
      fetchCurrentSettings();
    }
  }, [isOpen, section]);

  const fetchCurrentSettings = async () => {
    try {
      setInitialLoading(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/announcements/ui-settings`);
      if (response.data.success) {
        const sectionSetting = response.data.data.find((s: any) => s.section === section);
        if (sectionSetting) {
          setFormData({
            primaryColor: sectionSetting.primaryColor || '#611B9B',
            secondaryColor: sectionSetting.secondaryColor || '#FFD100',
            accentColor: sectionSetting.accentColor || '#FFFFFF',
            fontFamily: sectionSetting.fontFamily || "'Inter', sans-serif",
            backgroundPattern: sectionSetting.backgroundPattern || 'Dots',
            cardStyle: sectionSetting.cardStyle || 'Curved'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching UI settings:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/announcements/ui-settings/${section}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onClose();
    } catch (err) {
      console.error('Error updating UI settings:', err);
      alert('Failed to update theme. Ensure you are logged in as Super Admin.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <Palette size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Customize {section === 'HiringSection' ? 'Recruitment' : 'Ads'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Design Studio • Super Admin Control</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {initialLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Palette Configuration...</p>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
                {/* Patterns Section */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                        <Layout size={14} /> Background Pattern
                    </label>
                    <div className="grid grid-cols-5 gap-3">
                        {['None', 'Dots', 'Waves', 'Grid', 'Abstract'].map((pattern) => (
                            <button
                                key={pattern}
                                onClick={() => setFormData({ ...formData, backgroundPattern: pattern })}
                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 ${
                                    formData.backgroundPattern === pattern 
                                    ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-xl shadow-indigo-100' 
                                    : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                                }`}
                            >
                                {pattern}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Colors Section */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                           Primary Color
                        </label>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                            <input 
                                type="color" 
                                value={formData.primaryColor} 
                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                            />
                            <span className="text-xs font-black text-slate-600 uppercase font-mono">{formData.primaryColor}</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                           Secondary Color
                        </label>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                            <input 
                                type="color" 
                                value={formData.secondaryColor} 
                                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                            />
                            <span className="text-xs font-black text-slate-600 uppercase font-mono">{formData.secondaryColor}</span>
                        </div>
                    </div>
                </div>

                {/* Typography */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                        <Type size={14} /> Font Typography
                    </label>
                    <select 
                        value={formData.fontFamily}
                        onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none focus:border-indigo-600 transition-colors italic appearance-none"
                    >
                        <option value="'Inter', sans-serif">Inter (Modern Sans)</option>
                        <option value="'Outfit', sans-serif">Outfit (Premium Rounded)</option>
                        <option value="'Playfair Display', serif">Playfair (Classic Elegance)</option>
                        <option value="'JetBrains Mono', monospace">JetBrains (Technical Intel)</option>
                        <option value="'System-UI', sans-serif">System Default</option>
                    </select>
                </div>

                {/* Card Styles */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                        Card Geometry
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                        {['Curved', 'Sharp', 'Glass', 'Gradient'].map((style) => (
                            <button
                                key={style}
                                onClick={() => setFormData({ ...formData, cardStyle: style })}
                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 ${
                                    formData.cardStyle === style 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                                }`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="p-8 bg-slate-50 flex items-center gap-4">
          <button 
            onClick={() => setFormData({
                primaryColor: '#611B9B',
                secondaryColor: '#FFD100',
                accentColor: '#FFFFFF',
                fontFamily: "'Inter', sans-serif",
                backgroundPattern: 'Dots',
                cardStyle: 'Curved'
            })} 
            className="p-5 bg-white border border-slate-200 text-slate-400 rounded-3xl hover:bg-slate-100 transition-all flex items-center gap-3 shadow-sm"
          >
            <RotateCcw size={20} />
          </button>
          
          <button 
                onClick={handleSave}
                disabled={loading || initialLoading}
                className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
            >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
            {loading ? 'Propagating Themes...' : 'Apply Changes Globally'}
          </button>
        </div>
      </div>
    </div>
  );
}
