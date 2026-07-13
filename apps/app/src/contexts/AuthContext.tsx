'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
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
  passingYear: number | null;
  resumeUrl: string | null;
  socialLinks: SocialLinks;
  designationId: string | null;
  designationSeniority: SeniorityLevel | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
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
  passingYear: null,
  resumeUrl: null,
  socialLinks: {},
  designationId: null,
  designationSeniority: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo<SupabaseClient | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      // eslint-disable-next-line no-console
      console.error(
        'Missing Supabase config: set SUPABASE_URL and SUPABASE_ANON_KEY in .env and restart the dev server.'
      );
      return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseUrl, supabaseAnonKey]);

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
  const [passingYear, setPassingYear] = useState<number | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [designationId, setDesignationId] = useState<string | null>(null);
  const [designationSeniority, setDesignationSeniority] = useState<SeniorityLevel | null>(null);
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
            setPassingYear(null);
            setResumeUrl(null);
            setSocialLinks({});
            setDesignationId(null);
            setDesignationSeniority(null);
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
          setPassingYear(profile?.passing_year ?? null);
          setResumeUrl(profile?.resume_url ?? null);
          setSocialLinks((profile?.social_links as SocialLinks) ?? {});
          setDesignationId(profile?.designation_id ?? null);
          setDesignationSeniority((profile?.designation_seniority as SeniorityLevel) ?? null);
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
        setPassingYear(null);
        setResumeUrl(null);
        setSocialLinks({});
        setDesignationId(null);
        setDesignationSeniority(null);
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
    setPassingYear(profile.passing_year ?? null);
    setResumeUrl(profile.resume_url ?? null);
    setSocialLinks((profile.social_links as SocialLinks) ?? {});
    setDesignationId(profile.designation_id ?? null);
    setDesignationSeniority((profile.designation_seniority as SeniorityLevel) ?? null);
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
    passingYear,
    resumeUrl,
    socialLinks,
    designationId,
    designationSeniority,
    loading,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
