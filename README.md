# stacks-governance-vault

## 🌟 Project Overview: Bitcoin-Anchored Governance

The Stacks Governance Vault (SGV) establishes a secure, transparent, and automated system for decentralized governance within the Stacks ecosystem. The key innovation is using a **Google Sheet** as the central, user-friendly source for managing proposal topics and leveraging **Chainhooks** to automate post-vote actions like reward distribution and off-chain reporting.



### ⚙️ Core Components

1.  **Clarity Smart Contracts:** The core logic for voting and reward distribution is handled by `vote-manager.clar` and `sbt-reward.clar`.
2.  **Node.js Middleware Server:** The crucial link that:
    * Serves voting topics from Google Sheets to the frontend.
    * Listens for on-chain events via Chainhooks.
    * Sends automated transactions (e.g., executing rewards) to the Stacks network.
3.  **Google Sheets:** Used as the dynamic configuration source for governance themes (replacing static JSON files).
4.  **Chainhooks Integration:** Provides reliable, reorg-aware event indexing, triggering the Middleware when a proposal is executed on-chain.

### 🛠️ Setup and Installation

#### 1. Prerequisites

* Node.js (v18+)
* An operational Stacks node/API endpoint.
* A Google Cloud Project with the Sheets API enabled and a Service Account created for authentication.

#### 2. Environment Variables

Create a `.env` file in the root directory.

```env
# --- Stacks Network Configuration ---
STACKS_NETWORK_URL=[https://api.stacks.co](https://api.stacks.co)
VOTE_MANAGER_ADDRESS=SP... # Deployed address of VoteManager.clar (e.g., SP12345.vote-manager)
SBT_REWARD_ADDRESS=SP...   # Deployed address of SBTReward.clar (e.g., SP12345.sbt-reward)
PRIVATE_KEY=...            # Private key for the Stacks deployer account (for transaction signing by the Middleware)
DEPLOYER_ADDRESS=SP...     # Address associated with the PRIVATE_KEY

# --- Google Sheets API Configuration ---
GOOGLE_SERVICE_ACCOUNT_EMAIL=sheets-reader@your-project.iam.gserviceaccount.com
# NOTE: The private key must be correctly formatted with actual newlines or escaped newlines (\n)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
VOTING_SHEET_ID=1A2B3C4D5E6F7G8H9I0J # ID of your configured Google Sheet
VOTING_SHEET_RANGE='GovernanceTopics!A:D' # Sheet and cell range containing the topic data

# --- Chainhooks Configuration ---
CHAINHOOK_WEBHOOK_SECRET=your_secure_chainhook_secret # Used for HMAC verification
CHAINHOOK_SERVER_PORT=3000
