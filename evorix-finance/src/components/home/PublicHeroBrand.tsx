import { useState } from "react";
import { Pause, Play } from "lucide-react";
import "./hero-brand.css";

/** The brand illustration is decorative; the hero copy carries its meaning. */
export function PublicHeroBrand() {
  const [paused, setPaused] = useState(false);

  return (
    <div
      className="ph-brand"
      data-ph-loop
      data-ph-inview="false"
      data-ph-paused={paused}
    >
      <div className="ph-brand-art" aria-hidden="true">
        <div className="ph-brand-grid" />
        <div className="ph-brand-aura" />

        <svg
          className="ph-brand-orbits"
          viewBox="0 0 600 550"
          fill="none"
          focusable="false"
        >
          <circle className="ph-brand-orbit" cx="300" cy="262" r="216" />
          <circle
            className="ph-brand-orbit ph-brand-orbit-inner"
            cx="300"
            cy="262"
            r="184"
          />
          <path
            className="ph-brand-orbit-accent"
            d="M111 158A216 216 0 0 1 307 46M493 359A216 216 0 0 1 414 445"
          />
          <g className="ph-brand-signal">
            <path d="M273 47A216 216 0 0 1 307 46" />
            <circle cx="307" cy="46" r="3.5" />
          </g>
          <g className="ph-brand-signal ph-brand-signal-secondary">
            <path d="M438 429A216 216 0 0 1 414 445" />
            <circle cx="414" cy="445" r="3" />
          </g>
          <path
            className="ph-brand-guides"
            d="M60 262H93M507 262H540M300 12V45M300 479V512"
          />
          <path
            className="ph-brand-label-lines"
            d="M389 112H462L486 88H555M79 408H139L162 385"
          />
          <circle className="ph-brand-pin" cx="389" cy="112" r="2.5" />
          <circle className="ph-brand-pin" cx="162" cy="385" r="2.5" />
        </svg>

        <div className="ph-brand-mark">
          <img
            className="ph-brand-logo ph-brand-logo-depth"
            src="/ediv-logo-clean.png"
            alt=""
            width="508"
            height="503"
            decoding="async"
            draggable="false"
          />
          <img
            className="ph-brand-logo ph-brand-logo-main"
            src="/ediv-logo-clean.png"
            alt=""
            width="508"
            height="503"
            decoding="async"
            draggable="false"
          />
        </div>

        <span className="ph-brand-label ph-brand-label-research">
          Pesquisa de ações
        </span>
        <span className="ph-brand-label ph-brand-label-learning">
          Educação em dividendos
        </span>
      </div>
      <button
        className="ph-brand-motion-control"
        type="button"
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? (
          <Play size={13} aria-hidden="true" />
        ) : (
          <Pause size={13} aria-hidden="true" />
        )}
        {paused ? "Reproduzir animação" : "Pausar animação"}
      </button>
    </div>
  );
}
