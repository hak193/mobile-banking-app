import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Card from '../components/Card';
import theme from '../styles/theme';

const FILTER_OPTIONS = {
  ALL: 'All',
  INCOME: 'Income',
  EXPENSE: 'Expense',
};

const MOCK_TRANSACTIONS = [
  {
    id: '1',
    title: 'Salary Deposit',
    amount: '+$3,500.00',
    date: '2023-08-15',
    type: 'credit',
    category: 'Income',
    description: 'Monthly salary payment',
  },
  {
    id: '2',
    title: 'Grocery Shopping',
    amount: '-$156.32',
    date: '2023-08-14',
    type: 'debit',
    category: 'Shopping',
    description: 'Weekly groceries',
  },
  {
    id: '3',
    title: 'Netflix Subscription',
    amount: '-$14.99',
    date: '2023-08-13',
    type: 'debit',
    category: 'Entertainment',
    description: 'Monthly subscription',
  },
  {
    id: '4',
    title: 'Freelance Payment',
    amount: '+$850.00',
    date: '2023-08-12',
    type: 'credit',
    category: 'Income',
    description: 'Web development project',
  },
  {
    id: '5',
    title: 'Restaurant',
    amount: '-$45.80',
    date: '2023-08-12',
    type: 'debit',
    category: 'Dining',
    description: 'Dinner with friends',
  },
];

const TransactionHistory = ({ navigation }) => {
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(FILTER_OPTIONS.ALL);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const filterTransactions = useCallback(() => {
    let filtered = [...MOCK_TRANSACTIONS];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (transaction) =>
          transaction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          transaction.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (activeFilter === FILTER_OPTIONS.INCOME) {
      filtered = filtered.filter((transaction) => transaction.type === 'credit');
    } else if (activeFilter === FILTER_OPTIONS.EXPENSE) {
      filtered = filtered.filter((transaction) => transaction.type === 'debit');
    }

    return filtered;
  }, [searchQuery, activeFilter]);

  const renderFilterButton = (filter) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterButtonText,
          activeFilter === filter && styles.filterButtonTextActive,
        ]}
      >
        {filter}
      </Text>
    </TouchableOpacity>
  );

  const renderTransaction = ({ item }) => (
    <Card
      title={item.title}
      subtitle={`${item.category} • ${item.date}`}
      amount={item.amount}
      icon={item.type === 'credit' ? 'arrow-down' : 'arrow-up'}
      iconColor={item.type === 'credit' ? theme.colors.success : theme.colors.danger}
      onPress={() => navigation.navigate('TransactionDetails', { transaction: item })}
      style={styles.transactionCard}
    >
      <Text style={styles.transactionDescription} numberOfLines={1}>
        {item.description}
      </Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.filterIcon}
          onPress={() => navigation.navigate('TransactionFilters')}
        >
          <Icon name="tune" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={theme.colors.gray[500]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.gray[500]}
        />
      </View>

      <View style={styles.filterContainer}>
        {Object.values(FILTER_OPTIONS).map((filter) => renderFilterButton(filter))}
      </View>

      <FlatList
        data={filterTransactions()}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.transactionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-search" size={48} color={theme.colors.gray[400]} />
            <Text style={styles.emptyText}>No transactions found</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.dark,
  },
  filterIcon: {
    padding: theme.spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.dark,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
    fontWeight: theme.typography.weights.medium,
  },
  filterButtonTextActive: {
    color: theme.colors.white,
  },
  transactionsList: {
    padding: theme.spacing.lg,
  },
  transactionCard: {
    marginBottom: theme.spacing.md,
  },
  transactionDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
    marginTop: theme.spacing.xs,
  },
  emptyContainer: {
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

export default TransactionHistory;
