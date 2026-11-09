import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Fiche Markdown. Le HTML brut n'est pas interprété (comportement par défaut de react-markdown). */
export function Markdown({ children, glass = false }: { children: string; glass?: boolean }) {
  return (
    <div className={glass ? "prose-glass" : "prose-md"}>
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
