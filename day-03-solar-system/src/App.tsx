import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { chapters } from "./data/solarData";
import { useEnvironment } from "./hooks/useEnvironment";
import { useSolarStore } from "./store/solarStore";
import { HeroOverlay } from "./components/HeroOverlay";
import { ChapterRail } from "./components/ChapterRail";
import { PlanetDrawer } from "./components/PlanetDrawer";
import { QualityBadge } from "./components/QualityBadge";
import { FallbackView } from "./components/FallbackView";
import { QuickJump } from "./components/QuickJump";

const SolarCanvas = lazy(async () => {
  const module = await import("./scene/SolarCanvas");
  return { default: module.SolarCanvas };
});

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const storyShellRef = useRef<HTMLElement | null>(null);
  const { reducedMotion, webglSupported, initialQuality } = useEnvironment();
  const setActiveChapter = useSolarStore((state) => state.setActiveChapter);
  const setQualityMode = useSolarStore((state) => state.setQualityMode);
  const setReducedMotion = useSolarStore((state) => state.setReducedMotion);
  const setGuidedCameraActive = useSolarStore((state) => state.setGuidedCameraActive);

  useEffect(() => {
    setReducedMotion(reducedMotion);
    setQualityMode(webglSupported ? initialQuality : "fallback");
  }, [initialQuality, reducedMotion, setQualityMode, setReducedMotion, webglSupported]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: reducedMotion ? 0.9 : 1.25,
      smoothWheel: !reducedMotion,
    });

    const update = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(update);
    };

    lenis.on("scroll", ScrollTrigger.update);
    requestAnimationFrame(update);

    return () => {
      lenis.destroy();
    };
  }, [reducedMotion]);

  useLayoutEffect(() => {
    if (!storyShellRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-story-card]");
      cards.forEach((card) => {
        gsap.fromTo(
          card,
          {
            y: 36,
            opacity: 0.22,
          },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 78%",
              end: "top 38%",
              scrub: reducedMotion ? false : 0.8,
            },
          }
        );
      });

      const sections = gsap.utils.toArray<HTMLElement>("[data-chapter-section]");
      sections.forEach((section) => {
        const chapterId = section.dataset.chapter;
        if (!chapterId) {
          return;
        }

        ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: "bottom center",
          onEnter: () => {
            setGuidedCameraActive(true);
            setActiveChapter(chapterId as never);
          },
          onEnterBack: () => {
            setGuidedCameraActive(true);
            setActiveChapter(chapterId as never);
          },
        });
      });
    }, storyShellRef);

    return () => ctx.revert();
  }, [reducedMotion, setActiveChapter, setGuidedCameraActive]);

  if (!webglSupported) {
    return <FallbackView />;
  }

  return (
    <div className="day03-app">
      <div className="day03-app__bg" aria-hidden="true">
        <span className="day03-app__gradient day03-app__gradient--warm"></span>
        <span className="day03-app__gradient day03-app__gradient--cool"></span>
        <span className="day03-app__grid"></span>
      </div>

      <Suspense fallback={<div className="canvas-loader">Initializing cinematic scene...</div>}>
        <SolarCanvas />
      </Suspense>
      <HeroOverlay />
      <ChapterRail />
      <QualityBadge />
      <QuickJump />
      <PlanetDrawer />

      <main className="story-shell" ref={storyShellRef}>
        {chapters.map((chapter) => (
          <section
            id={`chapter-${chapter.id}`}
            key={chapter.id}
            className="story-section"
            data-chapter-section
            data-chapter={chapter.id}
          >
            <article className="story-card" data-story-card>
              <p className="story-card__eyebrow">{chapter.eyebrow}</p>
              <h2>{chapter.title}</h2>
              <p className="story-card__summary">{chapter.summary}</p>
              <p>{chapter.body}</p>
            </article>
          </section>
        ))}
      </main>
    </div>
  );
}
