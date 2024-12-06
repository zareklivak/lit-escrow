# Decentralized Escrow Platform

## Project Objective
This project is designed to create a **Decentralized Escrow Platform** that uses **Ethereum smart contracts** and the **Lit Protocol** to facilitate secure and conditional exchange of funds and assets. Key functionalities include:

1. **Escrow Fund Management**:
   - Secure handling of ETH deposits and conditional release of funds.
2. **Conditional Asset Decryption**:
   - Encryption of sensitive assets with decryption conditioned upon fund release.
3. **Decentralized Storage Integration**:
   - Storing encrypted assets on **IPFS** (via **Pinata**) for decentralized and immutable storage.

### Key Benefits
- **Buyer-Seller Fairness**: Protects both parties by enforcing conditional transactions.
- **Transparency**: Blockchain-based validation ensures trust.
- **Decentralization**: Eliminates the need for intermediaries.

---

## Workflow

### **Step 1: Asset Preparation and Encryption (Seller)**

#### Process
1. **Asset Encryption**:
   - Utilize the **Lit Protocol SDK** to encrypt assets (e.g., confidential documents).
   - Define **Access Control Conditions (ACCs)** to restrict decryption. The ACCs enforce that `isFundsReleased == true` in the smart contract.

2. **Storage**:
   - Upload the encrypted asset and ACCs to **IPFS** using **Pinata**.
   - Save the generated **CIDs** for:
     - Encrypted asset.
     - Access Control Conditions (ACCs).

#### Outputs
- `ciphertext`: Encrypted asset.
- `encryptedSymmetricKey`: Decryption key secured with ACCs.

**Code Reference**: [encryptAssetTest.js](encryptAssetTest.js)

---

### **Step 2: Fund Deposit (Buyer)**

#### Process
1. **Deposit ETH**:
   - Buyer calls the `deposit` function on the escrow smart contract.
   - The smart contract validates:
     - Sender is the buyer.
     - Funds haven’t already been deposited.
     - Deposit amount > 0.

2. **State Update**:
   - Sets `isFundsDeposited = true`.

#### Post-Deposit State
- `isFundsDeposited == true`
- `isFundsReleased == false`

**Code Reference**: [depositFunds.js](depositFunds.js)

---

### **Step 3: Fund Release and Decryption (Buyer)**

#### Process
1. **Release Funds**:
   - Buyer calls the `releaseFunds` function on the escrow smart contract.
   - Contract ensures:
     - Caller is the buyer.
     - Funds have been deposited and not yet released.

2. **Fund Transfer**:
   - Sends ETH to the seller.
   - Sets `isFundsReleased = true`.

3. **Decryption**:
   - Buyer requests the decryption key from the Lit Protocol.
   - Lit verifies `isFundsReleased == true`.
   - Buyer decrypts the asset.

**Code Reference**: [releaseFunds.js](releaseFunds.js), [decryptAsset.js](decryptAsset.js)

---

## Deployment and Setup

### **Smart Contract Deployment**
1. Use the `deploy.js` script to deploy the escrow smart contract.
2. The deployed contract address is stored in `contractAddress.txt`.

**Code Reference**: [deploy.js](deploy.js)

---

## How to Use

### **Prerequisites**
1. Install Node.js (v14+ recommended).
2. Set up a `.env` file with the following:
   - `BUYER_PRIVATE_KEY`: Private key of the buyer's Ethereum wallet.
   - `SELLER_PRIVATE_KEY`: Private key of the seller's Ethereum wallet.
   - `ALCHEMY_API_URL`: Ethereum network endpoint.
   - `PINATA_API_KEY` and `PINATA_API_SECRET`: For IPFS uploads via Pinata.
