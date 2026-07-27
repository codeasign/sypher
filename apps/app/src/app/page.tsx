import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAppOrigin } from '@sypher/auth-core/src/urls';
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

const SITE_TITLE = 'Learn AI Engineering & System Design';
const SITE_DESCRIPTION =
  'Sypher is a hands-on learning platform for AI engineering, system design, Python, and software engineering. Text-first lessons with real projects, plus Resume Review and Mock Interview for Pro members.';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: getAppOrigin(),
  },
  openGraph: {
    title: `${SITE_TITLE} | Sypher`,
    description: SITE_DESCRIPTION,
    url: getAppOrigin(),
    siteName: 'Sypher',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_TITLE} | Sypher`,
    description: SITE_DESCRIPTION,
  },
};

function StructuredData() {
  const origin = getAppOrigin();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}#organization`,
        name: 'Sypher',
        url: origin,
        logo: `${origin}/favicon.ico`,
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}#website`,
        url: origin,
        name: 'Sypher',
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${origin}#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect('/dashboard');
  }

  return (
    <>
      <StructuredData />
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
