import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({ title, loading, variant = 'primary', style, ...props }) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'primary':
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style, props.disabled && styles.disabled]}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#1A1A1A' : '#CCFF00'} />
      ) : (
        <Text style={[styles.text, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#CCFF00', // Neon Yellow
  },
  secondaryButton: {
    backgroundColor: '#1A1A1A', // Dark Gray
    borderWidth: 1,
    borderColor: '#333333',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#CCFF00',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  primaryText: {
    color: '#1A1A1A', // Dark text on Neon
  },
  secondaryText: {
    color: '#FFFFFF', // White text on Dark
  },
  outlineText: {
    color: '#CCFF00', // Neon text on dark bg
  },
});
