import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resetView,
  startAutoSpin,
  stopAutoSpin,
  toggleAutoSpin,
  rotateView,
  zoomView,
  type Mol3DViewer,
} from './viewControlManager';

describe('viewControlManager', () => {
  let mockViewer: Mol3DViewer;

  beforeEach(() => {
    mockViewer = {
      zoomTo: vi.fn(),
      spin: vi.fn(),
      stopAnimate: vi.fn(),
      render: vi.fn(),
      getOrientation: vi.fn(() => [[1, 0, 0], [0, 1, 0], [0, 0, 1]]),
      setOrientation: vi.fn(),
    };
  });

  describe('resetView', () => {
    it('should stop animation, reset orientation, and zoom', () => {
      resetView(mockViewer);

      expect(mockViewer.stopAnimate).toHaveBeenCalled();
      expect(mockViewer.setOrientation).toHaveBeenCalledWith([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]);
      expect(mockViewer.zoomTo).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should handle missing setOrientation gracefully', () => {
      const viewerWithoutOrientation = {
        ...mockViewer,
        setOrientation: undefined,
      };

      resetView(viewerWithoutOrientation);

      expect(mockViewer.zoomTo).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockViewer.zoomTo = vi.fn(() => {
        throw new Error('Test error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      resetView(mockViewer);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to reset view:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('startAutoSpin', () => {
    it('should start auto-spin with default parameters', () => {
      startAutoSpin(mockViewer);

      expect(mockViewer.spin).toHaveBeenCalledWith('y', 0.5);
    });

    it('should start auto-spin with custom axis and speed', () => {
      startAutoSpin(mockViewer, 'x', 1.0);

      expect(mockViewer.spin).toHaveBeenCalledWith('x', 1.0);
    });

    it('should handle missing spin function gracefully', () => {
      const viewerWithoutSpin = { ...mockViewer, spin: undefined };

      startAutoSpin(viewerWithoutSpin);

      expect(mockViewer.render).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockViewer.spin = vi.fn(() => {
        throw new Error('Spin error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      startAutoSpin(mockViewer);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to start auto-spin:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('stopAutoSpin', () => {
    it('should stop auto-spin', () => {
      stopAutoSpin(mockViewer);

      expect(mockViewer.stopAnimate).toHaveBeenCalled();
    });

    it('should handle missing stopAnimate gracefully', () => {
      const viewerWithoutStop = { ...mockViewer, stopAnimate: undefined };

      stopAutoSpin(viewerWithoutStop);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle errors gracefully', () => {
      mockViewer.stopAnimate = vi.fn(() => {
        throw new Error('Stop error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      stopAutoSpin(mockViewer);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to stop auto-spin:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('toggleAutoSpin', () => {
    it('should start spin when not spinning', () => {
      const result = toggleAutoSpin(mockViewer, false);

      expect(result).toBe(true);
      expect(mockViewer.spin).toHaveBeenCalled();
    });

    it('should stop spin when spinning', () => {
      const result = toggleAutoSpin(mockViewer, true);

      expect(result).toBe(false);
      expect(mockViewer.stopAnimate).toHaveBeenCalled();
    });

    it('should handle errors and return current state', () => {
      mockViewer.spin = vi.fn(() => {
        throw new Error('Toggle error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = toggleAutoSpin(mockViewer, false);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('rotateView', () => {
    it('should rotate view with X angle', () => {
      rotateView(mockViewer, 45, 0, 0);

      expect(mockViewer.setOrientation).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should rotate view with Y angle', () => {
      rotateView(mockViewer, 0, 90, 0);

      expect(mockViewer.setOrientation).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should rotate view with Z angle', () => {
      rotateView(mockViewer, 0, 0, 180);

      expect(mockViewer.setOrientation).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should rotate view with combined angles', () => {
      rotateView(mockViewer, 45, 90, 180);

      expect(mockViewer.setOrientation).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should handle missing setOrientation gracefully', () => {
      const viewerWithoutOrientation = {
        ...mockViewer,
        setOrientation: undefined,
      };

      rotateView(viewerWithoutOrientation, 45, 0, 0);

      expect(mockViewer.render).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockViewer.setOrientation = vi.fn(() => {
        throw new Error('Rotate error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      rotateView(mockViewer, 45, 0, 0);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to rotate view:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('zoomView', () => {
    it('should zoom in with factor > 1', () => {
      zoomView(mockViewer, 1.5);

      expect(mockViewer.zoomTo).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should zoom out with factor < 1', () => {
      zoomView(mockViewer, 0.8);

      expect(mockViewer.zoomTo).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should use default zoom factor', () => {
      zoomView(mockViewer);

      expect(mockViewer.zoomTo).toHaveBeenCalled();
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockViewer.zoomTo = vi.fn(() => {
        throw new Error('Zoom error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      zoomView(mockViewer, 1.5);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to zoom view:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
