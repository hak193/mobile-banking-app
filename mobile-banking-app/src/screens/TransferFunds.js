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

const RECENT_RECIPIENTS = [
  { id: '1', name: 'John Doe', accountNo: '****1234', avatar: 'JD' },
  { id: '2', name: 'Sarah Smith', accountNo: '****5678', avatar: 'SS' },
  { id: '3', name: 'Mike Johnson', accountNo: '****9012', avatar: 'MJ' },
];

const TransferFunds = ({ navigation }) => {
  const [formData, setFormData] = useState({
    recipient: '',
    accountNumber: '',
    amount: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.recipient) {
      newErrors.recipient = 'Recipient name is required';
    }

    if (!formData.accountNumber) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d{10,12}$/.test(formData.accountNumber)) {
      newErrors.accountNumber = 'Invalid account number';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Invalid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTransfer = async () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const confirmTransfer = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setShowConfirmation(false);
      Alert.alert(
        'Transfer Successful',
        'Your transfer has been processed successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('AccountOverview'),
          },
        ]
      );
    }, 2000);
  };

  const selectRecipient = (recipient) => {
    setFormData({
      ...formData,
      recipient: recipient.name,
      accountNumber: recipient.accountNo.replace('*', ''),
    });
    setErrors({
      ...errors,
      recipient: null,
      accountNumber: null,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transfer Money</Text>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Recipients</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {RECENT_RECIPIENTS.map((recipient) => (
            <TouchableOpacity
              key={recipient.id}
              style={styles.recipientCard}
              onPress={() => selectRecipient(recipient)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{recipient.avatar}</Text>
              </View>
              <Text style={styles.recipientName}>{recipient.name}</Text>
              <Text style={styles.accountNumber}>{recipient.accountNo}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formContainer}>
        <CustomInput
          label="Recipient Name"
          value={formData.recipient}
          onChangeText={(text) => setFormData({ ...formData, recipient: text })}
          placeholder="Enter recipient name"
          error={errors.recipient}
        />

        <CustomInput
          label="Account Number"
          value={formData.accountNumber}
          onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
          placeholder="Enter account number"
          keyboardType="numeric"
          error={errors.accountNumber}
        />

        <CustomInput
          label="Amount"
          value={formData.amount}
          onChangeText={(text) => setFormData({ ...formData, amount: text })}
          placeholder="Enter amount"
          keyboardType="decimal-pad"
          error={errors.amount}
        />

        <CustomInput
          label="Description (Optional)"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Add a note"
          multiline
        />

        <CustomButton
          title="Continue"
          onPress={handleTransfer}
          style={styles.transferButton}
        />
      </View>

      <Modal
        visible={showConfirmation}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Transfer</Text>
            
            <Card
              title="Transfer Details"
              style={styles.confirmationCard}
            >
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>To:</Text>
                <Text style={styles.detailValue}>{formData.recipient}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account:</Text>
                <Text style={styles.detailValue}>{formData.accountNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>${formData.amount}</Text>
              </View>
              {formData.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Note:</Text>
                  <Text style={styles.detailValue}>{formData.description}</Text>
                </View>
              )}
            </Card>

            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                variant="outline"
                onPress={() => setShowConfirmation(false)}
                style={styles.modalButton}
              />
              <CustomButton
                title="Confirm"
                loading={loading}
                onPress={confirmTransfer}
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
  recentSection: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.md,
  },
  recipientCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  recipientName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  accountNumber: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
  },
  formContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    ...theme.shadows.small,
  },
  transferButton: {
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

export default TransferFunds;
