import { Resend } from "resend";
import { env } from "../env.js";

const client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/** Domaine réservé (RFC 6762), jamais livrable : comptes de démo et de tests. */
const undeliverable = (to: string) => to.toLowerCase().endsWith(".local");

/**
 * Envoie un e-mail et attend la réponse de Resend. Sans clé Resend, ou vers une adresse en .local,
 * rien n'est envoyé. Les erreurs sont journalisées, jamais propagées.
 */
export async function deliver(to: string, subject: string, text: string, html?: string) {
  if (!client || undeliverable(to)) return;
  try {
    const { error } = await client.emails.send({ from: env.MAIL_FROM, to, subject, text, html });
    if (error) console.error(`E-mail non envoyé à ${to} : ${error.message}`);
  } catch (e) {
    console.error(`E-mail non envoyé à ${to} :`, e);
  }
}

/** Envoi sans attendre : la notification est déjà dans la boîte de réception, l'e-mail n'en est qu'une copie. */
export function sendMail(to: string, subject: string, text: string) {
  void deliver(to, subject, text);
}

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** E-mail contenant un code à usage unique (inscription ou connexion). */
export function sendCode(to: string, code: string, purpose: "inscription" | "connexion") {
  const subject =
    purpose === "inscription"
      ? `${code} : votre code pour confirmer votre adresse`
      : `${code} : votre code de connexion`;
  const intro =
    purpose === "inscription"
      ? "Voici le code pour confirmer votre adresse e-mail et activer votre compte sur la Plateforme IA appliquée :"
      : "Voici le code pour terminer votre connexion à la Plateforme IA appliquée :";
  const outro =
    "Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : sans ce code, personne ne peut se connecter à votre compte.";
  const text = [intro, "", code, "", outro].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#141a2a;max-width:480px">
<p>${escape(intro)}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0;font-family:ui-monospace,monospace">${escape(code)}</p>
<p style="color:#5a6478">${escape(outro)}</p>
</div>`;
  return deliver(to, subject, text, html);
}
