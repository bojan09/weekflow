import { Customize } from "@/components/site/customize";
import { Hero } from "@/components/site/hero";
import { MobileCta } from "@/components/site/mobile-cta";
import { ProductWindow } from "@/components/site/product-window";
import { Faq, Features, FinalCta, FreeBand, HowItWorks, Panel, Roadmap } from "@/components/site/sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-2 pt-3 pb-4 outline-none sm:gap-5 sm:px-5 sm:pt-4">
        <Hero />
        <div id="hero-end" aria-hidden="true" />
        <section aria-label="Product preview" className="surface-panel rounded-3xl border p-3 shadow-soft sm:p-6">
          <ProductWindow />
        </section>
        <HowItWorks />
        <Features />
        <Panel
          id="customize"
          title="Make it yours"
          intro="Pick a theme, a color and a background. Try it right here: it is the same control you get in Settings."
        >
          <Customize />
        </Panel>
        <FreeBand />
        <Roadmap />
        <Faq />
        <FinalCta />
        <div id="site-footer">
          <SiteFooter />
        </div>
      </main>
      <div className="h-24 sm:h-6" aria-hidden="true" />
      <MobileCta afterId="hero-end" untilId="site-footer" />
    </>
  );
}
