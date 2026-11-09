import { useParams } from "react-router";
import { useProblem } from "../api/hooks";
import { ErrorText, Query } from "../components/ui";
import { PublishProblem } from "../features/problem-form/PublishProblem";
import { ProblemsView } from "../features/problems/ProblemsView";

/** Liste des problèmes (charte « Liquid Glass ») : voir features/problems/ProblemsView. */
export function ProblemsPage() {
  return <ProblemsView />;
}

export function ProblemNewPage() {
  return <PublishProblem />;
}

export function ProblemEditPage() {
  const { id = "" } = useParams();
  const problem = useProblem(id);
  return (
    <Query query={problem}>
      {(p) =>
        p.isAuthor ? (
          <PublishProblem initial={p} />
        ) : (
          <ErrorText error={new Error("Seul l'auteur peut modifier ce problème.")} />
        )
      }
    </Query>
  );
}
