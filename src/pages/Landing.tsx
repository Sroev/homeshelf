import { Link } from "react-router-dom";
import { BookOpen, Share2, MessageSquare, Shield, Users, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Landing() {
  const { t } = useLanguage();
  const l = t.landing;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <span
          className="text-2xl font-bold"
          style={{ fontFamily: "'Source Serif 4', serif" }}
        >
          Runo
        </span>
        <div className="flex items-center gap-2">
          <LanguageToggle variant="compact" />
          <Button asChild size="sm">
            <Link to="/login">{l.cta}</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
        <h1
          className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
          style={{ fontFamily: "'Source Serif 4', serif" }}
        >
          {l.heroTitle}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          {l.heroSubtitle}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/login">
              {l.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2
            className="text-center text-2xl font-bold md:text-3xl"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            {l.featuresTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            {l.featuresSubtitle}
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, title: l.feature1Title, desc: l.feature1Desc },
              { icon: Share2, title: l.feature2Title, desc: l.feature2Desc },
              { icon: MessageSquare, title: l.feature3Title, desc: l.feature3Desc },
              { icon: Shield, title: l.feature4Title, desc: l.feature4Desc },
            ].map((f, i) => (
              <Card key={i} className="border-none bg-background">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2
            className="text-center text-2xl font-bold md:text-3xl"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            {l.howTitle}
          </h2>

          <ol className="mt-12 space-y-8">
            {[l.step1, l.step2, l.step3, l.step4].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2
            className="text-center text-2xl font-bold md:text-3xl"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            {l.faqTitle}
          </h2>

          <Accordion type="single" collapsible className="mt-10">
            {[l.faq1, l.faq2, l.faq3, l.faq4, l.faq5].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2
            className="text-2xl font-bold md:text-3xl"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            {l.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            {l.ctaSubtitle}
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/login">
              {l.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <span style={{ fontFamily: "'Source Serif 4', serif" }} className="font-semibold text-foreground">
          Runo
        </span>{" "}
        — {l.footerTagline}
      </footer>
    </div>
  );
}
