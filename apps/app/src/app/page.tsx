import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HeroSection from '@/components/HeroSection';
import StatsBar from '@/components/StatsBar';
import PillarsSection from '@/components/PillarsSection';
import ApproachSection from '@/components/ApproachSection';
import CoursesTeaser from '@/components/CoursesTeaser';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Learn AI Engineering & System Design',
  description:
    'Sypher is a hands-on learning platform for AI engineering, system design, Python, and software engineering. Text-first lessons with real projects.',
};

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect('/dashboard');
  }

  return (
    <>
      <HeroSection />
      <StatsBar />
      <PillarsSection />
      <CoursesTeaser />
      <ApproachSection />
      <Footer />
    </>
  );
}
