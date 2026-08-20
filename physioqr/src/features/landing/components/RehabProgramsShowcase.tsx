import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    src: '/rehab-showcase/knee-pain.png',
    alt: 'PhysioQR knee pain care programme showcase',
    label: 'Knee Pain',
  },
  {
    src: '/rehab-showcase/neck-pain.png',
    alt: 'PhysioQR neck pain care programme showcase',
    label: 'Neck Pain',
  },
  {
    src: '/rehab-showcase/back-pain.png',
    alt: 'PhysioQR back pain care programme showcase',
    label: 'Back Pain',
  },
  {
    src: '/rehab-showcase/post-tkr-rehab.jpeg',
    alt: 'PhysioQR post total knee replacement day-wise rehabilitation programme',
    label: 'Post TKR Rehab',
  },
  {
    src: '/rehab-showcase/post-knee-ligament-rehab.jpeg',
    alt: 'PhysioQR post knee ligament surgery day-wise rehabilitation programme',
    label: 'Post Ligament Surgery Rehab',
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

  const goPrevious = () => {
    goTo(activeIndex - 1);
  };

  const goNext = () => {
    goTo(activeIndex + 1);
  };

  useEffect(() => {
    if (isPaused || typeof window === 'undefined') {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPaused]);

  const getSlideOffset = (index: number) => {
    let offset = index - activeIndex;

    const half = Math.floor(slides.length / 2);

    if (offset > half) {
      offset -= slides.length;
    }

    if (offset < -half) {
      offset += slides.length;
    }

    return offset;
  };

  return (
    <section
      aria-labelledby="rehab-programs-heading"
      className="overflow-hidden bg-white py-12 sm:py-14 lg:pb-20 lg:pt-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-600">
            Personalised recovery support
          </p>

          <h2
            id="rehab-programs-heading"
            className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
          >
            No matter where you have pain,
            <span className="block text-primary-700">
              we have you covered
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
            Explore structured physiotherapy and post-surgery rehabilitation
            programmes designed around common pain areas and recovery goals.
          </p>
        </div>

        {/* Carousel */}
        <div
          className="relative mx-auto mt-8 h-[210px] max-w-5xl sm:h-[285px] lg:h-[390px]"
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

            if (startX == null || endX == null) {
              return;
            }

            const distance = endX - startX;

            if (Math.abs(distance) < 45) {
              return;
            }

            if (distance > 0) {
              goPrevious();
            } else {
              goNext();
            }
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
                className="
                  absolute
                  left-1/2
                  top-1/2
                  block
                  overflow-hidden
                  rounded-2xl
                  border
                  border-neutral-200
                  bg-white
                  shadow-lg
                  transition-all
                  duration-700
                  ease-out
                  focus:outline-none
                  focus-visible:ring-4
                  focus-visible:ring-primary-200
                "
                style={{
                  width: isActive
                    ? 'min(82vw, 550px)'
                    : 'min(56vw, 400px)',

                  transform: `translate(
                    calc(-50% + ${offset * 72}%),
                    -50%
                  ) scale(${isActive ? 1 : 0.82})`,

                  opacity: isActive
                    ? 1
                    : isAdjacent
                      ? 0.34
                      : 0,

                  zIndex: isActive
                    ? 20
                    : isAdjacent
                      ? 10
                      : 0,

                  pointerEvents:
                    isActive || isAdjacent
                      ? 'auto'
                      : 'none',
                }}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  className="block h-auto w-full select-none object-contain"
                />
              </button>
            );
          })}

          {/* Previous */}
          <button
            type="button"
            onClick={goPrevious}
            aria-label="Show previous recovery programme"
            className="
              absolute
              left-[4%]
              top-1/2
              z-30
              flex
              h-10
              w-10
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-neutral-200
              bg-white/95
              text-primary-700
              shadow-md
              transition
              hover:scale-105
              hover:bg-white
              focus:outline-none
              focus-visible:ring-4
              focus-visible:ring-primary-200
              sm:left-[8%]
              sm:h-12
              sm:w-12
              lg:left-[17%]
            "
          >
            <ChevronLeft
              className="h-5 w-5 sm:h-6 sm:w-6"
              aria-hidden="true"
            />
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={goNext}
            aria-label="Show next recovery programme"
            className="
              absolute
              right-[4%]
              top-1/2
              z-30
              flex
              h-10
              w-10
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-neutral-200
              bg-white/95
              text-primary-700
              shadow-md
              transition
              hover:scale-105
              hover:bg-white
              focus:outline-none
              focus-visible:ring-4
              focus-visible:ring-primary-200
              sm:right-[8%]
              sm:h-12
              sm:w-12
              lg:right-[17%]
            "
          >
            <ChevronRight
              className="h-5 w-5 sm:h-6 sm:w-6"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Indicators */}
        <div
          className="mt-3 flex flex-wrap items-center justify-center gap-2.5"
          aria-label="Recovery programme slides"
        >
          {slides.map((slide, index) => {
            const isCurrent = activeIndex === index;

            return (
              <button
                key={slide.label}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show ${slide.label} slide`}
                aria-current={isCurrent ? 'true' : undefined}
                className={`
                  h-2
                  rounded-full
                  transition-all
                  duration-300
                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-primary-400
                  focus-visible:ring-offset-2
                  ${
                    isCurrent
                      ? 'w-8 bg-primary-600'
                      : 'w-2.5 bg-neutral-300 hover:bg-primary-300'
                  }
                `}
              />
            );
          })}
        </div>

        <p className="mt-3 text-center text-xs text-neutral-500 sm:text-sm">
          Slides advance automatically. Hover, focus, swipe, or use the controls
          to explore at your own pace.
        </p>
      </div>
    </section>
  );
}

export default RehabProgramsShowcase;