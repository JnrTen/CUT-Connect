import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

export function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuthSuccess = async (user: any) => {
    // Check if user document exists
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef).catch(e => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`));
    
    if (!userDoc || !('exists' in userDoc) || !userDoc.exists()) {
      // Create user document
      const userData = {
        uid: user.uid,
        displayName: user.displayName || displayName || 'Student',
        email: user.email,
        photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
        isSubscribed: false,
        role: 'user',
        interests: [],
        personalityTraits: [],
        preferences: {
          gender: 'any',
          minAge: 18,
          maxAge: 30,
          interests: [],
          personalityTraits: []
        },
        blockedUsers: [],
        createdAt: serverTimestamp()
      };
      await setDoc(userDocRef, userData).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));

      // Create public profile
      const profileDocRef = doc(db, 'profiles', user.uid);
      await setDoc(profileDocRef, {
        uid: user.uid,
        displayName: user.displayName || displayName || 'Student',
        photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
        interests: [],
        personalityTraits: []
      }).catch(e => handleFirestoreError(e, OperationType.WRITE, `profiles/${user.uid}`));
    }

    navigate('/discover');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user);
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(result.user, { displayName });
        }
        await handleAuthSuccess(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(result.user);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Reset error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 mx-auto mb-4">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-zinc-500">
            {isSignUp ? 'Join the CUT Connect community' : 'Sign in to continue your journey'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-sm font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  required={isSignUp}
                  className="w-full bg-zinc-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-sky-500 transition-all font-medium"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@cut.ac.zw"
                required
                className="w-full bg-zinc-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-sky-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-zinc-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-sky-500 transition-all font-medium"
              />
            </div>
          </div>

          {!isSignUp && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs font-bold text-sky-500 hover:text-sky-600 transition-colors ml-1"
            >
              Forgot Password?
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50 shadow-lg flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}</span>
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-zinc-400">
            <span className="bg-white px-4">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-zinc-200 text-zinc-700 py-4 rounded-2xl font-bold hover:bg-zinc-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span>Google</span>
        </button>

        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            We only allow verified CUT students to connect. Use your student email for the best experience.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
