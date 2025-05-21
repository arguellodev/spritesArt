/**
 * Color utility module for standardized color handling
 * This provides a consistent API for working with colors in different formats
 */

/**
 * Converts RGBA components to a single Uint32 value
 * Format: 0xAARRGGBB (alpha in most significant byte)
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @param {number} a - Alpha component (0-255)
 * @returns {number} - Uint32 representation
 */
export const rgbaToUint32 = (r, g, b, a = 255) => {
    return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
  };
  
  /**
   * Extracts RGBA components from a Uint32 value
   * @param {number} color - Uint32 color value
   * @returns {Object} - {r, g, b, a} components
   */
  export const uint32ToRgba = (color) => {
    return {
      r: color & 0xff,
      g: (color >> 8) & 0xff,
      b: (color >> 16) & 0xff,
      a: (color >> 24) & 0xff
    };
  };
  
  /**
   * Converts a CSS color string to Uint32 format
   * @param {string} colorStr - CSS color string (hex, rgb, rgba, etc.)
   * @returns {number} - Uint32 representation
   */
  export const colorStringToUint32 = (colorStr) => {
    if (!colorStr || colorStr === 'transparent') {
      return 0x00000000; // Transparent
    }
    
    // Use canvas to parse any CSS color format
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colorStr;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return rgbaToUint32(r, g, b, Math.round(a));
  };
  
  /**
   * Converts a Uint32 color to CSS rgba() string
   * @param {number} color - Uint32 color value
   * @returns {string} - CSS rgba string
   */
  export const uint32ToCssColor = (color) => {
    const { r, g, b, a } = uint32ToRgba(color);
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  };
  
  /**
   * Converts a hex color string to Uint32 format
   * @param {string} hex - Hex color string (#RGB or #RRGGBB)
   * @returns {number} - Uint32 representation
   */
  export const hexToUint32 = (hex) => {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex to RGB
    let r, g, b, a = 255;
    
    if (hex.length === 3) {
      // #RGB format
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      // #RRGGBB format
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else if (hex.length === 8) {
      // #RRGGBBAA format
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
      a = parseInt(hex.substring(6, 8), 16);
    } else {
      // Invalid format, return black
      return 0xFF000000;
    }
    
    return rgbaToUint32(r, g, b, a);
  };
  
  /**
   * Parses a color from any format to Uint32
   * @param {any} color - Color in any format (Uint32, string, object)
   * @returns {number} - Uint32 representation
   */
  export const parseColor = (color) => {
    if (typeof color === 'number') {
      // Already a Uint32 value
      return color;
    } else if (typeof color === 'string') {
      // CSS color string
      return colorStringToUint32(color);
    } else if (typeof color === 'object' && color !== null) {
      // Object with r,g,b,a properties
      const r = color.r || 0;
      const g = color.g || 0;
      const b = color.b || 0;
      const a = 'a' in color ? color.a : 255;
      return rgbaToUint32(r, g, b, a);
    }
    // Default to transparent
    return 0x00000000;
  };
  
  /**
   * Creates a color object with both Uint32 and CSS representations
   * @param {any} color - Color in any format
   * @returns {Object} - Color object with multiple representations
   */
  export const createColorObject = (color) => {
    const uint32 = parseColor(color);
    const rgba = uint32ToRgba(uint32);
    const cssColor = uint32ToCssColor(uint32);
    
    return {
      uint32,
      rgba,
      cssColor,
      toString() { return cssColor; }
    };
  };
  
  /**
   * Creates a transparent color
   * @returns {number} - Transparent color in Uint32 format
   */
  export const transparent = () => 0x00000000;
  
  /**
   * Standard colors in Uint32 format
   */
  export const colors = {
    black: 0xFF000000,
    white: 0xFFFFFFFF,
    red: 0xFFFF0000,
    green: 0xFF00FF00,
    blue: 0xFF0000FF,
    yellow: 0xFFFFFF00,
    cyan: 0xFF00FFFF,
    magenta: 0xFFFF00FF,
    transparent: 0x00000000
  };