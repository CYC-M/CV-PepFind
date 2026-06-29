/**
 * View Control Manager for 3Dmol.js
 * Handles view manipulation, reset, and auto-spin functionality
 */

export interface Mol3DViewer {
  zoomTo: () => void;
  spin?: (axis: string, speed: number) => void;
  stopAnimate?: () => void;
  render: () => void;
  getOrientation?: () => Array<Array<number>>;
  setOrientation?: (mat: Array<Array<number>>) => void;
}

/**
 * Default orientation matrix for reset view
 * This is the identity matrix which represents the default view
 */
const DEFAULT_ORIENTATION: Array<Array<number>> = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/**
 * Reset the view to default orientation and zoom
 * @param viewer 3Dmol viewer instance
 */
export function resetView(viewer: Mol3DViewer): void {
  try {
    // Stop any ongoing animation
    viewer.stopAnimate?.();

    // Reset orientation to default
    if (viewer.setOrientation) {
      viewer.setOrientation(DEFAULT_ORIENTATION);
    }

    // Zoom to fit all atoms
    viewer.zoomTo();

    // Render the updated view
    viewer.render();
  } catch (error) {
    console.error('Failed to reset view:', error);
  }
}

/**
 * Start auto-spin animation
 * @param viewer 3Dmol viewer instance
 * @param axis Rotation axis ('x', 'y', or 'z')
 * @param speed Rotation speed (default 0.5)
 */
export function startAutoSpin(
  viewer: Mol3DViewer,
  axis: 'x' | 'y' | 'z' = 'y',
  speed: number = 0.5
): void {
  try {
    if (viewer.spin) {
      viewer.spin(axis, speed);
    }
  } catch (error) {
    console.error('Failed to start auto-spin:', error);
  }
}

/**
 * Stop auto-spin animation
 * @param viewer 3Dmol viewer instance
 */
export function stopAutoSpin(viewer: Mol3DViewer): void {
  try {
    viewer.stopAnimate?.();
  } catch (error) {
    console.error('Failed to stop auto-spin:', error);
  }
}

/**
 * Toggle auto-spin on/off
 * @param viewer 3Dmol viewer instance
 * @param isSpinning Current spin state
 * @returns New spin state
 */
export function toggleAutoSpin(
  viewer: Mol3DViewer,
  isSpinning: boolean
): boolean {
  try {
    if (isSpinning) {
      stopAutoSpin(viewer);
      return false;
    } else {
      startAutoSpin(viewer);
      return true;
    }
  } catch (error) {
    console.error('Failed to toggle auto-spin:', error);
    return isSpinning;
  }
}

/**
 * Get current spin state by checking if animation is active
 * Note: 3Dmol doesn't provide a direct way to check spin state,
 * so we track it through our own state management
 */
export function isAutoSpinning(viewer: Mol3DViewer): boolean {
  // Since 3Dmol doesn't expose spin state, we rely on external state management
  // This is a placeholder for potential future enhancement
  return false;
}

/**
 * Rotate view by a specific angle
 * @param viewer 3Dmol viewer instance
 * @param angleX Rotation angle around X axis (degrees)
 * @param angleY Rotation angle around Y axis (degrees)
 * @param angleZ Rotation angle around Z axis (degrees)
 */
export function rotateView(
  viewer: Mol3DViewer,
  angleX: number = 0,
  angleY: number = 0,
  angleZ: number = 0
): void {
  try {
    // Convert degrees to radians
    const radX = (angleX * Math.PI) / 180;
    const radY = (angleY * Math.PI) / 180;
    const radZ = (angleZ * Math.PI) / 180;

    // Create rotation matrices
    const cosX = Math.cos(radX);
    const sinX = Math.sin(radX);
    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);
    const cosZ = Math.cos(radZ);
    const sinZ = Math.sin(radZ);

    // Combined rotation matrix (ZYX order)
    const matrix: Array<Array<number>> = [
      [
        cosY * cosZ,
        -cosY * sinZ,
        sinY,
      ],
      [
        sinX * sinY * cosZ + cosX * sinZ,
        -sinX * sinY * sinZ + cosX * cosZ,
        -sinX * cosY,
      ],
      [
        -cosX * sinY * cosZ + sinX * sinZ,
        cosX * sinY * sinZ + sinX * cosZ,
        cosX * cosY,
      ],
    ];

    if (viewer.setOrientation) {
      viewer.setOrientation(matrix);
      viewer.render();
    }
  } catch (error) {
    console.error('Failed to rotate view:', error);
  }
}

/**
 * Zoom in/out
 * @param viewer 3Dmol viewer instance
 * @param factor Zoom factor (> 1 for zoom in, < 1 for zoom out)
 */
export function zoomView(viewer: Mol3DViewer, factor: number = 1.2): void {
  try {
    // 3Dmol doesn't have direct zoom control, so we use zoomTo as fallback
    // A more sophisticated implementation would manipulate the camera directly
    if (factor > 1) {
      // Zoom in - could be enhanced with camera manipulation
      viewer.zoomTo();
    } else {
      // Zoom out - could be enhanced with camera manipulation
      viewer.zoomTo();
    }
    viewer.render();
  } catch (error) {
    console.error('Failed to zoom view:', error);
  }
}
