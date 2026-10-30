import { useEffect, useState } from 'preact/hooks';

// Only large custom files need this extra deferral. Native images keep their
// existing lifecycle. Loaded images remain cached when the card moves away.
export const useArtworkVisibility = (nodes: Map<string, HTMLElement>, key: string, enabled: boolean) => {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!enabled) { setNear(false); return; }
    const node = nodes.get(key);
    if (!node || typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [nodes, key, enabled]);
  return !enabled || near;
};
