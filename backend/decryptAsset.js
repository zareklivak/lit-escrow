// decryptAsset.js
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// Import the Lit SDK and helpers
const LitJsSdk = require('@lit-protocol/lit-node-client');
const { LIT_NETWORK } = require('@lit-protocol/constants');
const { checkAndSignAuthMessage } = require('@lit-protocol/auth-helpers');

const decryptAsset = async () => {
    const chain = 'ethereum';

    // Initialize LitNodeClient
    const litNodeClient = new LitJsSdk.LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev,
    });
    await litNodeClient.connect();

    // Buyer's wallet
    const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY);

    // Buyer's authentication signature
    const authSig = await checkAndSignAuthMessage({ chain, ethers, wallet: buyerWallet });

    // Read encrypted asset and symmetric key
    const encryptedString = fs.readFileSync('encryptedAsset', 'utf8');
    const encryptedSymmetricKeyHex = fs.readFileSync('encryptedSymmetricKey', 'utf8').trim();
    const encryptedSymmetricKey = LitJsSdk.hexStringToUint8Array(encryptedSymmetricKeyHex);

    // Define access control conditions
    const accessControlConditions = [
        {
            contractAddress: fs.readFileSync('contractAddress.txt', 'utf8').trim(),
            standardContractType: '',
            chain: chain,
            method: 'isFundsReleased',
            parameters: [],
            returnValueTest: {
                comparator: '=',
                value: 'true',
            },
        },
    ];

    // Retrieve symmetric key
    const symmetricKey = await litNodeClient.getEncryptionKey({
        accessControlConditions,
        toDecrypt: encryptedSymmetricKey,
        chain,
        authSig,
    });

    // Decrypt the asset
    const decryptedString = await LitJsSdk.decryptString(
        encryptedString,
        symmetricKey
    );

    console.log('Decrypted Asset:', decryptedString);
};

decryptAsset().catch((error) => {
    console.error('Error in decryptAsset:', error);
    process.exit(1);
});
