/** Smooth-scroll to a profile subsection after navigating to the tab. */
export function scrollToProfileAnchor(id: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}
