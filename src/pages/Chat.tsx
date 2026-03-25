import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, Shield, MoreVertical, Search, Zap, MessageSquare, Sparkles, UserX } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../lib/utils';

export function Chat({ isSubscribed }: { isSubscribed: boolean }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch current user's blocked list
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setBlockedUsers(docSnap.data().blockedUsers || []);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'matches'),
      where('users', 'array-contains', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedMatches = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const otherUserId = data.users.find((uid: string) => uid !== auth.currentUser?.uid);
        
        // Mock profile for now, in real app fetch from profiles collection
        return {
          id: docSnap.id,
          ...data,
          otherUserId,
          name: 'Student', // Placeholder
          photoURL: `https://picsum.photos/seed/${otherUserId}/100/100`
        };
      }));
      
      // Filter out matches with blocked users
      const filteredMatches = fetchedMatches.filter(m => !blockedUsers.includes(m.otherUserId));
      
      setMatches(filteredMatches);
      if (filteredMatches.length > 0 && !activeMatch) {
        setActiveMatch(filteredMatches[0]);
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });

    return () => unsubscribe();
  }, [blockedUsers]);

  useEffect(() => {
    if (!activeMatch) return;

    const q = query(
      collection(db, 'matches', activeMatch.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(fetchedMessages);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `matches/${activeMatch.id}/messages`);
    });

    return () => unsubscribe();
  }, [activeMatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeMatch) return;

    const text = message;
    setMessage('');

    try {
      await addDoc(collection(db, 'matches', activeMatch.id, 'messages'), {
        senderId: auth.currentUser?.uid,
        text,
        createdAt: serverTimestamp()
      }).catch(e => handleFirestoreError(e, OperationType.WRITE, `matches/${activeMatch.id}/messages`));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!activeMatch || !auth.currentUser) return;
    
    if (confirm(`Are you sure you want to block ${activeMatch.name}? You will no longer be able to message each other.`)) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, {
          blockedUsers: arrayUnion(activeMatch.otherUserId)
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
        
        setActiveMatch(null);
        setShowOptions(false);
      } catch (error) {
        console.error('Error blocking user:', error);
      }
    }
  };

  if (!isSubscribed) {
    return (
      <div className="h-[calc(100vh-12rem)] bg-white rounded-[2.5rem] border border-zinc-100 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-sky-50 rounded-3xl flex items-center justify-center text-sky-500 shadow-lg shadow-sky-100">
          <Zap className="w-12 h-12 fill-current" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Chat is Locked</h2>
          <p className="text-zinc-500">
            You need a Premium subscription to message other students and build connections.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
          <button
            onClick={() => window.location.href = '/subscription'}
            className="flex-1 bg-sky-500 text-white py-4 rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
          >
            Go Premium
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-500">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-zinc-400 font-medium">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="h-[calc(100vh-12rem)] bg-white rounded-[2.5rem] border border-zinc-100 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-zinc-50 rounded-3xl flex items-center justify-center text-zinc-400">
          <Heart className="w-12 h-12" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">No Matches Yet</h2>
          <p className="text-zinc-500">
            Start swiping in the Discover tab to find students with similar interests!
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/discover'}
          className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg"
        >
          Start Discovering
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] bg-white rounded-[2.5rem] border border-zinc-100 shadow-2xl overflow-hidden flex">
      {/* Sidebar: Chat List */}
      <div className="w-80 border-r border-zinc-100 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-zinc-100 space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {matches.map((match) => (
            <button
              key={match.id}
              onClick={() => setActiveMatch(match)}
              className={cn(
                "w-full p-4 flex items-center space-x-4 transition-all hover:bg-zinc-50 border-b border-zinc-50",
                activeMatch?.id === match.id && "bg-sky-50/50 border-r-4 border-sky-500"
              )}
            >
              <div className="relative">
                <img
                  src={match.photoURL}
                  alt={match.name}
                  className="w-12 h-12 rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-zinc-900 truncate">{match.name}</span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active</span>
                </div>
                <p className="text-sm text-zinc-500 truncate">Connected on {new Date(match.createdAt?.seconds * 1000).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className="flex-1 flex flex-col bg-zinc-50/30">
        {activeMatch ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={activeMatch.photoURL}
                  alt={activeMatch.name}
                  className="w-10 h-10 rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-zinc-900">{activeMatch.name}</span>
                    <Shield className="w-3 h-3 text-blue-500 fill-current" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 relative">
                <button 
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-zinc-100 py-2 z-50"
                    >
                      <button
                        onClick={handleBlockUser}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Block User</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex justify-center">
                <div className="px-4 py-1 bg-white border border-zinc-100 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Conversation Started
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col space-y-1",
                      msg.senderId === auth.currentUser?.uid ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "p-4 rounded-2xl max-w-[80%] shadow-sm",
                        msg.senderId === auth.currentUser?.uid
                          ? "bg-sky-500 text-white rounded-br-none shadow-sky-100"
                          : "bg-white text-zinc-700 rounded-bl-none border border-zinc-100"
                      )}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">
                      {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="p-6 bg-white border-t border-zinc-100">
              <form className="flex items-center space-x-4" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="bg-sky-500 text-white p-4 rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-100 disabled:opacity-50"
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <p className="text-zinc-500 font-medium">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
