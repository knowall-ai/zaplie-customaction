/**
 * Global Type Definitions for Zaplie Custom Action API
 */

// LNbits Wallet Interface
interface Wallet {
    id: string;
    admin: string;
    name: string;
    user: string;
    adminkey: string;
    inkey: string;
    balance_msat: number;
    deleted: boolean;
}

// User Interface (generic, not Teams-specific)
interface User {
    id: string;
    displayName: string;
    email?: string;
    externalId?: string;
    privateWallet: Wallet | null;
    allowanceWallet: Wallet | null;
    metadata?: Record<string, unknown>;
}

// Wallet types
type WalletType = 'Allowance' | 'Private';

// Reward/Payment related types
interface RewardTransaction {
    id: string;
    sender: string;
    recipient: string;
    amount: number;
    reason: string;
    message?: string;
    timestamp: string;
    status: 'pending' | 'completed' | 'failed';
    paymentHash?: string;
    metadata?: Record<string, unknown>;
}

// Reward reason categories
type RewardReason =
    | 'timesheet_completed'
    | 'sla_met'
    | 'daily_standup'
    | 'code_review'
    | 'training_completed'
    | 'goal_achieved'
    | 'peer_recognition'
    | 'milestone_reached'
    | 'custom';

// Configuration types
interface ApiConfig {
    lnbitsUrl: string;
    lnbitsUsername: string;
    lnbitsPassword: string;
    lnbitsAdminKey: string;
    nwcConnectionString?: string;
}
