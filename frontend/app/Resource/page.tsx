// app/resources/page.tsx
import AdvancedHeader from '../Compontent/Header';
import { 
  FileText, 
  Video, 
  BookOpen, 
  Download, 
  Calendar,
  User,
  Clock,
  Tag,
  Search,
  Filter,
  ArrowRight,
  PlayCircle,
  Eye,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';

export default function ResourcesPage() {
  const resourceCategories = [
    {
      icon: <FileText className="w-6 h-6" />,
      name: "Technical Notes",
      count: "24 Documents",
      description: "Detailed technical specifications and protocols",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      name: "Application Notes",
      count: "18 Documents",
      description: "Real-world applications and case studies",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Video className="w-6 h-6" />,
      name: "Webinars",
      count: "32 Recordings",
      description: "Live and recorded expert sessions",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      name: "Publications",
      count: "45 Papers",
      description: "Peer-reviewed research publications",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      name: "Case Studies",
      count: "12 Studies",
      description: "Success stories and implementations",
      color: "from-indigo-500 to-blue-500"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      name: "Support Center",
      count: "100+ Articles",
      description: "Help articles and troubleshooting",
      color: "from-gray-500 to-slate-600"
    }
  ];

  const featuredResources = [
    {
      title: "Advanced NGS Library Prep Guide",
      type: "Technical Note",
      category: "Technical Notes",
      description: "Comprehensive guide for next-generation sequencing library preparation with optimized protocols.",
      image: "/api/placeholder/400/250",
      author: "Dr. Sarah Chen",
      date: "2024-01-15",
      duration: "15 min read",
      downloads: 1247,
      featured: true,
      new: true
    },
    {
      title: "Single-Cell RNA Sequencing Webinar",
      type: "Webinar",
      category: "Webinars",
      description: "Live demonstration of single-cell RNA sequencing analysis pipeline and best practices.",
      image: "/api/placeholder/400/250",
      author: "Prof. Michael Rodriguez",
      date: "2024-01-10",
      duration: "45 min",
      views: 892,
      featured: true,
      new: false
    }
  ];

  const recentResources = [
    {
      title: "Whole Genome Sequencing Analysis Pipeline",
      type: "Application Note",
      category: "Application Notes",
      author: "Dr. Emily Watson",
      date: "2024-01-12",
      downloads: 543,
      icon: <FileText className="w-5 h-5" />
    },
    {
      title: "Metagenomics in Clinical Diagnostics",
      type: "Publication",
      category: "Publications",
      author: "Dr. James Kim",
      date: "2024-01-08",
      downloads: 321,
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      title: "CRISPR Screening Best Practices",
      type: "Technical Note",
      category: "Technical Notes",
      author: "Dr. Lisa Wang",
      date: "2024-01-05",
      downloads: 678,
      icon: <FileText className="w-5 h-5" />
    },
    {
      title: "Introduction to Spatial Transcriptomics",
      type: "Webinar",
      category: "Webinars",
      author: "Dr. Robert Taylor",
      date: "2024-01-03",
      views: 456,
      icon: <Video className="w-5 h-5" />
    }
  ];

  const upcomingWebinars = [
    {
      title: "Advanced Bioinformatics for NGS Data",
      date: "2024-01-25",
      time: "2:00 PM EST",
      speaker: "Dr. Amanda Johnson",
      registered: 234,
      capacity: 500
    },
    {
      title: "Multi-omics Integration Strategies",
      date: "2024-02-01",
      time: "11:00 AM EST",
      speaker: "Dr. Kevin Brown",
      registered: 189,
      capacity: 500
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <AdvancedHeader />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-cyan-500/5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
              <BookOpen className="w-4 h-4 mr-2" />
              Knowledge Center
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-900 to-cyan-700 bg-clip-text text-transparent mb-6">
              Resources &
              <span className="block text-blue-600">Learning</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Access technical documentation, application notes, webinars, and publications 
              to support your genomics research journey.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources, technical notes, webinars..."
                  className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-lg"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Resource Categories</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Browse our comprehensive collection of technical resources and learning materials.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {resourceCategories.map((category, index) => (
              <div 
                key={index}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-200 overflow-hidden"
              >
                <div className={`h-2 bg-gradient-to-r ${category.color}`}></div>
                <div className="p-6">
                  <div className={`w-12 h-12 bg-gradient-to-r ${category.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {category.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-gray-600 mb-4">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">{category.count}</span>
                    <button className="flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm group-hover:translate-x-1 transition-transform duration-300">
                      Explore
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Resources */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Resources</h2>
              <p className="text-gray-600">Handpicked content to get you started</p>
            </div>
            <button className="flex items-center px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300">
              View All Resources
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {featuredResources.map((resource, index) => (
              <div key={index} className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 border border-gray-200 overflow-hidden">
                <div className="relative">
                  <div className="h-48 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    {resource.type === "Webinar" ? (
                      <PlayCircle className="w-16 h-16 text-blue-600 opacity-80" />
                    ) : (
                      <FileText className="w-16 h-16 text-blue-600 opacity-80" />
                    )}
                  </div>
                  <div className="absolute top-4 left-4 flex space-x-2">
                    {resource.new && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-semibold">
                        New
                      </span>
                    )}
                    {resource.featured && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full font-semibold">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <Tag className="w-4 h-4 mr-1" />
                    {resource.category}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {resource.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {resource.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {resource.author}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {resource.date}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {resource.duration}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      {resource.downloads ? (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          {resource.downloads} downloads
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          {resource.views} views
                        </>
                      )}
                    </div>
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-semibold text-sm">
                      {resource.type === "Webinar" ? "Watch Now" : "Download"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Resources & Upcoming Webinars */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Recent Resources */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Resources</h3>
              <div className="space-y-4">
                {recentResources.map((resource, index) => (
                  <div key={index} className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 border border-gray-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        {resource.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-600">{resource.type}</span>
                          <span className="text-xs text-gray-500">{resource.date}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {resource.title}
                        </h4>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>By {resource.author}</span>
                          <span className="flex items-center">
                            <Download className="w-4 h-4 mr-1" />
                            {resource.downloads}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Webinars */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Webinars</h3>
              <div className="space-y-4">
                {upcomingWebinars.map((webinar, index) => (
                  <div key={index} className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                          {webinar.title}
                        </h4>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <User className="w-4 h-4 mr-2" />
                          {webinar.speaker}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          {webinar.date} at {webinar.time}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                        <Video className="w-6 h-6" />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Registered: {webinar.registered}/{webinar.capacity}</span>
                        <span>{Math.round((webinar.registered / webinar.capacity) * 100)}% full</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(webinar.registered / webinar.capacity) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300">
                      Register Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-cyan-800 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Can't Find What You're Looking For?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Our technical support team is ready to help you with custom solutions and expert guidance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-lg">
                Contact Support
              </button>
              <button className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                Request Custom Content
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}