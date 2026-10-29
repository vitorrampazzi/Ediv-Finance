import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./teaching-journey.css";

const teachingSteps = [
  {
    name: "Empresa",
    title: "Comece pelo negócio.",
    text: "Veja o que a empresa vende, quem paga por isso e como a receita se transforma em resultado.",
    detail:
      "No ranking, abra a pesquisa da empresa para consultar o negócio, os indicadores publicados e o contexto que acompanha os números.",
    action: "Conhecer as empresas",
    path: "/#caderno-de-exemplo",
    diagram: "Negócio → receita → resultado",
  },
  {
    name: "Pesquisa",
    title: "Leia as premissas.",
    text: "Uma estimativa depende de hipóteses. Abra a tese, confira o horizonte do cenário e compare o que mudou entre versões.",
    detail:
      "O preço-alvo faz parte dessa leitura. O que sustenta o cenário e os riscos precisam acompanhar o número.",
    action: "Consultar o ranking",
    path: "/ranking",
    diagram: "Premissas → cenário → revisão",
  },
  {
    name: "Dividendos",
    title: "Siga o caminho do lucro.",
    text: "Parte do resultado pode ser distribuída aos acionistas. Entenda essa relação antes de comparar os pagamentos.",
    detail:
      "As aulas explicam payout, dividendo por ação e as datas que definem quem recebe cada pagamento.",
    action: "Abrir a primeira aula",
    path: "/aprender",
    diagram: "Resultado → distribuição → acionista",
  },
] as const;

function CompanyScene() {
  return (
    <svg
      className="ph-teaching-svg"
      viewBox="0 0 460 290"
      fill="none"
      aria-hidden="true"
    >
      <path d="M22 227H438" stroke="#4F5967" />
      <path d="M158 105H302" stroke="#4F5967" strokeDasharray="3 7" />
      <path
        d="M296 100L302 105L296 110"
        stroke="#A9D9D1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="ph-teaching-business">
        <rect
          x="36"
          y="82"
          width="103"
          height="145"
          rx="2"
          fill="#292D34"
          stroke="#4F5967"
        />
        <path
          d="M53 82V59H122V82M75 227V186H100V227"
          stroke="#A9D9D1"
          strokeWidth="2"
        />
        <path
          d="M54 111H69M87 111H103M119 111H124M54 137H69M87 137H103M119 137H124M54 163H69M87 163H103M119 163H124"
          stroke="#D5DBE5"
          strokeWidth="3"
        />
      </g>
      <g className="ph-teaching-bars">
        <rect
          className="ph-teaching-bar ph-teaching-bar-one"
          x="185"
          y="165"
          width="23"
          height="62"
          fill="#4F5967"
        />
        <rect
          className="ph-teaching-bar ph-teaching-bar-two"
          x="218"
          y="129"
          width="23"
          height="98"
          fill="#95CCB4"
          fillOpacity=".56"
        />
        <rect
          className="ph-teaching-bar ph-teaching-bar-three"
          x="251"
          y="93"
          width="23"
          height="134"
          fill="#A9D9D1"
        />
      </g>
      <rect
        x="320"
        y="61"
        width="106"
        height="166"
        rx="2"
        fill="#292D34"
        stroke="#4F5967"
      />
      <path
        d="M338 83H406M338 101H389M338 119H399"
        stroke="#D5DBE5"
        strokeOpacity=".65"
        strokeWidth="3"
      />
      <path d="M338 172H406M338 194H373" stroke="#A9D9D1" strokeWidth="3" />
      <circle cx="395" cy="194" r="9" stroke="#95CCB4" />
      <path
        d="M391 194L394 197L400 190"
        stroke="#95CCB4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="87" y="257" textAnchor="middle" fill="#D5DBE5" fontSize="16">
        Negócio
      </text>
      <text x="230" y="257" textAnchor="middle" fill="#D5DBE5" fontSize="16">
        Receita
      </text>
      <text x="373" y="257" textAnchor="middle" fill="#D5DBE5" fontSize="16">
        Resultado
      </text>
    </svg>
  );
}

