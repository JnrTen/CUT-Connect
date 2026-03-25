import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Camera, Mail, Heart, Settings, Shield, Zap, Sparkles, CheckCircle2, UserX, Trash2 } from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc, arrayRemove } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { GENDERS, INTERESTS } from '../constants';
import { cn } from '../lib/utils';

export function Profile({ isSubscribed }: { isSubscribed: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.data());
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}`);
    });

    return () => unsubscribe();
  }, []);

  const toggleInterest = (interest: string) => {
    if (!isEditing) return;
    setUserData((prev: any) => {
      const currentInterests = prev.interests || [];
      const newInterests = currentInterests.includes(interest)
        ? currentInterests.filter((i: string) => i !== interest)
        : [...currentInterests, interest];
      return { ...prev, interests: newInterests };
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userData) return;

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const updates = {
      displayName: formData.get('displayName') as string,
      bio: formData.get('bio') as string,
      age: Number(formData.get('age')),
      gender: formData.get('gender') as string,
      interests: userData.interests || []
    };

    try {
      // Update private user doc
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updates).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
      
      // Update public profile doc
      await updateDoc(doc(db, 'profiles', auth.currentUser.uid), {
        displayName: updates.displayName,
        bio: updates.bio,
        age: updates.age,
        gender: updates.gender,
        interests: updates.interests,
        photoURL: userData.photoURL
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `profiles/${auth.currentUser?.uid}`));

      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleUnblock = async (uid: string) => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        blockedUsers: arrayRemove(uid)
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
      alert('User unblocked successfully.');
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-500">
            <User className="w-6 h-6" />
          </div>
          <p className="text-zinc-400 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 pt-8">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-4xl font-bold tracking-tight">Your Profile</h2>
        <div className="flex items-center space-x-4">
          {!isSubscribed && (
            <button
              onClick={() => window.location.href = '/subscription'}
              className="bg-sky-500 text-white px-6 py-2 rounded-xl font-medium hover:bg-sky-600 transition-colors flex items-center space-x-2 shadow-lg shadow-sky-100"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Go Premium</span>
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-zinc-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        {/* Left Column: Avatar & Basic Info */}
        <div className="space-y-8">
          <div className="relative group">
            <div className="aspect-square rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl">
              <img
                src={userData?.photoURL || `https://picsum.photos/seed/${userData?.uid}/800/800`}
                alt={userData?.displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {isEditing && (
              <button className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-10 h-10" />
              </button>
            )}
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-xl space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Subscription</p>
              {isSubscribed ? (
                <div className="flex items-center space-x-2 text-sky-500">
                  <Zap className="w-5 h-5 fill-current" />
                  <span className="font-bold">Premium Member</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-zinc-400">
                  <Shield className="w-5 h-5" />
                  <span className="font-bold">Free Member</span>
                </div>
              )}
              {isSubscribed && <p className="text-xs text-zinc-500">Expires: March 25, 2027</p>}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Account Verified</p>
              <div className="flex items-center space-x-2 text-blue-500">
                <CheckCircle2 className="w-5 h-5 fill-current" />
                <span className="font-bold">CUT Student</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Preferences */}
        <div className="md:col-span-2 space-y-8">
          <form onSubmit={handleUpdateProfile} className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-10">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center space-x-3">
                <User className="w-6 h-6 text-sky-500" />
                <span>Personal Details</span>
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Display Name</label>
                  <input
                    name="displayName"
                    disabled={!isEditing}
                    type="text"
                    defaultValue={userData?.displayName}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-70"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Age</label>
                  <input
                    name="age"
                    disabled={!isEditing}
                    type="number"
                    defaultValue={userData?.age || 20}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Gender</label>
                  <select
                    name="gender"
                    disabled={!isEditing}
                    defaultValue={userData?.gender || 'other'}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-70"
                  >
                    {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Email</label>
                  <div className="flex items-center space-x-2 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-500">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{userData?.email}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Bio</label>
                <textarea
                  name="bio"
                  disabled={!isEditing}
                  rows={4}
                  defaultValue={userData?.bio || ''}
                  placeholder="Tell other students about yourself..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-70 resize-none"
                />
              </div>
            </div>

            {isEditing && (
              <button
                type="submit"
                className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
              >
                Save Changes
              </button>
            )}

            <div className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center space-x-3">
                <Heart className="w-6 h-6 text-sky-500" />
                <span>Interests</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    disabled={!isEditing}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      userData?.interests?.includes(interest)
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-zinc-50 text-zinc-600 border border-zinc-100 hover:border-sky-500 hover:text-sky-500",
                      "disabled:hover:border-zinc-100 disabled:hover:text-zinc-600"
                    )}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Blocked Users Section */}
      {userData?.blockedUsers && userData.blockedUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-xl space-y-8"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Blocked Users</h3>
              <p className="text-zinc-500 text-sm">Manage users you've blocked from discovery and chat.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userData.blockedUsers.map((uid: string) => (
              <div key={uid} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-zinc-200 rounded-xl flex items-center justify-center text-zinc-400">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-zinc-900">User {uid.slice(0, 8)}...</span>
                </div>
                <button
                  onClick={() => handleUnblock(uid)}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Unblock User"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
