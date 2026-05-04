import { Link } from "react-router-dom";
import { BookOpen, Share2, MessageSquare, Shield, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Landing() {
  const { t } = useLanguage();
  const l = t.landing;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Glass Nav */}
      <nav className="fixed w-full z-50 glass-nav border-b border-border/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Runo" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/30" />
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "'Source Serif 4', serif" }}>

                Runo
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {l.navFeatures}
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {l.navHow}
              </a>
              <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {l.navFaq}
              </a>
            </div>

            <div className="flex items-center gap-3">
              <LanguageToggle variant="compact" />
              <Link to="/login" className="hidden md:inline text-sm font-semibold hover:text-primary transition-colors">
                {l.navLogin}
              </Link>
              <Button asChild className="rounded-full px-5 shadow-lg shadow-primary/30">
                <Link to="/login">{l.cta}</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="hero-pattern absolute inset-0" />
        <div className="blob bg-secondary w-96 h-96 rounded-full top-0 left-0 -translate-x-1/2 -translate-y-1/2 animate-blob" />
        <div className="blob bg-accent/30 w-80 h-80 rounded-full bottom-0 right-0 translate-x-1/3 translate-y-1/3 animate-blob animation-delay-2000" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
            style={{ fontFamily: "'Source Serif 4', serif" }}>

            {l.heroTitle}{" "}
            <span className="text-primary">
              {l.heroTitleHighlight}
            </span>
            {l.heroTitleEnd}
          </h1>

          <p className="text-lg lg:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            {l.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-8 py-6 text-base font-bold shadow-xl hover:-translate-y-1 transition-all duration-200">
              <Link to="/login">
                {l.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-card relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            


            <h2
              className="text-3xl md:text-4xl font-bold mb-6"
              style={{ fontFamily: "'Source Serif 4', serif" }}>

              {l.featuresTitle}
            </h2>
            <p className="text-lg text-muted-foreground">{l.featuresSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
            { icon: BookOpen, title: l.feature1Title, desc: l.feature1Desc, iconBg: "bg-primary/10", iconColor: "text-primary" },
            { icon: Share2, title: l.feature2Title, desc: l.feature2Desc, iconBg: "bg-accent/20", iconColor: "text-accent" },
            { icon: MessageSquare, title: l.feature3Title, desc: l.feature3Desc, iconBg: "bg-primary/10", iconColor: "text-primary" },
            { icon: Shield, title: l.feature4Title, desc: l.feature4Desc, iconBg: "bg-accent/20", iconColor: "text-accent" }].
            map((f, i) =>
            <div
              key={i}
              className="group bg-background rounded-3xl p-8 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border">

                <div className={`w-14 h-14 rounded-2xl ${f.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className={`w-7 h-7 ${f.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">
              {l.howLabel}
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ fontFamily: "'Source Serif 4', serif" }}>

              {l.howTitle}
            </h2>
          </div>

          <div className="space-y-12 max-w-2xl mx-auto">
            {[l.step1, l.step2, l.step3].map((step, i) => {
              const colors = [
              "bg-primary/10 text-primary",
              "bg-accent/20 text-accent",
              "bg-primary/10 text-primary"];

              return (
                <div key={i} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full ${colors[i]} flex items-center justify-center font-bold text-xl`}>
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </div>);

            })}
          </div>

          <div className="mt-12 text-center">
            <Button asChild className="rounded-full px-6 shadow-lg shadow-primary/30">
              <Link to="/login">
                {l.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Source Serif 4', serif" }}>

              {l.faqTitle}
            </h2>
            <p className="text-muted-foreground">{l.faqSubtitle}</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[l.faq1, l.faq2, l.faq3, l.faq4, l.faq5].map((faq, i) =>
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-background rounded-2xl border border-border overflow-hidden px-6">

                <AccordionTrigger className="font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </section>

      {/* Dark CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-foreground rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary rounded-full mix-blend-screen filter blur-3xl opacity-20" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-accent rounded-full mix-blend-screen filter blur-3xl opacity-20" />

            <div className="relative z-10">
              <h2
                className="text-4xl md:text-5xl font-bold text-background mb-6"
                style={{ fontFamily: "'Source Serif 4', serif" }}>

                {l.ctaTitle}
              </h2>
              <p className="text-background/70 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                {l.ctaSubtitle}
              </p>

              <Button
                asChild
                size="lg"
                className="rounded-full px-8 py-6 text-lg font-bold bg-background text-foreground hover:bg-background/90 hover:scale-105 transition-all duration-200">

                <Link to="/login">{l.cta}</Link>
              </Button>
              <p className="mt-6 text-sm text-background/40">{l.ctaFree}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="Runo" className="w-8 h-8 rounded-lg" />
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "'Source Serif 4', serif" }}>

                Runo
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {l.footerTagline}
            </p>
            <div className="flex items-center gap-4">
              <Link
                to="/changelog"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Changelog
              </Link>
              <LanguageToggle variant="compact" />
            </div>
          </div>
        </div>
      </footer>
    </div>);

}