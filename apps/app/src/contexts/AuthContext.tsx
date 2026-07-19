'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { getAppOrigin } from '@sypher/auth-core/src/urls';
import { getOwnProfile } from '@/data/profiles';
import type { Role } from '@/types/roles';
import type { LookingFor } from '@/types/lookingFor';
import type { EducationStatus } from '@/types/educationStatus';
import type { CurrentStatus, NoticePeriod } from '@/types/currentStatus';
import type { SocialLinks } from '@/types/socialLinks';
import type { SeniorityLevel } from '@/types/seniority';

interface AuthContextValue {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  role: Role | null;
  companyName: string | null;
  paidUntil: string | null;
  fullName: string | null;
  bio: string | null;
  currentStatus: CurrentStatus | null;
  noticePeriod: NoticePeriod | null;
  lookingFor: LookingFor[];
  educationStatus: EducationStatus | null;
  experienceYears: number | null;
  experienceMonths: number | null;
  passingYear: number | null;
  resumeUrl: string | null;
  socialLinks: SocialLinks;
  designationId: string | null;
  designationSeniority: SeniorityLevel | null;
  categoryDomainId: string | null;
  categoryRoleId: string | null;
  currentLocationId: string | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: string | null }>;
  signInWithWorkEmail: (
    email: string,
    redirectTo?: string
  ) => Promise<{ error: string | null; status: 'sent' | 'not_recognized' | 'error' }>;
  signOut: () => Promise<void>;
}

const NOT_CONFIGURED_ERROR = 'Auth is not configured. Check Supabase environment variables.';

// OAuth/magic-link redirects must always land back on app.sypher (getAppOrigin),
// never window.location.origin -- that's whatever origin the sign-in form
// happened to load from, which can be localhost or docs.sypher during dev/proxying.
// The callback route exchanges the code server-side and writes the session
// cookie with the shared .sypher.local domain, then forwards on to `next`.
function getAuthCallbackUrl(next: string): string {
  const url = new URL('/auth/callback', getAppOrigin());
  url.searchParams.set('next', next);
  return url.toString();
}

