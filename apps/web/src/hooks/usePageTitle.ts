import { useEffect } from "react";
import { site } from "../content/site";

/** Titre de l'onglet : « Page · Plateforme ». Chaque page avait le même titre. */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${site.name}` : site.name;
  }, [title]);
}
