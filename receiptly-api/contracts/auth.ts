export type AuthPlatform = 'ios' | 'android' | 'web';
export type AuthProvider = 'google' | 'apple' | 'email';

export type AuthDevice = {
  installationId: string;
  platform: AuthPlatform;
  name: string | null;
};

export type AuthHousehold = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  timezone: string;
  currency: string;
};

export type OnboardingState = 'needs_profile' | 'needs_household' | 'ready';

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: 900;
  sessionId: string;
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
  households: AuthHousehold[];
  activeHouseholdId: string | null;
  onboardingState: OnboardingState;
  isNewUser: boolean;
};
