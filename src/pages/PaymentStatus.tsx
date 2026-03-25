import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Loader2, ArrowRight, Zap } from 'lucide-react';

export function PaymentStatus({ isSubscribed }: { isSubscribed: boolean }) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [attempts, setAttempts] = useState(0);
  const pollUrl = searchParams.get('pollUrl');

  useEffect(() => {
    if (isSubscribed) {
      setStatus('success');
      return;
    }

    // If not subscribed yet, wait for the server update
    // We'll check for 30 seconds (15 attempts every 2 seconds)
    if (attempts < 15) {
      const timer = setTimeout(() => {
        setAttempts(prev => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setStatus('error');
    }
  }, [isSubscribed, attempts]);

  return (
    <div className="max-w-md mx-auto pt-24 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-[3rem] border border-zinc-100 shadow-2xl space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-sky-500" />
        
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center text-zinc-400 mx-auto animate-spin">
              <Loader2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Verifying Payment</h2>
            <p className="text-zinc-500">Please wait while we confirm your subscription with Paynow...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center text-green-500 mx-auto">
              <CheckCircle className="w-10 h-10 fill-current" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Payment Successful!</h2>
              <div className="flex items-center justify-center space-x-2 text-sky-500 font-bold">
                <Zap className="w-5 h-5 fill-current" />
                <span>Premium Activated</span>
              </div>
            </div>
            <p className="text-zinc-500">
              Your subscription is now active. You have full access to all CUT Connect features for one year.
            </p>
            <Link
              to="/discover"
              className="w-full inline-flex items-center justify-center space-x-2 bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all group"
            >
              <span>Start Discovering</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
              <XCircle className="w-10 h-10 fill-current" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Payment Failed</h2>
            <p className="text-zinc-500">
              Something went wrong with your transaction. Please try again or contact support if the issue persists.
            </p>
            <Link
              to="/profile"
              className="w-full inline-flex items-center justify-center space-x-2 bg-sky-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-sky-600 transition-all"
            >
              Try Again
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
