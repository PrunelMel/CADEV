import type { FormEvent } from "react";
import { Upload } from "lucide-react";
import { Button, ErrorText, Field, Input } from "./ui";

type Props = {
  onUpload: (input: { path: string; file: File; message: string }, reset: () => void) => void;
  pending: boolean;
  error: unknown;
  withMessage?: boolean;
};

/** Envoi d'un fichier : le chemin dans le dépôt reprend le nom du fichier si laissé vide. */
export function FileUpload({ onUpload, pending, error, withMessage = true }: Props) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.name) return;
    const path = String(data.get("path") ?? "").trim() || file.name;
    onUpload({ path, file, message: String(data.get("message") ?? "") }, () => form.reset());
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-lg border border-dashed border-neutral-300 bg-paper p-4 sm:grid-cols-2"
    >
      <Field label="Fichier">
        <input
          type="file"
          name="file"
          required
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-white"
        />
      </Field>
      <Field label="Chemin dans le dépôt" hint="Facultatif, par exemple weights/model.onnx">
        <Input name="path" />
      </Field>
      {withMessage && (
        <Field label="Message de version">
          <Input name="message" />
        </Field>
      )}
      <div className="flex items-end gap-2">
        <Button disabled={pending}>
          <Upload size={14} /> Envoyer
        </Button>
        <ErrorText error={error} />
      </div>
    </form>
  );
}