function ResearchScene() {
  return (
    <svg
      className="ph-teaching-svg"
      viewBox="0 0 460 290"
      fill="none"
      aria-hidden="true"
    >
      <path d="M72 31H332L385 84V268H72V31Z" fill="#292D34" stroke="#4F5967" />
      <path d="M332 31V84H385" stroke="#4F5967" />
      <text x="96" y="62" fill="#A9D9D1" fontSize="13" letterSpacing="2">
        CADERNO DE PESQUISA
      </text>
      <text x="96" y="103" fill="#F6F7F9" fontSize="17">
        Premissas
      </text>
      <path
        d="M96 120H297M96 134H272"
        stroke="#D5DBE5"
        strokeOpacity=".55"
        strokeWidth="3"
      />
      <text x="96" y="172" fill="#F6F7F9" fontSize="17">
        Cenário e horizonte
      </text>
      <path
        d="M96 189H246M96 203H286"
        stroke="#D5DBE5"
        strokeOpacity=".55"
        strokeWidth="3"
      />
      <g className="ph-teaching-revision">
        <rect
          x="231"
          y="211"
          width="186"
          height="47"
          rx="2"
          fill="#28665F"
          stroke="#95CCB4"
        />
        <path
          d="M250 229V240M244 234.5H256"
          stroke="#A9D9D1"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text x="270" y="240" fill="#F6F7F9" fontSize="14">
          Nova informação
        </text>
      </g>
      <text x="96" y="247" fill="#A9D9D1" fontSize="14">
        Revisão
      </text>
    </svg>
  );
}

function DividendScene() {
  return (
    <svg
      className="ph-teaching-svg"
      viewBox="0 0 460 290"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M77 133C126 133 130 100 170 100H287C327 100 330 133 380 133"
        stroke="#4F5967"
        strokeWidth="2"
      />
      <path
        className="ph-teaching-dividend-signal"
        d="M77 133C126 133 130 100 170 100H287C327 100 330 133 380 133"
        stroke="#A9D9D1"
        strokeWidth="3"
        strokeDasharray="2 27"
        strokeLinecap="round"
      />
      <g fill="#292D34" stroke="#4F5967">
        <rect x="45" y="103" width="64" height="64" rx="4" />
        <rect x="197" y="69" width="64" height="64" rx="4" stroke="#A9D9D1" />
        <rect x="348" y="103" width="64" height="64" rx="4" />
      </g>
      <path
        d="M60 151V135M77 151V119M93 151V128"
        stroke="#A9D9D1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M217 110C214 96 224 88 242 88C243 104 237 114 222 114M219 111L237 94"
        stroke="#A9D9D1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="380" cy="126" r="8" stroke="#A9D9D1" strokeWidth="2" />
      <path
        d="M364 152C364 142 371 138 380 138C389 138 396 142 396 152"
        stroke="#A9D9D1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text x="77" y="205" textAnchor="middle" fill="#D5DBE5" fontSize="16">
        Resultado
      </text>
      <text x="229" y="172" textAnchor="middle" fill="#A9D9D1" fontSize="16">
        Distribuição
      </text>
      <text x="380" y="205" textAnchor="middle" fill="#D5DBE5" fontSize="16">
        Acionista
      </text>
      <path
        d="M44 236H412"
        stroke="#4F5967"
        strokeDasharray="1 10"
        strokeLinecap="round"
      />
    </svg>
  );
}

const scenes = [CompanyScene, ResearchScene, DividendScene];

