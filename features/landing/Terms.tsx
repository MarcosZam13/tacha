import { BackButton } from "./components/BackButton";
import { PublicFooter } from "./components/PublicFooter";
import { PublicNavbar } from "./components/PublicNavbar";
import { TERMS_SECTIONS, TERMS_TEXT } from "./constants/terms.constants";

export const Terms = (): React.JSX.Element => (
  <div className="flex min-h-screen flex-col">
    <PublicNavbar />
    <main className="flex-1">
      <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
        <BackButton />
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold text-tacha-text">{TERMS_TEXT.TITLE}</h1>
          <p className="font-body text-sm text-tacha-textsec">{TERMS_TEXT.LAST_UPDATED}</p>
        </header>
        {TERMS_SECTIONS.map(({ id, paragraphs, title }, index) => (
          <section key={id} className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-semibold text-tacha-text">
              {index + 1}. {title}
            </h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="font-body text-base text-tacha-textsec">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
    <PublicFooter />
  </div>
);
