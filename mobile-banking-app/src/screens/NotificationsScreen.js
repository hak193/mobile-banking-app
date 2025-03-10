import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationItem from '../components/NotificationItem';
import theme from '../styles/theme';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Large Transaction Alert',
    message: 'A transaction of $1,000 has been processed from your account ending in *1234.',
    timestamp: '2 mins ago',
    type: 'transaction',
    read: false,
  },
  {
    id: '2',
    title: 'Security Alert',
    message: 'New login detected from an unrecognized device. Please verify if this was you.',
    timestamp: '1 hour ago',
    type: 'security',
    read: false,
  },
  {
    id: '3',
    title: 'Bill Payment Reminder',
    message: 'Your electricity bill payment is due in 3 days. Set up automatic payment to avoid late fees.',
    timestamp: '3 hours ago',
    type: 'bill',
    read: true,
  },
  {
    id: '4',
    title: 'Account Update',
    message: 'Your account details have been successfully updated.',
    timestamp: 'Yesterday',
    type: 'account',
    read: true,
  },
  {
    id: '5',
    title: 'New Feature Available',
    message: 'Try our new bill splitting feature! Split expenses easily with friends and family.',
    timestamp: '2 days ago',
    type: 'system',
    read: true,
  },
];

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            setNotifications(prev =>
              prev.filter(notification => notification.id !== notificationId)
            );
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification.id);
    // Navigate based on notification type
    switch (notification.type) {
      case 'transaction':
        navigation.navigate('TransactionDetails', { transactionId: notification.id });
        break;
      case 'security':
        navigation.navigate('SecuritySettings');
        break;
      case 'bill':
        navigation.navigate('Bills');
        break;
      case 'account':
        navigation.navigate('AccountSettings');
        break;
      default:
        // Handle other notification types
        break;
    }
  };

  const renderNotification = ({ item }) => (
    <NotificationItem
      {...item}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => deleteNotification(item.id)}
    />
  );

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bell-off" size={48} color={theme.colors.gray[400]} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.light,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.round,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.gray[200],
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.gray[700],
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  markAllButton: {
    alignSelf: 'flex-end',
  },
  markAllText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  list: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
  },
});

export default NotificationsScreen;
