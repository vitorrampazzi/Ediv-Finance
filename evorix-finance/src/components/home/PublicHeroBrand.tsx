import "./hero-brand.css";

export function PublicHeroBrand() {
  return (
    <div className="ph-brand" aria-hidden="true">
      <img
        className="ph-brand-logo-main mx-auto block h-auto w-4/5"
        src="/ediv-logo-clean.png"
        alt=""
        width="508"
        height="503"
        decoding="async"
        draggable="false"
      />
    </div>
  );
}
