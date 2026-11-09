// Drives the SMIL illustrations on the home page (src/components/art/*Art.astro).
//
// SMIL can't be switched off from CSS, so this does it from script:
//  - prefers-reduced-motion: pause every SVG on its own "still" frame (data-still, seconds).
//  - otherwise: play an SVG only while it is on screen, so nine looping animations
//    aren't all running at once.

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const svgs = Array.from(document.querySelectorAll<SVGSVGElement>('svg[data-art]'));
const visible = new WeakSet<SVGSVGElement>();

function apply(svg: SVGSVGElement) {
  if (typeof svg.pauseAnimations !== 'function') return;
  try {
    if (reduceQuery.matches) {
      svg.pauseAnimations();
      svg.setCurrentTime(Number(svg.dataset.still) || 0);
    } else if (visible.has(svg)) {
      svg.unpauseAnimations();
    } else {
      svg.pauseAnimations();
    }
  } catch {
    /* animation timeline not ready yet; the next observer tick retries */
  }
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const svg = entry.target as SVGSVGElement;
      if (entry.isIntersecting) visible.add(svg);
      else visible.delete(svg);
      apply(svg);
    }
  },
  { rootMargin: '120px 0px' },
);

svgs.forEach((svg) => observer.observe(svg));
reduceQuery.addEventListener('change', () => svgs.forEach(apply));
