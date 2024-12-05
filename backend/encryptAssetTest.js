import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { LIT_NETWORK } from '@lit-protocol/constants';
import { encryptString } from '@lit-protocol/encryption';

// Load environment variables
dotenv.config();

// Pinata API credentials from .env
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

// Validate Pinata API credentials
if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    console.error('❌ Error: Pinata API Key and Secret are required in the .env file.');
    process.exit(1);
}

/**
 * Initialize the Lit Protocol Node Client.
 * Connects to the Lit network for encryption and access control.
 */
const initializeLitNodeClient = async () => {
    console.log('🔄 [1/4] Connecting to the Lit Protocol network...');
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: LIT_NETWORK.DatilDev });

    await litNodeClient.connect();
    console.log('✅ Connected to the Lit network.');
    return litNodeClient;
};

/**
 * Upload a file or data to Pinata (IPFS).
 * @param {string} fileName - Display name of the file.
 * @param {string|Buffer} data - The data to upload.
 * @returns {string} - The CID (Content Identifier) of the uploaded file.
 */
const uploadToPinata = async (fileName, data) => {
    try {
        console.log(`📤 Uploading "${fileName}" to Pinata...`);

        const formData = new FormData();
        formData.append('file', Buffer.from(data, 'utf8'), fileName);

        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxContentLength: 'Infinity',
            maxBodyLength: 'Infinity',
            headers: {
                ...formData.getHeaders(),
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_API_SECRET,
            },
        });

        console.log(`✅ Uploaded "${fileName}" | CID: ${response.data.IpfsHash}`);
        return response.data.IpfsHash;
    } catch (error) {
        console.error(`❌ Failed to upload "${fileName}" to Pinata:`, error.response?.data || error.message);
        throw new Error(`Upload failed for "${fileName}".`);
    }
};

/**
 * Encrypt a given asset using the Lit Protocol.
 * @param {object} litNodeClient - Lit Protocol client instance.
 * @param {Array} accessControlConditions - Access control conditions for the encryption.
 * @param {string} asset - The asset (text or file data) to encrypt.
 * @returns {object} - Encrypted data and its hash.
 */
const encryptAsset = async (litNodeClient, accessControlConditions, asset) => {
    console.log('🔒 [2/4] Encrypting the asset...');
    try {
        const encryptionResult = await encryptString(
            { accessControlConditions, dataToEncrypt: asset },
            litNodeClient
        );

        console.log('✅ Encryption completed.');
        console.log('   - Ciphertext: (truncated)');
        console.log(`     ${encryptionResult.ciphertext.slice(0, 60)}...`);
        console.log(`   - Data Hash: ${encryptionResult.dataToEncryptHash}`);
        return encryptionResult;
    } catch (error) {
        console.error('❌ Error during the encryption process:', error.message);
        throw new Error('Encryption process failed.');
    }
};

/**
 * Save encrypted data and metadata to Pinata.
 * @param {string} ciphertext - Encrypted data (ciphertext).
 * @param {string} dataToEncryptHash - Hash of the original data.
 * @param {Array} accessControlConditions - Access control conditions as metadata.
 * @returns {object} - Object containing CIDs of the uploaded files.
 */
const saveEncryptionResults = async (ciphertext, dataToEncryptHash, accessControlConditions) => {
    console.log('📦 [3/4] Saving encrypted data and metadata to Pinata...');
    try {
        // Upload ciphertext
        const ciphertextCid = await uploadToPinata('encryptedAsset.txt', ciphertext);

        // Upload hash of the original data
        const dataToEncryptHashCid = await uploadToPinata('dataToEncryptHash.txt', dataToEncryptHash);

        // Upload access control conditions as JSON
        const accessControlConditionsCid = await uploadToPinata(
            'accessControlConditions.json',
            JSON.stringify(accessControlConditions, null, 2)
        );

        console.log('✅ All files uploaded to Pinata.');
        return {
            ciphertextCid,
            dataToEncryptHashCid,
            accessControlConditionsCid,
        };
    } catch (error) {
        console.error('❌ Error saving encrypted data and metadata:', error.message);
        throw new Error('Failed to save encrypted data and metadata.');
    }
};

/**
 * Main Function: Executes the full workflow.
 * 1. Connects to the Lit Protocol.
 * 2. Encrypts the asset.
 * 3. Uploads encrypted data and metadata to Pinata (IPFS).
 */
const main = async () => {
    console.log('======================== ENCRYPTION WORKFLOW START ========================');
    try {
        // 1. Initialize Lit Node Client
        const litNodeClient = await initializeLitNodeClient();

        // 2. Define access control conditions
        const chain = 'ethereum';
        const contractAddress = '0x5F3933184A2BFEAc07d85c1D07a0787552F135B9'; // Replace with your contract address
        const accessControlConditions = [
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

        console.log('🛡️ Defined Access Control Conditions.');
        console.log(JSON.stringify(accessControlConditions, null, 2));

        // 3. The asset to be encrypted
        const asset = 'This is the secret asset to be revealed upon fund release.';
        console.log(`📄 Asset to encrypt: "${asset}"`);

        // 4. Encrypt the asset
        const { ciphertext, dataToEncryptHash } = await encryptAsset(
            litNodeClient,
            accessControlConditions,
            asset
        );

        if (!ciphertext || !dataToEncryptHash) {
            throw new Error('Encryption failed: Missing outputs.');
        }

        // 5. Save the encrypted data and metadata to Pinata
        const cids = await saveEncryptionResults(ciphertext, dataToEncryptHash, accessControlConditions);

        // 6. Display CIDs for uploaded data
        console.log('\n🌐 [4/4] Data uploaded to Pinata successfully:');
        console.log(`   🔗 Ciphertext CID: ${cids.ciphertextCid}`);
        console.log(`   🔗 Data Hash CID: ${cids.dataToEncryptHashCid}`);
        console.log(`   🔗 Access Control Conditions CID: ${cids.accessControlConditionsCid}`);
        console.log('🎉 Workflow completed successfully!');

    } catch (error) {
        console.error('❌ An error occurred during the process:', error.message);
        process.exit(1);
    }
    console.log('==========================================================================');
};

// Execute the main function
main();
