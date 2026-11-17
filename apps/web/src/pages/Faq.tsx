import { Link } from "react-router";
import { FaqView } from "../features/faq/FaqView";

/** Questions fréquentes (charte « Liquid Glass ») : voir features/faq/FaqView. */
export function FaqPage() {
  return <FaqView />;
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
