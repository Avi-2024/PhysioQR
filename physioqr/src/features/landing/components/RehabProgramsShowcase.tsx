import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    src: '/rehab-showcase/pain-knee.webp',
    alt: 'PhysioQR knee pain care programme showcase',
    label: 'Knee Pain',
  },
  {
    src: '/rehab-showcase/pain-neck.webp',
    alt: 'PhysioQR neck pain care programme showcase',
    label: 'Neck Pain',
  },
  {
    src: '/rehab-showcase/pain-back.webp',
    alt: 'PhysioQR back pain care programme showcase',
    label: 'Back Pain',
  },
] as const;

const AUTOPLAY_MS = 4500;

export function RehabProgramsShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = (index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  };

  const goPrevious = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  useEffect(() => {
    if (isPaused || typeof window === 'undefined') return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const getSlideOffset = (index: number) => {
    const raw = index - activeIndex;
    if (raw > 1) return raw - slides.length;
    if (raw < -1) return raw + slides.length;
    return raw;
  };

  return (
    <section
      aria-labelledby="rehab-programs-heading"
      className="overflow-hidden bg-white py-14 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-600">
            Personalised recovery support
          </p>
          <h2
            id="rehab-programs-heading"
            className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
          >
            No matter where you have pain,
            <span className="block text-primary-700">we have you covered</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
            Explore structured physiotherapy programmes designed around common pain areas and everyday recovery goals.
          </p>
        </div>

        <div
          className="relative mx-auto mt-10 h-[250px] max-w-6xl sm:h-[370px] lg:mt-12 lg:h-[500px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartX.current;
            const endX = event.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (startX == null || endX == null) return;
            const distance = endX - startX;
            if (Math.abs(distance) < 45) return;
            if (distance > 0) goPrevious();
            else goNext();
          }}
        >
          {slides.map((slide, index) => {
            const offset = getSlideOffset(index);
            const isActive = offset === 0;
            const isAdjacent = Math.abs(offset) === 1;

            return (
              <button
                key={slide.src}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show ${slide.label} programme`}
                aria-current={isActive ? 'true' : undefined}
                tabIndex={isActive || isAdjacent ? 0 : -1}
                className="absolute left-1/2 top-1/2 block overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-xl transition-all duration-700 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 sm:rounded-[30px]"
                style={{
                  width: isActive ? 'min(86vw, 1050px)' : 'min(70vw, 760px)',
                  transform: `translate(calc(-50% + ${offset * 82}%), -50%) scale(${isActive ? 1 : 0.9})`,
                  opacity: isActive ? 1 : isAdjacent ? 0.48 : 0,
                  zIndex: isActive ? 20 : isAdjacent ? 10 : 0,
                  pointerEvents: isActive || isAdjacent ? 'auto' : 'none',
                }}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="block h-auto w-full select-none"
                  draggable={false}
                />
              </button>
            );
          })}

          <button
            type="button"
            onClick={goPrevious}
            aria-label="Show previous recovery programme"
            className="absolute left-1 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-primary-700 shadow-lg transition hover:scale-105 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 sm:left-4 sm:h-14 sm:w-14 lg:left-8"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Show next recovery programme"
            className="absolute right-1 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-primary-700 shadow-lg transition hover:scale-105 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 sm:right-4 sm:h-14 sm:w-14 lg:right-8"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-7 flex items-center justify-center gap-2.5" aria-label="Recovery programme slides">
          {slides.map((slide, index) => (
            <button
              key={slide.label}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show ${slide.label} slide`}
              aria-current={activeIndex === index ? 'true' : undefined}
              className={`h-2.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${
                activeIndex === index ? 'w-8 bg-primary-600' : 'w-2.5 bg-neutral-300 hover:bg-primary-300'
              }`}
            />
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Slides advance automatically. Hover, focus, or use the controls to explore at your own pace.
        </p>
      </div>
    </section>
  );
}

export default RehabProgramsShowcase;
