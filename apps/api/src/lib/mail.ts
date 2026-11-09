import { Resend } from "resend";
import { env } from "../env.js";

const client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Envoie un e-mail sans bloquer ni faire échouer la requête : la notification est déjà dans la
 * boîte de réception, l'e-mail n'en est qu'une copie. Sans clé Resend, rien n'est envoyé.
 */
export function sendMail(to: string, subject: string, text: string) {
  if (!client) return;
  client.emails
    .send({ from: env.MAIL_FROM, to, subject, text })
    .then(({ error }) => {
      if (error) console.error(`E-mail non envoyé à ${to} : ${error.message}`);
    })
    .catch((e: unknown) => console.error(`E-mail non envoyé à ${to} :`, e));
}
