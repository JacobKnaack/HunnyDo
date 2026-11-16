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

// SVGs sharing a data-sync value run on one clock: they all restart from 0 together when any of
// them scrolls into view, and all pause together once none is on screen. Without this each SVG
// would resume from wherever it was frozen, so a stack of them drifts out of step.
const groups = new Map<string, { members: SVGSVGElement[]; playing: boolean }>();
for (const svg of svgs) {
  const key = svg.dataset.sync;
  if (!key) continue;
  const group = groups.get(key) ?? { members: [], playing: false };
  group.members.push(svg);
  groups.set(key, group);
}

function applyGroup(group: { members: SVGSVGElement[]; playing: boolean }) {
  if (reduceQuery.matches) {
    group.playing = false;
    group.members.forEach(apply);
    return;
  }
  const anyVisible = group.members.some((svg) => visible.has(svg));
  try {
    if (anyVisible && !group.playing) {
      group.members.forEach((svg) => {
        if (typeof svg.pauseAnimations !== 'function') return;
        svg.setCurrentTime(0);
        svg.unpauseAnimations();
      });
      group.playing = true;
    } else if (!anyVisible && group.playing) {
      group.members.forEach((svg) => svg.pauseAnimations?.());
      group.playing = false;
    }
  } catch {
    /* animation timeline not ready yet; the next observer tick retries */
  }
}

function update(svg: SVGSVGElement) {
  const group = svg.dataset.sync ? groups.get(svg.dataset.sync) : undefined;
  if (group) applyGroup(group);
  else apply(svg);
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const svg = entry.target as SVGSVGElement;
      if (entry.isIntersecting) visible.add(svg);
      else visible.delete(svg);
      update(svg);
    }
  },
  { rootMargin: '120px 0px' },
);

svgs.forEach((svg) => observer.observe(svg));
reduceQuery.addEventListener('change', () => svgs.forEach(update));
