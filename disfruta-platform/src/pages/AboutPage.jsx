import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Globe,
  CheckCircle,
  Award,
  Lock,
  Zap,
  Target,
  Heart,
  Star,
  ArrowRight
} from 'lucide-react';

const AboutPage = () => {
  const values = [
    {
      icon: Shield,
      title: 'Security First',
      description: 'Built on blockchain technology with enterprise-grade security measures to protect all users and transactions.'
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Empowering a global community of borrowers and lenders to connect and grow together.'
    },
    {
      icon: TrendingUp,
      title: 'Fair Returns',
      description: 'Providing competitive interest rates and transparent fee structures for all participants.'
    },
    {
      icon: Globe,
      title: 'Global Access',
      description: 'Breaking down geographical barriers to create worldwide access to financial services.'
    }
  ];

  const features = [
    {
      icon: Lock,
      title: 'Blockchain Security',
      description: 'All transactions are secured by smart contracts on the Ethereum blockchain, ensuring transparency and immutability.'
    },
    {
      icon: CheckCircle,
      title: 'KYC Verification',
      description: 'Comprehensive Know Your Customer verification process to ensure all users are verified and compliant.'
    },
    {
      icon: Zap,
      title: 'Smart Contracts',
      description: 'Automated loan processing and repayment through smart contracts eliminates intermediaries and reduces costs.'
    },
    {
      icon: Award,
      title: 'Credit Scoring',
      description: 'Advanced AI-powered credit scoring system that evaluates borrowers fairly and accurately.'
    },
    {
      icon: Target,
      title: 'Risk Management',
      description: 'Sophisticated risk assessment tools help lenders make informed investment decisions.'
    },
    {
      icon: Heart,
      title: 'Community Support',
      description: '24/7 customer support and active community forums to help users succeed on the platform.'
    }
  ];

  const teamMembers = [
    {
      name: 'Alex Rodriguez',
      role: 'CEO & Co-Founder',
      description: 'Former Goldman Sachs executive with 15+ years in fintech and blockchain technology.',
      image: '/assets/images/team-alex.jpg'
    },
    {
      name: 'Sarah Chen',
      role: 'CTO & Co-Founder',
      description: 'MIT graduate and former Google engineer specializing in blockchain and smart contract development.',
      image: '/assets/images/team-sarah.jpg'
    },
    {
      name: 'Michael Johnson',
      role: 'Head of Risk',
      description: 'Former JPMorgan risk manager with expertise in credit assessment and regulatory compliance.',
      image: '/assets/images/team-michael.jpg'
    },
    {
      name: 'Maria Garcia',
      role: 'Head of Product',
      description: 'Former Stripe product manager focused on creating user-centric financial products.',
      image: '/assets/images/team-maria.jpg'
    }
  ];

  const stats = [
    { number: '$50M+', label: 'Total Volume Processed' },
    { number: '25,000+', label: 'Active Users' },
    { number: '95%+', label: 'Loan Success Rate' },
    { number: '150+', label: 'Countries Served' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Disfruta
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              We're revolutionizing the lending industry by connecting borrowers and lenders 
              directly through secure blockchain technology.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                At Disfruta, we believe that everyone deserves access to fair and transparent 
                financial services. Traditional banking systems often exclude those who need 
                credit the most, while limiting returns for investors.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Our blockchain-based platform eliminates intermediaries, reduces costs, and 
                creates a more inclusive financial ecosystem where borrowers can access credit 
                at competitive rates and lenders can earn attractive returns.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Join Our Mission</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="relative">
              <img
                src="/assets/images/mission-illustration.svg"
                alt="Our Mission"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-lg text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {value.title}
                </h3>
                <p className="text-gray-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Impact
            </h2>
            <p className="text-xl text-gray-600">
              Numbers that show our growing impact
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                  {stat.number}
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
              Platform Features
            </h2>
            <p className="text-xl text-gray-600">
              Advanced technology powering the future of lending
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-lg">
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

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600">
              Experienced professionals from leading financial institutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                  <Users className="w-16 h-16 text-gray-400" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {member.name}
                  </h3>
                  <p className="text-blue-600 font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {member.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built on Cutting-Edge Technology
              </h2>
              <p className="text-lg text-gray-300 mb-6">
                Our platform leverages the latest blockchain technology, smart contracts, 
                and AI-powered risk assessment to provide a secure, transparent, and 
                efficient lending experience.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span>Ethereum blockchain for security and transparency</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span>Smart contracts for automated loan processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span>AI-powered credit scoring and risk assessment</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span>Multi-layer security and encryption</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Shield className="w-24 h-24 text-white mb-4 mx-auto" />
                  <p className="text-white text-lg">Blockchain Technology</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Join the Future of Lending?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Be part of the financial revolution. Start borrowing or lending today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Get Started Today
            </Link>
            <Link
              to="/"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;