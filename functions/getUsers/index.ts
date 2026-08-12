import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getWallets, setLnbitUrl } from '../services/lnbitsService';
import { getCredentials } from '../services/utils';

/**
 * Get Wallets/Users API Endpoint
 *
 * Lists all wallets in the LNbits instance, which can be used to identify
 * valid recipient user IDs for the sendReward endpoint.
 *
 * GET /api/getUsers
 *
 * Authentication: Basic Auth + query params (siteURL, adminkey)
 */
const listUsers: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('Get Users/Wallets API - Processing request...');

    try {
        // Extract credentials from the request
        const { username, password, siteUrl, adminKey } = getCredentials(req);

        if (!username || !password || !siteUrl || !adminKey) {
            context.res = {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: "Missing authentication credentials. Required: Basic Auth (username:password), siteURL, adminkey"
                })
            };
            return;
        }

        // Set the lnbiturl
        setLnbitUrl(req);

        // Get all wallets (which represent users)
        const wallets = await getWallets(req, adminKey);

        if (!wallets) {
            context.res = {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: "Failed to retrieve wallets from LNbits"
                })
            };
            return;
        }

        // Group wallets by user ID to create user-centric view
        const userMap = new Map<string, {
            userId: string;
            wallets: Array<{
                id: string;
                name: string;
                type: string;
                balance_sats: number;
            }>;
        }>();

        for (const wallet of wallets) {
            const userId = wallet.user;
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    userId: userId,
                    wallets: []
                });
            }

            userMap.get(userId)!.wallets.push({
                id: wallet.id,
                name: wallet.name,
                type: wallet.name === 'Private' ? 'receiving' : wallet.name === 'Allowance' ? 'sending' : 'other',
                balance_sats: Math.floor(wallet.balance_msat / 1000)
            });
        }

        const users = Array.from(userMap.values());

        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                count: users.length,
                users: users
            })
        };

    } catch (error) {
        context.log.error('Error in getUsers:', error);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error.message || "Internal server error"
            })
        };
    }
};

export default listUsers;
