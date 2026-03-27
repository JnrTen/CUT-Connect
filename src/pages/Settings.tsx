import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Bell, 
  Lock, 
  Trash2, 
  ChevronRight, 
  Shield, 
  LogOut,
  ArrowLeft,
  Save,
  AlertTriangle,
  Heart,
  Plus,
  X
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  updatePassword, 
  deleteUser, 
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [interestInput, setInterestInput] = useState('');
  const [traitInput, setTraitInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
          .catch(e => handleFirestoreError(e, OperationType.GET, `users/${auth.currentUser?.uid}`));
        if (userDoc && 'exists' in userDoc && userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          if (data.preferences) {
            setPreferences(data.preferences);
          } else {
            setPreferences({
              gender: 'any',
              minAge: 18,
              maxAge: 30,
              interests: [],
              personalityTraits: []
            });
          }
        }
      }
    };
    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMessage('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('Please sign out and sign back in to update your password.');
      } else {
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !preferences) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        preferences: preferences
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
      
      setMessage('Match preferences updated successfully!');
    } catch (error: any) {
      console.error('Preferences update error:', error);
      setError('Failed to update preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addInterest = () => {
    if (interestInput.trim() && !preferences.interests.includes(interestInput.trim())) {
      setPreferences({
        ...preferences,
        interests: [...preferences.interests, interestInput.trim()]
      });
      setInterestInput('');
    }
  };

  const removeInterest = (interest: string) => {
    setPreferences({
      ...preferences,
      interests: preferences.interests.filter((i: string) => i !== interest)
    });
  };

  const addTrait = () => {
    if (traitInput.trim() && !preferences.personalityTraits.includes(traitInput.trim())) {
      setPreferences({
        ...preferences,
        personalityTraits: [...preferences.personalityTraits, traitInput.trim()]
      });
      setTraitInput('');
    }
  };

  const removeTrait = (trait: string) => {
    setPreferences({
      ...preferences,
      personalityTraits: preferences.personalityTraits.filter((t: string) => t !== trait)
    });
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    setIsLoading(true);
    setError(null);
    try {
      const uid = auth.currentUser.uid;
      
      // 1. Delete Firestore data
      await deleteDoc(doc(db, 'users', uid)).catch(e => handleFirestoreError(e, OperationType.DELETE, `users/${uid}`));
      await deleteDoc(doc(db, 'profiles', uid)).catch(e => handleFirestoreError(e, OperationType.DELETE, `profiles/${uid}`));
      
      // 2. Delete Auth user
      await deleteUser(auth.currentUser);
      
      navigate('/auth');
    } catch (error: any) {
      console.error('Delete account error:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('Please sign out and sign back in to delete your account.');
      } else {
        setError(error.message);
      }
      setShowDeleteConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) return <div className="p-8 text-center text-zinc-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center space-x-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-600" />
        </button>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <section className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-50 flex items-center space-x-3">
            <User className="w-5 h-5 text-sky-500" />
            <h2 className="font-bold text-zinc-900">Account Details</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Display Name</p>
                <p className="font-medium text-zinc-900">{userData.displayName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email Address</p>
                <p className="font-medium text-zinc-900">{userData.email}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-50 flex items-center space-x-3">
            <Lock className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-zinc-900">Security</h2>
          </div>
          <div className="p-6 space-y-6">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-700">Change Password</h3>
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
              {message && <p className="text-xs text-green-500 font-medium">{message}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-sky-500 transition-all text-sm"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-sky-500 transition-all text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !newPassword}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </section>

        {/* Match Preferences Section */}
        <section className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-50 flex items-center space-x-3">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="font-bold text-zinc-900">Match Preferences</h2>
          </div>
          <div className="p-6 space-y-6">
            <form onSubmit={handleUpdatePreferences} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gender Preference */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Preferred Gender</label>
                  <select
                    value={preferences?.gender || 'any'}
                    onChange={(e) => setPreferences({ ...preferences, gender: e.target.value })}
                    className="w-full bg-zinc-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-rose-500 transition-all text-sm font-medium"
                  >
                    <option value="any">Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Age Range */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Age Range</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={preferences?.minAge || 18}
                      onChange={(e) => setPreferences({ ...preferences, minAge: parseInt(e.target.value) })}
                      className="w-full bg-zinc-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-rose-500 transition-all text-sm font-medium"
                      placeholder="Min"
                    />
                    <span className="text-zinc-400 font-bold">-</span>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={preferences?.maxAge || 30}
                      onChange={(e) => setPreferences({ ...preferences, maxAge: parseInt(e.target.value) })}
                      className="w-full bg-zinc-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-rose-500 transition-all text-sm font-medium"
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Preferred Interests</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {preferences?.interests.map((interest: string) => (
                    <span 
                      key={interest}
                      className="inline-flex items-center space-x-1 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold"
                    >
                      <span>{interest}</span>
                      <button 
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="hover:text-rose-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    placeholder="Add an interest (e.g. Music, Coding)"
                    className="flex-1 bg-zinc-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-rose-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Personality Traits */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Preferred Personality Traits</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {preferences?.personalityTraits?.map((trait: string) => (
                    <span 
                      key={trait}
                      className="inline-flex items-center space-x-1 bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-xs font-bold"
                    >
                      <span>{trait}</span>
                      <button 
                        type="button"
                        onClick={() => removeTrait(trait)}
                        className="hover:text-sky-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={traitInput}
                    onChange={(e) => setTraitInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTrait())}
                    placeholder="Add a trait (e.g. Extrovert, Creative)"
                    className="flex-1 bg-zinc-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-rose-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={addTrait}
                    className="p-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-rose-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-rose-100"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Saving...' : 'Save Match Preferences'}</span>
              </button>
            </form>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-50 flex items-center space-x-3">
            <Bell className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold text-zinc-900">Preferences</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900">Notifications</p>
                  <p className="text-xs text-zinc-500">Manage how you receive updates</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900">Privacy</p>
                  <p className="text-xs text-zinc-500">Control your profile visibility</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-50/50 rounded-[2rem] border border-red-100 overflow-hidden">
          <div className="p-6 border-b border-red-100 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-red-900">Danger Zone</h2>
          </div>
          <div className="p-6 space-y-4">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-colors group"
            >
              <div className="flex items-center space-x-3 text-red-600">
                <LogOut className="w-5 h-5" />
                <span className="font-bold">Sign Out</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-200 group-hover:text-red-300" />
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-between p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-colors group"
              >
                <div className="flex items-center space-x-3 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  <span className="font-bold">Delete Account</span>
                </div>
                <ChevronRight className="w-5 h-5 text-red-200 group-hover:text-red-300" />
              </button>
            ) : (
              <div className="p-4 bg-white border border-red-200 rounded-2xl space-y-4">
                <p className="text-sm text-red-600 font-medium">
                  Are you sure you want to delete your account? This action is permanent and cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isLoading}
                    className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Deleting...' : 'Yes, Delete Everything'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-zinc-100 text-zinc-600 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
