import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { SignIn, SignUp } from "./pages/Auth";
import { FaqPage, NotFoundPage } from "./pages/Faq";
import { Home } from "./pages/Home";
import { Landing } from "./features/landing/Landing";
import { HubPage, RepoNewPage } from "./pages/Hub";
import { OrgDetailPage, OrgNewPage } from "./pages/Orgs";
import { ProblemDetailPage } from "./pages/ProblemDetail";
import { ProblemNewPage, ProblemsPage } from "./pages/Problems";
import { ProfilePage } from "./pages/Profile";
import { PullDetailPage } from "./pages/PullDetail";
import { RepoDetailPage } from "./pages/RepoDetail";
import { SearchPage } from "./pages/Search";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route index element={<Landing />} />
          <Route element={<Layout />}>
            <Route path="accueil" element={<Home />} />
            <Route path="recherche" element={<SearchPage />} />
            <Route path="problemes" element={<ProblemsPage />} />
            <Route path="problemes/nouveau" element={<ProblemNewPage />} />
            <Route path="problemes/:id" element={<ProblemDetailPage />} />
            <Route path="hub" element={<HubPage />} />
            <Route path="nouveau-depot" element={<RepoNewPage />} />
            <Route path="orgs/nouvelle" element={<OrgNewPage />} />
            <Route path="orgs/:slug" element={<OrgDetailPage />} />
            <Route path="u/:username" element={<ProfilePage />} />
            <Route path="connexion" element={<SignIn />} />
            <Route path="inscription" element={<SignUp />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path=":owner/:name" element={<RepoDetailPage />} />
            <Route path=":owner/:name/pulls/:number" element={<PullDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
