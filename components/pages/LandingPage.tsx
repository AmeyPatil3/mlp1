
import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuitIcon, UsersIcon, UserHeartIcon, CheckCircleIcon } from '../ui/icons';

const LandingHeader: React.FC = () => (
  <header className="absolute top-0 left-0 right-0 z-50 py-6 px-4 sm:px-6 lg:px-8">
    <div className="container mx-auto flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <BrainCircuitIcon className="w-8 h-8 text-white" />
        <span className="text-2xl font-bold text-white">MindLink</span>
      </div>
      <nav className="flex items-center space-x-4">
        <Link to="/login" className="text-white hover:text-gray-200 transition-colors">Login</Link>
        <Link to="/register-user" className="bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">
          Sign Up
        </Link>
      </nav>
    </div>
  </header>
);

const LandingFooter: React.FC = () => (
  <footer className="bg-gray-800 text-white">
    <div className="container mx-auto px-4 py-6 text-center text-gray-400">
      <p>&copy; {new Date().getFullYear()} MindLink. All rights reserved.</p>
      <p className="text-sm mt-1">"Connecting Minds, Offering Support"</p>
    </div>
  </footer>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white p-8 rounded-lg shadow-lg">
    <div className="flex-shrink-0 mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
    <p className="mt-2 text-gray-600">{children}</p>
  </div>
);

const LandingPage: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800">
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white pt-32 pb-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Find Your Safe Space.</h1>
          <p className="mt-4 text-lg md:text-xl text-blue-100 max-w-3xl mx-auto">
            MindLink offers a supportive community for peer-to-peer conversations and professional therapy sessions. You are not alone.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/register-user" className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full text-lg hover:bg-gray-100 transition-transform transform hover:scale-105 duration-300">
              Join for Support
            </Link>
            <Link to="/register-therapist" className="border-2 border-white text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-white hover:text-blue-600 transition-all duration-300">
              I'm a Therapist
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800">How It Works</h2>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">A simple, secure, and supportive process to get the help you need.</p>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            <FeatureCard icon={<UsersIcon className="w-12 h-12 text-blue-600" />} title="Anonymous Peer Groups">
              Connect with others in safe, anonymous video chat rooms. Share experiences and find strength in community.
            </FeatureCard>
            <FeatureCard icon={<UserHeartIcon className="w-12 h-12 text-green-600" />} title="Verified Therapists">
              Browse and book sessions with our directory of professional, vetted therapists for one-on-one support.
            </FeatureCard>
            <FeatureCard icon={<CheckCircleIcon className="w-12 h-12 text-indigo-600" />} title="Complete Privacy">
              Your identity is protected. We are committed to providing a secure platform for your mental wellness journey.
            </FeatureCard>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
