import { Navigate, Outlet, useLocation } from "react-router";
import { useSession } from "../api/auth";

/** Pages réservées aux membres : renvoie vers la connexion, puis revient ici. */
export function RequireAuth() {
  const { data: session, isPending } = useSession();
  const location = useLocation();
  if (isPending) return null;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/connexion?suite=${next}`} replace />;
  }
  return <Outlet />;
}
