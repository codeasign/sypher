export type SignupSource = 'google' | 'email';

export const SIGNUP_SOURCES: { value: SignupSource; label: string }[] = [
  { value: 'google', label: 'Google' },
  { value: 'email', label: 'Email' },
];
