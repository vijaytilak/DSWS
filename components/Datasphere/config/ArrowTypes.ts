export type ArrowType = 'unidirectional' | 'bidirectional' | 'curved' | 'animated';
export type MarkerType = 'arrow' | 'circle' | 'diamond' | 'square';

export interface Point {
  x: number;
  y: number;
}

export interface ArrowLabel {
  text: string;
  position: number; // 0-1 along the line
  offset?: number;
  fontSize?: number;
  color?: string;
}

export interface ArrowStyle {
  thickness: number;
  color: string;
  opacity?: number;
  dashArray?: string;
  animationDuration?: number;
}

export interface MarkerStyle {
  type: MarkerType;
  size: number;
  color: string;
  strokeWidth?: number;
}

export interface ArrowConfiguration {
  type: ArrowType;
  startPoint: Point;
  endPoint: Point;
  style: ArrowStyle;
  startMarker?: MarkerStyle;
  endMarker?: MarkerStyle;
  labels?: ArrowLabel[];
  interactive?: boolean;
  clickable?: boolean;
  hoverable?: boolean;
}

export interface ArrowTypeDefinition {
  id: ArrowType;
  name: string;
  description: string;
  supportsMarkers: boolean;
  supportsLabels: boolean;
  supportsAnimation: boolean;
  defaultStyle: Partial<ArrowStyle>;
}

export const ARROW_TYPE_DEFINITIONS: Record<ArrowType, ArrowTypeDefinition> = {
  unidirectional: {
    id: 'unidirectional',
    name: 'Unidirectional Arrow',
    description: 'Single arrow showing directional flow',
    supportsMarkers: true,
    supportsLabels: true,
    supportsAnimation: false,
    defaultStyle: {
      thickness: 2,
      opacity: 0.8
    }
  },
  bidirectional: {
    id: 'bidirectional',
    name: 'Bidirectional Arrow',
    description: 'Split arrow showing flow in both directions',
    supportsMarkers: true,
    supportsLabels: true,
    supportsAnimation: false,
    defaultStyle: {
      thickness: 2,
      opacity: 0.8
    }
  },
  curved: {
    id: 'curved',
    name: 'Curved Arrow',
    description: 'Curved arrow for avoiding overlaps',
    supportsMarkers: true,
    supportsLabels: true,
    supportsAnimation: false,
    defaultStyle: {
      thickness: 2,
      opacity: 0.8
    }
  },
  animated: {
    id: 'animated',
    name: 'Animated Arrow',
    description: 'Arrow with flow animation',
    supportsMarkers: true,
    supportsLabels: true,
    supportsAnimation: true,
    defaultStyle: {
      thickness: 2,
      opacity: 0.8,
      animationDuration: 2000
    }
  }
};

export const MARKER_TYPE_DEFINITIONS: Record<MarkerType, { viewBox: string; path: string }> = {
  arrow: {
    viewBox: '0 -5 10 10',
    path: 'M0,-5L10,0L0,5'
  },
  circle: {
    viewBox: '0 0 10 10',
    path: 'M5,5 m-4,0 a4,4 0 1,1 8,0 a4,4 0 1,1 -8,0'
  },
  diamond: {
    viewBox: '0 -5 10 10',
    path: 'M0,0L5,-5L10,0L5,5Z'
  },
  square: {
    viewBox: '0 -5 10 10',
    path: 'M2,-3L8,-3L8,3L2,3Z'
  }
};

/**
 * Get arrow type definition
 */
export function getArrowTypeDefinition(arrowType: ArrowType): ArrowTypeDefinition {
  const definition = ARROW_TYPE_DEFINITIONS[arrowType];
  if (!definition) {
    throw new Error(`Unknown arrow type: ${arrowType}`);
  }
  return definition;
}

/**
 * Get marker definition
 */
export function getMarkerDefinition(markerType: MarkerType): { viewBox: string; path: string } {
  const definition = MARKER_TYPE_DEFINITIONS[markerType];
  if (!definition) {
    throw new Error(`Unknown marker type: ${markerType}`);
  }
  return definition;
}

/**
 * Create default arrow configuration
 */
export function createDefaultArrowConfig(
  type: ArrowType,
  startPoint: Point,
  endPoint: Point,
  color: string,
  thickness: number = 2
): ArrowConfiguration {
  const definition = getArrowTypeDefinition(type);
  
  return {
    type,
    startPoint,
    endPoint,
    style: {
      thickness,
      color,
      opacity: definition.defaultStyle.opacity || 0.8,
      animationDuration: definition.defaultStyle.animationDuration
    },
    endMarker: {
      type: 'arrow',
      size: Math.max(3, thickness * 0.5),
      color
    },
    interactive: true,
    clickable: true,
    hoverable: true
  };
}

/**
 * Check if arrow type supports a specific feature
 */
export function supportsFeature(arrowType: ArrowType, feature: 'markers' | 'labels' | 'animation'): boolean {
  const definition = getArrowTypeDefinition(arrowType);
  switch (feature) {
    case 'markers':
      return definition.supportsMarkers;
    case 'labels':
      return definition.supportsLabels;
    case 'animation':
      return definition.supportsAnimation;
    default:
      return false;
  }
}
