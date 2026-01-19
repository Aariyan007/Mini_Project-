import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const PageLoader = ({ onLoadComplete }) => {
  const loaderRef = useRef(null);
  const counterRef = useRef(null);
  const overlayTopRef = useRef(null);
  const overlayBottomRef = useRef(null);
  const textRef = useRef(null);
  const contentRef = useRef(null);
  const circleRefs = useRef([]);
  const glowRef = useRef(null);
  const lineLeftRef = useRef(null);
  const lineRightRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = '';
        if (onLoadComplete) onLoadComplete();
      }
    });

    // Pulsing glow effect behind counter
    gsap.to(glowRef.current, {
      scale: 1.2,
      opacity: 0.6,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    // Expanding lines animation
    tl.fromTo([lineLeftRef.current, lineRightRef.current], {
      scaleX: 0,
      opacity: 0
    }, {
      scaleX: 1,
      opacity: 1,
      duration: 1,
      ease: "power2.out"
    }, 0);

    const counter = { value: 0 };

    // Counter with scale pulse on milestones
    tl.to(counter, {
      value: 100,
      duration: 2,
      ease: "power2.inOut",
      onUpdate: () => {
        if (counterRef.current) {
          const val = Math.floor(counter.value);
          counterRef.current.textContent = val;
          
          // Pulse on every 25%
          if (val % 25 === 0 && val > 0) {
            gsap.to(counterRef.current, {
              scale: 1.1,
              duration: 0.2,
              yoyo: true,
              repeat: 1,
              ease: "power2.inOut"
            });
          }
        }
      }
    });

    // Text slide up with stagger effect on letters
    tl.fromTo(textRef.current, {
      y: 100,
      opacity: 0
    }, {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power3.out"
    }, 0.3);

    // Animated circles that rotate and scale
    tl.to(circleRefs.current, {
      rotate: 360,
      scale: 1.5,
      stagger: 0.1,
      duration: 0.6,
      ease: "back.out(2)"
    }, 0.5);

    // Content fade out with slight scale
    tl.to(contentRef.current, {
      opacity: 0,
      scale: 0.95,
      duration: 0.5,
      ease: "power2.in"
    }, "-=0.3");

    // Overlays split with rotation effect - faster and smoother
    tl.to(overlayTopRef.current, {
      yPercent: -100,
      rotation: -2,
      duration: 0.8,
      ease: "power3.inOut"
    });

    tl.to(overlayBottomRef.current, {
      yPercent: 100,
      rotation: 2,
      duration: 0.8,
      ease: "power3.inOut"
    }, "<");

    // Remove pointer-events blocker and hide loader right when overlays start moving
    tl.set(loaderRef.current, {
      pointerEvents: "none",
      zIndex: -1
    }, "-=0.8");

    // Completely remove from DOM after animation finishes
    tl.set(loaderRef.current, {
      display: "none"
    });

    return () => {
      tl.kill();
      document.body.style.overflow = '';
    };
  }, [onLoadComplete]);

  return (
    <div
      ref={loaderRef}
      className="fixed inset-0 z-[9999] bg-black"
      style={{ pointerEvents: 'none' }}
    >
      <div
        ref={overlayTopRef}
        className="absolute top-0 left-0 w-full h-1/2 bg-black origin-bottom will-change-transform"
      />
      <div
        ref={overlayBottomRef}
        className="absolute bottom-0 left-0 w-full h-1/2 bg-black origin-top will-change-transform"
      />
      <div 
        ref={contentRef}
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="relative">
          {/* Animated expanding lines */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-between items-center px-4">
            <div
              ref={lineLeftRef}
              className="h-px bg-gradient-to-r from-transparent to-white/40 w-32 origin-right"
            />
            <div
              ref={lineRightRef}
              className="h-px bg-gradient-to-l from-transparent to-white/40 w-32 origin-left"
            />
          </div>

          {/* Glowing background effect */}
          <div
            ref={glowRef}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/20 rounded-full blur-3xl"
          />

          <div className="text-center mb-6 relative z-10">
            <span
              ref={counterRef}
              className="text-8xl md:text-9xl font-bold text-white tracking-tight inline-block"
            >
              0
            </span>
            <span className="text-6xl md:text-7xl font-bold text-white/60">%</span>
          </div>

          <div className="overflow-hidden">
            <p
              ref={textRef}
              className="text-lg md:text-xl text-white/80 tracking-widest uppercase font-light text-center"
            >
              Welcome to Code-Red
            </p>
          </div>

          {/* Enhanced animated circles */}
          <div className="flex justify-center gap-3 mt-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                ref={(el) => (circleRefs.current[i] = el)}
                className="relative"
              >
                <div
                  className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1s'
                  }}
                />
                {/* Ring effect */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-white/30 rounded-full animate-ping"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '2s'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Corner brackets */}
          <div className="absolute -top-8 -left-8 w-16 h-16 border-l-2 border-t-2 border-white/20" />
          <div className="absolute -top-8 -right-8 w-16 h-16 border-r-2 border-t-2 border-white/20" />
          <div className="absolute -bottom-8 -left-8 w-16 h-16 border-l-2 border-b-2 border-white/20" />
          <div className="absolute -bottom-8 -right-8 w-16 h-16 border-r-2 border-b-2 border-white/20" />
        </div>
      </div>
    </div>
  );
};

export default PageLoader;