// BloomOS: a pinned scene with video time driven entirely by page scroll.
const hero = document.querySelector('#hero');
const stage = document.querySelector('.hero-stage');
const video = document.querySelector('#garden-video');
const plane = document.querySelector('#media-plane');
const copy = document.querySelector('.hero-copy');
const title = document.querySelector('#hero-title');
const status = document.querySelector('#bloom-status');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
let progress = 0, desiredTime = 0, drawing = 0, copyShift = 0;
let decoded = false, home = true;

video.pause();
video.loop = false;
video.muted = true;

function scrollRange() { return Math.max(1, hero.offsetHeight - stage.offsetHeight); }
function requestSeek() {
  if (!Number.isFinite(video.duration) || video.readyState < 2 || video.seeking || !home || document.hidden) return;
  if (Math.abs(video.currentTime - desiredTime) > 1 / 60) video.currentTime = desiredTime;
}
function renderScroll() {
  drawing = 0;
  home = document.body.dataset.route === 'home';
  if (!home) { video.pause(); return; }
  progress = clamp(-hero.getBoundingClientRect().top / scrollRange());
  const travel = smooth(0, .43, progress);
  copyShift = motion.matches ? 0 : -stage.clientHeight * .38 * travel;
  // Animate each layer independently so controls can stay above the foreground.
  // Individual translate preserves the headline's existing horizontal scale.
  for (const layer of copy.children) {
    layer.style.translate = `0 ${copyShift}px`;
    layer.style.opacity = String(1 - smooth(.035, .36, progress));
  }
  copy.inert = progress >= .36;
  hero.classList.toggle('has-scrolled', progress > .015);
  hero.classList.toggle('is-bloomed', progress >= .995);
  if (Number.isFinite(video.duration)) {
    // Avoid asking the decoder for a time beyond the final encoded frame.
    desiredTime = progress * Math.max(0, video.duration - 1 / 24);
    requestSeek();
  }
  video.style.opacity = decoded && progress > .001 ? '1' : '0';
  // The narrow-screen crop follows the camera as the computer moves to center.
  video.style.transform = innerWidth <= 700 ? `translate3d(${progress * 13}%,0,0)` : '';
  window.BloomScene?.render(decoded && progress > .001 ? video : firstFrame, progress);
  status.textContent = progress >= .995 ? 'The garden is in full bloom. Use the controls on the computer screen, or scroll back to return to the start.' : 'Scroll down to grow the garden. Scroll up to return to the start.';
}
function scheduleScroll() { if (!drawing) drawing = requestAnimationFrame(renderScroll); }
window.addEventListener('scroll', scheduleScroll, {passive: true});
video.addEventListener('loadeddata', () => {
  // Force one decoded seek before revealing the video; some decoders expose an
  // empty surface briefly at time zero even after loadeddata.
  video.currentTime = Math.max(.001, desiredTime);
  scheduleScroll();
});
video.addEventListener('loadedmetadata', scheduleScroll);
video.addEventListener('seeked', () => { decoded = true; scheduleScroll(); });
video.addEventListener('error', () => {
  video.style.opacity = '0';
  status.textContent = 'The video could not load. The still garden is available; reload to try again.';
});
document.addEventListener('visibilitychange', () => { video.pause(); if (!document.hidden) scheduleScroll(); });
new MutationObserver(scheduleScroll).observe(document.body, {attributes: true, attributeFilter: ['data-route']});

function scrollToProgress(value) {
  const top = window.scrollY + hero.getBoundingClientRect().top + value * scrollRange();
  window.scrollTo({top, behavior: motion.matches ? 'instant' : 'smooth'});
}
document.querySelector('#watch-demo').addEventListener('click', () => scrollToProgress(1));
document.querySelector('#replay').addEventListener('click', () => scrollToProgress(0));

const firstFrame = document.querySelector('.start-frame');
window.addEventListener('resize', scheduleScroll);
motion.addEventListener('change', scheduleScroll);
renderScroll();
