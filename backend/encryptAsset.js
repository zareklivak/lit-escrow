require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const { LitNodeClientNodeJs } = require('@lit-protocol/lit-node-client-nodejs');
const { LIT_NETWORK } = require('@lit-protocol/constants');
const { encryptString } = require('@lit-protocol/encryption');

/**
 * Initialize the Lit Node Client
 */
const initializeLitNodeClient = async () => {
    console.log('Initializing Lit Node Client...');
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: LIT_NETWORK.DatilDev });
    await litNodeClient.connect();
    console.log('LitNodeClient connected.');
    return litNodeClient;
};

/**
 * Load Contract Address
 */
const loadContractAddress = () => {
    try {
        console.log('Reading contract address from file...');
        const contractAddress = fs.readFileSync('contractAddress.txt', 'utf8').trim();
        console.log('Contract address loaded:', contractAddress);
        return contractAddress;
    } catch (error) {
        console.error('Failed to read contract address:', error);
        throw new Error('Contract address file missing or unreadable.');
    }
};

/**
 * Define Access Control Conditions
 */
const defineAccessControlConditions = (contractAddress, chain) => {
    const conditions = [
        {
            contractAddress,
            standardContractType: '',
            chain,
            method: 'isFundsReleased',
            parameters: [],
            returnValueTest: {
                comparator: '=',
                value: 'true',
            },
        },
    ];
    console.log('Access Control Conditions:', JSON.stringify(conditions, null, 2));
    return conditions;
};

/**
 * Encrypt the Asset
 */
const encryptAsset = async (litNodeClient, accessControlConditions, asset) => {
    try {
        console.log('Encrypting the asset...');
        const encryptionResult = await encryptString(
            { accessControlConditions, dataToEncrypt: asset },
            litNodeClient
        );
        console.log('Encryption result:', encryptionResult);
        return encryptionResult;
    } catch (error) {
        console.error('Error during encryption process:', error);
        throw new Error('Encryption process failed.');
    }
};

/**
 * Save Encryption Results to Files
 */
const saveEncryptionResults = (ciphertext, dataToEncryptHash, accessControlConditions) => {
    try {
        console.log('Saving encrypted data and metadata...');
        fs.writeFileSync('encryptedAsset.txt', ciphertext);
        fs.writeFileSync('dataToEncryptHash.txt', dataToEncryptHash);
        fs.writeFileSync(
            'accessControlConditions.json',
            JSON.stringify(accessControlConditions, null, 2)
        );
        console.log('Encryption complete. Files saved successfully.');
    } catch (error) {
        console.error('Error saving encrypted data and metadata:', error);
        throw new Error('Failed to save encrypted data and metadata.');
    }
};

/**
 * Main Function
 */
const main = async () => {
    try {
        const chain = 'ethereum';
        const litNodeClient = await initializeLitNodeClient();
        const contractAddress = loadContractAddress();
        const accessControlConditions = defineAccessControlConditions(contractAddress, chain);
        const asset = 'This is the secret asset to be revealed upon fund release.';
        console.log('Asset to encrypt:', asset);

        const { ciphertext, dataToEncryptHash } = await encryptAsset(
            litNodeClient,
            accessControlConditions,
            asset
        );

        if (!ciphertext || !dataToEncryptHash) {
            console.error('Encryption failed: outputs are undefined.');
            throw new Error('Encryption returned undefined results.');
        }

        saveEncryptionResults(ciphertext, dataToEncryptHash, accessControlConditions);
    } catch (error) {
        console.error('Error in encryptAsset function:', error);
        process.exit(1);
    }
};

main();