const AuthContext = createContext<AuthContextValue>({
  supabase: null,
  session: null,
  user: null,
  role: null,
  companyName: null,
  paidUntil: null,
  fullName: null,
  bio: null,
  currentStatus: null,
  noticePeriod: null,
  lookingFor: [],
  educationStatus: null,
  experienceYears: null,
  experienceMonths: null,
  passingYear: null,
  resumeUrl: null,
  socialLinks: {},
  designationId: null,
  designationSeniority: null,
  categoryDomainId: null,
  categoryRoleId: null,
  currentLocationId: null,
  loading: true,
  refreshProfile: async () => {},
  signInWithGoogle: async () => ({ error: NOT_CONFIGURED_ERROR }),
  signInWithWorkEmail: async () => ({ error: NOT_CONFIGURED_ERROR, status: 'error' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const supabase = useMemo<SupabaseClient | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // eslint-disable-next-line no-console
      console.error(
        'Missing Supabase config: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server.'
      );
      return null;
    }
    return createClient();
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [paidUntil, setPaidUntil] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus | null>(null);
  const [noticePeriod, setNoticePeriod] = useState<NoticePeriod | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingFor[]>([]);
  const [educationStatus, setEducationStatus] = useState<EducationStatus | null>(null);
  const [experienceYears, setExperienceYears] = useState<number | null>(null);
  const [experienceMonths, setExperienceMonths] = useState<number | null>(null);
  const [passingYear, setPassingYear] = useState<number | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [designationId, setDesignationId] = useState<string | null>(null);
  const [designationSeniority, setDesignationSeniority] = useState<SeniorityLevel | null>(null);
  const [categoryDomainId, setCategoryDomainId] = useState<string | null>(null);
  const [categoryRoleId, setCategoryRoleId] = useState<string | null>(null);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    // Tracks the signed-in user id outside React state so the auth-event
    // listener below can tell "same user, token refresh" apart from a real
    // sign-in/out without a stale closure over `session`.
    let currentUserId: string | null = null;

    async function applySession(newSession: Session | null): Promise<void> {
      if (newSession) {
        const profile = await getOwnProfile(supabase, newSession.user.id);
        if (profile?.deleted_at) {
          await supabase!.auth.signOut();
          if (isMounted) {
            setSession(null);
            setRole(null);
            setCompanyName(null);
            setPaidUntil(null);
            setFullName(null);
            setBio(null);
            setCurrentStatus(null);
            setNoticePeriod(null);
            setLookingFor([]);
            setEducationStatus(null);
            setExperienceYears(null);
            setExperienceMonths(null);
            setPassingYear(null);
            setResumeUrl(null);
            setSocialLinks({});
            setDesignationId(null);
            setDesignationSeniority(null);
            setCategoryDomainId(null);
            setCategoryRoleId(null);
            setCurrentLocationId(null);
          }
          return;
        }
        if (isMounted) {
          setRole((profile?.role as Role) ?? null);
          setCompanyName(profile?.company_name ?? null);
          setPaidUntil(profile?.paid_until ?? null);
          setFullName(profile?.full_name ?? null);
          setBio(profile?.bio ?? null);
          setCurrentStatus((profile?.current_status as CurrentStatus) ?? null);
          setNoticePeriod((profile?.notice_period as NoticePeriod) ?? null);
          setLookingFor((profile?.looking_for as LookingFor[]) ?? []);
          setEducationStatus((profile?.education_status as EducationStatus) ?? null);
          setExperienceYears(profile?.experience_years ?? null);
          setExperienceMonths(profile?.experience_months ?? null);
          setPassingYear(profile?.passing_year ?? null);
          setResumeUrl(profile?.resume_url ?? null);
          setSocialLinks((profile?.social_links as SocialLinks) ?? {});
          setDesignationId(profile?.designation_id ?? null);
          setDesignationSeniority((profile?.designation_seniority as SeniorityLevel) ?? null);
          setCategoryDomainId(profile?.category_domain_id ?? null);
          setCategoryRoleId(profile?.category_role_id ?? null);
          setCurrentLocationId(profile?.current_location_id ?? null);
        }
      } else if (isMounted) {
        setRole(null);
        setCompanyName(null);
        setPaidUntil(null);
        setFullName(null);
        setBio(null);
        setCurrentStatus(null);
        setNoticePeriod(null);
        setLookingFor([]);
        setEducationStatus(null);
        setExperienceYears(null);
        setExperienceMonths(null);
        setPassingYear(null);
        setResumeUrl(null);
        setSocialLinks({});
        setDesignationId(null);
        setDesignationSeniority(null);
        setCategoryDomainId(null);
        setCategoryRoleId(null);
        setCurrentLocationId(null);
      }
      currentUserId = newSession?.user.id ?? null;
      if (isMounted) {
        setSession(newSession);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session).finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // A token refresh (e.g. triggered by switching browser tabs and back)
      // doesn't mean the profile changed — re-running applySession would
      // re-fetch and reset every profile field to its last-saved value,
      // wiping out any unsaved edits in open forms (like /profile). Only
      // re-apply when the signed-in user actually changed.
      if (event === 'TOKEN_REFRESHED' && (newSession?.user.id ?? null) === currentUserId) {
        if (isMounted) {
          setSession(newSession);
        }
        return;
      }
      applySession(newSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function refreshProfile(): Promise<void> {
    if (!supabase || !session?.user.id) return;
    const profile = await getOwnProfile(supabase, session.user.id);
    if (!profile) return;
    setRole((profile.role as Role) ?? null);
    setCompanyName(profile.company_name ?? null);
    setPaidUntil(profile.paid_until ?? null);
    setFullName(profile.full_name ?? null);
    setBio(profile.bio ?? null);
    setCurrentStatus((profile.current_status as CurrentStatus) ?? null);
    setNoticePeriod((profile.notice_period as NoticePeriod) ?? null);
    setLookingFor((profile.looking_for as LookingFor[]) ?? []);
    setEducationStatus((profile.education_status as EducationStatus) ?? null);
    setExperienceYears(profile.experience_years ?? null);
    setExperienceMonths(profile.experience_months ?? null);
    setPassingYear(profile.passing_year ?? null);
    setResumeUrl(profile.resume_url ?? null);
    setSocialLinks((profile.social_links as SocialLinks) ?? {});
    setDesignationId(profile.designation_id ?? null);
    setDesignationSeniority((profile.designation_seniority as SeniorityLevel) ?? null);
    setCategoryDomainId(profile.category_domain_id ?? null);
    setCategoryRoleId(profile.category_role_id ?? null);
    setCurrentLocationId(profile.current_location_id ?? null);
  }

  async function signInWithGoogle(redirectTo = '/dashboard'): Promise<{ error: string | null }> {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthCallbackUrl(redirectTo) },
    });
    return { error: error?.message ?? null };
  }

  async function signInWithWorkEmail(
    email: string,
    redirectTo = '/dashboard'
  ): Promise<{ error: string | null; status: 'sent' | 'not_recognized' | 'error' }> {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR, status: 'error' };

    const normalized = email.trim().toLowerCase();
    const { data: isInvited, error: rpcError } = await supabase.rpc('email_is_invited', {
      check_email: normalized,
    });
    if (rpcError) return { error: rpcError.message, status: 'error' };
    if (!isInvited) return { error: null, status: 'not_recognized' };

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthCallbackUrl(redirectTo),
      },
    });
    if (otpError) return { error: otpError.message, status: 'error' };
    return { error: null, status: 'sent' };
  }

  async function signOut(): Promise<void> {
    await supabase?.auth.signOut();
  }

  const value: AuthContextValue = {
    supabase,
    session,
    user: session?.user ?? null,
    role,
    companyName,
    paidUntil,
    fullName,
    bio,
    currentStatus,
    noticePeriod,
    lookingFor,
    educationStatus,
    experienceYears,
    experienceMonths,
    passingYear,
    resumeUrl,
    socialLinks,
    designationId,
    designationSeniority,
    categoryDomainId,
    categoryRoleId,
    currentLocationId,
    loading,
    refreshProfile,
    signInWithGoogle,
    signInWithWorkEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
