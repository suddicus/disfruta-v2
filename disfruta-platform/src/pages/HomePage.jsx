import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle,
  Star,
  Globe,
  Zap,
  Lock
} from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const features = [
    {
      icon: Shield,
      title: 'Secure & Transparent',
      description: 'Built on blockchain technology for complete transparency and security'
    },
    {
      icon: TrendingUp,
      title: 'Competitive Returns',
      description: 'Earn attractive returns by lending to verified borrowers'
    },
    {
      icon: Users,
      title: 'Global Community',
      description: 'Connect with borrowers and lenders from around the world'
    },
    {
      icon: Zap,
      title: 'Fast Processing',
      description: 'Quick loan approval and funding through smart contracts'
    }
  ];

  const stats = [
    { label: 'Total Loans Funded', value: '$2.5M+' },
    { label: 'Active Users', value: '5,000+' },
    { label: 'Average Return', value: '12.5%' },
    { label: 'Success Rate', value: '98%' }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Small Business Owner',
      content: 'Disfruta helped me expand my business when traditional banks said no. The process was transparent and fast.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Investor',
      content: 'I\'ve been earning consistent returns by lending through Disfruta. The platform is reliable and secure.',
      rating: 5
    },
    {
      name: 'Maria Rodriguez',
      role: 'Freelancer',
      content: 'Got a loan for my equipment upgrade in just 2 days. Amazing experience compared to traditional lending.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('/assets/images/hero-pattern.svg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        ></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Democratizing Access to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Financial Freedom
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Connect borrowers and lenders directly through blockchain technology. 
              Transparent, secure, and efficient peer-to-peer lending.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <div className="flex space-x-4">
                  {user?.userType === 'borrower' ? (
                    <button
                      onClick={() => navigate('/borrow')}
                      className="bg-white text-blue-900 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/lend')}
                      className="bg-white text-blue-900 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className="bg-white text-blue-900 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/about"
                    className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-900 transition-colors"
                  >
                    Learn More
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Disfruta?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built with cutting-edge blockchain technology to provide a secure, 
              transparent, and efficient lending experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple steps to get started with peer-to-peer lending
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* For Borrowers */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                For Borrowers
              </h3>
              <div className="space-y-6">
                {[
                  { step: 1, title: 'Create Account', desc: 'Sign up and complete KYC verification' },
                  { step: 2, title: 'Apply for Loan', desc: 'Submit your loan application with required details' },
                  { step: 3, title: 'Get Approved', desc: 'Our AI system evaluates and approves your loan' },
                  { step: 4, title: 'Receive Funding', desc: 'Get funded by multiple lenders and withdraw funds' }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Lenders */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                For Lenders
              </h3>
              <div className="space-y-6">
                {[
                  { step: 1, title: 'Create Account', desc: 'Sign up and connect your wallet' },
                  { step: 2, title: 'Browse Loans', desc: 'Explore verified loan opportunities' },
                  { step: 3, title: 'Invest Funds', desc: 'Choose loans that match your risk profile' },
                  { step: 4, title: 'Earn Returns', desc: 'Receive regular payments with interest' }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600">
              Real experiences from our community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-lg">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-gray-500 text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already using Disfruta for their lending and borrowing needs.
          </p>
          
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Borrowing
              </Link>
              <Link
                to="/auth"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Start Lending
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <Lock className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
              <p className="text-gray-600">Enterprise-grade encryption and security measures</p>
            </div>
            <div className="flex flex-col items-center">
              <Globe className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Global Accessibility</h3>
              <p className="text-gray-600">Available worldwide with local compliance</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verified Users</h3>
              <p className="text-gray-600">All users go through comprehensive KYC verification</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;