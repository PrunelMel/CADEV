import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Landing } from "./features/landing/Landing";
import "./index.css";

/**
 * Chaque page est chargée à sa première visite : la page d'accueil (landing) ne télécharge ni
 * n'exécute le code des autres pages (concepteur de contribution, formulaires, cartes…).
 */
const Layout = lazy(() => import("./components/Layout").then((x) => ({ default: x.Layout })));
const RequireAuth = lazy(() =>
  import("./components/RequireAuth").then((x) => ({ default: x.RequireAuth })),
);
const ProblemsPage = lazy(() =>
  import("./pages/Problems").then((x) => ({ default: x.ProblemsPage })),
);
const ProblemNewPage = lazy(() =>
  import("./pages/Problems").then((x) => ({ default: x.ProblemNewPage })),
);
const ProblemEditPage = lazy(() =>
  import("./pages/Problems").then((x) => ({ default: x.ProblemEditPage })),
);
const ProblemDetailPage = lazy(() =>
  import("./pages/ProblemDetail").then((x) => ({ default: x.ProblemDetailPage })),
);
const HubPage = lazy(() => import("./pages/Hub").then((x) => ({ default: x.HubPage })));
const RepoNewPage = lazy(() => import("./pages/Hub").then((x) => ({ default: x.RepoNewPage })));
const ContributionDesignPage = lazy(() =>
  import("./pages/Contribution").then((x) => ({ default: x.ContributionDesignPage })),
);
const ContributePage = lazy(() =>
  import("./pages/Contribution").then((x) => ({ default: x.ContributePage })),
);
const Home = lazy(() => import("./pages/Home").then((x) => ({ default: x.Home })));
const SearchPage = lazy(() => import("./pages/Search").then((x) => ({ default: x.SearchPage })));
const DashboardPage = lazy(() =>
  import("./pages/Dashboard").then((x) => ({ default: x.DashboardPage })),
);
const OrgNewPage = lazy(() => import("./pages/Orgs").then((x) => ({ default: x.OrgNewPage })));
const OrgDetailPage = lazy(() =>
  import("./pages/Orgs").then((x) => ({ default: x.OrgDetailPage })),
);
const ProfilePage = lazy(() => import("./pages/Profile").then((x) => ({ default: x.ProfilePage })));
const SignIn = lazy(() => import("./pages/Auth").then((x) => ({ default: x.SignIn })));
const SignUp = lazy(() => import("./pages/Auth").then((x) => ({ default: x.SignUp })));
const FaqPage = lazy(() => import("./pages/Faq").then((x) => ({ default: x.FaqPage })));
const NotFoundPage = lazy(() => import("./pages/Faq").then((x) => ({ default: x.NotFoundPage })));
const RepoDetailPage = lazy(() =>
  import("./pages/RepoDetail").then((x) => ({ default: x.RepoDetailPage })),
);
const PullDetailPage = lazy(() =>
  import("./pages/PullDetail").then((x) => ({ default: x.PullDetailPage })),
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route index element={<Landing />} />
            <Route element={<Layout full />}>
              <Route path="problemes" element={<ProblemsPage />} />
              <Route path="hub" element={<HubPage />} />
              <Route path="problemes/:id" element={<ProblemDetailPage />} />
            <Route path=":owner/:name" element={<RepoDetailPage />} />
            <Route path=":owner/:name/pulls/:number" element={<PullDetailPage />} />
              <Route element={<RequireAuth />}>
                <Route path="problemes/nouveau" element={<ProblemNewPage />} />
                <Route path="problemes/:id/modifier" element={<ProblemEditPage />} />
                <Route path="problemes/:id/concevoir" element={<ContributionDesignPage />} />
                <Route path="problemes/:id/contribuer" element={<ContributePage />} />
                <Route path="nouveau-depot" element={<RepoNewPage />} />
              </Route>
            </Route>
            <Route element={<Layout />}>
              <Route path="accueil" element={<Home />} />
              <Route path="recherche" element={<SearchPage />} />
              <Route element={<RequireAuth />}>
                <Route path="tableau-de-bord" element={<DashboardPage />} />
                <Route path="orgs/nouvelle" element={<OrgNewPage />} />
              </Route>
              <Route path="orgs/:slug" element={<OrgDetailPage />} />
              <Route path="u/:username" element={<ProfilePage />} />
              <Route path="connexion" element={<SignIn />} />
              <Route path="inscription" element={<SignUp />} />
              <Route path="faq" element={<FaqPage />} />
                  <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
