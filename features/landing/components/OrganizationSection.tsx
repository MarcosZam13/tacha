import { ORGANIZATION_FACTS, ORGANIZATION_TEXT } from "../constants/landing.constants";

export const OrganizationSection = (): React.JSX.Element => (
  <section className="bg-tacha-surface px-4 py-12 md:px-10">
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h2 className="font-display text-3xl font-bold text-tacha-text">{ORGANIZATION_TEXT.TITLE}</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {ORGANIZATION_FACTS.map(({ id, text, title }) => (
          <li key={id} className="flex flex-col gap-2 rounded-tacha-card border border-tacha-border bg-tacha-bg p-5">
            <h3 className="font-display text-lg font-semibold text-tacha-text">{title}</h3>
            <p className="font-body text-sm text-tacha-textsec">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
