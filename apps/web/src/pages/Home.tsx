import { Link } from "react-router";
import { useProblems } from "../api/hooks";
import { ProblemList } from "../components/Lists";
import { Query, Section } from "../components/ui";
import { howItWorks, site } from "../content/site";

export function Home() {
  const problems = useProblems({});
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{site.tagline}</h1>
        <p className="max-w-2xl text-neutral-700">{site.intro}</p>
        <div className="flex gap-3 pt-2 text-sm">
          <Link to="/problemes/nouveau" className="underline">
            Publier un problème
          </Link>
          <Link to="/hub" className="underline">
            Parcourir le hub
          </Link>
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        {howItWorks.map((s, i) => (
          <li key={s.title} className="space-y-1 text-sm">
            <p className="font-medium">
              {i + 1}. {s.title}
            </p>
            <p className="text-neutral-700">{s.text}</p>
          </li>
        ))}
      </ol>

      <Section title="Problèmes récents">
        <Query query={problems}>{(items) => <ProblemList items={items.slice(0, 10)} />}</Query>
      </Section>
    </div>
  );
}
