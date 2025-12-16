/**
 * Nostr Wallet Connect (NWC) Service
 *
 * This service provides integration with Nostr Wallet Connect protocol
 * for sending Lightning payments via Nostr-enabled wallets.
 *
 * NWC Protocol: https://github.com/nostr-protocol/nips/blob/master/47.md
 *
 * Supported wallets:
 * - Alby
 * - Mutiny Wallet
 * - Any NWC-compatible wallet
 */

export interface NostrWalletConfig {
    connectionString: string;  // nostr+walletconnect://... URI
    relayUrl?: string;         // Optional relay URL override
}

export interface PaymentRequest {
    invoice: string;           // BOLT11 lightning invoice
    amount?: number;           // Amount in sats (optional if invoice has amount)
    description?: string;      // Payment description
}

export interface PaymentResponse {
    success: boolean;
    preimage?: string;         // Payment preimage (proof of payment)
    paymentHash?: string;      // Payment hash
    error?: string;
}

export interface WalletInfo {
    alias?: string;
    color?: string;
    pubkey?: string;
    network?: string;
    blockHeight?: number;
    methods?: string[];
}

/**
 * NostrWalletService class for NWC integration
 *
 * Usage:
 * ```typescript
 * const nwc = new NostrWalletService({
 *   connectionString: process.env.NWC_CONNECTION_STRING
 * });
 *
 * const result = await nwc.payInvoice({
 *   invoice: 'lnbc...',
 *   description: 'Reward payment'
 * });
 * ```
 */
export class NostrWalletService {
    private connectionString: string;
    private relayUrl: string;
    private walletPubkey: string;
    private secret: string;

    constructor(config: NostrWalletConfig) {
        this.connectionString = config.connectionString;
        this.parseConnectionString();
    }

    /**
     * Parse NWC connection string
     * Format: nostr+walletconnect://<wallet_pubkey>?relay=<relay_url>&secret=<secret>
     */
    private parseConnectionString(): void {
        try {
            const url = new URL(this.connectionString);
            this.walletPubkey = url.hostname || url.pathname.replace('//', '');

            const params = new URLSearchParams(url.search);
            this.relayUrl = params.get('relay') || 'wss://relay.getalby.com/v1';
            this.secret = params.get('secret') || '';

            if (!this.walletPubkey || !this.secret) {
                throw new Error('Invalid NWC connection string: missing pubkey or secret');
            }
        } catch (error) {
            console.error('Error parsing NWC connection string:', error);
            throw new Error('Invalid NWC connection string format');
        }
    }

    /**
     * Get wallet information
     */
    async getInfo(): Promise<WalletInfo> {
        // TODO: Implement NWC get_info request
        // This requires WebSocket connection to Nostr relay
        // and sending encrypted NWC request

        console.log('NostrWalletService.getInfo() - Not yet implemented');
        return {
            methods: ['pay_invoice', 'get_balance', 'get_info']
        };
    }

    /**
     * Get wallet balance
     */
    async getBalance(): Promise<number> {
        // TODO: Implement NWC get_balance request

        console.log('NostrWalletService.getBalance() - Not yet implemented');
        throw new Error('NWC getBalance not yet implemented. Use LNbits service for now.');
    }

    /**
     * Pay a Lightning invoice via NWC
     */
    async payInvoice(request: PaymentRequest): Promise<PaymentResponse> {
        console.log(`NostrWalletService.payInvoice() - Invoice: ${request.invoice.substring(0, 20)}...`);

        // TODO: Implement full NWC pay_invoice flow:
        // 1. Connect to Nostr relay via WebSocket
        // 2. Generate ephemeral keypair from secret
        // 3. Create NWC request event (kind 23194)
        // 4. Encrypt payload with NIP-04
        // 5. Sign and publish event
        // 6. Wait for response event (kind 23195)
        // 7. Decrypt and parse response

        // For now, return a placeholder indicating NWC is not yet implemented
        console.log('NostrWalletService.payInvoice() - Full NWC implementation pending');

        return {
            success: false,
            error: 'NWC payment not yet implemented. Configure LNbits backend for payments.'
        };
    }

    /**
     * Create a Lightning invoice via NWC
     */
    async createInvoice(amount: number, description: string): Promise<string | null> {
        console.log(`NostrWalletService.createInvoice() - Amount: ${amount}, Desc: ${description}`);

        // TODO: Implement NWC make_invoice request

        console.log('NostrWalletService.createInvoice() - Not yet implemented');
        return null;
    }

    /**
     * Check if NWC is properly configured
     */
    isConfigured(): boolean {
        return !!(this.walletPubkey && this.secret && this.relayUrl);
    }

    /**
     * Get connection status
     */
    getConnectionInfo(): { pubkey: string; relay: string; configured: boolean } {
        return {
            pubkey: this.walletPubkey ? `${this.walletPubkey.substring(0, 8)}...` : 'not set',
            relay: this.relayUrl || 'not set',
            configured: this.isConfigured()
        };
    }
}

/**
 * Create a Nostr Wallet Service instance from environment variables
 */
export function createNostrWalletService(): NostrWalletService | null {
    const connectionString = process.env.NWC_CONNECTION_STRING;

    if (!connectionString) {
        console.log('NWC_CONNECTION_STRING not configured, Nostr wallet disabled');
        return null;
    }

    try {
        return new NostrWalletService({ connectionString });
    } catch (error) {
        console.error('Failed to initialize Nostr Wallet Service:', error);
        return null;
    }
}

export default NostrWalletService;
