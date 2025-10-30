export function adjustColor(hex, isDarkMode = false, factor = 0.5) {
  if (typeof hex !== 'string') return; // or a fallback color

  hex = hex.replace('#', '');

  if (hex.length === 8) hex = hex.substring(0, 6);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');

  const num = parseInt(hex, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;

  const adjust = (c) => {
    return Math.min(255, Math.max(0, isDarkMode ? c * (1 - factor) : c + (255 - c) * factor));
  };

  return `#${Math.round(adjust(r)).toString(16).padStart(2, '0')}${Math.round(adjust(g)).toString(16).padStart(2, '0')}${Math.round(adjust(b)).toString(16).padStart(2, '0')}`;
}
