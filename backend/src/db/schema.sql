-- Users table
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    fullName NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20),
    role NVARCHAR(20) DEFAULT 'user',
    status NVARCHAR(20) DEFAULT 'active',
    twoFactorEnabled BIT DEFAULT 0,
    twoFactorSecret NVARCHAR(100),
    emailVerified BIT DEFAULT 0,
    passwordChangedAt DATETIME2,
    lastLoginAt DATETIME2,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Accounts table
CREATE TABLE Accounts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    accountType NVARCHAR(50) NOT NULL,
    accountNumber NVARCHAR(20) UNIQUE NOT NULL,
    balance DECIMAL(19,4) DEFAULT 0,
    currency NVARCHAR(3) DEFAULT 'USD',
    status NVARCHAR(20) DEFAULT 'active',
    holdAmount DECIMAL(19,4) DEFAULT 0,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id)
);

-- Transactions table
CREATE TABLE Transactions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    fromAccountId INT,
    toAccountId INT,
    type NVARCHAR(50) NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    currency NVARCHAR(3) DEFAULT 'USD',
    status NVARCHAR(20) NOT NULL,
    description NVARCHAR(255),
    reference NVARCHAR(100),
    metadata NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    processedAt DATETIME2,
    FOREIGN KEY (userId) REFERENCES Users(id),
    FOREIGN KEY (fromAccountId) REFERENCES Accounts(id),
    FOREIGN KEY (toAccountId) REFERENCES Accounts(id)
);

-- Billers table
CREATE TABLE Billers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(50) UNIQUE NOT NULL,
    category NVARCHAR(50) NOT NULL,
    description NVARCHAR(255),
    status NVARCHAR(20) DEFAULT 'active',
    metadata NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- SavedBillers table
CREATE TABLE SavedBillers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    billerId INT NOT NULL,
    nickname NVARCHAR(100),
    accountNumber NVARCHAR(100) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id),
    FOREIGN KEY (billerId) REFERENCES Billers(id)
);

-- BillPayments table
CREATE TABLE BillPayments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    accountId INT NOT NULL,
    billerId INT NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    currency NVARCHAR(3) DEFAULT 'USD',
    status NVARCHAR(20) NOT NULL,
    reference NVARCHAR(100),
    scheduledDate DATETIME2,
    processedAt DATETIME2,
    metadata NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id),
    FOREIGN KEY (accountId) REFERENCES Accounts(id),
    FOREIGN KEY (billerId) REFERENCES Billers(id)
);

-- Notifications table
CREATE TABLE Notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    title NVARCHAR(100) NOT NULL,
    message NVARCHAR(500) NOT NULL,
    type NVARCHAR(50) NOT NULL,
    read BIT DEFAULT 0,
    data NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id)
);

-- NotificationPreferences table
CREATE TABLE NotificationPreferences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    type NVARCHAR(50) NOT NULL,
    email BIT DEFAULT 1,
    push BIT DEFAULT 1,
    sms BIT DEFAULT 0,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id)
);

-- Statements table
CREATE TABLE Statements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    accountId INT NOT NULL,
    startDate DATETIME2 NOT NULL,
    endDate DATETIME2 NOT NULL,
    status NVARCHAR(20) NOT NULL,
    fileUrl NVARCHAR(255),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id),
    FOREIGN KEY (accountId) REFERENCES Accounts(id)
);

-- Create indexes
CREATE INDEX IX_Transactions_UserId ON Transactions(userId);
CREATE INDEX IX_Transactions_FromAccountId ON Transactions(fromAccountId);
CREATE INDEX IX_Transactions_ToAccountId ON Transactions(toAccountId);
CREATE INDEX IX_Transactions_CreatedAt ON Transactions(createdAt);

CREATE INDEX IX_BillPayments_UserId ON BillPayments(userId);
CREATE INDEX IX_BillPayments_AccountId ON BillPayments(accountId);
CREATE INDEX IX_BillPayments_BillerId ON BillPayments(billerId);
CREATE INDEX IX_BillPayments_Status ON BillPayments(status);

CREATE INDEX IX_Notifications_UserId ON Notifications(userId);
CREATE INDEX IX_Notifications_Read ON Notifications(read);
CREATE INDEX IX_Notifications_CreatedAt ON Notifications(createdAt);

-- Insert default data
INSERT INTO Billers (name, code, category, description, status)
VALUES 
    ('City Power Corp', 'CITYPWR', 'Utilities', 'Electricity bills', 'active'),
    ('Water Services', 'WATER', 'Utilities', 'Water bills', 'active'),
    ('Internet Plus', 'INTPLUS', 'Internet', 'Internet service provider', 'active'),
    ('Mobile Network', 'MOBNET', 'Phone', 'Mobile phone service', 'active'),
    ('Gas Company', 'GASCO', 'Utilities', 'Natural gas service', 'active');

-- Create triggers for updating timestamps
GO
CREATE TRIGGER TR_Users_UpdateTimestamp
ON Users
AFTER UPDATE
AS
BEGIN
    UPDATE Users
    SET updatedAt = GETDATE()
    FROM Users u
    INNER JOIN inserted i ON u.id = i.id;
END;

GO
CREATE TRIGGER TR_Accounts_UpdateTimestamp
ON Accounts
AFTER UPDATE
AS
BEGIN
    UPDATE Accounts
    SET updatedAt = GETDATE()
    FROM Accounts a
    INNER JOIN inserted i ON a.id = i.id;
END;
