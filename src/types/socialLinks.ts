export type SocialPlatform = 'linkedin' | 'github' | 'medium' | 'x' | 'substack' | 'devto' | 'website';

export const SOCIAL_PLATFORM_OPTIONS: { value: SocialPlatform; label: string; placeholder: string }[] = [
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { value: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { value: 'medium', label: 'Medium', placeholder: 'https://medium.com/@username' },
  { value: 'x', label: 'X', placeholder: 'https://x.com/username' },
  { value: 'substack', label: 'Substack', placeholder: 'https://username.substack.com' },
  { value: 'devto', label: 'dev.to', placeholder: 'https://dev.to/username' },
  { value: 'website', label: 'Your Site', placeholder: 'https://yoursite.com' },
];

export type SocialLinks = Partial<Record<SocialPlatform, string>>;
