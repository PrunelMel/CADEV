import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Search } from "lucide-react";
import { useCountryCounts, useProblems, useRepos } from "../api/hooks";
import { AfricaMap } from "../components/AfricaMap";
import { ProblemList, RepoList } from "../components/Lists";
import { Band, ButtonLink, DisplayTitle, Eyebrow, Query, Section } from "../components/ui";
import { howItWorks, site } from "../content/site";
import { usePageTitle } from "../hooks/usePageTitle";

const examples = ["maladies du manioc", "darija", "transcription en fon", "adresse par repères"];

export function Home() {
  usePageTitle("Accueil");
  const problems = useProblems({ status: "open" });
  const repos = useRepos({});
  const countries = useCountryCounts();
  const navigate = useNavigate();

  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (q) navigate(`/recherche?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="space-y-14">
      <Band>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Eyebrow>Une communauté à travers l'Afrique</Eyebrow>
            <DisplayTitle className="sm:text-7xl">
              Partir des problèmes, <span className="text-lilac">pas des modèles.</span>
            </DisplayTitle>
            <p className="max-w-xl text-lg text-[#c9d1e0]">{site.intro}</p>
            <form onSubmit={search} role="search" className="flex max-w-xl gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-night-line bg-white/5 px-3 focus-within:border-lilac">
                <Search size={16} className="text-[#8a95ab]" />
                <input
                  name="q"
                  aria-label="Rechercher un problème"
                  placeholder="Ce qui ne marche pas chez vous"
                  className="w-full bg-transparent py-3 text-white placeholder:text-[#8a95ab] focus:outline-none"
                />
              </div>
              <button className="rounded-md bg-lilac px-5 font-medium text-night hover:bg-[#b5abf9]">
                Chercher
              </button>
            </form>
            <p className="flex flex-wrap items-center gap-2 text-sm text-[#8a95ab]">
              Essayez :
              {examples.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => navigate(`/recherche?q=${encodeURIComponent(q)}`)}
                  className="rounded-full border border-night-line px-3 py-0.5 text-[#e6ebf4] hover:border-lilac hover:text-lilac"
                >
                  {q}
                </button>
              ))}
            </p>
          </div>
          <figure className="space-y-2">
            {countries.data && (
              <AfricaMap
                counts={countries.data}
                variant="dark"
                className="mx-auto w-full max-w-lg"
              />
            )}
            <figcaption className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[#8a95ab]">
              Problèmes publiés par pays, cliquez pour filtrer
            </figcaption>
          </figure>
        </div>
      </Band>

      <ol className="grid gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:grid-cols-3">
        {howItWorks.map((s, i) => (
          <li key={s.title} className="space-y-2 bg-white p-6">
            <span className="font-display text-5xl leading-none text-accent">0{i + 1}</span>
            <p className="text-lg font-semibold">{s.title}</p>
            <p className="text-sm text-neutral-600">{s.text}</p>
          </li>
        ))}
      </ol>

      <Section
        title="Problèmes ouverts"
        actions={
          <ButtonLink to="/problemes" variant="ghost" size="sm">
            Tous les problèmes <ArrowRight size={13} />
          </ButtonLink>
        }
      >
        <Query query={problems}>{(items) => <ProblemList items={items.slice(0, 6)} />}</Query>
      </Section>

      <Section
        title="Derniers dépôts du hub"
        actions={
          <ButtonLink to="/hub" variant="ghost" size="sm">
            Tout le hub <ArrowRight size={13} />
          </ButtonLink>
        }
      >
        <Query query={repos}>{(items) => <RepoList items={items.slice(0, 4)} />}</Query>
      </Section>

      <section className="grid items-center gap-6 rounded-lg bg-night p-8 text-[#e6ebf4] sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <p className="font-display text-4xl uppercase tracking-wide">
            Vous avez un problème de terrain ?
          </p>
          <p className="text-[#c9d1e0]">
            Décrivez-le en langage courant, avec vos contraintes et vos critères. La communauté s'en
            charge, et vous gardez la main sur la validation.
          </p>
        </div>
        <Link
          to="/problemes/nouveau"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-lilac px-5 py-3 font-medium text-night hover:bg-[#b5abf9]"
        >
          Publier un problème <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
