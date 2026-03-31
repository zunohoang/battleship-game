import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GAME_BRAND_NAME } from '@/constants/branding';
import { useSettings } from '@/hooks/useSettings';
import type { AppLanguage, AppTheme } from '@/types/settings';

// Landing content types
type LandingMediaPanel = {
  id: string;
  tag: string;
  title: string;
  description: string;
  frameLabel: string;
  frameHint: string;
  imageSrc?: string;
  imageAlt?: string;
};

type LandingSlideBase = {
  id: string;
  layout: 'carousel' | 'finale';
  number: string;
  railLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  ctaLabel?: string;
  ctaHint?: string;
};

type LandingCarouselSlide = LandingSlideBase & {
  layout: 'carousel';
  panels: LandingMediaPanel[];
};

type LandingFinaleSlide = LandingSlideBase & {
  layout: 'finale';
};

type LandingSlide = LandingCarouselSlide | LandingFinaleSlide;

type LandingContributor = {
  name: string;
  initials: string;
  githubLabel: string;
  githubUrl?: string;
};

type LandingSupportCard = {
  label: string;
  title: string;
  description: string;
  qrLabel: string;
};

type LandingContent = {
  railTitle: string;
  carousel: {
    panelLabel: string;
    swipeHint: string;
  };
  aria: {
    jumpTo: string;
    previousPanel: string;
    nextPanel: string;
    goToPanel: string;
  };
  credits: {
    label: string;
    contributors: LandingContributor[];
    support: LandingSupportCard;
  };
  slides: LandingSlide[];
};

// Shared layout constants and helpers
const darkSectionBackdrops = [
  'radial-gradient(circle at 16% 18%, rgba(64, 229, 255, 0.18), transparent 0, transparent 30%), radial-gradient(circle at 84% 18%, rgba(8, 79, 104, 0.28), transparent 36%), linear-gradient(180deg, rgba(3, 9, 15, 0.12) 0%, rgba(2, 7, 13, 0.28) 100%)',
  'radial-gradient(circle at 76% 22%, rgba(64, 229, 255, 0.16), transparent 0, transparent 30%), radial-gradient(circle at 18% 72%, rgba(9, 78, 102, 0.24), transparent 36%), linear-gradient(180deg, rgba(3, 9, 15, 0.16) 0%, rgba(2, 7, 13, 0.28) 100%)',
  'radial-gradient(circle at 20% 22%, rgba(64, 229, 255, 0.16), transparent 0, transparent 28%), radial-gradient(circle at 80% 76%, rgba(10, 83, 109, 0.24), transparent 38%), linear-gradient(180deg, rgba(3, 9, 15, 0.14) 0%, rgba(2, 7, 13, 0.28) 100%)',
  'radial-gradient(circle at 78% 26%, rgba(64, 229, 255, 0.15), transparent 0, transparent 30%), radial-gradient(circle at 16% 70%, rgba(10, 72, 95, 0.24), transparent 36%), linear-gradient(180deg, rgba(3, 9, 15, 0.18) 0%, rgba(2, 7, 13, 0.3) 100%)',
  'radial-gradient(circle at 18% 18%, rgba(64, 229, 255, 0.16), transparent 0, transparent 30%), radial-gradient(circle at 84% 72%, rgba(10, 75, 99, 0.24), transparent 36%), linear-gradient(180deg, rgba(3, 9, 15, 0.14) 0%, rgba(2, 7, 13, 0.32) 100%)',
];

const lightSectionBackdrops = [
  'radial-gradient(circle at 16% 18%, rgba(56, 190, 224, 0.18), transparent 0, transparent 30%), radial-gradient(circle at 84% 18%, rgba(172, 218, 230, 0.34), transparent 36%), linear-gradient(180deg, rgba(248, 252, 255, 0.82) 0%, rgba(236, 246, 251, 0.94) 100%)',
  'radial-gradient(circle at 76% 22%, rgba(63, 198, 228, 0.16), transparent 0, transparent 30%), radial-gradient(circle at 18% 72%, rgba(170, 217, 230, 0.28), transparent 36%), linear-gradient(180deg, rgba(247, 252, 255, 0.82) 0%, rgba(234, 245, 250, 0.94) 100%)',
  'radial-gradient(circle at 20% 22%, rgba(71, 199, 226, 0.16), transparent 0, transparent 28%), radial-gradient(circle at 80% 76%, rgba(173, 221, 232, 0.28), transparent 38%), linear-gradient(180deg, rgba(248, 252, 255, 0.8) 0%, rgba(235, 245, 250, 0.94) 100%)',
  'radial-gradient(circle at 78% 26%, rgba(69, 196, 224, 0.16), transparent 0, transparent 30%), radial-gradient(circle at 16% 70%, rgba(176, 221, 231, 0.28), transparent 36%), linear-gradient(180deg, rgba(248, 252, 255, 0.8) 0%, rgba(235, 245, 250, 0.95) 100%)',
  'radial-gradient(circle at 18% 18%, rgba(64, 193, 223, 0.16), transparent 0, transparent 30%), radial-gradient(circle at 84% 72%, rgba(171, 217, 229, 0.28), transparent 36%), linear-gradient(180deg, rgba(248, 252, 255, 0.8) 0%, rgba(234, 245, 250, 0.95) 100%)',
];

const panelTransition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] } as const;
const railNodeSize = 32;
const railNodeGap = 16;
const railNodeStep = railNodeSize + railNodeGap;
const railControlWidth = 88;
const scrollSettleDelayMs = 140;

