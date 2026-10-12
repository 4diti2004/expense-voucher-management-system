-- Reference relational schema for migrating this demonstration project
-- from JSON persistence to SQLite, PostgreSQL, or MySQL.

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Employee', 'Manager', 'Admin')),
    department VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vouchers (
    id VARCHAR(36) PRIMARY KEY,
    employee VARCHAR(120) NOT NULL,
    department VARCHAR(120) NOT NULL,
    expense_date DATE NOT NULL,
    category VARCHAR(60) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    receipt_name VARCHAR(255),
    receipt_type VARCHAR(100),
    receipt_data TEXT,
    created_by VARCHAR(36) NOT NULL,
    reviewed_by VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    CONSTRAINT fk_voucher_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_voucher_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_created_by ON vouchers(created_by);
CREATE INDEX idx_vouchers_expense_date ON vouchers(expense_date);
