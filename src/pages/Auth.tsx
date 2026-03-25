import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Shield } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

export function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef).catch(e => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`));
      
      if (!userDoc || !('exists' in userDoc) || !userDoc.exists()) {
        // Create user document
        const userData = {
          uid: user.uid,
          displayName: user.displayName || 'Student',
          email: user.email,
          photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
          isSubscribed: false,
          role: 'user',
          preferences: {
            gender: 'any',
            minAge: 18,
            maxAge: 30,
            interests: []
          },
          blockedUsers: [],
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, userData).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));

        // Create public profile
        const profileDocRef = doc(db, 'profiles', user.uid);
        await setDoc(profileDocRef, {
          uid: user.uid,
          displayName: user.displayName || 'Student',
          photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `profiles/${user.uid}`));
      }

      navigate('/discover');
    } catch (error) {
      console.error('Login error:', error);
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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Welcome to CUT Connect</h1>
          <p className="text-zinc-500">Connect with fellow students at Chinhoyi University of Technology</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-zinc-200 text-zinc-700 py-4 rounded-2xl font-bold hover:bg-zinc-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-zinc-400">
              <span className="bg-white px-4">Student Verification</span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              We only allow verified CUT students to connect. Use your student email for the best experience.
            </p>
          </div>

          <p className="text-center text-[10px] text-zinc-400 leading-relaxed px-4">
            By continuing, you agree to our Terms of Service and Privacy Policy. 
          </p>
        </div>
      </motion.div>
    </div>
  );
}
