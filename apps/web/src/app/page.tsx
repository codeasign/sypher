import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import HeroSection from '@/components/HeroSection';
import StatsBar from '@/components/StatsBar';
import PillarsSection from '@/components/PillarsSection';
import HowYouLearnSection from '@/components/HowYouLearnSection';
import WhatYouBuildSection from '@/components/WhatYouBuildSection';
import CoursesTeaser from '@/components/CoursesTeaser';
import FreeVsProSection from '@/components/FreeVsProSection';
import CareerServicesSection from '@/components/CareerServicesSection';
import ApproachSection from '@/components/ApproachSection';
import ForBusinessSection from '@/components/ForBusinessSection';
import Footer from '@/components/Footer';

// Ported from apps/app's landing page (all 10 sections + Footer are static/
// presentational — no Supabase calls). The one dynamic touch point (auth
// redirect) uses apps/web's own serverApiFetch('/auth/me') pattern instead
// of apps/app's supabase.auth.getUser() call.
export default async function Home(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (meRes.ok) {
    redirect('/dashboard');
  }

  return (
    <>
      <HeroSection />
      <StatsBar />
      <PillarsSection />
      <HowYouLearnSection />
      <WhatYouBuildSection />
      <CoursesTeaser />
      <FreeVsProSection />
      <CareerServicesSection />
      <ApproachSection />
      <ForBusinessSection />
      <Footer />
    </>
  );
}
