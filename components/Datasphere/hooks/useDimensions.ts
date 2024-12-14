import { useState, useEffect, RefObject } from 'react';
import { CONFIG } from '../constants/config';

export function useDimensions(containerRef: RefObject<HTMLDivElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Get the actual available space
        const availableWidth = containerRef.current.clientWidth;
        const availableHeight = window.innerHeight - CONFIG.visualization.headerHeight - CONFIG.visualization.controlsHeight;

        // Ensure minimum dimensions while maintaining aspect ratio
        const aspectRatio = CONFIG.visualization.minWidth / CONFIG.visualization.minHeight;
        const containerAspectRatio = availableWidth / availableHeight;

        let width, height;
        if (containerAspectRatio > aspectRatio) {
          // Container is wider than needed, constrain by height
          height = Math.max(availableHeight, CONFIG.visualization.minHeight);
          width = height * aspectRatio;
        } else {
          // Container is taller than needed, constrain by width
          width = Math.max(availableWidth, CONFIG.visualization.minWidth);
          height = width / aspectRatio;
        }

        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  return dimensions;
}