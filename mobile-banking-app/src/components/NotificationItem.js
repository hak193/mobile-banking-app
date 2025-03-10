import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../styles/theme';

const getNotificationIcon = (type) => {
  const icons = {
    transaction: 'bank-transfer',
    security: 'shield-alert',
    account: 'account-alert',
    bill: 'file-document',
    system: 'information',
    default: 'bell',
  };
  return icons[type] || icons.default;
};

const getNotificationColor = (type) => {
  const colors = {
    transaction: theme.colors.primary,
    security: theme.colors.danger,
    account: theme.colors.warning,
    bill: theme.colors.info,
    system: theme.colors.gray[600],
    default: theme.colors.primary,
  };
  return colors[type] || colors.default;
};

const NotificationItem = ({
  title,
  message,
  timestamp,
  type = 'default',
  read = false,
  onPress,
}) => {
  const iconName = getNotificationIcon(type);
  const iconColor = getNotificationColor(type);

  return (
    <TouchableOpacity
      style={[styles.container, !read && styles.unread]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
        <Icon name={iconName} size={24} color={iconColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {!read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  unread: {
    backgroundColor: `${theme.colors.primary}05`,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.dark,
    marginRight: theme.spacing.sm,
  },
  timestamp: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[500],
  },
  message: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});

export default NotificationItem;
