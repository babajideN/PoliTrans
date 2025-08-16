# PoliTrans

A blockchain-powered platform for transparent political campaign financing, enabling donors to track fund usage in real-time, participate in governance decisions, and hold campaigns accountable — all on-chain to combat corruption and build trust in politics.

---

## Overview

PoliTrans consists of four main smart contracts that together form a decentralized, transparent, and accountable ecosystem for political campaigns and supporters:

1. **Campaign Token Contract** – Issues and manages campaign-specific donor tokens.
2. **Treasury Management Contract** – Tracks donations, expenditures, and fund allocations transparently.
3. **Governance DAO Contract** – Allows token holders to vote on campaign proposals and fund usage.
4. **Verification Oracle Contract** – Connects with off-chain data for expenditure verification and compliance checks.

---

## Features

- **Campaign-branded donor tokens** with governance rights  
- **Real-time donation and expenditure tracking** on-chain  
- **DAO-based voting** for supporter-driven decisions on fund allocation  
- **Automated transparency reports** for all transactions  
- **Oracle integration** for verifying real-world expenditures (e.g., invoices, receipts)  
- **Anti-corruption mechanisms** like whistleblower rewards and locked funds  
- **Secure token staking** for enhanced voting power  

---

## Smart Contracts

### Campaign Token Contract
- Mint, burn, and transfer campaign-specific tokens to donors
- Staking mechanisms for increased governance influence
- Token supply limits tied to campaign goals

### Treasury Management Contract
- Receive and log donations in stablecoins or tokens
- Track and categorize expenditures with immutable records
- Enforce spending rules (e.g., percentages for ads, events)

### Governance DAO Contract
- Proposal creation and voting weighted by staked tokens
- On-chain execution of approved proposals (e.g., fund releases)
- Quorum requirements and voting timelines

### Verification Oracle Contract
- Secure integration with off-chain data providers for receipt validation
- Trigger alerts for discrepancies in reported vs. verified expenditures
- Automated compliance checks against campaign finance laws

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/politrans.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete transparent campaigning experience.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License