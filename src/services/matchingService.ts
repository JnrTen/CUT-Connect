import { UserProfile, UserPreferences } from '../types';

export const calculateMatchScore = (user: UserProfile, potentialMatch: UserProfile): number => {
  let score = 0;

  // Gender Match
  if (user.preferences.gender !== 'any' && user.preferences.gender !== potentialMatch.gender) {
    return 0; // Not a match
  }

  // Age Match
  if (potentialMatch.age < user.preferences.minAge || potentialMatch.age > user.preferences.maxAge) {
    return 0; // Not a match
  }

  // Interests Overlap
  const userInterests = user.preferences?.interests || [];
  const potentialInterests = potentialMatch.preferences?.interests || (potentialMatch as any).interests || [];
  
  const commonInterests = userInterests.filter(i => potentialInterests.includes(i));
  score += commonInterests.length * 10;

  // Reciprocal Interest (if they match each other's preferences)
  const userMinAge = user.preferences?.minAge || 18;
  const userMaxAge = user.preferences?.maxAge || 100;
  const userPrefGender = user.preferences?.gender || 'any';

  const matchMinAge = potentialMatch.preferences?.minAge || 18;
  const matchMaxAge = potentialMatch.preferences?.maxAge || 100;
  const matchPrefGender = potentialMatch.preferences?.gender || 'any';

  if (matchPrefGender === 'any' || matchPrefGender === user.gender) {
    if (user.age >= matchMinAge && user.age <= matchMaxAge) {
      score += 50;
    }
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
