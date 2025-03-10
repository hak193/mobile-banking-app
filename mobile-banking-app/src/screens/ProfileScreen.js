import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import SettingsItem from '../components/SettingsItem';
import theme from '../styles/theme';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: logout,
          style: 'destructive',
        },
      ]
    );
  };

  const sections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'account-edit',
          title: 'Personal Information',
          onPress: () => navigation.navigate('PersonalInfo'),
        },
        {
          icon: 'email',
          title: 'Email Address',
          subtitle: user?.email,
          onPress: () => navigation.navigate('UpdateEmail'),
        },
        {
          icon: 'phone',
          title: 'Phone Number',
          subtitle: '+1 (555) 123-4567',
          onPress: () => navigation.navigate('UpdatePhone'),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: 'lock',
          title: 'Change Password',
          onPress: () => navigation.navigate('ChangePassword'),
        },
        {
          icon: 'fingerprint',
          title: 'Biometric Authentication',
          showToggle: true,
          toggleValue: biometricEnabled,
          onToggle: setBiometricEnabled,
        },
        {
          icon: 'shield-check',
          title: 'Two-Factor Authentication',
          onPress: () => navigation.navigate('TwoFactorAuth'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'bell',
          title: 'Push Notifications',
          showToggle: true,
          toggleValue: notifications,
          onToggle: setNotifications,
        },
        {
          icon: 'theme-light-dark',
          title: 'Dark Mode',
          showToggle: true,
          toggleValue: darkMode,
          onToggle: setDarkMode,
        },
        {
          icon: 'translate',
          title: 'Language',
          subtitle: 'English',
          onPress: () => navigation.navigate('Language'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle',
          title: 'Help Center',
          onPress: () => navigation.navigate('HelpCenter'),
        },
        {
          icon: 'headphones',
          title: 'Contact Support',
          onPress: () => navigation.navigate('Support'),
        },
        {
          icon: 'file-document',
          title: 'Terms & Privacy Policy',
          onPress: () => navigation.navigate('Terms'),
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.editAvatarButton}>
              <Icon name="camera" size={14} color={theme.colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.fullName || 'User Name'}</Text>
          <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
        </View>
      </View>

      {sections.map((section, index) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => (
              <SettingsItem
                key={item.title}
                {...item}
                style={[
                  styles.settingsItem,
                  itemIndex === 0 && styles.firstItem,
                  itemIndex === section.items.length - 1 && styles.lastItem,
                ]}
              />
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={24} color={theme.colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.light,
  },
  header: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.xl,
    ...theme.shadows.small,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: theme.typography.sizes.xxxl,
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  name: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  settingsItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  firstItem: {
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
  },
  lastItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  logoutText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.danger,
    fontWeight: theme.typography.weights.medium,
  },
  version: {
    textAlign: 'center',
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[500],
    marginBottom: theme.spacing.xl,
  },
});

export default ProfileScreen;
