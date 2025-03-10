import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import theme from '../styles/theme';

const AccountOverview = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [accountData, setAccountData] = useState({
    balance: '45,250.75',
    savingsBalance: '12,430.50',
    recentTransactions: [
      {
        id: '1',
        title: 'Coffee Shop',
        amount: '-$4.50',
        date: '2 hours ago',
        type: 'debit',
      },
      {
        id: '2',
        title: 'Salary Deposit',
        amount: '+$3,500.00',
        date: 'Today',
        type: 'credit',
      },
      {
        id: '3',
        title: 'Grocery Store',
        amount: '-$65.30',
        date: 'Yesterday',
        type: 'debit',
      },
    ],
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const QuickAction = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Icon name={icon} size={24} color={theme.colors.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.notificationButton}
        >
          <Icon name="bell-outline" size={24} color={theme.colors.dark} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <Card
        title="Total Balance"
        amount={`$${accountData.balance}`}
        icon="wallet"
        iconColor={theme.colors.primary}
        style={styles.balanceCard}
      />

      <View style={styles.quickActionsContainer}>
        <QuickAction
          icon="bank-transfer"
          label="Transfer"
          onPress={() => navigation.navigate('Transfer')}
        />
        <QuickAction
          icon="file-document-outline"
          label="Pay Bills"
          onPress={() => navigation.navigate('Bills')}
        />
        <QuickAction
          icon="credit-card"
          label="Cards"
          onPress={() => navigation.navigate('Cards')}
        />
        <QuickAction
          icon="dots-horizontal"
          label="More"
          onPress={() => navigation.navigate('More')}
        />
      </View>

      <Card
        title="Savings Account"
        amount={`$${accountData.savingsBalance}`}
        subtitle="Available Balance"
        icon="piggy-bank"
        iconColor={theme.colors.success}
        onPress={() => navigation.navigate('SavingsDetails')}
        rightIcon="chevron-right"
      />

      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {accountData.recentTransactions.map((transaction) => (
        <Card
          key={transaction.id}
          title={transaction.title}
          subtitle={transaction.date}
          amount={transaction.amount}
          icon={transaction.type === 'credit' ? 'arrow-down' : 'arrow-up'}
          iconColor={transaction.type === 'credit' ? theme.colors.success : theme.colors.danger}
          onPress={() => navigation.navigate('TransactionDetails', { transaction })}
          style={styles.transactionCard}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  greeting: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
  },
  userName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.dark,
  },
  notificationButton: {
    position: 'relative',
    padding: theme.spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
  },
  balanceCard: {
    margin: theme.spacing.lg,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    marginBottom: theme.spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  quickActionLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[700],
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  transactionsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.dark,
  },
  viewAllText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  transactionCard: {
    marginHorizontal: theme.spacing.lg,
  },
});

export default AccountOverview;