export function TeachingJourney() {
  const titleId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const studioRef = useRef<HTMLElement>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const studio = studioRef.current;
    if (!section || !studio) return;

    let frame = 0;

    const updateSelection = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.52;
      let closest = -1;
      let distance = Infinity;
      for (const [index, step] of stepRefs.current.entries()) {
        const rectangle = step?.getBoundingClientRect();
        if (!rectangle) continue;
        const currentDistance = Math.abs(
          rectangle.top + rectangle.height / 2 - readingLine,
        );
        if (currentDistance < distance) {
          distance = currentDistance;
          closest = index;
        }
      }
      if (closest >= 0)
        setActive((current) => (current === closest ? current : closest));
    };

    // Intersection thresholds do not track the crossing of the reading line.
    // Coalesce scroll/resize events into one measurement of the three steps.
    const scheduleSelection = () => {
      if (!frame) frame = requestAnimationFrame(updateSelection);
    };

    const loopElements = [
      studio,
      ...section.querySelectorAll<HTMLElement>(
        "[data-ph-teaching-mobile-loop]",
      ),
    ];
    const visibilityObserver =
      window.IntersectionObserver &&
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            (entry.target as HTMLElement).dataset.phInview = String(
              entry.isIntersecting && entry.intersectionRatio >= 0.2,
            );
          }
        },
        { threshold: [0, 0.2] },
      );
    for (const element of loopElements) visibilityObserver?.observe(element);
    scheduleSelection();

    window.addEventListener("scroll", scheduleSelection, { passive: true });
    window.addEventListener("resize", scheduleSelection);
    return () => {
      visibilityObserver?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleSelection);
      window.removeEventListener("resize", scheduleSelection);
      for (const element of loopElements) element.dataset.phInview = "false";
    };
  }, []);

  return (
    <section
      id="como-a-ediv-ensina"
      className="ph-teaching"
      aria-labelledby={titleId}
      ref={sectionRef}
    >
      <div className="ph-teaching-layout">
        <div className="ph-teaching-fixed">
          <header className="ph-teaching-intro">
            <p className="edition-label">Como a Escola do Dividendo ensina</p>
            <h2 id={titleId} className="display-title ph-teaching-title">
              Como ler uma empresa.
            </h2>
            <p className="ph-teaching-lead">
              Comece pela empresa, leia a pesquisa e entenda o caminho dos
              dividendos.
            </p>
          </header>
          <figure
            className="ph-teaching-studio"
            ref={studioRef}
            data-ph-inview="false"
          >
            <div className="ph-teaching-stage-key" aria-hidden="true">
              {teachingSteps.map((step, index) => (
                <span
                  key={step.name}
                  className={active === index ? "ph-is-current" : undefined}
                >
                  {step.name}
                </span>
              ))}
            </div>
            <div className="ph-teaching-scene-stack" aria-hidden="true">
              {scenes.map((Scene, index) => (
                <div
                  key={teachingSteps[index].name}
                  className={`ph-teaching-scene${active === index ? " ph-is-active" : ""}`}
                >
                  <Scene />
                </div>
              ))}
            </div>
            <figcaption>
              <span>Exemplo didático</span>
              <span>{teachingSteps[active].diagram}</span>
            </figcaption>
          </figure>
        </div>
        <ol className="ph-teaching-steps">
          {teachingSteps.map((step, index) => {
            const Scene = scenes[index];
            return (
              <li key={step.name}>
                <article
                  className={`ph-teaching-step${active === index ? " ph-is-current" : ""}`}
                  ref={(element) => {
                    stepRefs.current[index] = element;
                  }}
                >
                  <p className="ph-teaching-step-label">{step.name}</p>
                  <h3 className="display-title">{step.title}</h3>
                  <p className="ph-teaching-step-text">{step.text}</p>
                  <figure
                    className="ph-teaching-mini"
                    data-ph-teaching-mobile-loop
                    data-ph-inview="false"
                  >
                    <Scene />
                    <figcaption>Exemplo didático · {step.diagram}</figcaption>
                  </figure>
                  <p className="ph-teaching-detail">{step.detail}</p>
                  <Link
                    reloadDocument={step.path.includes("#")}
                    to={step.path}
                    className="ph-teaching-action"
                  >
                    {step.action}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
