import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Card from '../components/Card';
import theme from '../styles/theme';

const BILL_CATEGORIES = [
  { id: '1', name: 'Utilities', icon: 'flash' },
  { id: '2', name: 'Internet', icon: 'wifi' },
  { id: '3', name: 'Phone', icon: 'phone' },
  { id: '4', name: 'Credit Card', icon: 'credit-card' },
  { id: '5', name: 'Insurance', icon: 'shield-check' },
  { id: '6', name: 'Others', icon: 'dots-horizontal' },
];

const SAVED_BILLERS = [
  {
    id: '1',
    name: 'City Power Corp',
    category: 'Utilities',
    accountNo: '1234567890',
    icon: 'flash',
  },
  {
    id: '2',
    name: 'Internet Plus',
    category: 'Internet',
    accountNo: '9876543210',
    icon: 'wifi',
  },
  {
    id: '3',
    name: 'Mobile Network',
    category: 'Phone',
    accountNo: '5432167890',
    icon: 'phone',
  },
];

const BillPayment = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBiller, setSelectedBiller] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(null);

  const handlePayment = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setShowPaymentModal(false);
      Alert.alert(
        'Payment Successful',
        'Your bill payment has been processed successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('AccountOverview'),
          },
        ]
      );
    }, 2000);
  };

  const renderCategoryItem = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        selectedCategory?.id === category.id && styles.categoryItemSelected,
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <View
        style={[
          styles.categoryIcon,
          selectedCategory?.id === category.id && styles.categoryIconSelected,
        ]}
      >
        <Icon
          name={category.icon}
          size={24}
          color={
            selectedCategory?.id === category.id
              ? theme.colors.white
              : theme.colors.primary
          }
        />
      </View>
      <Text
        style={[
          styles.categoryText,
          selectedCategory?.id === category.id && styles.categoryTextSelected,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderBillerCard = (biller) => (
    <Card
      key={biller.id}
      title={biller.name}
      subtitle={`Account: ${biller.accountNo}`}
      icon={biller.icon}
      onPress={() => setSelectedBiller(biller)}
      style={[
        styles.billerCard,
        selectedBiller?.id === biller.id && styles.billerCardSelected,
      ]}
    />
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pay Bills</Text>
      </View>

      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {BILL_CATEGORIES.map(renderCategoryItem)}
        </ScrollView>
      </View>

      <View style={styles.billersSection}>
        <Text style={styles.sectionTitle}>Saved Billers</Text>
        {SAVED_BILLERS.filter(
          (biller) =>
            !selectedCategory || biller.category === selectedCategory.name
        ).map(renderBillerCard)}
      </View>

      {selectedBiller && (
        <View style={styles.paymentSection}>
          <CustomInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="decimal-pad"
          />

          <CustomButton
            title="Pay Now"
            onPress={handlePayment}
            style={styles.payButton}
          />
        </View>
      )}

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Payment</Text>

            <Card style={styles.confirmationCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Biller:</Text>
                <Text style={styles.detailValue}>{selectedBiller?.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account:</Text>
                <Text style={styles.detailValue}>{selectedBiller?.accountNo}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>${amount}</Text>
              </View>
            </Card>

            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                variant="outline"
                onPress={() => setShowPaymentModal(false)}
                style={styles.modalButton}
              />
              <CustomButton
                title="Confirm"
                loading={loading}
                onPress={confirmPayment}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.dark,
  },
  categoriesSection: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.md,
  },
  categoriesContainer: {
    paddingRight: theme.spacing.lg,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: `${theme.colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
    fontWeight: theme.typography.weights.medium,
  },
  categoryTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  billersSection: {
    padding: theme.spacing.lg,
  },
  billerCard: {
    marginBottom: theme.spacing.md,
  },
  billerCardSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  paymentSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    ...theme.shadows.small,
  },
  payButton: {
    marginTop: theme.spacing.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  confirmationCard: {
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
  },
  detailValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.dark,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
});

export default BillPayment;
