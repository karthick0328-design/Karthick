// app/sequencing-services/page.tsx
import AdvancedHeader from '../Compontent/Header';
import { 
  Microscope, 
  Zap, 
  Shield, 
  Clock, 
  Award, 
  Users, 
  CheckCircle,
  BarChart3,
  Target,
  Database
} from 'lucide-react';

export default function SequencingServices() {
  const services = [
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Whole Genome Sequencing",
      description: "Complete genome analysis with comprehensive variant calling and annotation.",
      features: ["30x Coverage", "SNV/Indel Detection", "Structural Variants", "CNV Analysis"],
      price: "From $999",
      timeline: "4-6 weeks",
      popular: true
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Exome Sequencing",
      description: "Targeted sequencing of all protein-coding regions of the genome.",
      features: ["100x Coverage", "Clinical Grade", "Trio Analysis", "Medical Interpretation"],
      price: "From $599",
      timeline: "3-4 weeks",
      popular: false
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "RNA Sequencing",
      description: "Transcriptome analysis for gene expression and alternative splicing.",
      features: ["50M Reads", "Differential Expression", "Isoform Analysis", "Pathway Analysis"],
      price: "From $799",
      timeline: "3-5 weeks",
      popular: true
    }
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "CLIA Certified",
      description: "Clinical Laboratory Improvement Amendments certified for clinical grade results"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Rapid Turnaround",
      description: "Express options available with results in as little as 2 weeks"
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Expert Analysis",
      description: "PhD-level scientists and bioinformaticians on every project"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Dedicated Support",
      description: "Personal project manager and scientific support throughout your project"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <AdvancedHeader />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-500/10"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
              <Award className="w-4 h-4 mr-2" />
              Industry-Leading Sequencing Services
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-900 to-cyan-700 bg-clip-text text-transparent mb-6">
              Advanced Sequencing
              <span className="block text-blue-600">Solutions</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Cutting-edge genomic sequencing services powered by state-of-the-art technology 
              and expert bioinformatics analysis for research and clinical applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
                Request a Quote
              </button>
              <button className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300">
                View Case Studies
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Sequencing Services</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive genomic solutions tailored to your research needs with 
              industry-leading quality and support.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {services.map((service, index) => (
              <div key={index} className={`relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border ${
                service.popular ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
              }`}>
                {service.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white mb-6">
                    {service.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{service.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                  
                  <div className="space-y-3 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{service.price}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {service.timeline}
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-cyan-800 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Start Your Project?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Contact our sequencing specialists today for a personalized consultation 
              and project quote.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300">
                Schedule Consultation
              </button>
              <button className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                Call: (555) 123-4567
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}