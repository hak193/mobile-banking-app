-- Insert test users
INSERT INTO Users (fullName, email, password, phone, role, status, emailVerified)
VALUES 
    -- Password: Test@123 (hashed)
    ('John Doe', 'john@example.com', '$2a$10$XgXB8pDEbBmzgHX5H5pCe.kJ8Zm1L9q5YR6QH7ZE3HqGR1hQ3H5Uy', '+1234567890', 'user', 'active', 1),
    -- Password: Admin@123 (hashed)
    ('Admin User', 'admin@example.com', '$2a$10$XgXB8pDEbBmzgHX5H5pCe.kJ8Zm1L9q5YR6QH7ZE3HqGR1hQ3H5Uy', '+1987654321', 'admin', 'active', 1);

-- Insert test accounts
INSERT INTO Accounts (userId, accountType, accountNumber, balance, currency, status)
VALUES
    -- John's accounts
    (1, 'savings', '1000000001', 5000.00, 'USD', 'active'),
    (1, 'checking', '1000000002', 2500.00, 'USD', 'active'),
    -- Admin's accounts
    (2, 'savings', '2000000001', 10000.00, 'USD', 'active'),
    (2, 'checking', '2000000002', 5000.00, 'USD', 'active');

-- Insert test billers
INSERT INTO Billers (name, code, category, description, status)
VALUES
    ('City Power Corp', 'CITYPWR', 'Utilities', 'Electricity bills', 'active'),
    ('Water Services', 'WATER', 'Utilities', 'Water bills', 'active'),
    ('Internet Plus', 'INTPLUS', 'Internet', 'Internet service provider', 'active'),
    ('Mobile Network', 'MOBNET', 'Phone', 'Mobile phone service', 'active'),
    ('Gas Company', 'GASCO', 'Utilities', 'Natural gas service', 'active');

-- Insert saved billers for John
INSERT INTO SavedBillers (userId, billerId, nickname, accountNumber)
VALUES
    (1, 1, 'Home Electricity', 'ELEC001'),
    (1, 2, 'Home Water', 'WATER001'),
    (1, 3, 'Home Internet', 'NET001');

-- Insert test transactions
INSERT INTO Transactions (userId, fromAccountId, toAccountId, type, amount, status, description)
VALUES
    -- John's transactions
    (1, 1, NULL, 'withdrawal', 100.00, 'completed', 'ATM Withdrawal'),
    (1, 1, 2, 'transfer', 500.00, 'completed', 'Transfer to Checking'),
    (1, 2, NULL, 'payment', 50.00, 'completed', 'Online Purchase'),
    -- Admin's transactions
    (2, 3, NULL, 'withdrawal', 200.00, 'completed', 'ATM Withdrawal'),
    (2, 3, 4, 'transfer', 1000.00, 'completed', 'Transfer to Checking');

-- Insert test bill payments
INSERT INTO BillPayments (userId, accountId, billerId, amount, status, reference)
VALUES
    (1, 1, 1, 150.00, 'completed', 'ELEC-001'),
    (1, 1, 2, 75.00, 'completed', 'WATER-001'),
    (1, 1, 3, 89.99, 'scheduled', 'NET-001');

-- Insert test notifications
INSERT INTO Notifications (userId, title, message, type, read)
VALUES
    (1, 'Welcome!', 'Welcome to Mobile Banking App', 'system', 0),
    (1, 'Transaction Alert', 'Your account has been debited $100.00', 'transaction', 0),
    (1, 'Bill Payment Due', 'Your electricity bill payment is due in 3 days', 'bill', 0),
    (2, 'Welcome!', 'Welcome to Mobile Banking App', 'system', 0),
    (2, 'Security Alert', 'New login detected from your account', 'security', 0);

-- Insert notification preferences
INSERT INTO NotificationPreferences (userId, type, email, push, sms)
VALUES
    (1, 'transaction', 1, 1, 0),
    (1, 'security', 1, 1, 1),
    (1, 'bill', 1, 1, 0),
    (2, 'transaction', 1, 1, 0),
    (2, 'security', 1, 1, 1),
    (2, 'bill', 1, 1, 0);

-- Insert test statements
INSERT INTO Statements (userId, accountId, startDate, endDate, status, fileUrl)
VALUES
    (1, 1, DATEADD(month, -1, GETDATE()), GETDATE(), 'generated', 'statements/user1/statement_1.pdf'),
    (2, 3, DATEADD(month, -1, GETDATE()), GETDATE(), 'generated', 'statements/user2/statement_1.pdf');
