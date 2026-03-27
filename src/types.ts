export interface UserPreferences {
  gender: 'male' | 'female' | 'other' | 'any';
  minAge: number;
  maxAge: number;
  interests: string[];
  personalityTraits?: string[];
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
  personalityTraits?: string[];
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

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  imageUrl: string;
  caption?: string;
  likes: number;
  createdAt: any;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  imageUrl: string;
  createdAt: any;
  expiresAt?: any;
}
