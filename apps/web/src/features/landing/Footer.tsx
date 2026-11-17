import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { footer } from "../../content/landing";

/** Marque à points, en attendant un vrai logo dans content/landing.ts. */
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
          <Link className="footer__logo" to="/problemes">
            {footer.logo ? <img src={footer.logo} alt="" height={28} /> : <DotMark />}
            <span>{footer.name}</span>
          </Link>
          <p className="footer__tagline">{footer.tagline}</p>
        </div>
      </div>

      <div className="footer__bottom">
        <p>{footer.legal}</p>
        <ul className="footer__socials">
          <li>
            <Link to="/problemes">
              Entrer dans la plateforme
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
