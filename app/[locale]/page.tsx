import { setRequestLocale } from 'next-intl/server';

import { SiteHeader } from '@/components/sections/SiteHeader';
import { Hero } from '@/components/sections/Hero';
import { ValueProps } from '@/components/sections/ValueProps';
import { DietsMarquee } from '@/components/sections/DietsMarquee';
import { Steps } from '@/components/sections/Steps';
import { PricingLadder } from '@/components/sections/PricingLadder';
import { CtaBand } from '@/components/sections/CtaBand';
import { SiteFooter } from '@/components/sections/SiteFooter';

/**
 * The explanatory home page — per the spec, the one page readable without an
 * account. Every CTA on it leads to login.
 *
 * The bands alternate cream / alternate-cream so the eye gets a rhythm on the
 * way down, and each section owns its own vertical padding rather than the page
 * spacing them, so a section can be reordered without retuning its neighbours.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ValueProps />
        <DietsMarquee />
        <Steps />
        <PricingLadder />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