function clampIndex(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function getSectionIndex(element: Element) {
  const index = Number(element.getAttribute('data-slide-index') ?? -1);
  return Number.isNaN(index) ? -1 : index;
}

function getLeadingSectionIndex(
  scrollRoot: HTMLElement,
  sections: HTMLElement[],
) {
  const rootRect = scrollRoot.getBoundingClientRect();
  let leadingIndex = getSectionIndex(sections[0] ?? scrollRoot);
  let bestRatio = -1;
  let bestTopOffset = Number.POSITIVE_INFINITY;

  sections.forEach((section) => {
    const index = getSectionIndex(section);
    if (index < 0) {
      return;
    }

    const rect = section.getBoundingClientRect();
    const visibleTop = Math.max(rect.top, rootRect.top);
    const visibleBottom = Math.min(rect.bottom, rootRect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibleRatio = visibleHeight / Math.max(1, Math.min(rect.height, rootRect.height));
    const topOffset = Math.abs(rect.top - rootRect.top);

    if (
      visibleRatio > bestRatio + 0.001 ||
      (Math.abs(visibleRatio - bestRatio) <= 0.001 &&
        topOffset < bestTopOffset)
    ) {
      leadingIndex = index;
      bestRatio = visibleRatio;
      bestTopOffset = topOffset;
    }
  });

  return leadingIndex;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => {
      mediaQuery.removeEventListener('change', updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

// Go to /home btn
function ActionButton({
  label,
  onClick,
  isLightTheme,
}: {
  label: string;
  onClick: () => void;
  isLightTheme: boolean;
}) {
  const buttonClassName = isLightTheme
    ? 'inline-flex cursor-pointer items-center gap-4 rounded-xl border border-[#37b8d3] bg-[linear-gradient(180deg,rgba(240,251,255,0.98),rgba(215,240,247,0.96))] px-8 py-5 font-mono text-[11px] font-bold tracking-[0.3em] text-[#123748] uppercase shadow-[0_0_24px_rgba(79,172,198,0.16)]'
    : 'inline-flex cursor-pointer items-center gap-4 rounded-xl border border-[#77efff]/82 bg-[linear-gradient(180deg,rgba(76,224,255,0.24),rgba(17,124,162,0.24))] px-8 py-5 font-mono text-[11px] font-bold tracking-[0.3em] text-[#f2fdff] uppercase shadow-[0_0_32px_rgba(30,194,228,0.2)]';

  return (
    <motion.button
      type='button'
      onClick={onClick}
      className={buttonClassName}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <span>{label}</span>
    </motion.button>
  );
}

// Reusable media carousel
function LandingMediaCarousel({
  panels,
  labels,
  reducedMotion,
  isLightTheme,
}: {
  panels: LandingMediaPanel[];
  labels: LandingContent['carousel'] & LandingContent['aria'];
  reducedMotion: boolean;
  isLightTheme: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const programmaticPanelIndexRef = useRef<number | null>(null);
  const programmaticResetTimeoutRef = useRef<number | null>(null);
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [expandedPanelIndex, setExpandedPanelIndex] = useState<number | null>(
    null,
  );

  const activePanel = panels[activePanelIndex] ?? panels[0];
  const expandedPanel =
    expandedPanelIndex === null ? null : (panels[expandedPanelIndex] ?? null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    let animationFrameId = 0;
    const syncPanelIndex = () => {
      animationFrameId = 0;
      if (programmaticPanelIndexRef.current !== null) {
        return;
      }

      const nextIndex = clampIndex(
        Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)),
        panels.length - 1,
      );
      setActivePanelIndex((current) =>
        current === nextIndex ? current : nextIndex,
      );
    };

    const handleScroll = () => {
      if (animationFrameId !== 0) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(syncPanelIndex);
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    syncPanelIndex();

    return () => {
      track.removeEventListener('scroll', handleScroll);
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [panels.length]);

  useEffect(() => {
    return () => {
      if (programmaticResetTimeoutRef.current !== null) {
        window.clearTimeout(programmaticResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (expandedPanelIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedPanelIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedPanelIndex]);

  useEffect(() => {
    const handleResize = () => {
      const track = trackRef.current;
      if (!track) {
        return;
      }

      track.scrollTo({
        left: track.clientWidth * activePanelIndex,
        behavior: 'auto',
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activePanelIndex]);

  const goToPanel = (nextIndex: number) => {
    const track = trackRef.current;
    const clampedIndex = clampIndex(nextIndex, panels.length - 1);

    setActivePanelIndex(clampedIndex);

    if (!track) {
      return;
    }

    programmaticPanelIndexRef.current = clampedIndex;
    if (programmaticResetTimeoutRef.current !== null) {
      window.clearTimeout(programmaticResetTimeoutRef.current);
    }

    track.scrollTo({
      left: track.clientWidth * clampedIndex,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });

    if (reducedMotion) {
      programmaticPanelIndexRef.current = null;
      return;
    }

    programmaticResetTimeoutRef.current = window.setTimeout(() => {
      programmaticPanelIndexRef.current = null;
      programmaticResetTimeoutRef.current = null;
    }, 420);
  };

  const openExpandedPanel = (panelIndex: number) => {
    if (!panels[panelIndex]?.imageSrc) {
      return;
    }

    setExpandedPanelIndex(panelIndex);
  };

  const closeExpandedPanel = () => {
    setExpandedPanelIndex(null);
  };

  const expandedOverlayClassName = isLightTheme
    ? 'fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(231,241,247,0.82)] p-5 backdrop-blur-md sm:p-7 lg:p-12'
    : 'fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(2,8,14,0.82)] p-5 backdrop-blur-md sm:p-7 lg:p-12';
  const expandedPanelClassName = isLightTheme
    ? 'relative flex w-full max-w-6xl flex-col gap-5 rounded-[28px] border border-[#8ebdcb] bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_24px_90px_rgba(86,123,145,0.18)] sm:p-6 lg:p-7'
    : 'relative flex w-full max-w-6xl flex-col gap-5 rounded-[28px] border border-[#1d6078] bg-[rgba(5,16,24,0.94)] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.5)] sm:p-6 lg:p-7';
  const expandedCloseClassName = isLightTheme
    ? 'absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#9bc7d5] bg-[rgba(247,252,255,0.95)] text-[#1d4a5e] transition-colors hover:border-[#4ac0d7]'
    : 'absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#2a647b] bg-[rgba(4,16,24,0.92)] text-[#d9fbff] transition-colors hover:border-[#79f0ff]';
  const expandedFrameClassName = isLightTheme
    ? 'overflow-hidden rounded-[22px] border border-[#c1dae5] bg-[rgba(241,248,252,0.92)] p-4 sm:p-5'
    : 'overflow-hidden rounded-[22px] border border-[#194b5f] bg-[rgba(2,10,16,0.88)] p-4 sm:p-5';
  const expandedTagClassName = isLightTheme
    ? 'font-mono text-[10px] tracking-[0.32em] text-[#2896b1] uppercase'
    : 'font-mono text-[10px] tracking-[0.32em] text-[#79eefe] uppercase';
  const expandedTitleClassName = isLightTheme
    ? 'mt-2 text-lg font-black tracking-[0.08em] text-[#173d4f] uppercase'
    : 'mt-2 text-lg font-black tracking-[0.08em] text-[#f1fdff] uppercase';
  const expandedDescriptionClassName = isLightTheme
    ? 'mt-2 text-sm leading-7 text-[#5f7e8d]'
    : 'mt-2 text-sm leading-7 text-[#98c3d1]';
  const carouselShellClassName = isLightTheme
    ? 'relative z-10 w-full max-w-[720px] rounded-[30px] border border-[#8cbcc9]/82 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_0_0_1px_rgba(141,186,205,0.2),0_26px_80px_rgba(91,132,155,0.16)] backdrop-blur-xl'
    : 'relative z-10 w-full max-w-[720px] rounded-[30px] border border-[#1c5f76]/76 bg-[rgba(5,16,24,0.78)] p-6 shadow-[0_0_0_1px_rgba(32,149,186,0.12),0_26px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl';
  const carouselGridOverlay = isLightTheme
    ? 'linear-gradient(180deg, rgba(111, 203, 225, 0.05) 0%, transparent 14%, transparent 86%, rgba(111, 203, 225, 0.04) 100%), repeating-linear-gradient(180deg, rgba(93, 176, 198, 0.06) 0 1px, transparent 1px 4px)'
    : 'linear-gradient(180deg, rgba(140, 245, 255, 0.06) 0%, transparent 14%, transparent 86%, rgba(140, 245, 255, 0.05) 100%), repeating-linear-gradient(180deg, rgba(109, 230, 255, 0.07) 0 1px, transparent 1px 4px)';
  const carouselHeaderClassName = isLightTheme
    ? 'relative flex items-center justify-between gap-4 border-b border-[#bfd7e1] pb-4'
    : 'relative flex items-center justify-between gap-4 border-b border-[#174759] pb-4';
  const carouselLabelClassName = isLightTheme
    ? 'font-mono text-[10px] tracking-[0.34em] text-[#2992ad] uppercase'
    : 'font-mono text-[10px] tracking-[0.34em] text-[#84e8fb] uppercase';
  const carouselTitleClassName = isLightTheme
    ? 'mt-2 text-xl font-black tracking-[0.08em] text-[#173d4f] uppercase'
    : 'mt-2 text-xl font-black tracking-[0.08em] text-[#f1fdff] uppercase';
  const carouselNavButtonClassName = isLightTheme
    ? 'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#95c0ce] bg-[rgba(244,251,253,0.92)] text-[#205169] transition-colors hover:border-[#58c3db] disabled:cursor-not-allowed disabled:opacity-40'
    : 'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#24576c] bg-[rgba(7,20,29,0.82)] text-[#d9fbff] transition-colors hover:border-[#59e4f7] disabled:cursor-not-allowed disabled:opacity-40';
  const panelArticleClassName = isLightTheme
    ? 'relative aspect-[16/10] w-full shrink-0 snap-center overflow-hidden rounded-[24px] border border-[#aacfdc] bg-[linear-gradient(180deg,rgba(249,253,255,0.98),rgba(237,247,251,0.96))]'
    : 'relative aspect-[16/10] w-full shrink-0 snap-center overflow-hidden rounded-[24px] border border-[#184a5d] bg-[linear-gradient(180deg,rgba(7,22,32,0.98),rgba(4,15,24,0.96))]';
  const panelGridOverlay = isLightTheme
    ? 'linear-gradient(90deg, rgba(63, 167, 196, 0.06) 1px, transparent 1px), linear-gradient(180deg, rgba(63, 167, 196, 0.05) 1px, transparent 1px)'
    : 'linear-gradient(90deg, rgba(78, 216, 243, 0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(78, 216, 243, 0.07) 1px, transparent 1px)';
  const panelImageOverlayClassName = isLightTheme
    ? 'absolute inset-0 bg-[linear-gradient(180deg,rgba(245,250,253,0.04),rgba(211,229,237,0.16)_40%,rgba(44,93,111,0.34))]'
    : 'absolute inset-0 bg-[linear-gradient(180deg,rgba(2,9,14,0.08),rgba(2,9,14,0.28)_40%,rgba(2,9,14,0.55))]';
  const panelPlaceholderClassName = isLightTheme
    ? 'absolute inset-x-5 top-1/2 z-10 -translate-y-1/2 rounded-[28px] border border-dashed border-[#8fc4d4] bg-[rgba(247,252,255,0.8)] px-6 py-10 text-center shadow-[inset_0_0_36px_rgba(107,187,208,0.08)]'
    : 'absolute inset-x-5 top-1/2 z-10 -translate-y-1/2 rounded-[28px] border border-dashed border-[#2a677f] bg-[rgba(6,20,29,0.72)] px-6 py-10 text-center shadow-[inset_0_0_36px_rgba(48,189,223,0.08)]';
  const panelPlaceholderLabelClassName = isLightTheme
    ? 'font-mono text-[11px] tracking-[0.34em] text-[#338fa9] uppercase'
    : 'font-mono text-[11px] tracking-[0.34em] text-[#7cd4e7] uppercase';
  const panelPlaceholderHintClassName = isLightTheme
    ? 'mt-4 text-sm leading-7 text-[#698895]'
    : 'mt-4 text-sm leading-7 text-[#8db8c7]';
  const panelFooterClassName =
    'relative mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between';
  const panelFooterTagClassName = isLightTheme
    ? 'font-mono text-[10px] tracking-[0.32em] text-[#2f95af] uppercase'
    : 'font-mono text-[10px] tracking-[0.32em] text-[#6fd7eb] uppercase';
  const panelFooterDescriptionClassName = isLightTheme
    ? 'mt-1 max-w-2xl text-sm leading-7 text-[#5f7f8e]'
    : 'mt-1 max-w-2xl text-sm leading-7 text-[#9cc6d4]';
  const dotActiveClassName = isLightTheme
    ? 'w-10 bg-[#1ea3c1] shadow-[0_0_14px_rgba(30,163,193,0.28)]'
    : 'w-10 bg-[#79f0ff] shadow-[0_0_14px_rgba(121,240,255,0.55)]';
  const dotIdleClassName = isLightTheme ? 'w-2.5 bg-[#a9cbd6]' : 'w-2.5 bg-[#2a5c6e]';

  return (
    <>
      {expandedPanel?.imageSrc ? (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={panelTransition}
          className={expandedOverlayClassName}
          onClick={closeExpandedPanel}
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={panelTransition}
            className={expandedPanelClassName}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type='button'
              aria-label='Close preview'
              onClick={closeExpandedPanel}
              className={expandedCloseClassName}
            >
              <X size={18} />
            </button>

            <div className={expandedFrameClassName}>
              <img
                src={expandedPanel.imageSrc}
                alt={expandedPanel.imageAlt ?? expandedPanel.title}
                className='max-h-[calc(100vh-12rem)] w-full rounded-2xl object-contain'
              />
            </div>

            <div className='pr-12'>
              <p className={expandedTagClassName}>
                {expandedPanel.tag}
              </p>
              <h4 className={expandedTitleClassName}>
                {expandedPanel.title}
              </h4>
              <p className={expandedDescriptionClassName}>
                {expandedPanel.description}
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}

      <div className={carouselShellClassName}>
        <div
          className='pointer-events-none absolute inset-0 rounded-[30px] opacity-55'
          style={{
            backgroundImage: carouselGridOverlay,
          }}
        />

        <div className={carouselHeaderClassName}>
          <div>
            <p className={carouselLabelClassName}>
              {labels.panelLabel} {String(activePanelIndex + 1).padStart(2, '0')}
            </p>
            <h3 className={carouselTitleClassName}>
              {activePanel.title}
            </h3>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              aria-label={labels.previousPanel}
              disabled={activePanelIndex === 0}
              onClick={() => goToPanel(activePanelIndex - 1)}
              className={carouselNavButtonClassName}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type='button'
              aria-label={labels.nextPanel}
              disabled={activePanelIndex === panels.length - 1}
              onClick={() => goToPanel(activePanelIndex + 1)}
              className={carouselNavButtonClassName}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className='landing-media-track relative mt-4 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-3xl'
        >
          {panels.map((panel, panelIndex) => (
            <article
              key={panel.id}
              className={panelArticleClassName}
            >
              <div
                className='pointer-events-none absolute inset-0 opacity-56'
                style={{
                  backgroundImage: panelGridOverlay,
                  backgroundSize: 'clamp(42px, 7vw, 80px) clamp(42px, 7vw, 80px)',
                }}
              />

              {panel.imageSrc ? (
                <button
                  type='button'
                  onClick={() => openExpandedPanel(panelIndex)}
                  className='group absolute inset-0 cursor-zoom-in overflow-hidden rounded-3xl text-left'
                >
                  <img
                    src={panel.imageSrc}
                    alt={panel.imageAlt ?? panel.title}
                    className='h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]'
                  />
                  <div className={panelImageOverlayClassName} />
                </button>
              ) : (
                <div className={panelPlaceholderClassName}>
                  <p className={panelPlaceholderLabelClassName}>
                    {panel.frameLabel}
                  </p>
                  <p className={panelPlaceholderHintClassName}>
                    {panel.frameHint}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>

        <motion.div
          key={activePanel.id}
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={panelTransition}
          className={panelFooterClassName}
        >
          <div className='max-w-xl'>
            <p className={panelFooterTagClassName}>
              {activePanel.tag}
            </p>
            <p className={panelFooterDescriptionClassName}>
              {activePanel.description}
            </p>
          </div>

          <div className='flex self-center gap-2'>
            {panels.map((panel, panelIndex) => {
              const isActive = panelIndex === activePanelIndex;

              return (
                <button
                  key={panel.id}
                  type='button'
                  aria-label={`${labels.goToPanel} ${panelIndex + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => goToPanel(panelIndex)}
                  className={`h-2.5 cursor-pointer rounded-full transition-all ${isActive ? dotActiveClassName : dotIdleClassName}`}
                />
              );
            })}
          </div>
        </motion.div>
      </div>
    </>
  );
}

// Finale slide presentation
function LandingFinaleShowcase({
  slide,
  credits,
  isLightTheme,
}: {
  slide: LandingFinaleSlide;
  credits: LandingContent['credits'];
  isLightTheme: boolean;
}) {
  const finaleShellClassName = isLightTheme
    ? 'relative z-10 flex max-h-full w-full flex-col overflow-y-auto rounded-[34px] border border-[#8cbecd]/84 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(236,246,251,0.94))] p-5 shadow-[0_0_0_1px_rgba(151,194,209,0.18),0_30px_96px_rgba(89,130,151,0.16)] backdrop-blur-xl sm:p-7 lg:overflow-visible lg:p-10'
    : 'relative z-10 flex max-h-full w-full flex-col overflow-y-auto rounded-[34px] border border-[#1f5d73]/82 bg-[linear-gradient(180deg,rgba(7,19,28,0.84),rgba(4,13,22,0.96))] p-5 shadow-[0_0_0_1px_rgba(36,149,183,0.1),0_30px_96px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-7 lg:overflow-visible lg:p-10';
  const finaleGridOverlay = isLightTheme
    ? 'linear-gradient(180deg, rgba(120, 207, 226, 0.05) 0%, transparent 16%, transparent 84%, rgba(120, 207, 226, 0.04) 100%), repeating-linear-gradient(180deg, rgba(104, 184, 202, 0.06) 0 1px, transparent 1px 4px)'
    : 'linear-gradient(180deg, rgba(138, 245, 255, 0.05) 0%, transparent 16%, transparent 84%, rgba(138, 245, 255, 0.04) 100%), repeating-linear-gradient(180deg, rgba(105, 229, 255, 0.06) 0 1px, transparent 1px 4px)';
  const finaleGlowClassName = isLightTheme
    ? 'pointer-events-none absolute inset-x-[14%] top-8 h-28 rounded-full bg-[radial-gradient(circle,rgba(74,191,219,0.16),transparent_68%)] blur-3xl'
    : 'pointer-events-none absolute inset-x-[14%] top-8 h-28 rounded-full bg-[radial-gradient(circle,rgba(80,229,255,0.16),transparent_68%)] blur-3xl';
  const finaleEyebrowClassName = isLightTheme
    ? 'font-mono text-[11px] tracking-[0.36em] text-[#278ca6] uppercase'
    : 'font-mono text-[11px] tracking-[0.36em] text-[#7fe5f8] uppercase';
  const finaleTitleClassName = isLightTheme
    ? 'mt-3 text-2xl font-bold text-[#173d4f] sm:text-3xl'
    : 'mt-3 text-2xl font-bold text-[#effcff] sm:text-3xl';
  const finaleDescriptionClassName = isLightTheme
    ? 'mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#5e7d8c] sm:text-base sm:leading-8'
    : 'mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#97c0cf] sm:text-base sm:leading-8';
  const finaleSectionLabelClassName = isLightTheme
    ? 'text-center font-mono text-[10px] tracking-[0.32em] text-[#26849f] uppercase'
    : 'text-center font-mono text-[10px] tracking-[0.32em] text-[#7fe2f4] uppercase';
  const contributorCardClassName = isLightTheme
    ? 'rounded-[26px] border border-[#9bc6d4] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,248,251,0.94))] p-5 text-center shadow-[inset_0_0_0_1px_rgba(137,188,204,0.1)]'
    : 'rounded-[26px] border border-[#1b5368] bg-[linear-gradient(180deg,rgba(8,24,35,0.8),rgba(5,16,24,0.94))] p-5 text-center shadow-[inset_0_0_0_1px_rgba(62,210,236,0.04)]';
  const contributorInitialsClassName = isLightTheme
    ? 'mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#90c0cf] bg-[rgba(237,247,252,0.96)] font-mono text-sm font-bold tracking-[0.22em] text-[#1d4c5f]'
    : 'mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#2d6f87] bg-[rgba(12,36,48,0.9)] font-mono text-sm font-bold tracking-[0.22em] text-[#effcff]';
  const contributorNameClassName = isLightTheme
    ? 'mt-4 text-sm font-semibold text-[#173d4f]'
    : 'mt-4 text-sm font-semibold text-[#effcff]';
  const contributorLinkClassName = isLightTheme
    ? 'mt-3 inline-flex rounded-full border border-[#86c0d0] bg-[rgba(245,251,254,0.96)] px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-[#2d9ab4] uppercase transition-colors hover:border-[#44b9d1] hover:text-[#173d4f]'
    : 'mt-3 inline-flex rounded-full border border-[#2a667c] bg-[rgba(8,24,35,0.86)] px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-[#9cefff] uppercase transition-colors hover:border-[#7eeeff] hover:text-[#effcff]';
  const contributorLinkStaticClassName = isLightTheme
    ? 'mt-3 inline-flex rounded-full border border-[#86c0d0] bg-[rgba(245,251,254,0.96)] px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-[#2d9ab4] uppercase'
    : 'mt-3 inline-flex rounded-full border border-[#2a667c] bg-[rgba(8,24,35,0.86)] px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-[#9cefff] uppercase';
  const supportCardClassName = isLightTheme
    ? 'mx-auto w-full max-w-4xl rounded-[30px] border border-[#91c2d0] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(238,247,251,0.95))] p-5 shadow-[inset_0_0_0_1px_rgba(130,191,208,0.12)] sm:p-6'
    : 'mx-auto w-full max-w-4xl rounded-[30px] border border-[#215b6f] bg-[linear-gradient(180deg,rgba(9,25,36,0.88),rgba(5,15,24,0.98))] p-5 shadow-[inset_0_0_0_1px_rgba(61,208,234,0.05)] sm:p-6';
  const supportLabelClassName = isLightTheme
    ? 'font-mono text-[10px] tracking-[0.32em] text-[#278aa3] uppercase'
    : 'font-mono text-[10px] tracking-[0.32em] text-[#7fe5f8] uppercase';
  const supportTitleClassName = isLightTheme
    ? 'mt-3 text-xl font-bold text-[#173d4f] sm:text-2xl'
    : 'mt-3 text-xl font-bold text-[#effcff] sm:text-2xl';
  const supportDescriptionClassName = isLightTheme
    ? 'mt-3 max-w-2xl text-sm leading-7 text-[#5c7b89]'
    : 'mt-3 max-w-2xl text-sm leading-7 text-[#94bfcd]';
  const qrOuterClassName = isLightTheme
    ? 'mx-auto flex h-34 w-34 shrink-0 items-center justify-center rounded-[28px] border border-[#8abecd] bg-[rgba(247,252,254,0.96)] shadow-[0_0_24px_rgba(91,167,190,0.14)] sm:mx-0'
    : 'mx-auto flex h-34 w-34 shrink-0 items-center justify-center rounded-[28px] border border-[#2a667c] bg-[rgba(8,24,35,0.92)] shadow-[0_0_24px_rgba(56,203,229,0.12)] sm:mx-0';
  const qrInnerClassName = isLightTheme
    ? 'flex h-[118px] w-[118px] items-center justify-center rounded-[20px] border border-dashed border-[#3db4cf] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,246,250,0.98))] px-4 text-center'
    : 'flex h-[118px] w-[118px] items-center justify-center rounded-[20px] border border-dashed border-[#4ddff6] bg-[linear-gradient(180deg,rgba(10,32,45,0.96),rgba(6,20,29,0.96))] px-4 text-center';
  const qrTextClassName = isLightTheme
    ? 'font-mono text-[11px] font-bold tracking-[0.24em] text-[#23667c] uppercase'
    : 'font-mono text-[11px] font-bold tracking-[0.24em] text-[#eaffff] uppercase';

  return (
    <div className='mx-auto flex h-full max-w-280 items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 xl:px-16'>
      <div className={finaleShellClassName}>
        <div
          className='pointer-events-none absolute inset-0 rounded-[34px] opacity-52'
          style={{
            backgroundImage: finaleGridOverlay,
          }}
        />
        <div className={finaleGlowClassName} />

        <div className='relative flex flex-col gap-6 sm:gap-8 lg:gap-10'>
          <div className='mx-auto max-w-3xl text-center'>
            <p className={finaleEyebrowClassName}>
              {slide.eyebrow}
            </p>
            <p className={finaleTitleClassName}>{slide.title}</p>
            <p className={finaleDescriptionClassName}>
              {slide.description}
            </p>
          </div>

          <div>
            <p className={finaleSectionLabelClassName}>
              {credits.label}
            </p>
            <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {credits.contributors.map((contributor) => (
                <div
                  key={contributor.name}
                  className={contributorCardClassName}
                >
                  <div className={contributorInitialsClassName}>
                    {contributor.initials}
                  </div>
                  <p className={contributorNameClassName}>
                    {contributor.name}
                  </p>
                  {contributor.githubUrl ? (
                    <a
                      href={contributor.githubUrl}
                      target='_blank'
                      rel='noreferrer'
                      className={contributorLinkClassName}
                    >
                      {contributor.githubLabel}
                    </a>
                  ) : (
                    <span className={contributorLinkStaticClassName}>
                      {contributor.githubLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={supportCardClassName}>
            <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8'>
              <div className='min-w-0 flex-1 text-left'>
                <p className={supportLabelClassName}>
                  {credits.support.label}
                </p>
                <p className={supportTitleClassName}>
                  {credits.support.title}
                </p>
                <p className={supportDescriptionClassName}>
                  {credits.support.description}
                </p>
              </div>

              <div className={qrOuterClassName}>
                <div className={qrInnerClassName}>
                  <span className={qrTextClassName}>
                    {credits.support.qrLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Landing page shell and section renderer
export function LandingPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { settings, setLanguage, setTheme } = useSettings();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isLightTheme = settings.theme === 'light';
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const railLabelTimeoutRef = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  const pendingRailIndexRef = useRef<number | null>(null);
  const pendingRailSettleTimeoutRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bubbleRailIndex, setBubbleRailIndex] = useState(0);
  const [pendingRailIndex, setPendingRailIndex] = useState<number | null>(null);
  const [revealedRailIndex, setRevealedRailIndex] = useState<number | null>(
    null,
  );

  const landing = t('landing', {
    returnObjects: true,
    gameName: GAME_BRAND_NAME,
  }) as unknown as LandingContent;
  const slides = landing.slides;
  const sectionBackdrops = isLightTheme ? lightSectionBackdrops : darkSectionBackdrops;
  const pageClassName = isLightTheme
    ? 'relative h-[100svh] overflow-hidden bg-[#eef5f8] text-[#163747]'
    : 'relative h-[100svh] overflow-hidden bg-[#020814] text-[#e4faff]';
  const pageOverlayMain = isLightTheme
    ? 'radial-gradient(circle at top, rgba(67, 191, 220, 0.14), transparent 34%), linear-gradient(180deg, rgba(247, 252, 255, 0.96) 0%, rgba(234, 245, 250, 0.98) 48%, rgba(225, 239, 246, 1) 100%)'
    : 'radial-gradient(circle at top, rgba(73, 231, 255, 0.14), transparent 34%), linear-gradient(180deg, rgba(1, 8, 15, 0.9) 0%, rgba(2, 7, 14, 0.96) 48%, #02060d 100%)';
  const pageOverlayGrid = isLightTheme
    ? 'linear-gradient(90deg, rgba(65, 153, 181, 0.06) 1px, transparent 1px), linear-gradient(180deg, rgba(65, 153, 181, 0.05) 1px, transparent 1px)'
    : 'linear-gradient(90deg, rgba(74, 217, 255, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(74, 217, 255, 0.04) 1px, transparent 1px)';
  const pageOverlayScan = isLightTheme
    ? 'linear-gradient(180deg, rgba(104, 193, 214, 0.05) 0%, transparent 14%, transparent 86%, rgba(104, 193, 214, 0.04) 100%), repeating-linear-gradient(180deg, rgba(89, 175, 196, 0.05) 0 1px, transparent 1px 4px)'
    : 'linear-gradient(180deg, rgba(153, 242, 255, 0.05) 0%, transparent 14%, transparent 86%, rgba(153, 242, 255, 0.04) 100%), repeating-linear-gradient(180deg, rgba(116, 230, 255, 0.05) 0 1px, transparent 1px 4px)';
  const railPanelClassName = isLightTheme
    ? 'pointer-events-auto rounded-[30px] border border-[#9ac6d3]/84 bg-[rgba(251,254,255,0.84)] px-3 py-4 shadow-[0_24px_60px_rgba(88,129,149,0.16)] backdrop-blur-xl sm:px-3.5'
    : 'pointer-events-auto rounded-[30px] border border-[#1a5166]/84 bg-[rgba(4,15,23,0.82)] px-3 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:px-3.5';
  const railSubLabelClassName = isLightTheme
    ? 'whitespace-nowrap rounded-full border border-[#9fc9d6] bg-[rgba(255,255,255,0.95)] px-4 py-2 font-mono text-[10px] tracking-[0.26em] text-[#28566c] uppercase shadow-[0_0_18px_rgba(103,180,199,0.12)]'
    : 'whitespace-nowrap rounded-full border border-[#23586d] bg-[rgba(5,18,27,0.94)] px-4 py-2 font-mono text-[10px] tracking-[0.26em] text-[#eafcff] uppercase shadow-[0_0_18px_rgba(76,223,248,0.18)]';
  const railSegmentActiveClassName = isLightTheme
    ? 'bg-[#29b5d4] shadow-[0_0_12px_rgba(41,181,212,0.32)]'
    : 'bg-[#58edff] shadow-[0_0_12px_rgba(88,237,255,0.65)]';
  const railSegmentIdleClassName = isLightTheme ? 'bg-[#b4ccd5]' : 'bg-[#173f4f]';
  const railBubbleActiveClassName = isLightTheme
    ? 'border-[#1d9fbe] bg-[rgba(29,159,190,0.14)] text-[#173e51] shadow-[0_0_18px_rgba(29,159,190,0.22)]'
    : 'border-[#72f0ff] bg-[rgba(61,226,255,0.18)] text-[#f2fdff] shadow-[0_0_18px_rgba(114,240,255,0.36)]';
  const railBubbleIdleClassName = isLightTheme
    ? 'border-[#9fc6d3] bg-[rgba(246,251,253,0.9)] text-[#4d7485] group-hover:border-[#56ddee] group-hover:text-[#183d4e]'
    : 'border-[#1f586c] bg-[rgba(7,20,29,0.72)] text-[#77b9cb] group-hover:border-[#56ddee] group-hover:text-[#dff9ff]';
  const railControlsClassName = isLightTheme
    ? 'mt-5 border-t border-[#c0d8e1] pt-4'
    : 'mt-5 border-t border-[#1d4658] pt-4';
  const railPrimaryControlClassName = isLightTheme
    ? 'flex h-9 w-[88px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#3fb6d1] bg-[rgba(63,182,209,0.14)] px-0 font-mono text-[10px] font-bold tracking-[0.24em] text-[#173c4e] uppercase shadow-[0_0_18px_rgba(63,182,209,0.14)] transition-colors hover:border-[#5cc8df]'
    : 'flex h-9 w-[88px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#72f0ff] bg-[rgba(61,226,255,0.18)] px-0 font-mono text-[10px] font-bold tracking-[0.24em] text-[#f2fdff] uppercase shadow-[0_0_18px_rgba(114,240,255,0.28)] transition-colors hover:border-[#8cf3ff]';
  const railSecondaryControlClassName = isLightTheme
    ? 'flex h-9 w-[88px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#97c5d3] bg-[rgba(246,251,253,0.9)] px-0 font-mono text-[10px] font-bold tracking-[0.18em] text-[#214a60] uppercase transition-colors hover:border-[#56ddee]'
    : 'flex h-9 w-[88px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#1f586c] bg-[rgba(7,20,29,0.72)] px-0 font-mono text-[10px] font-bold tracking-[0.18em] text-[#dff9ff] uppercase transition-colors hover:border-[#56ddee]';
  const slideEyebrowClassName = isLightTheme
    ? 'font-mono text-[11px] tracking-[0.36em] text-[#278ca6] uppercase'
    : 'font-mono text-[11px] tracking-[0.36em] text-[#7fe5f8] uppercase';
  const slideTitleClassName = isLightTheme
    ? 'mt-4 max-w-3xl text-3xl leading-[1.3] font-black tracking-[0.06em] text-[#173d4f] uppercase sm:text-[42px]'
    : 'mt-4 max-w-3xl text-3xl leading-[1.3] font-black tracking-[0.06em] text-[#f2fdff] uppercase sm:text-[42px]';
  const slideDescriptionClassName = isLightTheme
    ? 'mt-5 max-w-xl text-sm leading-7 text-[#5f7d8c] sm:text-base sm:leading-8'
    : 'mt-5 max-w-xl text-sm leading-7 text-[#95bccb] sm:text-base sm:leading-8';
  const slideHighlightClassName = isLightTheme
    ? 'rounded-full border border-[#a1cad8] bg-[rgba(255,255,255,0.74)] px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-[#2d5b70] uppercase'
    : 'rounded-full border border-[#23576c] bg-[rgba(7,21,30,0.72)] px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-[#dffaff] uppercase';
  const slideHintClassName = isLightTheme
    ? 'font-mono text-[10px] tracking-[0.3em] text-[#608da1] uppercase'
    : 'font-mono text-[10px] tracking-[0.3em] text-[#72bdd1] uppercase';
  const slideGlowClassName = isLightTheme
    ? 'absolute inset-10 rounded-full bg-[radial-gradient(circle,rgba(69,192,220,0.12),transparent_64%)] blur-3xl'
    : 'absolute inset-10 rounded-full bg-[radial-gradient(circle,rgba(60,221,255,0.14),transparent_64%)] blur-3xl';
  const slideNumberClassName = isLightTheme
    ? 'absolute right-10 top-8 font-mono text-[72px] font-bold tracking-[0.18em] text-[#d1e4eb] sm:right-16 sm:text-[120px] xl:text-[180px]'
    : 'absolute right-10 top-8 font-mono text-[72px] font-bold tracking-[0.18em] text-[#102734] sm:right-16 sm:text-[120px] xl:text-[180px]';

  const revealRailLabel = useCallback((index: number) => {
    setBubbleRailIndex(index);
    setRevealedRailIndex(index);

    if (railLabelTimeoutRef.current !== null) {
      window.clearTimeout(railLabelTimeoutRef.current);
    }

    railLabelTimeoutRef.current = window.setTimeout(() => {
      setRevealedRailIndex((current) => (current === index ? null : current));
      railLabelTimeoutRef.current = null;
    }, 2600);
  }, []);

  const setActiveRailIndex = useCallback((nextIndex: number) => {
    if (activeIndexRef.current === nextIndex) {
      return;
    }

    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    revealRailLabel(nextIndex);
  }, [revealRailLabel]);

  useEffect(() => {
    const scrollRoot = scrollContainerRef.current;
    const sections = sectionRefs.current.filter(
      (section): section is HTMLElement => section !== null,
    );

    if (!scrollRoot || sections.length === 0) {
      return;
    }

    const syncRailIndex = (forceUnlock = false) => {
      const nextIndex = getLeadingSectionIndex(scrollRoot, sections);
      if (nextIndex < 0) {
        return;
      }

      const pendingIndex = pendingRailIndexRef.current;
      if (pendingIndex === null) {
        setActiveRailIndex(nextIndex);
        return;
      }

      if (!forceUnlock && nextIndex !== pendingIndex) {
        return;
      }

      pendingRailIndexRef.current = null;
      setPendingRailIndex(null);
      setActiveRailIndex(nextIndex);
    };

    const observer = new IntersectionObserver(
      () => {
        syncRailIndex();
      },
      {
        root: scrollRoot,
        threshold: [0.35, 0.55, 0.72],
      },
    );

    const handleScroll = () => {
      if (pendingRailIndexRef.current === null) {
        return;
      }

      if (pendingRailSettleTimeoutRef.current !== null) {
        window.clearTimeout(pendingRailSettleTimeoutRef.current);
      }

      pendingRailSettleTimeoutRef.current = window.setTimeout(() => {
        pendingRailSettleTimeoutRef.current = null;
        syncRailIndex(true);
      }, scrollSettleDelayMs);
    };

    sections.forEach((section) => observer.observe(section));
    scrollRoot.addEventListener('scroll', handleScroll, { passive: true });
    syncRailIndex();

    return () => {
      scrollRoot.removeEventListener('scroll', handleScroll);
      if (pendingRailSettleTimeoutRef.current !== null) {
        window.clearTimeout(pendingRailSettleTimeoutRef.current);
        pendingRailSettleTimeoutRef.current = null;
      }
      observer.disconnect();
    };
  }, [setActiveRailIndex, slides.length]);

  const scrollToSection = (index: number) => {
    const section = sectionRefs.current[index];
    if (!section) {
      return;
    }

    section.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const carouselLabels = {
    ...landing.carousel,
    ...landing.aria,
  };

  const languageOptions: AppLanguage[] = ['en', 'vi'];
  const themeOptions: AppTheme[] = ['dark', 'light'];
  const displayedRailIndex = pendingRailIndex ?? activeIndex;
  const bubbleRailOffset = bubbleRailIndex * railNodeStep;

  useEffect(() => {
    return () => {
      if (railLabelTimeoutRef.current !== null) {
        window.clearTimeout(railLabelTimeoutRef.current);
      }

      if (pendingRailSettleTimeoutRef.current !== null) {
        window.clearTimeout(pendingRailSettleTimeoutRef.current);
      }
    };
  }, []);

  const lockRailToIndex = (index: number) => {
    if (pendingRailSettleTimeoutRef.current !== null) {
      window.clearTimeout(pendingRailSettleTimeoutRef.current);
      pendingRailSettleTimeoutRef.current = null;
    }

    pendingRailIndexRef.current = index;
    setPendingRailIndex(index);
  };

  const cycleLanguage = () => {
    const currentIndex = languageOptions.indexOf(settings.language);
    const nextLanguage =
      languageOptions[(currentIndex + 1) % languageOptions.length];
    setLanguage(nextLanguage);
  };

  const cycleTheme = () => {
    const currentIndex = themeOptions.indexOf(settings.theme);
    const nextTheme = themeOptions[(currentIndex + 1) % themeOptions.length];
    setTheme(nextTheme);
  };

  return (
    <main className={pageClassName}>
      <div
        className='pointer-events-none absolute inset-0'
        style={{
          backgroundImage: pageOverlayMain,
        }}
      />
      <div
        className='pointer-events-none absolute inset-0 opacity-42'
        style={{
          backgroundImage: pageOverlayGrid,
          backgroundSize: '74px 74px',
        }}
      />
      <div
        className='pointer-events-none absolute inset-0 opacity-34'
        style={{
          backgroundImage: pageOverlayScan,
        }}
      />

      {/* Rail navigation */}
      <nav
        aria-label={landing.railTitle}
        className='fixed right-2 top-1/2 z-40 -translate-y-1/2 sm:right-4'
      >
        <div className={railPanelClassName}>
          <div className='relative flex flex-col items-center gap-4'>
            {/* Rail sub label */}
            <motion.div
              initial={false}
              animate={{
                opacity: revealedRailIndex === null ? 0 : 1,
                x: prefersReducedMotion || revealedRailIndex !== null ? 0 : 10,
                y: bubbleRailOffset,
              }}
              transition={panelTransition}
              className='pointer-events-none absolute right-[73%] top-0 flex h-8 items-center'
            >
              <span className={railSubLabelClassName}>
                {slides[bubbleRailIndex]?.railLabel}
              </span>
            </motion.div>

            {/* Rail bubbles */}
            {slides.map((slide, index) => {
              const isActive = displayedRailIndex === index;
              const segmentIsActive = index < displayedRailIndex;

              return (
                <div
                  key={slide.id}
                  className='relative flex h-8 w-8 items-start justify-center'
                >
                  {index < slides.length - 1 ? (
                    <span
                      className={`pointer-events-none absolute left-1/2 top-full h-4 w-px -translate-x-1/2 ${segmentIsActive ? railSegmentActiveClassName : railSegmentIdleClassName}`}
                    />
                  ) : null}

                  <button
                    type='button'
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={`${landing.aria.jumpTo} ${slide.railLabel}`}
                    onClick={() => {
                      revealRailLabel(index);
                      if (index !== activeIndex) {
                        lockRailToIndex(index);
                      }
                      scrollToSection(index);
                    }}
                    className='group relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-transparent p-0 text-left'
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[10px] font-bold tracking-[0.2em] transition-colors ${isActive ? railBubbleActiveClassName : railBubbleIdleClassName}`}
                    >
                      {slide.number}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Rail controls */}
          <div className={railControlsClassName}>
            <div className='flex flex-col items-center gap-3'>
              <button
                type='button'
                aria-label={t('settings.language')}
                onClick={cycleLanguage}
                className={railPrimaryControlClassName}
                style={{ width: `${railControlWidth}px` }}
              >
                {settings.language}
              </button>

              <button
                type='button'
                aria-label={t('settings.theme')}
                onClick={cycleTheme}
                className={railSecondaryControlClassName}
                style={{ width: `${railControlWidth}px` }}
              >
                {t(`settings.${settings.theme}`)}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Slides */}
      <div
        ref={scrollContainerRef}
        className='landing-scroll relative h-svh snap-y snap-mandatory overflow-y-auto overflow-x-hidden'
      >
        {slides.map((slide, index) => {
          return (
            <section
              key={slide.id}
              ref={(node) => {
                sectionRefs.current[index] = node;
              }}
              data-slide-index={index}
              className='relative h-svh snap-start overflow-hidden'
              style={{ backgroundImage: sectionBackdrops[index] }}
            >
              <div className={slideNumberClassName}>
                {slide.number}
              </div>
              {slide.layout === 'finale' ? (
                <LandingFinaleShowcase
                  slide={slide}
                  credits={landing.credits}
                  isLightTheme={isLightTheme}
                />
              ) : (
                <div className='mx-auto grid h-full max-w-370 grid-rows-[auto_minmax(0,1fr)] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)] lg:grid-rows-1 lg:items-center lg:gap-12 lg:px-12 xl:px-16'>
                  <div className='relative z-10 flex max-w-2xl flex-col justify-center self-center'>
                    <p className={slideEyebrowClassName}>
                      {slide.eyebrow}
                    </p>
                    <h1 className={slideTitleClassName}>
                      {slide.title}
                    </h1>
                    <p className={slideDescriptionClassName}>
                      {slide.description}
                    </p>

                    <div className='mt-6 flex max-w-xl flex-wrap gap-2.5'>
                      {slide.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className={slideHighlightClassName}
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>

                    {slide.ctaLabel ? (
                      <div className='mt-8 flex flex-col items-start gap-4'>
                        <ActionButton
                          label={slide.ctaLabel}
                          onClick={() => navigate('/home')}
                          isLightTheme={isLightTheme}
                        />
                        {slide.ctaHint ? (
                          <p className={slideHintClassName}>
                            {slide.ctaHint}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className='relative z-10 flex min-h-0 items-center justify-center self-center'>
                    <div className={slideGlowClassName} />
                    <LandingMediaCarousel
                      panels={slide.panels}
                      labels={carouselLabels}
                      reducedMotion={prefersReducedMotion}
                      isLightTheme={isLightTheme}
                    />
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
