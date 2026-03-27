import { UserProfile } from '../types';

export const calculateMatchScore = (user: UserProfile, potentialMatch: UserProfile): number => {
  let score = 0;

  // 1. Basic Filters (Hard requirements)
  // Gender Match
  if (user.preferences.gender !== 'any' && user.preferences.gender !== potentialMatch.gender) {
    return 0;
  }

  // Age Match
  if (potentialMatch.age < user.preferences.minAge || potentialMatch.age > user.preferences.maxAge) {
    return 0;
  }

  // 2. Shared Interests (Nuanced)
  const userInterests = user.preferences?.interests || [];
  const potentialInterests = potentialMatch.preferences?.interests || (potentialMatch as any).interests || [];
  
  const commonInterests = userInterests.filter(i => potentialInterests.includes(i));
  // More weight for shared interests
  score += commonInterests.length * 15;

  // 3. Personality Traits (New)
  const userTraits = user.personalityTraits || [];
  const potentialTraits = potentialMatch.personalityTraits || [];
  
  const commonTraits = userTraits.filter(t => potentialTraits.includes(t));
  score += commonTraits.length * 20;

  // 4. Reciprocal Interest (Compatibility)
  const matchMinAge = potentialMatch.preferences?.minAge || 18;
  const matchMaxAge = potentialMatch.preferences?.maxAge || 100;
  const matchPrefGender = potentialMatch.preferences?.gender || 'any';

  const isReciprocalGender = matchPrefGender === 'any' || matchPrefGender === user.gender;
  const isReciprocalAge = user.age >= matchMinAge && user.age <= matchMaxAge;

  if (isReciprocalGender && isReciprocalAge) {
    score += 50; // Big boost for mutual preference match
  }

  // 5. Bio Sentiment/Length (Bonus)
  if (potentialMatch.bio && potentialMatch.bio.length > 50) {
    score += 10; // Reward users who put effort into their bio
  }

  return score;
};

export const getSuggestedMatches = (user: UserProfile, allProfiles: UserProfile[]): UserProfile[] => {
  return allProfiles
    .filter(p => p.uid !== user.uid)
    .map(p => ({ profile: p, score: calculateMatchScore(user, p) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(m => m.profile);
};
