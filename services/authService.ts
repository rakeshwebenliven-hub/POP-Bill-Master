
import { UserProfile, SubscriptionPlan } from '../types';
import { SUBSCRIPTION_PLANS } from '../constants';

const USER_KEY = 'pop_user_profile';

// Get current user from local storage
export const getCurrentUser = (): UserProfile | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

// Simulate Login/Signup
export const loginUser = (details: { name?: string; phone?: string; email?: string }): UserProfile => {
  const now = Date.now();
  // 3 Days Trial in ms
  const trialDuration = 3 * 24 * 60 * 60 * 1000;
  
  const newUser: UserProfile = {
    id: Date.now().toString(),
    name: details.name || 'User',
    phone: details.phone || '',
    email: details.email || '',
    joinedDate: now,
    trialEndDate: now + trialDuration,
    subscriptionEndDate: null,
    planId: 'trial'
  };

  localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  return newUser;
};

export const updateProfile = (details: Partial<UserProfile>) => {
  const user = getCurrentUser();
  if (user) {
    const updated = { ...user, ...details };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    return updated;
  }
  return null;
};

// Check if user has access (Trial active OR Subscription active)
export const checkSubscriptionAccess = (): { hasAccess: boolean; daysLeft: number; isTrial: boolean } => {
  const user = getCurrentUser();
  if (!user) return { hasAccess: false, daysLeft: 0, isTrial: false };

  const now = Date.now();
  
  // Check Subscription
  if (user.subscriptionEndDate && user.subscriptionEndDate > now) {
    const msLeft = user.subscriptionEndDate - now;
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    return { hasAccess: true, daysLeft, isTrial: false };
  }

  // Check Trial
  if (user.trialEndDate > now) {
    const msLeft = user.trialEndDate - now;
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    return { hasAccess: true, daysLeft, isTrial: true };
  }

  // Expired
  return { hasAccess: false, daysLeft: 0, isTrial: false };
};

// Purchase Plan
export const purchasePlan = (planId: string): UserProfile | null => {
  const user = getCurrentUser();
  if (!user) return null;

  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) return null;

  const now = Date.now();
  // If already subscribed, add time to current end date, else start from now
  const startDate = (user.subscriptionEndDate && user.subscriptionEndDate > now) 
    ? user.subscriptionEndDate 
    : now;

  // Calculate new end date (approx 30 days per month)
  const durationMs = plan.durationMonths * 30 * 24 * 60 * 60 * 1000;
  const newEndDate = startDate + durationMs;

  const updatedUser: UserProfile = {
    ...user,
    subscriptionEndDate: newEndDate,
    planId: plan.id as any
  };

  localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  return updatedUser;
};

export const logoutUser = () => {
  localStorage.removeItem(USER_KEY);
};