import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Discover } from './pages/Discover';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { Auth } from './pages/Auth';
import { PaymentStatus } from './pages/PaymentStatus';
import { Subscription } from './pages/Subscription';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.data());
      } else {
        setUserData(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribeUser();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-zinc-400 font-medium">Loading CUT Connect...</div>
      </div>
    );
  }

  const isSubscribed = userData?.isSubscribed || false;

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
          <Navbar user={user} onLogout={handleLogout} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={user ? <Navigate to="/discover" /> : <Auth />} />
              <Route path="/discover" element={user ? <Discover isSubscribed={isSubscribed} /> : <Navigate to="/auth" />} />
              <Route path="/chat" element={user ? <Chat isSubscribed={isSubscribed} /> : <Navigate to="/auth" />} />
              <Route path="/profile" element={user ? <Profile isSubscribed={isSubscribed} /> : <Navigate to="/auth" />} />
              <Route path="/subscription" element={user ? <Subscription isSubscribed={isSubscribed} /> : <Navigate to="/auth" />} />
              <Route path="/payment-status" element={<PaymentStatus isSubscribed={isSubscribed} />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
