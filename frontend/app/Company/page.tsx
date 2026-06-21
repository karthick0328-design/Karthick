'use client';
import { useState } from 'react';
import {
  Users,
  Target,
  Award,
  Globe,
  Clock,
  Shield,
  TrendingUp,
  Heart,
  Microscope,
  Dna,
  Calendar,
  MapPin
} from 'lucide-react';
import Header from '../Compontent/Header';
// import Footer from '../Compontent/Footer';

const stats = [
  { number: '15+', label: 'Years Experience', icon: <Calendar className="w-6 h-6" /> },
  { number: '500+', label: 'Research Projects', icon: <Microscope className="w-6 h-6" /> },
  { number: '50+', label: 'Countries Served', icon: <Globe className="w-6 h-6" /> },
  { number: '98%', label: 'Client Satisfaction', icon: <Heart className="w-6 h-6" /> },
];
const values = [
  {
    icon: <Target className="w-8 h-8" />,
    title: 'Precision',
    description: 'Delivering accurate and reliable genomic data with uncompromising quality standards.'
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Integrity',
    description: 'Maintaining the highest ethical standards in all our research and client interactions.'
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'Innovation',
    description: 'Continuously advancing genomic technologies and methodologies for better outcomes.'
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Collaboration',
    description: 'Working closely with researchers and institutions to achieve shared scientific goals.'
  },
];
const team = [
  {
    name: 'Dr. Priya Sharma',
    role: 'Chief Scientific Officer',
    expertise: 'Genomics & Bioinformatics',
    image: '/team/priya.jpg',
    education: 'PhD in Molecular Biology, Stanford University'
  },
  {
    name: 'Dr. Arjun Patel',
    role: 'Head of Sequencing',
    expertise: 'NGS Technologies',
    image: '/team/arjun.jpg',
    education: 'PhD in Genetics, Cambridge University'
  },
  {
    name: 'Dr. Meera Krishnan',
    role: 'Bioinformatics Director',
    expertise: 'Data Analysis & AI',
    image: '/team/meera.jpg',
    education: 'PhD in Computational Biology, MIT'
  },
  {
    name: 'Dr. Sanjay Gupta',
    role: 'Research Director',
    expertise: 'Clinical Genomics',
    image: '/team/sanjay.jpg',
    education: 'MD, PhD in Medical Genetics'
  },
];
const milestones = [
  { year: '2008', event: 'Founded with focus on Sanger sequencing' },
  { year: '2012', event: 'Established NGS capabilities' },
  { year: '2015', event: 'Opened advanced bioinformatics division' },
  { year: '2018', event: 'Achieved CAP/CLIA certifications' },
  { year: '2021', event: 'Launched single-cell sequencing services' },
  { year: '2023', event: 'Expanded to international markets' },
];
export default function CompanyPage() {
  const [activeTab, setActiveTab] = useState('about');
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-20">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl font-bold mb-6">Leading Genomic Innovation</h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                For over 15 years, Madurai BioScience has been at the forefront of genomic research,
                providing cutting-edge sequencing solutions to researchers worldwide.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                  Our Story
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                  Meet Our Team
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Stats Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-4 text-blue-600">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* Content Tabs */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex border-b border-gray-200 mb-8">
              {['about', 'values', 'team', 'milestones'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-semibold border-b-2 transition-colors capitalize ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    To accelerate scientific discovery by providing researchers with the most advanced
                    genomic technologies and expert analysis, enabling breakthroughs in understanding
                    human health and disease.
                  </p>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    Founded in 2008, Madurai BioScience has grown from a local sequencing facility
                    to an internationally recognized genomics center. Our team of scientists,
                    bioinformaticians, and technical experts work collaboratively to push the
                    boundaries of what's possible in genomic research.
                  </p>
                  <div className="flex items-center space-x-4">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">Based in Madurai, serving researchers worldwide</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
                  <Dna className="w-16 h-16 text-blue-600 mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Our Expertise</h3>
                  <ul className="space-y-3">
                    {[
                      'Next-Generation Sequencing',
                      'Single-Cell Genomics',
                      'Bioinformatics Analysis',
                      'Custom Assay Development',
                      'Data Visualization',
                      'Multi-omics Integration'
                    ].map((item, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {/* Values Tab */}
            {activeTab === 'values' && (
              <div className="grid md:grid-cols-2 gap-8">
                {values.map((value, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div className="text-blue-600 mb-4">
                      {value.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{value.description}</p>
                  </div>
                ))}
              </div>
            )}
            {/* Team Tab */}
            {activeTab === 'team' && (
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Leadership Team</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {team.map((member, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                        <Users className="w-16 h-16 text-blue-600" />
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">{member.name}</h3>
                        <p className="text-blue-600 font-semibold mb-2">{member.role}</p>
                        <p className="text-gray-600 text-sm mb-3">{member.expertise}</p>
                        <p className="text-gray-500 text-xs">{member.education}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Milestones Tab */}
            {activeTab === 'milestones' && (
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                  {milestones.map((milestone, index) => (
                    <div key={index} className="relative flex items-start mb-8">
                      <div className="flex-shrink-0 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-6">
                        {milestone.year}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-6 flex-1 hover:shadow-md transition-shadow">
                        <p className="text-gray-900 font-medium">{milestone.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Partner with us for your genomic research needs. Our expert team is ready to help you achieve your research goals.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Contact Our Team
              </button>
              <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                View Services
              </button>
            </div>
          </div>
        </section>
      </main>
      {/* <Footer /> */}
    </div>
  );
}