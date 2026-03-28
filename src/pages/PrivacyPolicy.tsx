import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPolicy() {
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

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Source Serif 4', serif" }}>
          {isBg ? "Политика за поверителност" : "Privacy Policy"}
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          {isBg ? "Последна актуализация: 28 март 2026 г." : "Last updated: March 28, 2026"}
        </p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          {isBg ? <BgContent /> : <EnContent />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function BgContent() {
  return (
    <>
      <Section title="1. Въведение">
        <p>
          Добре дошли в Runo („ние", „нас", „наш"). Ние уважаваме вашата поверителност и се
          ангажираме да защитаваме личните ви данни. Тази политика описва как събираме,
          използваме и съхраняваме вашата информация, когато използвате нашата услуга.
        </p>
      </Section>

      <Section title="2. Информация, която събираме">
        <p>Ние събираме следната информация:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Данни за акаунта:</strong> имейл адрес, показвано име и град (по избор).</li>
          <li><strong>Данни за библиотеката:</strong> заглавия на книги, автори, ISBN номера и корици.</li>
          <li><strong>Данни за заявки:</strong> име, имейл и съобщение от хора, които искат да заемат книга.</li>
          <li><strong>Технически данни:</strong> IP адрес, тип браузър и устройство — за осигуряване на нормална работа.</li>
        </ul>
      </Section>

      <Section title="3. Как използваме информацията">
        <p>Вашите данни се използват за:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Създаване и поддържане на вашия акаунт.</li>
          <li>Управление на вашата лична библиотека и споделянето ѝ.</li>
          <li>Обработка на заявки за заемане на книги.</li>
          <li>Изпращане на уведомления относно заявки и статус на книги.</li>
          <li>Подобряване и поддържане на услугата.</li>
        </ul>
      </Section>

      <Section title="4. Споделяне на данни">
        <p>
          Ние <strong>не продаваме</strong> вашите лични данни. Информацията се споделя само в следните случаи:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Когато споделите библиотеката си чрез линк — само заглавията и авторите на книгите са видими.</li>
          <li>Когато някой подаде заявка за книга — вие виждате неговите име и имейл.</li>
          <li>При законово изискване от компетентен орган.</li>
        </ul>
      </Section>

      <Section title="5. Съхранение и сигурност">
        <p>
          Вашите данни се съхраняват в защитена облачна инфраструктура. Използваме криптиране
          при предаване (TLS) и сигурна автентикация. Достъпът до данните е ограничен до
          минимално необходимото.
        </p>
      </Section>

      <Section title="6. Вашите права">
        <p>Имате право да:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Достъпите и редактирате личните си данни от профилната страница.</li>
          <li>Изтриете акаунта си и всички свързани данни, като се свържете с нас.</li>
          <li>Поискате копие на данните си.</li>
        </ul>
      </Section>

      <Section title="7. Бисквитки">
        <p>
          Използваме само функционални бисквитки, необходими за работата на услугата
          (напр. сесия за вход). Не използваме рекламни или проследяващи бисквитки.
        </p>
      </Section>

      <Section title="8. Промени в политиката">
        <p>
          Можем да актуализираме тази политика периодично. При съществени промени ще ви
          уведомим чрез имейл или чрез известие в приложението.
        </p>
      </Section>

      <Section title="9. Контакт">
        <p>
          Ако имате въпроси относно тази политика, моля свържете се с нас на{" "}
          <a href="mailto:privacy@runo.app" className="text-primary underline underline-offset-2">
            privacy@runo.app
          </a>.
        </p>
      </Section>
    </>
  );
}

function EnContent() {
  return (
    <>
      <Section title="1. Introduction">
        <p>
          Welcome to Runo ("we", "us", "our"). We respect your privacy and are committed to
          protecting your personal data. This policy describes how we collect, use, and store
          your information when you use our service.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We collect the following information:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> email address, display name, and city (optional).</li>
          <li><strong>Library data:</strong> book titles, authors, ISBN numbers, and cover images.</li>
          <li><strong>Request data:</strong> name, email, and message from people requesting to borrow a book.</li>
          <li><strong>Technical data:</strong> IP address, browser type, and device — to ensure proper functionality.</li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>Your data is used to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Create and maintain your account.</li>
          <li>Manage your personal library and sharing features.</li>
          <li>Process book borrowing requests.</li>
          <li>Send notifications about requests and book status.</li>
          <li>Improve and maintain the service.</li>
        </ul>
      </Section>

      <Section title="4. Data Sharing">
        <p>
          We <strong>do not sell</strong> your personal data. Information is shared only in the following cases:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>When you share your library via link — only book titles and authors are visible.</li>
          <li>When someone submits a book request — you see their name and email.</li>
          <li>When required by law or a competent authority.</li>
        </ul>
      </Section>

      <Section title="5. Storage and Security">
        <p>
          Your data is stored in a secure cloud infrastructure. We use encryption in transit (TLS)
          and secure authentication. Access to data is limited to what is strictly necessary.
        </p>
      </Section>

      <Section title="6. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access and edit your personal data from your profile page.</li>
          <li>Delete your account and all associated data by contacting us.</li>
          <li>Request a copy of your data.</li>
        </ul>
      </Section>

      <Section title="7. Cookies">
        <p>
          We only use functional cookies necessary for the service to work (e.g., login session).
          We do not use advertising or tracking cookies.
        </p>
      </Section>

      <Section title="8. Changes to This Policy">
        <p>
          We may update this policy periodically. For significant changes, we will notify you
          via email or through a notice in the application.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          If you have questions about this policy, please contact us at{" "}
          <a href="mailto:privacy@runo.app" className="text-primary underline underline-offset-2">
            privacy@runo.app
          </a>.
        </p>
      </Section>
    </>
  );
}
