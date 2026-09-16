const HEADER_OFFSET = 72;

export const scrollToSection = (id: string): void => {
  const element = document.getElementById(id);
  if (!element) return;

  const top = element.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });
};
