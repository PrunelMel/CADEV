import { OrgNewView, OrgView } from "../features/orgs/OrgView";

/** Organisations (charte « Liquid Glass ») : voir features/orgs/OrgView. */
export function OrgNewPage() {
  return <OrgNewView />;
}

export function OrgDetailPage() {
  return <OrgView />;
}
