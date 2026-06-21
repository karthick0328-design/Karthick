'use client';

import { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send,
  MessageCircle,
  Calendar,
  User,
  Building
} from 'lucide-react';
import Header from '../Compontent/Header';


const contactMethods = [
  {
    icon: <Phone className="w-6 h-6" />,
    title: 'Phone',
    details: '+1 (555) 123-4567',
    description: 'Mon-Fri from 8am to 6pm',
    action: 'Call Now'
  },
  {
    icon: <Mail className="w-6 h-6" />,
    title: 'Email',
    details: 'contact@maduraibioscience.com',
    description: 'Send us an email anytime',
    action: 'Send Email'
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: 'Office',
    details: '123 Science Park, Madurai, TN 625001',
    description: 'Visit our research facility',
    action: 'Get Directions'
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Business Hours',
    details: 'Monday - Friday: 8:00 AM - 6:00 PM',
    description: 'Weekend: Emergency support available',
    action: 'Schedule Meeting'
  },
];

const departments = [
  {
    name: 'Sales & Quotes',
    email: 'sales@maduraibioscience.com',
    phone: '+1 (555) 123-4501',
    description: 'Get pricing and project quotes'
  },
  {
    name: 'Technical Support',
    email: 'support@maduraibioscience.com',
    phone: '+1 (555) 123-4502',
    description: 'Technical assistance and troubleshooting'
  },
  {
    name: 'Research Collaboration',
    email: 'collaborations@maduraibioscience.com',
    phone: '+1 (555) 123-4503',
    description: 'Academic and research partnerships'
  },
  {
    name: 'Sample Submission',
    email: 'samples@maduraibioscience.com',
    phone: '+1 (555) 123-4504',
    description: 'Sample preparation and shipping guidelines'
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    department: '',
    projectType: '',
    message: '',
    urgency: 'standard'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-20">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl font-bold mb-6">Get In Touch</h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Ready to start your genomic research project? Our team of experts is here to help 
                you every step of the way.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactMethods.map((method, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="text-blue-600 mb-4 flex justify-center">
                    {method.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{method.title}</h3>
                  <p className="text-gray-900 font-semibold mb-2">{method.details}</p>
                  <p className="text-gray-600 text-sm mb-4">{method.description}</p>
                  <button className="text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors">
                    {method.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center mb-6">
                  <MessageCircle className="w-8 h-8 text-blue-600 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Send us a Message</h2>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          name="firstName"
                          required
                          value={formData.firstName}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your first name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="your.email@institution.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization *
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          name="organization"
                          required
                          value={formData.organization}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Your institution or company"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select department</option>
                        <option value="sales">Sales & Quotes</option>
                        <option value="support">Technical Support</option>
                        <option value="collaboration">Research Collaboration</option>
                        <option value="samples">Sample Submission</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Urgency
                      </label>
                      <select
                        name="urgency"
                        value={formData.urgency}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="standard">Standard (2-4 weeks)</option>
                        <option value="priority">Priority (1-2 weeks)</option>
                        <option value="urgent">Urgent (3-5 days)</option>
                        <option value="emergency">Emergency (1-2 days)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Type
                    </label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select project type</option>
                      <option value="wgs">Whole Genome Sequencing</option>
                      <option value="rna-seq">RNA Sequencing</option>
                      <option value="single-cell">Single Cell Analysis</option>
                      <option value="metagenomics">Metagenomics</option>
                      <option value="custom">Custom Project</option>
                      <option value="consultation">Technical Consultation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Details *
                    </label>
                    <textarea
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Please describe your project, sample type, research goals, and any specific requirements..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                  </button>
                </form>
              </div>

              {/* Department Contacts & Map */}
              <div className="space-y-8">
                {/* Department Contacts */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Department Contacts</h3>
                  <div className="space-y-4">
                    {departments.map((dept, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{dept.description}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-blue-600">{dept.email}</span>
                          <span className="text-gray-500">{dept.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Meeting */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                  <div className="flex items-center mb-4">
                    <Calendar className="w-6 h-6 mr-3" />
                    <h3 className="text-xl font-bold">Schedule a Meeting</h3>
                  </div>
                  <p className="mb-4 text-blue-100">
                    Book a 30-minute consultation with our genomics experts to discuss your project requirements.
                  </p>
                  <button className="w-full bg-white text-blue-600 py-3 px-6 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    Book Consultation
                  </button>
                </div>

                {/* Map Placeholder */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Our Location</h3>
                  <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Interactive Map</p>
                      <p className="text-sm text-gray-500">123 Science Park, Madurai</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                {
                  question: "What's the typical turnaround time for sequencing projects?",
                  answer: "Standard projects: 2-4 weeks, Priority: 1-2 weeks, Urgent: 3-5 days depending on project complexity."
                },
                {
                  question: "Do you accept international samples?",
                  answer: "Yes, we work with researchers worldwide and provide detailed shipping guidelines for international samples."
                },
                {
                  question: "What file formats do you provide for results?",
                  answer: "We provide standard formats (FASTQ, BAM, VCF) and customized reports based on your analysis requirements."
                },
                {
                  question: "Can you help with experimental design?",
                  answer: "Absolutely! Our scientific team provides free consultation for experimental design and project planning."
                }
              ].map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-3">{faq.question}</h4>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      {/* <Footer /> */}
    </div>
  );
}