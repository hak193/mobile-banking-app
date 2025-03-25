# Mobile Banking App

A secure and user-friendly mobile banking application built with React Native.

## Features

### Authentication & Security
- Secure login with biometric support
- Two-factor authentication
- Session management
- PIN/password protection
- Automatic logout on inactivity

### Account Management
- Account overview and balances
- Transaction history
- Account statements
- Account settings

### Banking Operations
- Fund transfers
- Bill payments
- Scheduled payments
- Recurring transactions
- Transaction limits management

### Notifications
- Push notifications
- Transaction alerts
- Security alerts
- Bill payment reminders
- Account updates

### User Experience
- Intuitive navigation
- Dark/Light theme support
- Accessibility features
- Offline capabilities
- Multi-language support

## Setup & Configuration

### Prerequisites
- Node.js (v14+)
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

### Environment Setup

1. Clone the repository
2. Install dependencies:
```bash
# Install npm dependencies
npm install

# Install iOS dependencies
cd ios && pod install && cd ..
```

3. Configure environment variables:
Copy `.env.example` to `.env` and configure:
```bash
API_URL=http://localhost:5000/api/v1
ENVIRONMENT=development
ENABLE_LOGS=true
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run with specific environment
npm run ios:staging
npm run android:staging
```

## Project Structure

```
src/
├── components/      # Reusable UI components
├── screens/         # Screen components
├── navigation/      # Navigation configuration
├── context/        # React Context providers
├── services/       # API and business logic
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
├── styles/         # Global styles and themes
├── assets/         # Images, fonts, etc.
└── locales/        # Internationalization files
```

## Components

### UI Components
- `CustomButton`: Styled button component
- `CustomInput`: Input field with validation
- `Card`: Card container component
- `NotificationItem`: Notification display component
- `SettingsItem`: Settings menu item component

### Screens
- `LoginScreen`: User authentication
- `RegisterScreen`: New user registration
- `AccountOverview`: Main account dashboard
- `TransactionHistory`: List of transactions
- `TransferFunds`: Money transfer interface
- `BillPayment`: Bill payment interface
- `ProfileScreen`: User profile management
- `NotificationsScreen`: Notification center

## State Management

- React Context for global state
- AsyncStorage for persistent data
- Secure storage for sensitive information

## Navigation

Using React Navigation with:
- Stack Navigator for authentication flow
- Tab Navigator for main app navigation
- Modal Navigator for overlays
- Drawer Navigator for settings/menu

## Styling

- Theme-based styling system
- Responsive design
- Platform-specific adaptations
- Dark mode support
- Custom fonts and icons

## Security Features

- Biometric authentication
- Secure storage
- Certificate pinning
- App state monitoring
- Jailbreak detection
- Screenshot prevention
- Clipboard protection

## Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run e2e

# Update snapshots
npm test -- -u

# Generate coverage report
npm run test:coverage
```

## Development Guidelines

### Code Style
- Follow ESLint configuration
- Use TypeScript for type safety
- Implement proper error handling
- Write unit tests for components
- Add JSDoc comments

### Performance
- Implement lazy loading
- Use memo for expensive computations
- Optimize images and assets
- Monitor bundle size
- Profile render performance

### Git Workflow
1. Create feature branch
2. Make changes and commit
3. Write/update tests
4. Create pull request
5. Code review
6. Merge to development

## Building for Production

### iOS
```bash
# Generate release build
npm run build:ios

# Archive and upload to App Store
npm run deploy:ios
```

### Android
```bash
# Generate release APK
npm run build:android

# Generate release bundle
npm run bundle:android

# Deploy to Play Store
npm run deploy:android
```

## Troubleshooting

Common issues and solutions:

### Build Issues
- Clear watchman: `watchman watch-del-all`
- Clear Metro: `npm start -- --reset-cache`
- Clean build: `cd ios && pod deintegrate && pod install`

### Runtime Issues
- Clear app data
- Reset async storage
- Check API connectivity
- Verify environment variables

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
