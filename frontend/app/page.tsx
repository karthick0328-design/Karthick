'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Briefcase } from 'lucide-react';
import axios from 'axios';
import Header from './Compontent/Header';
import Footer from './Compontent/Footer';
import PublicJobApplicationModal from './Compontent/PublicJobApplicationModal';
import { getSanitizedURL } from '@/lib/validation';

// --- Types ---
interface Job {
  _id: string;
  title?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  description?: string;
  closingDate?: string;
}

interface Advertisement {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  attachmentUrl?: string;
}

const servicesData = [
  { 
    title: "NGS Sequencing", 
    desc: "Whole genome, exome, and targeted sequencing using highly advanced platforms. Unveiling genomic mysteries.", 
    points: ["Quality Control", "Data Delivery", "Sample Prep", "Construction"], 
    bg: "/sequencing-lab.png" 
  },
  { 
    title: "Bioinformatics Analysis", 
    desc: "Advanced computational methodology for interpreting complex genomic data and driving actionable insights.", 
    points: ["Data Processing", "Variant Calling", "Custom Pipelines", "Visual Reporting"], 
    bg: "/bioinformatics.png" 
  },
  { 
    title: "Clinical Diagnostics", 
    desc: "Precision molecular diagnostics utilizing cutting edge sequencing for accurate patient outcomes.", 
    points: ["CAP/CLIA Certified", "Rapid Turnaround", "Expert Review", "Genetic Counseling"], 
    bg: "/medical.jpg" 
  }
];

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // (Removed getSafeUrl to process sanitization precisely inside the component body where taint flow starts)

  // Carousel States
  const [activeService, setActiveService] = useState(0);
  const [activeAd, setActiveAd] = useState(0);
  const [activeJob, setActiveJob] = useState(0);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/public/job-openings`)
      .then(res => {
        if (res.data.success) setJobs(res.data.data);
      })
      .catch(err => console.error('Error fetching jobs:', err));

    axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/announcements/public?category=Advertisement`)
      .then(res => {
        if (res.data.success) setAds(res.data.data);
      })
      .catch(err => console.error('Error fetching ads:', err));
  }, []);

  // Auto-play effect
  useEffect(() => {
    const serviceInterval = setInterval(() => {
      setActiveService(prev => (prev + 1) % servicesData.length);
    }, 5000);
    
    const adInterval = setInterval(() => {
      if (ads.length > 0) {
        setActiveAd(prev => (prev + 1) % ads.length);
      }
    }, 6000);

    const jobInterval = setInterval(() => {
      if (jobs.length > 0) {
        setActiveJob(prev => (prev + 1) % jobs.length);
      }
    }, 4500);

    return () => {
      clearInterval(serviceInterval);
      clearInterval(adInterval);
      clearInterval(jobInterval);
    };
  }, [ads.length, jobs.length]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBA';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const currentService = servicesData[activeService] || servicesData[0];
  const currentAd = ads.length > 0 ? ads[activeAd] : null;

  let safeAdImg = '';
  if (currentAd?.imageUrl && !/^\s*javascript:/i.test(currentAd.imageUrl)) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const parsedUrl = new URL(currentAd.imageUrl, baseUrl);
      safeAdImg = getSanitizedURL(parsedUrl.href);
    } catch {
      safeAdImg = '';
    }
  }

  // We show jobs one by one to match the screenshot's single card layout
  const currentJob = jobs.length > 0 ? jobs[activeJob] : { _id: 'fake', jobTitle: 'Drug-Discovery', location: 'MADURAI', description: 'I need the good communication skill', closingDate: '2026-03-19T00:00:00.000Z' };

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans selection:bg-[#FFD100] selection:text-black">
      <Header />

      <main className="flex-1 w-full overflow-hidden">
        
        {/* --- Hero Section --- */}
        <section className="relative w-full min-h-[85vh] flex items-center pt-16 pb-12">
          {/* Background Image Container */}
          <div className="absolute inset-0 z-0 flex justify-end items-stretch pointer-events-none opacity-90">
             {/* Using a clear fade gradient replacing the black overlay */}
             <div className="w-full lg:w-[70%] h-full relative" style={{ 
               backgroundImage: 'url("/bioscience.jpg"), url("/biology-1.jpg")',
               backgroundSize: 'cover', 
               backgroundPosition: 'center right',
               backgroundRepeat: 'no-repeat',
               WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,1) 40%, white 100%)',
               maskImage: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,1) 40%, white 100%)'
             }} />
          </div>

          <div className="container mx-auto px-8 md:px-16 lg:px-24 relative z-10">
            <div className="max-w-3xl">
              <h1 className="text-[5rem] md:text-[7rem] lg:text-[9rem] font-serif tracking-tighter leading-[0.85] text-[#1A1A1A] mb-10">
                Trust.<br />
                <span className="italic font-light opacity-90">Experience.</span><br />
                Tailored.
              </h1>
              
              <p className="text-xl md:text-2xl text-[#1A1A1A]/80 font-light max-w-lg mb-16 leading-relaxed">
                We are a pioneering scientific research society uncovering genomic insights through advanced sequencing and rigorous analysis.
              </p>
              
              <Link href="/Sequence" className="inline-flex items-center justify-center w-36 h-36 rounded-full border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F9F8F6] transition-all duration-700 uppercase tracking-[0.2em] text-[11px] font-bold ring-8 ring-transparent hover:ring-[#1A1A1A]/10">
                Explore
              </Link>
            </div>
          </div>
        </section>

        {/* --- Precision at Scale Section --- */}
        <section className="py-32 md:py-48 bg-[#F9F8F6]">
          <div className="container mx-auto px-8 md:px-16 lg:px-24">
            <div className="flex flex-col lg:flex-row gap-20 lg:gap-32">
              <div className="lg:w-5/12 shrink-0">
                <h2 className="text-6xl md:text-7xl font-serif tracking-tight text-[#1A1A1A] leading-none mb-4">
                  Precision <br /> 
                  <span className="italic font-light opacity-70 text-[#4A5D6A]">at scale.</span>
                </h2>
              </div>
              
              <div className="lg:w-7/12 space-y-24">
                <p className="text-3xl md:text-4xl font-light text-[#1A1A1A]/90 leading-snug">
                  Combining state-of-the-art technology with scientific expertise to deliver reliable genomics solutions tailored to your deepest hypotheses.
                </p>
                
                <div className="border-t border-[#1A1A1A]/10 pt-16">
                  <div className="space-y-16">
                    <div className="group cursor-default">
                      <h3 className="text-3xl md:text-4xl font-serif text-[#1A1A1A] mb-4 transition-all duration-500 hover:tracking-wide">01 — High-Throughput Sequencing</h3>
                      <p className="text-[#1A1A1A]/50 font-light text-lg">Scalable solutions for projects of any size.</p>
                    </div>
                    <div className="group cursor-default">
                      <h3 className="text-3xl md:text-4xl font-serif text-[#1A1A1A] mb-4 transition-all duration-500 hover:tracking-wide">02 — Quality Certified</h3>
                      <p className="text-[#1A1A1A]/50 font-light text-lg">ISO certified with rigorous validation protocols.</p>
                    </div>
                    <div className="group cursor-default">
                      <h3 className="text-3xl md:text-4xl font-serif text-[#1A1A1A] mb-4 transition-all duration-500 hover:tracking-wide">03 — Expert Team</h3>
                      <p className="text-[#1A1A1A]/50 font-light text-lg">PhD-level scientists with decades of experience.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Services Section --- */}
        <section className="py-32 md:py-48 border-t border-[#1A1A1A]/10 overflow-hidden">
          <div className="container mx-auto px-8 md:px-16 lg:px-24">
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-[#1A1A1A]/10 pb-12 mb-16">
              <h2 className="text-7xl md:text-[7rem] font-serif text-[#1A1A1A] tracking-tighter leading-none">Services</h2>
              <p className="text-xl text-[#1A1A1A]/70 font-light max-w-sm text-right mt-8 md:mt-0 leading-relaxed">
                End-to-end solutions, engineered for clarity.
              </p>
            </div>
            
            <div className="flex justify-between items-center mb-16">
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveService((prev) => (prev - 1 + servicesData.length) % servicesData.length)}
                  className="w-14 h-14 rounded-full border border-[#1A1A1A] flex items-center justify-center hover:bg-[#1A1A1A] hover:text-[#F9F8F6] transition-colors duration-500 z-10 relative"
                >
                  <ArrowRight size={20} className="rotate-180" strokeWidth={1} />
                </button>
                <button 
                  onClick={() => setActiveService((prev) => (prev + 1) % servicesData.length)}
                  className="w-14 h-14 rounded-full border border-[#1A1A1A] flex items-center justify-center hover:bg-[#1A1A1A] hover:text-[#F9F8F6] transition-colors duration-500 z-10 relative"
                >
                  <ArrowRight size={20} strokeWidth={1} />
                </button>
              </div>
              <div className="flex gap-2">
                {servicesData.map((_, i) => (
                  <div key={i} className={`h-0.5 transition-all duration-500 ${i === activeService ? 'w-16 bg-[#1A1A1A]' : 'w-6 bg-[#1A1A1A]/20'}`}></div>
                ))}
              </div>
            </div>

            {/* Service Card */}
            <div key={activeService} className="flex flex-col lg:flex-row shadow-[0_40px_100px_rgba(0,0,0,0.05)] bg-[#F9F8F6] border border-[#1A1A1A]/5 animate-[fadeIn_0.5s_ease-out]">
              <div className="lg:w-[45%] h-[500px] lg:h-auto relative overflow-hidden">
                 <div className="absolute inset-0 transition-transform duration-[4s] ease-in-out scale-100 hover:scale-105" style={{
                   backgroundImage: `url("${currentService.bg}")`,
                   backgroundSize: 'cover',
                   backgroundPosition: 'center',
                   backgroundRepeat: 'no-repeat'
                 }} />
              </div>
              <div className="lg:w-[55%] p-16 md:p-24 flex flex-col justify-center relative bg-[#F9F8F6]">
                <div className="w-10 h-10 mb-10 opacity-70">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                     <path d="M7 4V20M17 4V20M4 8H20M4 16H20M9 12L15 12" />
                  </svg>
                </div>
                <h3 className="text-5xl md:text-6xl font-serif text-[#1A1A1A] mb-8 tracking-tight">{currentService.title}</h3>
                <p className="text-xl text-[#1A1A1A]/60 font-light mb-16 leading-extra-loose border-b border-[#1A1A1A]/10 pb-16">
                  {currentService.desc}
                </p>
                <div className="grid grid-cols-2 gap-y-8 gap-x-12 mb-16">
                  {currentService.points.map((pt, i) => (
                    <div key={i} className="flex items-center gap-4 text-xs uppercase font-bold tracking-[0.2em] text-[#1A1A1A]/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]"></span> {pt}
                    </div>
                  ))}
                </div>
                <div>
                  <Link href="/Sequence" className="inline-flex items-center justify-center px-10 py-5 border border-[#1A1A1A] rounded-full uppercase tracking-widest text-[11px] font-bold hover:bg-[#1A1A1A] hover:text-[#F9F8F6] transition-all duration-500">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Featured Highlights (Advertisements) --- */}
        {ads.length > 0 && (
        <section className="py-32 md:py-48 bg-[#F9F8F6]">
          <div className="container mx-auto px-8 md:px-16 lg:px-24">
            <div className="bg-[#191919] p-16 md:p-32 text-white relative overflow-hidden group">
              <div className="flex justify-between items-center border-b border-white/10 pb-10 mb-20 relative z-10">
                <h2 className="text-2xl font-serif text-white/90">Featured Highlights</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveAd((prev) => (prev - 1 + ads.length) % ads.length)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <ArrowRight className="rotate-180" size={24} strokeWidth={1} />
                  </button>
                  <button 
                    onClick={() => setActiveAd((prev) => (prev + 1) % ads.length)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <ArrowRight size={24} strokeWidth={1} />
                  </button>
                </div>
              </div>

              {currentAd && (
                  <div key={`ad-${activeAd}`} className="flex flex-col lg:flex-row items-center gap-20 relative z-10 animate-[fadeIn_0.5s_ease-out]">
                    <div className="lg:w-[45%]">
                      <div className="flex items-center gap-3 text-[#4285F4] font-bold tracking-[0.2em] uppercase text-[10px] mb-8">
                        <div className="w-2 h-2 bg-[#4285F4]"></div> EXCLUSIVE OFFER
                      </div>
                      <h3 className="text-6xl md:text-7xl font-serif mb-8 tracking-tighter leading-none">{currentAd.title}</h3>
                      <p className="text-white/40 mb-16 text-xl font-light leading-relaxed max-w-md">
                        {currentAd.description || 'Exclusive insight into our latest research developments and offerings.'}
                      </p>
                      <button className="bg-white text-black rounded-full px-8 py-5 uppercase tracking-widest text-[11px] font-bold flex items-center gap-3 hover:bg-[#F9F8F6] transition-colors">
                        Redeem Now <ArrowUpRight size={18} strokeWidth={2} />
                      </button>
                    </div>
                    <div className="lg:w-[55%] flex justify-end">
                      <div className="w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-full bg-[#E8E6DF] overflow-hidden grayscale sepia-[0.1] hover:grayscale-0 transition-all duration-1000 relative">
                        {currentAd.imageUrl ? (
                          <img src={safeAdImg} alt="Ad Highlight" className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-[#E8E6DF] grayscale flex items-center justify-center opacity-70" style={{
                            backgroundImage: 'url("/Fund_Statement_68dbcd0292f23ec456c1f5b3.png")',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}></div>
                        )}
                      </div>
                    </div>
                  </div>
              )}
              {/* Slider indicators */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-3 z-10">
                {ads.map((_, i) => (
                  <button key={i} onClick={() => setActiveAd(i)} className={`h-1.5 transition-all rounded-full ${i === activeAd ? 'w-8 bg-white' : 'w-2 bg-white/20'}`} />
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* --- Careers / Job Hiring Section --- */}
        <section className="py-32 md:py-48 border-t border-[#1A1A1A]/10 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1A1A1A]/10 to-transparent"></div>
          
          <div className="container mx-auto px-8 md:px-16 lg:px-24">
            <div className="mb-24 flex flex-col md:flex-row justify-between items-end gap-10">
              <div>
                <p className="text-[#1A1A1A]/40 font-bold tracking-[0.25em] uppercase text-[11px] mb-8">Careers</p>
                <h2 className="text-[5rem] md:text-[8rem] font-serif text-[#1A1A1A] leading-[0.85] tracking-tighter">
                  Join Our<br/><span className="italic font-light">Mission</span>
                </h2>
              </div>
              <p className="text-xl font-light text-[#1A1A1A]/60 max-w-[300px] text-right leading-relaxed mb-4">
                Explore open roles and build the future of scientific research with us.
              </p>
            </div>

            <div className="border-t border-[#1A1A1A]/10 pt-16 relative">
              <div className="absolute -top-6 right-0 flex gap-2 z-10 bg-[#F9F8F6] px-4">
                 <button onClick={() => setActiveJob((prev) => (prev - 1 + (jobs.length || 1)) % (jobs.length || 1))} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors">
                   <ArrowRight size={20} className="rotate-180" />
                 </button>
                 <button onClick={() => setActiveJob((prev) => (prev + 1) % (jobs.length || 1))} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors">
                   <ArrowRight size={20} />
                 </button>
              </div>

               <div key={`job-${activeJob}`} className="bg-[#F5F4F0] p-16 md:p-24 group transition-colors duration-500 relative flex flex-col justify-between min-h-[450px] animate-[fadeIn_0.5s_ease-out]">
                  
                  <div className="absolute inset-0 border border-[#1A1A1A]/5 pointer-events-none transition-colors"></div>
                  <div className="hidden lg:block absolute inset-y-0 right-0 w-1/2 bg-[#EAE8E3] z-0 border-l border-[#1A1A1A]/5"></div>

                  <div className="relative z-10 w-full lg:w-[48%] bg-[#F5F4F0] pr-8">
                    <div className="flex justify-between items-start mb-10 w-full">
                      <h3 className="text-5xl font-serif text-[#1A1A1A] tracking-tight">{currentJob.jobTitle || currentJob.title}</h3>
                      <Briefcase className="text-[#1A1A1A]/30" size={28} strokeWidth={1.5} />
                    </div>
                    <div className="inline-block border border-[#1A1A1A]/20 rounded-full px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/70 mb-12 bg-transparent">
                      {currentJob.location || 'MADURAI'}
                    </div>
                    <p className="text-[#1A1A1A]/50 font-light text-xl leading-relaxed mb-16 max-w-md">
                      {currentJob.description || 'I need the good communication skill'}
                    </p>
                  </div>
                  
                  <div className="relative z-10 w-full lg:w-[48%] flex justify-between items-end mt-auto">
                    <div>
                       <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/30 mb-2">Closes</p>
                       <p className="text-sm font-bold text-[#1A1A1A]">{formatDate(currentJob.closingDate)}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedJob(currentJob as Job)}
                      className="flex items-center gap-4 text-[12px] font-bold uppercase tracking-widest text-[#1A1A1A] hover:text-[#4A5D6A] transition-colors group"
                    >
                      Apply <ArrowRight size={18} strokeWidth={2} className="group-hover:translate-x-2 transition-transform duration-500" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-center mt-10 gap-3">
                  {jobs.length > 0 && jobs.map((_, i) => (
                    <button key={i} onClick={() => setActiveJob(i)} className={`h-1.5 transition-all rounded-full ${i === activeJob ? 'w-8 bg-[#1A1A1A]' : 'w-2 bg-[#1A1A1A]/20'}`} />
                  ))}
                </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />

      {selectedJob && selectedJob._id !== 'fake' && (
        <PublicJobApplicationModal 
          job={selectedJob} 
          onClose={() => setSelectedJob(null)} 
        />
      )}
    </div>
  );
}
