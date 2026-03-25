import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Heart, Shield, Zap, Sparkles } from 'lucide-react';

export function Home() {
  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 text-sky-600 text-sm font-semibold border border-sky-100">
              <Sparkles className="w-4 h-4" />
              <span>Exclusive for CUT Students</span>
            </div>
            <h1 className="text-6xl sm:text-7xl font-bold tracking-tight leading-[1.1]">
              Find your <span className="text-sky-500">perfect match</span> at CUT.
            </h1>
            <p className="text-xl text-zinc-500 max-w-lg leading-relaxed">
              Connect with fellow students, share interests, and find meaningful relationships within the Chinhoyi University of Technology community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/auth"
                className="bg-sky-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 text-center"
              >
                Get Started for Free
              </Link>
              <Link
                to="/discover"
                className="bg-white text-zinc-900 border-2 border-zinc-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-zinc-50 transition-all text-center"
              >
                Browse Profiles
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
              <img
                src="https://apply.cut.ac.zw/cut-admin2.jpg"
                alt="Students at CUT"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Floating Cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-zinc-100 flex items-center space-x-3"
            >
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-500">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <div>
                <p className="text-sm font-bold">New Match!</p>
                <p className="text-xs text-zinc-500">Someone likes you back</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="p-8 bg-white rounded-3xl border border-zinc-100 space-y-4 hover:shadow-xl transition-all group">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Zap className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold">Smart Matching</h3>
          <p className="text-zinc-500">Our algorithm suggests partners based on your specific preferences and interests.</p>
        </div>
        <div className="p-8 bg-white rounded-3xl border border-zinc-100 space-y-4 hover:shadow-xl transition-all group">
          <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold">Verified Students</h3>
          <p className="text-zinc-500">A safe community exclusively for Chinhoyi University of Technology students.</p>
        </div>
        <div className="p-8 bg-white rounded-3xl border border-zinc-100 space-y-4 hover:shadow-xl transition-all group">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold">Secure Payments</h3>
          <p className="text-zinc-500">Safe and easy subscription via Paynow for full access and chat features.</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-zinc-900 rounded-[3rem] p-12 sm:p-20 text-center text-white space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-sky-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500 rounded-full blur-[100px]" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">Ready to find your match?</h2>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          Join thousands of CUT students already connecting on the platform. Registration is free and takes less than a minute.
        </p>
        <Link
          to="/auth"
          className="inline-block bg-white text-zinc-900 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-all"
        >
          Create Your Profile
        </Link>
      </section>
    </div>
  );
}
