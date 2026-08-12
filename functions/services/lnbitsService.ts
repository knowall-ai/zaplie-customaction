import { getCredentials } from '../services/utils';
import { HttpRequest } from "@azure/functions"

/// <reference path="../types/global.d.ts" />

let lnbiturl: string | null = null;
let currentUsername: string | null = null;
let currentPassword: string | null = null;

// Store token (persists between requests)
let accessToken: string | null = null;
let accessTokenPromise: Promise<string> | null = null;

// Function to set credentials from the request
export function setLnbitUrl(req: HttpRequest) {
    const { siteUrl, username, password } = getCredentials(req);
    lnbiturl = siteUrl;
    currentUsername = username;
    currentPassword = password;
    // Reset access token when credentials change
    accessToken = null;
}

export async function getAccessToken(
    req: HttpRequest,
    username: string,
    password: string,
): Promise<string> {
    if (!lnbiturl) {
        setLnbitUrl(req);
    }

    if (accessToken) {
        return accessToken;
    }

    if (accessTokenPromise) {
        return accessTokenPromise;
    }

    console.log('Requesting new access token from LNbits...');
    accessTokenPromise = (async (): Promise<string> => {
        try {
            const response = await fetch(`${lnbiturl}/api/v1/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    accept: 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error(
                    `Error creating access token (status: ${response.status}): ${response.statusText}`,
                );
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not in JSON format');
            }

            const data = await response.json() as { access_token: string };
            if (!data || !data.access_token) {
                throw new Error('Access token is missing in the response');
            }

            accessToken = data.access_token;
            console.log('Access token obtained successfully');
            return accessToken;
        } catch (error) {
            console.error('Error in getAccessToken:', error);
            throw new Error('Failed to retrieve access token');
        } finally {
            accessTokenPromise = null;
        }
    })();

    return accessTokenPromise;
}

const getWallets = async (
    req: HttpRequest,
    adminKey: string,
    filterByName?: string,
    filterById?: string,
): Promise<Wallet[] | null> => {
    console.log(`getWallets starting...`);

    // Ensure credentials are set from request
    if (!lnbiturl || !currentUsername || !currentPassword) {
        setLnbitUrl(req);
    }

    if (!currentUsername || !currentPassword) {
        console.error('Missing username or password');
        return null;
    }

    try {
        const token = await getAccessToken(req, currentUsername, currentPassword);
        const response = await fetch(`${lnbiturl}/api/v1/wallets`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Error getting wallets (status: ${response.status})`);
        }

        const data = await response.json() as Wallet[];

        // Filter if needed
        let filteredData = data;
        if (filterByName) {
            filteredData = filteredData.filter(wallet => wallet.name.includes(filterByName));
        }
        if (filterById) {
            filteredData = filteredData.filter(wallet => wallet.id === filterById);
        }

        // Map and enrich wallet data
        const walletData: Wallet[] = filteredData.map((wallet: any) => ({
            id: wallet.id,
            admin: wallet.admin || '',
            name: wallet.name,
            adminkey: wallet.adminkey,
            user: wallet.user,
            inkey: wallet.inkey,
            balance_msat: wallet.balance_msat || 0,
            deleted: wallet.deleted || false,
        }));

        // Remove deleted wallets
        return walletData.filter(wallet => wallet.deleted !== true);
    } catch (error) {
        console.error('Error in getWallets:', error);
        return null;
    }
};

const getUserWallets = async (
    req: HttpRequest,
    adminKey: string,
    userId: string,
): Promise<Wallet[] | null> => {
    console.log(`getUserWallets starting for user: ${userId}`);

    if (!lnbiturl || !currentUsername || !currentPassword) {
        setLnbitUrl(req);
    }

    if (!currentUsername || !currentPassword) {
        console.error('Missing username or password');
        return null;
    }

    try {
        const token = await getAccessToken(req, currentUsername, currentPassword);
        const response = await fetch(
            `${lnbiturl}/users/api/v1/user/${userId}/wallet`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        if (!response.ok) {
            throw new Error(`Error getting user wallets (status: ${response.status})`);
        }

        const data: Wallet[] = await response.json() as Wallet[];

        const walletData: Wallet[] = data.map((wallet: any) => ({
            id: wallet.id,
            admin: wallet.admin || '',
            name: wallet.name,
            adminkey: wallet.adminkey,
            user: wallet.user,
            inkey: wallet.inkey,
            balance_msat: wallet.balance_msat || 0,
            deleted: wallet.deleted || false,
        }));

        return walletData.filter(wallet => wallet.deleted !== true);
    } catch (error) {
        console.error('Error in getUserWallets:', error);
        return null;
    }
};

const createInvoice = async (
    req: HttpRequest,
    lnKey: string,
    recipientWalletId: string,
    amount: number,
    memo: string,
    extra: object,
): Promise<string | null> => {
    console.log(`createInvoice: amount=${amount}, memo=${memo}`);

    if (!lnbiturl) {
        setLnbitUrl(req);
    }

    try {
        const response = await fetch(`${lnbiturl}/api/v1/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': lnKey,
            },
            body: JSON.stringify({
                out: false,
                amount: amount,
                memo: memo,
                extra: extra,
                unit: 'sat',
            }),
        });

        if (!response.ok) {
            throw new Error(`Error creating invoice (status: ${response.status})`);
        }

        const data = await response.json() as any;
        console.log('Invoice created successfully');
        return data.payment_request;
    } catch (error) {
        console.error('Error in createInvoice:', error);
        return null;
    }
};

const payInvoice = async (
    req: HttpRequest,
    adminKey: string,
    paymentRequest: string,
    extra: object,
): Promise<any> => {
    console.log(`payInvoice: paying invoice...`);

    if (!lnbiturl) {
        setLnbitUrl(req);
    }

    try {
        const response = await fetch(`${lnbiturl}/api/v1/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': adminKey,
            },
            body: JSON.stringify({
                out: true,
                bolt11: paymentRequest,
                extra: extra,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error paying invoice (status: ${response.status})`);
        }

        const data = await response.json();
        console.log('Invoice paid successfully');
        return data;
    } catch (error) {
        console.error('Error in payInvoice:', error);
        throw error;
    }
};

const getWalletBalance = async (inKey: string): Promise<number> => {
    console.log(`getWalletBalance starting...`);

    try {
        const response = await fetch(`${lnbiturl}/api/v1/wallet`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': inKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Error getting wallet balance (status: ${response.status})`);
        }

        const data = await response.json() as any;
        return data.balance / 1000; // Convert from msat to sats
    } catch (error) {
        console.error('Error in getWalletBalance:', error);
        throw error;
    }
};

export {
    getWallets,
    getUserWallets,
    createInvoice,
    payInvoice,
    getWalletBalance,
};
