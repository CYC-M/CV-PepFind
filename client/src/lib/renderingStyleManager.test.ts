import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyRenderingStyle,
  applyMultipleStyles,
  getStyleDescription,
  getAllRenderingStyles,
  type RenderingStyle,
} from './renderingStyleManager';

describe('renderingStyleManager', () => {
  let mockViewer: any;

  beforeEach(() => {
    mockViewer = {
      setStyle: vi.fn(),
      render: vi.fn(),
    };
  });

  describe('applyRenderingStyle', () => {
    it('should apply cartoon style', () => {
      applyRenderingStyle(mockViewer, 'cartoon');

      expect(mockViewer.setStyle).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          cartoon: expect.any(Object),
        })
      );
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should apply stick style', () => {
      applyRenderingStyle(mockViewer, 'stick');

      expect(mockViewer.setStyle).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          stick: expect.any(Object),
        })
      );
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should apply surface style', () => {
      applyRenderingStyle(mockViewer, 'surface');

      expect(mockViewer.setStyle).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          surface: expect.any(Object),
        })
      );
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should apply sphere style', () => {
      applyRenderingStyle(mockViewer, 'sphere');

      expect(mockViewer.setStyle).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          sphere: expect.any(Object),
        })
      );
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should apply line style', () => {
      applyRenderingStyle(mockViewer, 'line');

      expect(mockViewer.setStyle).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          line: expect.any(Object),
        })
      );
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should handle invalid style gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      applyRenderingStyle(mockViewer, 'invalid' as RenderingStyle);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown rendering style'));
      expect(mockViewer.setStyle).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', () => {
      mockViewer.setStyle.mockImplementation(() => {
        throw new Error('Test error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      applyRenderingStyle(mockViewer, 'cartoon');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply rendering style'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('applyMultipleStyles', () => {
    it('should combine multiple styles', () => {
      applyMultipleStyles(mockViewer, ['cartoon', 'stick']);

      expect(mockViewer.setStyle).toHaveBeenCalled();
      const callArgs = mockViewer.setStyle.mock.calls[0][1];
      expect(callArgs).toHaveProperty('cartoon');
      expect(callArgs).toHaveProperty('stick');
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should handle empty styles array', () => {
      applyMultipleStyles(mockViewer, []);

      expect(mockViewer.setStyle).toHaveBeenCalledWith({}, {});
      expect(mockViewer.render).toHaveBeenCalled();
    });

    it('should handle errors in multiple styles', () => {
      mockViewer.setStyle.mockImplementation(() => {
        throw new Error('Test error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      applyMultipleStyles(mockViewer, ['cartoon', 'stick']);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply multiple styles'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getStyleDescription', () => {
    it('should return description for cartoon style', () => {
      const desc = getStyleDescription('cartoon');
      expect(desc).toContain('卡通');
      expect(desc).toContain('二级结构');
    });

    it('should return description for stick style', () => {
      const desc = getStyleDescription('stick');
      expect(desc).toContain('球棍');
    });

    it('should return description for surface style', () => {
      const desc = getStyleDescription('surface');
      expect(desc).toContain('表面');
    });

    it('should return description for sphere style', () => {
      const desc = getStyleDescription('sphere');
      expect(desc).toContain('球体');
    });

    it('should return description for line style', () => {
      const desc = getStyleDescription('line');
      expect(desc).toContain('线条');
    });

    it('should return default description for unknown style', () => {
      const desc = getStyleDescription('unknown' as RenderingStyle);
      expect(desc).toBe('未知渲染模式');
    });
  });

  describe('getAllRenderingStyles', () => {
    it('should return all available styles', () => {
      const styles = getAllRenderingStyles();

      expect(styles).toHaveLength(5);
      expect(styles).toContain('cartoon');
      expect(styles).toContain('stick');
      expect(styles).toContain('surface');
      expect(styles).toContain('sphere');
      expect(styles).toContain('line');
    });

    it('should return styles in expected order', () => {
      const styles = getAllRenderingStyles();
      expect(styles[0]).toBe('cartoon');
      expect(styles[1]).toBe('stick');
      expect(styles[2]).toBe('surface');
      expect(styles[3]).toBe('sphere');
      expect(styles[4]).toBe('line');
    });
  });
});
