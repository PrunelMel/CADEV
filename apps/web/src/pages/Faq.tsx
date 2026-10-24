import { Link } from "react-router";
import { faq } from "../content/site";

export function FaqPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Questions fréquentes</h1>
      <dl className="space-y-4">
        {faq.map((f) => (
          <div key={f.q}>
            <dt className="font-medium">{f.q}</dt>
            <dd className="text-neutral-700">{f.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <p>
      Page introuvable.{" "}
      <Link to="/" className="underline">
        Retour à l'accueil
      </Link>
    </p>
  );
}
