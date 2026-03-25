import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Zap, Shield, Sparkles, MessageSquare, UserX } from 'lucide-react';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp, getDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { getSuggestedMatches } from '../services/matchingService';
import { UserProfile } from '../types';

export function Discover({ isSubscribed }: { isSubscribed: boolean }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!auth.currentUser) return;
      
      try {
        // 1. Fetch current user's full profile (including preferences)
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? (userDoc.data() as UserProfile) : null;
        
        // 2. Fetch all other profiles
        const q = query(
          collection(db, 'profiles'),
          where('uid', '!=', auth.currentUser?.uid || ''),
          limit(100)
        );
        const querySnapshot = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, 'profiles'));
        let fetchedProfiles = querySnapshot && 'docs' in querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
        
        // 3. Filter out blocked users
        if (userData?.blockedUsers) {
          fetchedProfiles = fetchedProfiles.filter((p: any) => !userData.blockedUsers?.includes(p.uid));
        }

        // 4. Use matching service to sort profiles
        if (userData) {
          const suggested = getSuggestedMatches(userData, fetchedProfiles as any);
          setProfiles(suggested);
        } else {
          setProfiles(fetchedProfiles);
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleAction = async (type: 'like' | 'dislike' | 'block') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile || !auth.currentUser) return;
    
    if (type === 'block') {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, {
          blockedUsers: arrayUnion(currentProfile.uid)
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
        
        alert(`You have blocked ${currentProfile.displayName}. They will no longer appear in your discovery.`);
        // Remove from current list
        setProfiles(prev => prev.filter(p => p.uid !== currentProfile.uid));
        return; // setProfiles will trigger re-render, currentIndex might need adjustment if it was the last one
      } catch (error) {
        console.error('Error blocking user:', error);
      }
    }

    if (type === 'like') {
      try {
        // Create a match
        await addDoc(collection(db, 'matches'), {
          users: [auth.currentUser.uid, currentProfile.uid],
          createdAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, 'matches'));
        
        alert(`It's a Match with ${currentProfile.displayName}! You can now chat with them in the Messages tab.`);
      } catch (error) {
        console.error('Error creating match:', error);
      }
    }
    
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleChat = () => {
    if (!isSubscribed) {
      setShowSubscriptionModal(true);
    } else {
      window.location.href = '/chat';
    }
  };

  const handlePayment = async () => {
    try {
      const response = await fetch('/api/paynow/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          amount: 1,
          planId: 'semester'
        })
      });
      const data = await response.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert('Payment failed: ' + data.error);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-500">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-zinc-400 font-medium">Finding students nearby...</p>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-400">
          <X className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">No more profiles</h2>
          <p className="text-zinc-500">Check back later for more students!</p>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-12rem)] relative pt-8">
      <div className="flex items-center justify-between px-4 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Discover</h2>
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 text-sky-600 text-sm font-semibold border border-sky-100">
          <Sparkles className="w-4 h-4" />
          <span>Smart Match</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentProfile.uid}
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          className="absolute inset-x-0 top-24 bottom-24 bg-white rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col"
        >
          <div className="relative flex-1">
            <img
              src={currentProfile.photoURL || `https://picsum.photos/seed/${currentProfile.uid}/800/1200`}
              alt={currentProfile.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white space-y-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-3xl font-bold">{currentProfile.displayName}, {currentProfile.age || '20'}</h2>
                  <Shield className="w-5 h-5 text-blue-400 fill-current" />
                </div>
                <div className="flex items-center space-x-2 text-zinc-300 text-sm font-medium">
                  <Zap className="w-4 h-4 text-sky-400 fill-current" />
                  <span>{currentProfile.gender || 'Student'} • {currentProfile.interests?.[0] || 'CUT Student'}</span>
                </div>
              </div>
              <p className="text-zinc-200 line-clamp-2 text-sm leading-relaxed">
                {currentProfile.bio || 'No bio provided yet.'}
              </p>
            </div>

            {!isSubscribed && (
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold flex items-center space-x-1 uppercase tracking-wider">
                <Zap className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>Premium Info Locked</span>
              </div>
            )}
          </div>

          <div className="p-8 bg-white flex items-center justify-center space-x-4">
            <button
              onClick={() => handleAction('block')}
              title="Block User"
              className="w-12 h-12 rounded-full border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
            >
              <UserX className="w-6 h-6" />
            </button>
            <button
              onClick={() => handleAction('dislike')}
              className="w-16 h-16 rounded-full border-2 border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-all active:scale-90"
            >
              <X className="w-8 h-8" />
            </button>
            <button
              onClick={handleChat}
              className="w-20 h-20 bg-sky-500 rounded-full shadow-xl shadow-sky-200 flex items-center justify-center text-white hover:bg-sky-600 transition-all active:scale-90"
            >
              <MessageSquare className="w-10 h-10 fill-current" />
            </button>
            <button
              onClick={() => handleAction('like')}
              className="w-16 h-16 rounded-full border-2 border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-all active:scale-90"
            >
              <Heart className="w-8 h-8 fill-current" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-sky-500" />
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-sky-50 rounded-3xl flex items-center justify-center text-sky-500 mx-auto">
                  <Zap className="w-10 h-10 fill-current" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Unlock Full Access</h2>
                <p className="text-zinc-500">
                  Subscribe to CUT Connect Premium to chat with matches and see full profile details.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-zinc-50 rounded-3xl border-2 border-sky-500 relative">
                  <div className="absolute top-4 right-6 bg-sky-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    Best Value
                  </div>
                  <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Yearly Plan</p>
                  <div className="flex items-baseline space-x-1 pt-1">
                    <span className="text-4xl font-bold">$10</span>
                    <span className="text-zinc-500 font-medium">/ year</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                className="w-full bg-sky-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
              >
                Pay with Paynow
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
