export interface UserPreferences {
  gender: 'male' | 'female' | 'other' | 'any';
  minAge: number;
  maxAge: number;
  interests: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  preferences: UserPreferences;
  isSubscribed: boolean;
  blockedUsers?: string[];
  subscriptionExpiry?: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
}

export interface Match {
  id: string;
  users: string[]; // [uid1, uid2]
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: any;
}
