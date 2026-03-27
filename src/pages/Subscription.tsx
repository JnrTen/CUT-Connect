import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap, CheckCircle2, Shield, Sparkles, MessageSquare, Heart, Star, CreditCard, Loader2 } from 'lucide-react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../lib/utils';

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Premium',
    price: '$1',
    period: '/month',
    features: [
      'Unlimited swipes daily',
      'Unlock all chat conversations',
      'See who liked your profile',
      'Priority profile placement',
      'Premium badge on profile',
      'Advanced search filters'
    ],
    popular: false
  },
  {
    id: 'semester',
    name: 'Semester Pass',
    price: '$2',
    period: '/semester',
    features: [
      'All Monthly features',
      'Save 25% vs monthly',
      'Valid for full academic term',
      'Exclusive campus events access',
      'Verified student status badge',
      '24/7 Priority support'
    ],
    popular: true
  }
];

export function Subscription({ isSubscribed }: { isSubscribed: boolean }) {
  const [selectedPlan, setSelectedPlan] = useState('semester');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ecocash' | 'onemoney'>('ecocash');
  const [instructions, setInstructions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const startPolling = (uid: string) => {
    if (pollInterval) clearInterval(pollInterval);
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/paynow/status/${uid}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          clearInterval(interval);
          setPollInterval(null);
          // The parent component will update isSubscribed via onSnapshot in App.tsx
          // but we can also force a refresh or show success here
          window.location.reload(); 
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds
    
    setPollInterval(interval);
    
    // Stop polling after 2 minutes to save resources
    setTimeout(() => {
      clearInterval(interval);
      setPollInterval(null);
      setIsProcessing(false);
    }, 120000);
  };

  const handleSubscribe = async () => {
    if (!auth.currentUser) return;
    
    // Basic validation for mobile payments
    if (!mobileNumber.match(/^(071|073|077|078)\d{7}$/)) {
      setError('Please enter a valid Zimbabwean mobile number (e.g., 0771234567)');
      return;
    }

    setIsProcessing(true);
    setInstructions(null);
    setError(null);
    
    try {
      const plan = PLANS.find(p => p.id === selectedPlan);
      const amount = plan ? parseInt(plan.price.replace('$', '')) : 5;

      const response = await fetch('/api/paynow/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          amount: amount,
          planId: selectedPlan,
          mobileNumber: mobileNumber,
          mobileMethod: paymentMethod
        })
      });

      const data = await response.json();
      
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.pollUrl) {
        setInstructions(data.instructions || 'Please check your phone for the payment prompt.');
        // Start polling the server for status updates
        startPolling(auth.currentUser.uid);
      } else {
        setError(data.error || 'Failed to initiate payment');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError('Failed to start payment process. Please try again.');
      setIsProcessing(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-12">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-sky-500 blur-3xl opacity-20 animate-pulse" />
          <div className="relative w-32 h-32 bg-sky-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-sky-200 mx-auto">
            <Zap className="w-16 h-16 fill-current" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-5xl font-bold tracking-tight">You're Premium!</h2>
          <p className="text-xl text-zinc-500 max-w-md mx-auto">
            Enjoy unlimited connections and all premium features. Your subscription is active.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <div className="p-6 bg-white rounded-3xl border border-zinc-100 shadow-xl">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Status</p>
            <p className="text-lg font-bold text-green-500">Active</p>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-zinc-100 shadow-xl">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Plan</p>
            <p className="text-lg font-bold text-zinc-900 capitalize">Semester</p>
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/discover'}
          className="bg-zinc-900 text-white px-12 py-5 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
        >
          Back to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-16 px-4 space-y-20">
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-full text-sm font-bold uppercase tracking-widest">
          <Sparkles className="w-4 h-4 fill-current" />
          <span>Premium Access</span>
        </div>
        <h2 className="text-6xl font-bold tracking-tight">Connect Without Limits</h2>
        <p className="text-xl text-zinc-500">
          Upgrade to CUT Connect Premium to unlock the full potential of campus networking.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        {/* Benefits List */}
        <div className="space-y-8 bg-white p-12 rounded-[3rem] border border-zinc-100 shadow-2xl">
          <h3 className="text-3xl font-bold tracking-tight">Why Go Premium?</h3>
          <div className="grid gap-8">
            {[
              { icon: MessageSquare, title: 'Unlimited Chat', desc: 'Message any student you match with instantly.' },
              { icon: Heart, title: 'See Who Likes You', desc: 'No more guessing. See your admirers directly.' },
              { icon: Star, title: 'Priority Placement', desc: 'Your profile gets shown to more students first.' },
              { icon: Shield, title: 'Verified Status', desc: 'Get a premium badge that builds trust.' }
            ].map((benefit, i) => (
              <div key={i} className="flex items-start space-x-6">
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 flex-shrink-0">
                  <benefit.icon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-zinc-900">{benefit.title}</h4>
                  <p className="text-zinc-500 leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="space-y-8">
          <div className="grid gap-6">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "relative w-full p-8 rounded-[2.5rem] border-2 text-left transition-all group",
                  selectedPlan === plan.id
                    ? "bg-zinc-900 border-zinc-900 text-white shadow-2xl"
                    : "bg-white border-zinc-100 text-zinc-900 hover:border-sky-500"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 right-8 px-4 py-1 bg-sky-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                    Best Value
                  </div>
                )}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-2xl font-bold">{plan.name}</h4>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className={cn("text-sm font-medium", selectedPlan === plan.id ? "text-zinc-400" : "text-zinc-500")}>
                        {plan.period}
                      </span>
                    </div>
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedPlan === plan.id ? "bg-sky-500 border-sky-500" : "border-zinc-200 group-hover:border-sky-500"
                  )}>
                    {selectedPlan === plan.id && <CheckCircle2 className="w-5 h-5 text-white fill-current" />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {plan.features.slice(0, 4).map((feature, i) => (
                    <div key={i} className="flex items-center space-x-2 text-sm">
                      <CheckCircle2 className={cn("w-4 h-4", selectedPlan === plan.id ? "text-sky-500" : "text-zinc-300")} />
                      <span className={selectedPlan === plan.id ? "text-zinc-300" : "text-zinc-500"}>{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-6">
            <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-zinc-400">
              <span>Payment Method</span>
              <div className="flex items-center space-x-2">
                <img src="https://www.paynow.co.zw/Content/Images/Logo.png" alt="Paynow" className="h-4 grayscale opacity-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'ecocash', label: 'EcoCash' },
                { id: 'onemoney', label: 'OneMoney' }
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={cn(
                    "py-2 px-3 rounded-xl text-xs font-bold transition-all border",
                    paymentMethod === method.id
                      ? "bg-sky-500 border-sky-500 text-white"
                      : "bg-zinc-50 border-zinc-100 text-zinc-500 hover:border-sky-200"
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {paymentMethod === 'ecocash' ? 'EcoCash' : 'OneMoney'} Number
                </label>
                <input
                  type="tel"
                  placeholder="0771234567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-mono"
                />
              </div>
            </div>

            {instructions && (
              <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl text-sky-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {instructions}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                <p className="font-bold mb-1">Payment Error</p>
                <p className="opacity-90">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-sky-500 text-white py-5 rounded-2xl font-bold text-xl hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 flex items-center justify-center space-x-3 disabled:opacity-70"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-6 h-6" />
                  <span>Pay with USSD Push</span>
                </>
              )}
            </button>
            
            <p className="text-center text-xs text-zinc-400 leading-relaxed">
              By subscribing, you agree to our Terms of Service and Privacy Policy. 
              Payments are processed securely via Paynow Zimbabwe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
