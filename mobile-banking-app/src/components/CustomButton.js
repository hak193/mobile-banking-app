import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import theme from '../styles/theme';

const CustomButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}) => {
  const getButtonStyles = () => {
    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.gray[300],
      },
    };

    const sizeStyles = {
      small: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
      },
      medium: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
      },
      large: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
      },
    };

    return [
      styles.button,
      variantStyles[variant],
      sizeStyles[size],
      disabled && styles.buttonDisabled,
      style,
    ];
  };

  const getTextStyles = () => {
    const variantTextStyles = {
      primary: {
        color: theme.colors.white,
      },
      secondary: {
        color: theme.colors.primary,
      },
      outline: {
        color: theme.colors.gray[700],
      },
    };

    const sizeTextStyles = {
      small: {
        fontSize: theme.typography.sizes.sm,
      },
      medium: {
        fontSize: theme.typography.sizes.md,
      },
      large: {
        fontSize: theme.typography.sizes.lg,
      },
    };

    return [
      styles.text,
      variantTextStyles[variant],
      sizeTextStyles[size],
      disabled && styles.textDisabled,
    ];
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? theme.colors.white : theme.colors.primary}
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        <Text style={getTextStyles()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...theme.shadows.small,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  textDisabled: {
    opacity: 0.7,
  },
});

export default CustomButton;
