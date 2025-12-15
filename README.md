# stacks-governance-vault

## Project Overview: Bitcoin-Anchored Governance

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
