import { ArrowUpRight } from "lucide-react";
import { footer } from "../../content/landing";

/** Simple dot mark used until a real logo is set in content.ts. */
function DotMark() {
  const dots = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const lit = x === 2 && y === 1;
      dots.push(
        <circle
          key={`${x}-${y}`}
          cx={4 + x * 8}
          cy={4 + y * 8}
          r={lit ? 3 : 2.2}
          fill={lit ? "var(--green)" : "var(--dot)"}
        />,
      );
    }
  }
  return (
    <svg className="footer__mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      {dots}
    </svg>
  );
}

export function Footer() {
  return (
    <footer id="next" className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <a className="footer__logo" href="#">
            {footer.logo ? <img src={footer.logo} alt="" height={28} /> : <DotMark />}
            <span>{footer.name}</span>
          </a>
          <p className="footer__tagline">{footer.tagline}</p>
        </div>

        <nav className="footer__cols" aria-label="Footer">
          {footer.columns.map((col) => (
            <div key={col.title} className="footer__col">
              <p className="footer__col-title">{col.title}</p>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="footer__bottom">
        <p>{footer.legal}</p>
        <ul className="footer__socials" aria-label="Social accounts">
          {footer.socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noreferrer">
                {s.label}
                <ArrowUpRight size={14} strokeWidth={2} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
