import { useWindowDimensions } from 'react-native';

export function useScale() {
  const { width, height } = useWindowDimensions();
  const shorter = Math.min(width, height);
  const isTablet = shorter >= 600;
  const isLandscape = width > height;
  const factor = isTablet ? Math.max(0.8, Math.min(shorter / 600, 1.6)) : 1;

  const s = (phone: number, tablet?: number): number => {
    const base = tablet !== undefined && isTablet ? tablet : phone;
    return Math.round(base * factor);
  };

  return { width, height, shorter, isTablet, isLandscape, factor, s };
}
