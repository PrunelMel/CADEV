import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Fiche Markdown. Le HTML brut n'est pas interprété (comportement par défaut de react-markdown). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
