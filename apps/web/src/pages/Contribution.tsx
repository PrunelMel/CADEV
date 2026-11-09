import { useParams } from "react-router";
import { useProblem } from "../api/hooks";
import { ContributionDesigner } from "../features/contribution/ui/ContributionDesigner";
import { ContributorPage } from "../features/contribution/ui/ContributorPage";
import { usePageTitle } from "../hooks/usePageTitle";

/** Conception de la page-formulaire de contribution (auteur du problème ; l'API le vérifie). */
export function ContributionDesignPage() {
  const { id = "" } = useParams();
  const problem = useProblem(id);
  usePageTitle("Concevoir la contribution");
  return (
    <ContributionDesigner
      problemId={id}
      problemTitle={problem.data?.title ?? "Retour au problème"}
    />
  );
}

/** Page-formulaire publiée, remplie par un contributeur. */
export function ContributePage() {
  const { id = "" } = useParams();
  const problem = useProblem(id);
  usePageTitle("Contribuer");
  return (
    <ContributorPage problemId={id} problemTitle={problem.data?.title ?? "Retour au problème"} />
  );
}
