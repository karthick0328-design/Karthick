'use client';
// components/AdvancedFooter.tsx
import Link from 'next/link';
import {
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Shield,
  Award,
  Globe,
  Microscope,
  Dna,
  Cloud
} from 'lucide-react';

import { useState, useEffect } from 'react';

export default function AdvancedFooter() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentYear = new Date().getFullYear();

  const services = [
    'Whole Genome Sequencing',
    'Exome Sequencing',
    'RNA Sequencing',
    'Targeted Sequencing',
    'Single Cell Sequencing',
    'Metagenomics',
    'Epigenomics',
    'Sanger Sequencing'
  ];

  const technologies = [
    'Illumina NovaSeq',
    'PacBio SMRT',
    'Oxford Nanopore',
    'Ion Torrent',
    '10x Genomics',
    'BioNano Genomics'
  ];

  const resources = [
    'Technical Notes',
    'Application Notes',
    'Webinars',
    'Publications',
    'Case Studies',
    'Support Center',
    'Blog',
    'FAQ'
  ];

  const company = [
    'About Us',
    'Leadership Team',
    'Quality Control',
    'Careers',
    'News & Events',
    'Contact Us'
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:bg-blue-600' },
    { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:bg-blue-400' },
    { icon: Linkedin, href: '#', label: 'LinkedIn', color: 'hover:bg-blue-700' },
    { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:bg-red-600' },
    { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:bg-pink-600' }
  ];

  const certifications = [
    { name: 'ISO 9001 Certified', icon: Shield, description: 'Quality Management' },
    { name: 'CAP Accredited', icon: Award, description: 'College of American Pathologists' },
    { name: 'GLP Compliant', icon: Globe, description: 'Good Laboratory Practice' },
    { name: 'CLIA Certified', icon: Microscope, description: 'Clinical Laboratory' }
  ];

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Main Footer Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-6 gap-8 mb-12">
          {/* Company Info */}
          <div className="xl:col-span-2">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">MBS</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Madurai BioScience
                </h3>
                <p className="text-blue-300 text-sm font-medium">Global Genomics Research Hub</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed text-lg">
              Leading provider of comprehensive genomics and bioinformatics services
              for research institutions, pharmaceutical companies, and academic centers worldwide.
            </p>

            {/* Certifications */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {certifications.map((cert, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <cert.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{cert.name}</div>
                    <div className="text-gray-400 text-xs">{cert.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex space-x-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className={`w-12 h-12 bg-gray-800 ${social.color} rounded-xl flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg`}
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white border-l-4 border-blue-500 pl-3 flex items-center">
              <Dna className="w-5 h-5 mr-2" />
              Our Services
            </h4>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <li key={index}>
                  <Link
                    href={`/services/${service.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 hover:text-blue-300 transition-all duration-200 flex items-center group text-sm"
                  >
                    <ArrowRight className="w-4 h-4 mr-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1" />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {service}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Technologies */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white border-l-4 border-blue-500 pl-3 flex items-center">
              <Cloud className="w-5 h-5 mr-2" />
              Technologies
            </h4>
            <ul className="space-y-3">
              {technologies.map((tech, index) => (
                <li key={index}>
                  <Link
                    href={`/technologies/${tech.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 hover:text-blue-300 transition-all duration-200 flex items-center group text-sm"
                  >
                    <ArrowRight className="w-4 h-4 mr-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1" />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {tech}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white border-l-4 border-blue-500 pl-3">
              Resources
            </h4>
            <ul className="space-y-3">
              {resources.map((resource, index) => (
                <li key={index}>
                  <Link
                    href={`/resources/${resource.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 hover:text-blue-300 transition-all duration-200 flex items-center group text-sm"
                  >
                    <ArrowRight className="w-4 h-4 mr-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1" />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {resource}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white border-l-4 border-blue-500 pl-3">
              Contact Info
            </h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 group">
                <MapPin className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-gray-400 group-hover:text-white transition-colors">Madurai BioScience Hub</p>
                  <p className="text-gray-400 group-hover:text-white transition-colors">Genomics Research Park</p>
                  <p className="text-gray-400 group-hover:text-white transition-colors">Madurai, Tamil Nadu 625016</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 group">
                <Phone className="w-5 h-5 text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-gray-400 group-hover:text-white transition-colors">+91 44 1234 5678</span>
              </div>

              <div className="flex items-center space-x-3 group">
                <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-gray-400 group-hover:text-white transition-colors">info@maduraibioscience.com</span>
              </div>

              {/* Quick Contact Form */}
              <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <h5 className="text-white font-semibold mb-3 text-sm">Newsletter Signup</h5>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    suppressHydrationWarning
                  />
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center"
                    suppressHydrationWarning
                  >
                    Subscribe
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="text-gray-400 text-sm text-center lg:text-left">
              © {mounted ? currentYear : '2026'} Madurai BioScience Research Hub. All rights reserved.
            </div>

            <div className="flex flex-wrap justify-center space-x-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-blue-300 transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-blue-300 transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="/sitemap" className="text-gray-400 hover:text-blue-300 transition-colors duration-200">
                Sitemap
              </Link>
              <Link href="/quality" className="text-gray-400 hover:text-blue-300 transition-colors duration-200">
                Quality Assurance
              </Link>
              <Link href="/careers" className="text-gray-400 hover:text-blue-300 transition-colors duration-200">
                Careers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}