import { Motorcycle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export function LegalPage({
  eyebrow,
  title,
  description,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="legal-brand" href="/login" aria-label="Volver a Tudelivery">
          <span><Motorcycle size={25} weight="fill" /></span>
          <strong>Tudelivery</strong>
        </Link>
        <Link className="button button-secondary button-small" href="/login">Volver a la aplicación</Link>
      </header>

      <article className="legal-document">
        <div className="legal-intro">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <small>Última actualización: 7 de octubre de 2026</small>
        </div>

        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.items ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </section>
        ))}

        <footer className="legal-footer">
          <p>DevTesters Delivery&apos;s · Granada, Nicaragua</p>
          <a href="mailto:joel.chavarria@devtester.lat">joel.chavarria@devtester.lat</a>
        </footer>
      </article>
    </main>
  );
}
