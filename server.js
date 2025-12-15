// server.js
require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const { StacksMainnet } = require('micro-stacks/network');
const { 
    ContractCallPayloadBuilder, 
    TransactionVersion, 
    uintCV, 
    callReadOnlyFunction
} = require('micro-stacks/transactions');
const { getPublicKey, publicKeyToAddress, signTransaction, createStacksPrivateKey } = require('micro-stacks/cryptography');

const app = express();
// Middleware to parse JSON payload, important for Chainhook webhooks
app.use(express.json()); 
const PORT = process.env.CHAINHOOK_SERVER_PORT || 3000;

// --- Stacks Configuration ---
const network = new StacksMainnet({ url: process.env.STACKS_NETWORK_URL });
const privateKey = process.env.PRIVATE_KEY; 
const publicKey = getPublicKey(createStacksPrivateKey(privateKey));
const senderAddress = process.env.DEPLOYER_ADDRESS;

// --- Google Sheets Configuration ---
async function authenticateGoogleSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            // Replaces escaped newlines if present
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
        },
        scopes: ['[https://www.googleapis.com/auth/spreadsheets](https://www.googleapis.com/auth/spreadsheets)'], // Use sheets scope for read/write flexibility
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

// --- Helper Functions ---

/**
 * Triggers an automated report generation in Google Docs/Sheets.
 * (Placeholder for more complex G-Suite integration)
 */
async function generateFinalReport(proposalId) {
    console.log(`[REPORTING] Starting final report for Proposal ID: ${proposalId}`);
    
    // 1. Fetch proposal data from the contract
    const readResult = await callReadOnlyFunction({
        contractAddress: process.env.VOTE_MANAGER_ADDRESS.split('.')[0],
        contractName: 'vote-manager',
        functionName: 'get-proposal-data',
        functionArgs: [uintCV(proposalId)],
        senderAddress: senderAddress,
        network,
    });
    
    // 2. Format data and write to Google Sheets (e.g., to an 'Archive' sheet)
    // Placeholder: In a real app, use the Google Sheets API to append a row of results.
    console.log(`[REPORTING] Proposal Data fetched: ${JSON.stringify(readResult)}`);
    
    const sheets = await authenticateGoogleSheets();
    await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.VOTING_SHEET_ID,
        range: 'Reports!A:G', // Append to a separate Reports sheet
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [
                [
                    proposalId, 
                    readResult.value.proposer, 
                    readResult.value['yes-votes'].value, 
                    readResult.value['no-votes'].value, 
                    new Date().toISOString()
                ]
            ],
        },
    });

    console.log(`[REPORTING] Report data logged to Google Sheet.`);
}

// --- API Endpoints ---

/**
 * GET /api/voting-topics
 * Fetches dynamic voting themes from Google Sheets.
 */
app.get('/api/voting-topics', async (req, res) => {
    try {
        const sheets = await authenticateGoogleSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.VOTING_SHEET_ID,
            range: process.env.VOTING_SHEET_RANGE, 
        });

        const [headers, ...data] = response.data.values;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'No active voting topics found.' });
        }

        // Example mapping based on [Title, Duration (blocks), Category, Description]
        const topics = data.map(row => ({
            title: row[0],
            durationBlocks: parseInt(row[1]),
            category: row[2],
            description: row[3],
        }));

        res.json({ topics });
    } catch (error) {
        console.error('Error reading Google Sheet:', error.message);
        res.status(500).json({ error: 'Failed to fetch topics from Google Sheets.' });
    }
});

/**
 * POST /chainhook
 * Receives events from the Chainhook service (e.g., when a block containing PROPOSAL_EXECUTED is confirmed).
 */
app.post('/chainhook', async (req, res) => {
    const { payload } = req.body;
    
    // Basic secret verification (full implementation requires HMAC validation)
    // if (req.headers['x-chainhook-secret'] !== process.env.CHAINHOOK_WEBHOOK_SECRET) {
    //     return res.status(401).send('Unauthorized');
    // }

    try {
        for (const block of payload.chainhook.blocks) {
            for (const tx of block.transactions) {
                // Find the event signaling execution from the VoteManager contract
                const executionEvent = tx.events.find(e => {
                    if (e.type === 'contract_event' && e.contract_event.topic === 'print') {
                        // Check if it's the specific PROPOSAL_EXECUTED event
                        return e.contract_event.value.event === 'PROPOSAL_EXECUTED';
                    }
                    return false;
                });

                if (executionEvent) {
                    const proposalId = executionEvent.contract_event.value.id.value; 
                    
                    console.log(`[CHAINHOOK] Proposal ${proposalId} executed. Triggering reporting.`);
                    
                    // 1. Trigger Automated Reporting (Write results to Google Sheet)
                    await generateFinalReport(parseInt(proposalId));

                    // Note: The reward distribution is handled *on-chain* by the execute-proposal function 
                    // calling the sbt-reward contract, as seen in vote-manager.clar.
                }
            }
        }
        res.status(200).send('Events processed successfully.');
    } catch (error) {
        console.error('Error processing Chainhook payload:', error.message);
        res.status(500).json({ error: 'Internal Server Error during Chainhook processing.' });
    }
});

app.listen(PORT, () => {
    console.log(`Middleware Server listening on port ${PORT}`);
    console.log(`Chainhook webhook URL: http://localhost:${PORT}/chainhook`);
});
