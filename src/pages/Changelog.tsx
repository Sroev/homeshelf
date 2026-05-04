import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type ChangeType = "new" | "improved" | "fixed";

interface ChangelogEntry {
  date: string; // ISO date
  version?: string;
  changes: {
    type: ChangeType;
    bg: string;
    en: string;
  }[];
}

// Newest first. Add new entries at the top.
const ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-05-04",
    changes: [
      {
        type: "new",
        bg: "Жанр на книгите – избор при добавяне и филтриране в споделената библиотека.",
        en: "Book genre – set on each book and filter by it in the shared library.",
      },
      {
        type: "new",
        bg: "Страница /changelog с история на промените.",
        en: "/changelog page with product history.",
      },
      {
        type: "new",
        bg: "Търсене по заглавие и автор в споделената библиотека.",
        en: "Search by title and author in the shared library.",
      },
      {
        type: "improved",
        bg: "По-плавно сканиране на баркод чрез нативната камера на телефона.",
        en: "Smoother barcode scanning using the phone's native camera.",
      },
      {
        type: "new",
        bg: "Бутон „Напомняне за връщане“ – изпраща имейл на наемателя.",
        en: "“Send return reminder” button – emails the borrower.",
      },
      {
        type: "new",
        bg: "Очаквана дата на връщане при заявка за заемане.",
        en: "Expected return date when requesting a book.",
      },
      {
        type: "new",
        bg: "История на заетите книги с автоматично и ръчно записване.",
        en: "Loan history with automatic and manual entries.",
      },
    ],
  },
];

const TYPE_STYLES: Record<ChangeType, { bg: string; en: string; className: string }> = {
  new: {
    bg: "Ново",
    en: "New",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  improved: {
    bg: "Подобрение",
    en: "Improved",
    className: "bg-accent/15 text-accent-foreground border-accent/30",
  },
  fixed: {
    bg: "Поправка",
    en: "Fixed",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function formatDate(iso: string, isBg: boolean) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(isBg ? "bg-BG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Changelog() {
  const { language } = useLanguage();
  const isBg = language === "bg";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {isBg ? "Към началната страница" : "Back to home"}
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            {isBg ? "Какво е ново" : "What's new"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">
          {isBg
            ? "Списък на новите функции и подобрения в Runo."
            : "A log of new features and improvements in Runo."}
        </p>

        <div className="space-y-12">
          {ENTRIES.map((entry) => (
            <section key={entry.date} className="relative">
              <header className="mb-4 flex items-baseline gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {formatDate(entry.date, isBg)}
                </h2>
                {entry.version && (
                  <span className="text-xs text-muted-foreground">
                    v{entry.version}
                  </span>
                )}
              </header>
              <ul className="space-y-3">
                {entry.changes.map((change, i) => {
                  const style = TYPE_STYLES[change.type];
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm leading-relaxed"
                    >
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium ${style.className}`}
                      >
                        {isBg ? style.bg : style.en}
                      </span>
                      <span className="text-foreground/90">
                        {isBg ? change.bg : change.en}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}