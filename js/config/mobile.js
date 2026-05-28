/** Reliable mobile / touch-primary detection for lightweight 3D mode */
export function detectMobile() {
  return window.matchMedia(
    "(max-width: 768px), (hover: none) and (pointer: coarse)"
  ).matches;
}

export function applyMobileClass(isMobile) {
  document.documentElement.classList.toggle("is-mobile", isMobile);
}
