// Onboarding API - Backend is source of truth for completion state
import { apiCall } from './core';
import { API_URL } from '../../config/api';

export interface OnboardingStep {
  completed: boolean;
  completedAt: string | null;
  required: boolean;
}

export interface OnboardingStatus {
  onboardingComplete: boolean;
  completedAt: string | null;
  steps: {
    profile: OnboardingStep;
    availability: OnboardingStep;
  };
  missingSteps: string[];
  nextStep: string | null;
  requiresOnboarding: boolean;
}

export interface OnboardingRequiredResponse {
  required: boolean;
  nextStep: string | null;
  missingSteps: string[];
}

// Get complete onboarding status with all step details
export const getOnboardingStatus = async (): Promise<OnboardingStatus> => {
  return apiCall<OnboardingStatus>(`${API_URL}/api/onboarding/status`);
};

// Quick check if onboarding required - used on every login
export const checkOnboardingRequired = async (): Promise<OnboardingRequiredResponse> => {
  return apiCall<OnboardingRequiredResponse>(`${API_URL}/api/onboarding/required`);
};

// Mark profile setup as completed
export const markProfileCompleted = async (): Promise<void> => {
  await apiCall<void>(`${API_URL}/api/onboarding/complete/profile`, { method: 'POST' });
};

// Mark availability as completed (auto-called by backend on save)
export const markAvailabilityCompleted = async (): Promise<void> => {
  await apiCall<void>(`${API_URL}/api/onboarding/complete/availability`, { method: 'POST' });
};

export default {
  getOnboardingStatus,
  checkOnboardingRequired,
  markProfileCompleted,
  markAvailabilityCompleted,
};
