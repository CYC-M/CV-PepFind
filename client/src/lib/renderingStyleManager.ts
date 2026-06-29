/**
 * Rendering Style Manager for 3Dmol.js
 * Handles style switching and application to molecular structures
 */

export type RenderingStyle = 'cartoon' | 'stick' | 'surface' | 'sphere' | 'line';

interface Mol3DViewer {
  setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void;
  render: () => void;
  clear?: () => void;
  removeAllModels?: () => void;
}

/**
 * Style definitions for different rendering modes
 * Each style can be applied to the entire molecule or specific selections
 */
const STYLE_DEFINITIONS: Record<RenderingStyle, Record<string, unknown>> = {
  // Cartoon mode: rainbow colored secondary structures
  cartoon: {
    cartoon: {
      color: 'spectrum',
      opacity: 0.9,
      thickness: 0.8,
    },
    stick: {
      radius: 0.15,
      colorscheme: 'greenCarbon',
      opacity: 0.3,
    },
  },

  // Stick mode: ball-and-stick representation
  stick: {
    stick: {
      radius: 0.2,
      colorscheme: 'greenCarbon',
    },
    sphere: {
      scale: 0.3,
      colorscheme: 'greenCarbon',
    },
  },

  // Surface mode: molecular surface
  surface: {
    cartoon: {
      color: 'spectrum',
      opacity: 0.2,
    },
    surface: {
      color: 'spectrum',
      opacity: 0.8,
      wireframe: false,
    },
  },

  // Sphere mode: space-filling model
  sphere: {
    sphere: {
      colorscheme: 'greenCarbon',
      scale: 1.0,
    },
  },

  // Line mode: lightweight wireframe
  line: {
    line: {
      colorscheme: 'greenCarbon',
      linewidth: 1.5,
    },
  },
};

/**
 * Apply a rendering style to the 3D viewer
 * @param viewer 3Dmol viewer instance
 * @param style Rendering style to apply
 */
export function applyRenderingStyle(
  viewer: Mol3DViewer,
  style: RenderingStyle
): void {
  try {
    const styleConfig = STYLE_DEFINITIONS[style];
    if (!styleConfig) {
      console.warn(`Unknown rendering style: ${style}`);
      return;
    }

    // Apply the style to all atoms
    viewer.setStyle({}, styleConfig);
    viewer.render();
  } catch (error) {
    console.error(`Failed to apply rendering style ${style}:`, error);
  }
}

/**
 * Combine multiple rendering styles for a more complex visualization
 * @param viewer 3Dmol viewer instance
 * @param styles Array of styles to combine
 */
export function applyMultipleStyles(
  viewer: Mol3DViewer,
  styles: RenderingStyle[]
): void {
  try {
    // Combine all style definitions
    const combinedStyle: Record<string, unknown> = {};

    styles.forEach((style) => {
      const styleConfig = STYLE_DEFINITIONS[style];
      if (styleConfig) {
        Object.assign(combinedStyle, styleConfig);
      }
    });

    viewer.setStyle({}, combinedStyle);
    viewer.render();
  } catch (error) {
    console.error('Failed to apply multiple styles:', error);
  }
}

/**
 * Get a readable description of a rendering style
 */
export function getStyleDescription(style: RenderingStyle): string {
  const descriptions: Record<RenderingStyle, string> = {
    cartoon: '彩虹色卡通模式，适合查看二级结构',
    stick: '球棍模式，显示原子和键',
    surface: '分子表面模式，显示分子轮廓',
    sphere: '球体模式，显示原子球',
    line: '线条模式，轻量级渲染',
  };
  return descriptions[style] || '未知渲染模式';
}

/**
 * Get all available rendering styles
 */
export function getAllRenderingStyles(): RenderingStyle[] {
  return ['cartoon', 'stick', 'surface', 'sphere', 'line'];
}
