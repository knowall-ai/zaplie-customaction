import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { createInvoice, payInvoice, getUserWallets, setLnbitUrl } from '../services/lnbitsService';
import { getCredentials } from '../services/utils';

/**
 * Send Reward API Endpoint
 *
 * Sends sats (satoshis) to a user as a reward for completing tasks or activities.
 * This API can be called from Power Automate, custom code, webhooks, etc.
 *
 * POST /api/sendReward
 *
 * Request Body:
 * {
 *   "recipientUserId": string,    // LNbits user ID of the recipient
 *   "amount": number,             // Amount in sats to send
 *   "reason": string,             // Reason category (e.g., "timesheet_completed", "sla_met")
 *   "message": string,            // Optional message/comment
 *   "metadata": object            // Optional additional context
 * }
 *
 * Authentication:
 * - Basic Auth header with LNbits credentials
 * - Query params: siteURL, adminkey
 */

interface SendRewardRequest {
    recipientUserId: string;
    amount: number;
    reason: string;
    message?: string;
    metadata?: Record<string, unknown>;
}

interface RewardResponse {
    success: boolean;
    message: string;
    transactionId?: string;
    recipient?: string;
    amount?: number;
    reason?: string;
    timestamp?: string;
    error?: string;
}

const sendReward: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('Send Reward API - Processing request...');

    try {
        // Validate request body
        const body = req.body as SendRewardRequest;

        if (!body) {
            context.res = {
                status: 400,
                body: createErrorResponse("Request body is required")
            };
            return;
        }

        const { recipientUserId, amount, reason, message, metadata } = body;

        // Validate required fields
        if (!recipientUserId) {
            context.res = {
                status: 400,
                body: createErrorResponse("recipientUserId is required")
            };
            return;
        }

        if (!amount || amount <= 0) {
            context.res = {
                status: 400,
                body: createErrorResponse("amount must be a positive number")
            };
            return;
        }

        if (!reason) {
            context.res = {
                status: 400,
                body: createErrorResponse("reason is required")
            };
            return;
        }

        // Extract credentials from request
        const { username, password, siteUrl, adminKey } = getCredentials(req);

        if (!username || !password || !siteUrl || !adminKey) {
            context.res = {
                status: 401,
                body: createErrorResponse("Missing authentication credentials. Required: Basic Auth (username:password), siteURL, adminkey")
            };
            return;
        }

        // Initialize LNbits connection
        setLnbitUrl(req);

        context.log(`Processing reward: ${amount} sats to user ${recipientUserId} for ${reason}`);

        // Get recipient's wallets
        const recipientWallets = await getUserWallets(req, adminKey, recipientUserId);

        if (!recipientWallets || recipientWallets.length === 0) {
            context.res = {
                status: 404,
                body: createErrorResponse(`No wallets found for user: ${recipientUserId}`)
            };
            return;
        }

        // Find recipient's Private wallet (for receiving rewards)
        const recipientPrivateWallet = recipientWallets.find(w => w.name === 'Private');

        if (!recipientPrivateWallet) {
            context.res = {
                status: 404,
                body: createErrorResponse(`No Private wallet found for user: ${recipientUserId}`)
            };
            return;
        }

        // Build transaction metadata
        const transactionExtra = {
            tag: 'reward',
            reason: reason,
            message: message || '',
            timestamp: new Date().toISOString(),
            source: 'zaplie-customaction-api',
            ...metadata
        };

        // Create memo for the transaction
        const memo = message || `Reward: ${reason}`;

        // Create invoice in recipient's Private wallet
        context.log('Creating invoice for recipient...');
        const invoice = await createInvoice(
            req,
            recipientPrivateWallet.inkey,
            recipientPrivateWallet.id,
            amount,
            memo,
            transactionExtra
        );

        if (!invoice) {
            context.res = {
                status: 500,
                body: createErrorResponse("Failed to create invoice for recipient")
            };
            return;
        }

        context.log('Invoice created, paying from admin wallet...');

        // Pay the invoice using the admin key (system/host wallet)
        const paymentResult = await payInvoice(req, adminKey, invoice, transactionExtra);

        if (!paymentResult) {
            context.res = {
                status: 500,
                body: createErrorResponse("Failed to process payment")
            };
            return;
        }

        context.log('Reward sent successfully!');

        // Return success response
        const response: RewardResponse = {
            success: true,
            message: `Successfully sent ${amount} sats to user`,
            transactionId: paymentResult.payment_hash || paymentResult.checking_id,
            recipient: recipientUserId,
            amount: amount,
            reason: reason,
            timestamp: new Date().toISOString()
        };

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: response
        };

    } catch (error) {
        context.log.error('Error in sendReward:', error);
        context.res = {
            status: 500,
            body: createErrorResponse(error.message || "Internal server error")
        };
    }
};

function createErrorResponse(message: string): RewardResponse {
    return {
        success: false,
        message: message,
        error: message,
        timestamp: new Date().toISOString()
    };
}

export default sendReward;
