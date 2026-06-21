// app/technologies/page.tsx
import AdvancedHeader from '../Compontent/Header';
import { 
  Microscope, 
  Cpu, 
  Database, 
  Cloud, 
  Zap, 
  Shield,
  BarChart3,
  Target,
  PlayCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
  Award
} from 'lucide-react';

export default function TechnologiesPage() {
  const platforms = [
    {
      icon: <Microscope className="w-8 h-8" />,
      name: "Illumina NovaSeq",
      description: "High-throughput sequencing with industry-leading accuracy and scalability",
      specs: ["Up to 20B reads per run", "2x150 bp read length", "6 Tb per run", "99.9% accuracy"],
      applications: ["Whole Genome Sequencing", "Exome Sequencing", "Transcriptomics", "Epigenomics"],
      throughput: "Ultra-High",
      accuracy: "99.9%",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      name: "PacBio SMRT",
      description: "Long-read sequencing for comprehensive genome assembly and variant detection",
      specs: ["Reads up to 100 kb", "HiFi read accuracy >99.9%", "Epigenetic detection", "Structural variant calling"],
      applications: ["De novo Assembly", "Full-Length Transcripts", "Methylation Analysis", "Complex Variants"],
      throughput: "High",
      accuracy: "99.9%",
      color: "from-blue-500 to-cyan-500",
      featured: true
    },
    {
      icon: <Database className="w-8 h-8" />,
      name: "Oxford Nanopore",
      description: "Real-time, long-read sequencing for immediate insights and portability",
      specs: ["Reads >4 Mb", "Real-time analysis", "Portable devices", "Direct RNA sequencing"],
      applications: ["Metagenomics", "Field Sequencing", "Viral Surveillance", "RNA Modifications"],
      throughput: "Medium-High",
      accuracy: "98%",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const analysisTechnologies = [
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Bioinformatics Pipeline",
      description: "Automated analysis pipelines for variant calling, expression analysis, and more",
      features: ["QC & Trimming", "Alignment", "Variant Calling", "Annotation"],
      tools: ["BWA", "GATK", "STAR", "Samtools"],
      color: "from-orange-500 to-red-500"
    },
    {
      icon: <Cloud className="w-8 h-8" />,
      title: "Cloud Computing",
      description: "Scalable computing infrastructure for large-scale genomic data analysis",
      features: ["AWS & Google Cloud", "HPC Cluster", "Data Storage", "Parallel Processing"],
      tools: ["Docker", "Nextflow", "Kubernetes", "Slurm"],
      color: "from-indigo-500 to-blue-500"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "AI & Machine Learning",
      description: "Advanced machine learning models for predictive analysis and pattern recognition",
      features: ["Deep Learning", "Predictive Modeling", "Pattern Recognition", "Quality Control"],
      tools: ["TensorFlow", "PyTorch", "Scikit-learn", "Custom Models"],
      color: "from-purple-500 to-pink-500"
    }
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Sample Preparation",
      description: "Optimized library prep protocols for various sample types and applications",
      icon: <Microscope className="w-6 h-6" />,
      duration: "1-3 days"
    },
    {
      step: "02",
      title: "Sequencing",
      description: "High-quality data generation using state-of-the-art sequencing platforms",
      icon: <Cpu className="w-6 h-6" />,
      duration: "1-7 days"
    },
    {
      step: "03",
      title: "Data Analysis",
      description: "Comprehensive bioinformatics analysis with quality control and validation",
      icon: <BarChart3 className="w-6 h-6" />,
      duration: "2-5 days"
    },
    {
      step: "04",
      title: "Results Delivery",
      description: "Detailed reports, visualizations, and raw data in preferred formats",
      icon: <Database className="w-6 h-6" />,
      duration: "1 day"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-slate-100">
      <AdvancedHeader />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-cyan-500/5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Cutting-Edge Technology
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-900 to-cyan-700 bg-clip-text text-transparent mb-6">
              Advanced
              <span className="block text-blue-600">Technologies</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Leveraging state-of-the-art sequencing platforms and bioinformatics tools 
              to deliver unparalleled genomic insights and research capabilities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
                View Technology Specs
              </button>
              <button className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Showcase */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Sequencing Platforms</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Industry-leading sequencing technologies for every research need, 
              from high-throughput to long-read applications.
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-8">
            {platforms.map((platform, index) => (
              <div 
                key={index}
                className={`group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 border-2 ${
                  platform.featured ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
              >
                {platform.featured && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Recommended
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Platform Header */}
                    <div className="lg:w-1/3">
                      <div className="flex items-start space-x-4 mb-6">
                        <div className={`w-16 h-16 bg-gradient-to-r ${platform.color} rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                          {platform.icon}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{platform.name}</h3>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center text-gray-600">
                              <Zap className="w-4 h-4 mr-1" />
                              {platform.throughput}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Shield className="w-4 h-4 mr-1" />
                              {platform.accuracy}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        {platform.description}
                      </p>
                      
                      <button className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center">
                        View Platform Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>

                    {/* Specifications */}
                    <div className="lg:w-2/3">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                            Key Specifications
                          </h4>
                          <ul className="space-y-2">
                            {platform.specs.map((spec, specIndex) => (
                              <li key={specIndex} className="flex items-center text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                                {spec}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Target className="w-5 h-5 text-blue-500 mr-2" />
                            Applications
                          </h4>
                          <ul className="space-y-2">
                            {platform.applications.map((app, appIndex) => (
                              <li key={appIndex} className="flex items-center text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3"></div>
                                {app}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis Technologies */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Analysis Technologies</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced computational tools and infrastructure for comprehensive genomic data analysis.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {analysisTechnologies.map((tech, index) => (
              <div 
                key={index}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-200 overflow-hidden"
              >
                <div className={`h-2 bg-gradient-to-r ${tech.color}`}></div>
                <div className="p-6">
                  <div className={`w-12 h-12 bg-gradient-to-r ${tech.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {tech.icon}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{tech.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{tech.description}</p>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Key Features:</h4>
                    <div className="space-y-2">
                      {tech.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Tools & Technologies:</h4>
                    <div className="flex flex-wrap gap-2">
                      {tech.tools.map((tool, toolIndex) => (
                        <span 
                          key={toolIndex}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Workflow Process</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Streamlined process from sample to insight, ensuring quality and reliability at every step.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {workflowSteps.map((step, index) => (
                <div key={index} className="relative group">
                  {/* Connecting Line */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-cyan-200 transform -translate-y-1/2 z-0"></div>
                  )}
                  
                  <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-200 p-6 text-center group-hover:border-blue-300 z-10">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                      {step.step}
                    </div>
                    
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                      {step.description}
                    </p>
                    
                    <div className="flex items-center justify-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {step.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-cyan-800 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Cpu className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Ready to Leverage Our Technology?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Schedule a consultation with our technology experts to discuss your project requirements 
              and discover the best solutions for your research goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-lg">
                Schedule Technology Demo
              </button>
              <button className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                Download Tech Specs PDF
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}