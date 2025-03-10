import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../styles/theme';

const SettingsItem = ({
  icon,
  title,
  subtitle,
  onPress,
  showToggle,
  toggleValue,
  onToggle,
  showChevron = true,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress && !onToggle}
    >
      <View style={styles.content}>
        {icon && (
          <View style={styles.iconContainer}>
            <Icon name={icon} size={24} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {showToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary }}
            thumbColor={theme.colors.white}
          />
        ) : showChevron ? (
          <Icon name="chevron-right" size={24} color={theme.colors.gray[400]} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.dark,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
    marginTop: theme.spacing.xs,
  },
});

export default SettingsItem;
