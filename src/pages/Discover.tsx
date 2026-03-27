import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Zap, Shield, Sparkles, MessageSquare, UserX, Plus, Image as ImageIcon, Camera, Clock, MoreHorizontal, Send } from 'lucide-react';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp, getDoc, doc, updateDoc, arrayUnion, orderBy, onSnapshot, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '../firebase';
import { getSuggestedMatches } from '../services/matchingService';
import { UserProfile, Post, Story } from '../types';

export function Discover({ isSubscribed }: { isSubscribed: boolean }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<'discovery' | 'feed'>('discovery');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

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

    // Real-time posts
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(fetchedPosts);
    });

    // Real-time stories (simplified, no expiry logic in query for now)
    const storiesQuery = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      // Group stories by user (optional, but let's keep it simple)
      setStories(fetchedStories);
    });

    return () => {
      unsubscribePosts();
      unsubscribeStories();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'post' | 'story') => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `${type}s/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (type === 'post') {
        await addDoc(collection(db, 'posts'), {
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'Anonymous',
          userPhoto: auth.currentUser.photoURL || '',
          imageUrl: downloadURL,
          caption: postCaption,
          likes: 0,
          createdAt: serverTimestamp()
        });
        setShowCreatePost(false);
        setPostCaption('');
      } else {
        await addDoc(collection(db, 'stories'), {
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'Anonymous',
          userPhoto: auth.currentUser.photoURL || '',
          imageUrl: downloadURL,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        });
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      alert(`Failed to upload ${type}. Please try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: increment(1)
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

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
    <div className="max-w-md mx-auto min-h-[calc(100vh-12rem)] relative pt-4 pb-24">
      {/* Header & Tabs */}
      <div className="px-4 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Discover</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => storyInputRef.current?.click()}
              className="p-2 bg-sky-50 text-sky-600 rounded-full hover:bg-sky-100 transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreatePost(true)}
              className="p-2 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors shadow-lg shadow-sky-100"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stories Row */}
        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
          <div 
            onClick={() => storyInputRef.current?.click()}
            className="flex-shrink-0 flex flex-col items-center space-y-1 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-sky-300 flex items-center justify-center bg-sky-50">
              <Plus className="w-6 h-6 text-sky-500" />
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">My Story</span>
          </div>
          {stories.map((story) => (
            <div key={story.id} className="flex-shrink-0 flex flex-col items-center space-y-1">
              <div className="w-16 h-16 rounded-full p-0.5 border-2 border-sky-500">
                <img
                  src={story.imageUrl}
                  alt={story.userName}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest truncate w-16 text-center">
                {story.userName.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'discovery' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Discovery
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'feed' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Feed
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={storyInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'story')}
      />

      <AnimatePresence mode="wait">
        {activeTab === 'discovery' ? (
          <motion.div
            key="discovery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative h-[calc(100vh-24rem)] px-4"
          >
            {profiles.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentProfile.uid}
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  className="absolute inset-x-4 top-0 bottom-0 bg-white rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col"
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
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-400">
                  <X className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">No more profiles</h2>
                  <p className="text-zinc-500">Check back later for more students!</p>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 space-y-6"
          >
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200">
                        <img
                          src={post.userPhoto || `https://picsum.photos/seed/${post.userId}/100/100`}
                          alt={post.userName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 text-sm">{post.userName}</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                          {post.createdAt?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="aspect-square relative">
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => handleLikePost(post.id)}
                        className="flex items-center space-x-1.5 text-zinc-600 hover:text-rose-500 transition-colors group"
                      >
                        <Heart className="w-6 h-6 group-active:scale-125 transition-transform" />
                        <span className="text-sm font-bold">{post.likes}</span>
                      </button>
                      <button className="text-zinc-600 hover:text-sky-500 transition-colors">
                        <MessageSquare className="w-6 h-6" />
                      </button>
                      <button className="text-zinc-600 hover:text-sky-500 transition-colors">
                        <Send className="w-6 h-6" />
                      </button>
                    </div>
                    {post.caption && (
                      <p className="text-sm text-zinc-700 leading-relaxed">
                        <span className="font-bold text-zinc-900 mr-2">{post.userName}</span>
                        {post.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <p className="text-zinc-500 font-medium">No posts yet. Be the first to share!</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Create Post</h2>
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-zinc-100 transition-colors overflow-hidden relative"
                >
                  <ImageIcon className="w-10 h-10 text-zinc-300" />
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Select Image</p>
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Write a caption..."
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-sky-500 transition-all text-sm min-h-[100px] resize-none"
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'post')}
                />

                <button
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-sky-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-sky-600 transition-all shadow-lg shadow-sky-100 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Share Post'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
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
                  <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Full Year Plan</p>
                  <div className="flex items-baseline space-x-1 pt-1">
                    <span className="text-4xl font-bold">$2</span>
                    <span className="text-zinc-500 font-medium">/ year</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => window.location.href = '/subscription'}
                className="w-full bg-sky-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
              >
                Go to Subscription
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
