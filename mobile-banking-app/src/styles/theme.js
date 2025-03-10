export const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',
  light: '#F2F2F7',
  dark: '#1C1C1E',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    100: '#F2F2F7',
    200: '#E5E5EA',
    300: '#D1D1D6',
    400: '#C7C7CC',
    500: '#AEAEB2',
    600: '#8E8E93',
    700: '#636366',
    800: '#48484A',
    900: '#3A3A3C'
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40
};

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  }
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 6,
  }
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999
};

export default {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius
};
