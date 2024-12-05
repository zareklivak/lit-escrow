require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const { LitNodeClientNodeJs } = require('@lit-protocol/lit-node-client-nodejs');
const { LIT_NETWORK } = require('@lit-protocol/constants');
const { encryptString, uint8arrayToString } = require('@lit-protocol/encryption');

const encryptAsset = async () => {
    try {
        const chain = 'ethereum';

        // Initialize LitNodeClient
        const litNodeClient = new LitNodeClientNodeJs({
            litNetwork: LIT_NETWORK.DatilDev,
        });
        await litNodeClient.connect();
        console.log('LitNodeClient connected.');

        // Define access control conditions
        const accessControlConditions = [
            {
                contractAddress: "",
                standardContractType: "",
                chain: "ethereum",
                method: "eth_getBalance",
                parameters: [":userAddress", "latest"],
                returnValueTest: {
                    comparator: ">=",
                    value: "1000000000000", // 0.000001 ETH
                },
            },
        ];

        // Asset to encrypt
        const asset = 'This is the secret asset to be revealed upon fund release.';

        // Encrypt the asset
        const encryptionResult = await encryptString(
            {
                accessControlConditions, // Valid conditions for decryption
                dataToEncrypt: asset,
            },
            litNodeClient // Lit Node Client instance
        );

        // Extract the results
        const { ciphertext, dataToEncryptHash } = encryptionResult;

        console.log('Encryption Result:', { ciphertext, dataToEncryptHash });

        // Save encrypted data and metadata
        fs.writeFileSync('encryptedAsset.txt', ciphertext);
        fs.writeFileSync('dataToEncryptHash.txt', dataToEncryptHash);
        fs.writeFileSync(
            'accessControlConditions.json',
            JSON.stringify(accessControlConditions, null, 2)
        );

        console.log('Encryption complete. Files saved.');
    } catch (error) {
        console.error('Error in encryptAsset:', error);
        process.exit(1);
    }
};

encryptAsset();
