import dotenv from 'dotenv';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { encryptString } from '@lit-protocol/encryption';
import { LIT_NETWORK } from '@lit-protocol/constants';
import fs from 'fs/promises';
import axios from 'axios';
import FormData from 'form-data';

// Load environment variables
dotenv.config();

// Pinata API credentials from .env
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    console.error('❌ Error: Pinata API Key and Secret are required in the .env file.');
    process.exit(1);
}

/**
 * Initialize the Lit Protocol Node Client.
 */
const initializeLitNodeClient = async () => {
    console.log('🔄 Connecting to the Lit Protocol network...');
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: LIT_NETWORK.DatilDev });
    await litNodeClient.connect();
    console.log('✅ Connected to the Lit network.');
    return litNodeClient;
};

/**
 * Upload data to Pinata (IPFS).
 */
const uploadToPinata = async (fileName, data) => {
    try {
        console.log(`📤 Uploading "${fileName}" to Pinata...`);

        const formData = new FormData();
        formData.append('file', Buffer.from(data, 'utf8'), fileName);

        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxContentLength: 'Infinity',
            headers: {
                ...formData.getHeaders(),
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_API_SECRET,
            },
        });

        console.log(`✅ Uploaded "${fileName}" | CID: ${response.data.IpfsHash}`);
        return response.data.IpfsHash;
    } catch (error) {
        console.error(`❌ Failed to upload "${fileName}" to Pinata:`, error.message);
        throw new Error('Upload failed.');
    }
};

/**
 * Save generated CIDs to a JSON file.
 */
const saveCIDsToFile = async (cids) => {
    const fileName = 'cids.json';
    try {
        await fs.writeFile(fileName, JSON.stringify(cids, null, 2));
        console.log(`✅ CIDs saved to ${fileName}`);
    } catch (error) {
        console.error(`❌ Error saving CIDs to file:`, error.message);
    }
};

/**
 * Main function to execute the encryption workflow.
 */
const main = async () => {
    try {
        const contractAddress = (await fs.readFile('contractAddress.txt', 'utf8')).trim();
        const chain = 'ethereum';
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

        console.log('🛡️ Access Control Conditions:', JSON.stringify(accessControlConditions, null, 2));

        const litNodeClient = await initializeLitNodeClient();

        const asset = 'This is the secret asset to be revealed upon fund release.';
        const { ciphertext, dataToEncryptHash } = await encryptString(
            { accessControlConditions, dataToEncrypt: asset },
            litNodeClient
        );

        const cids = {
            ciphertextCid: await uploadToPinata('encryptedAsset.txt', ciphertext),
            dataToEncryptHashCid: await uploadToPinata('dataToEncryptHash.txt', dataToEncryptHash),
            accessControlConditionsCid: await uploadToPinata(
                'accessControlConditions.json',
                JSON.stringify(accessControlConditions, null, 2)
            ),
        };

        await saveCIDsToFile(cids);

        console.log('🎉 Workflow completed successfully.');
        console.log('🔗 Ciphertext CID:', cids.ciphertextCid);
        console.log('🔗 Data Hash CID:', cids.dataToEncryptHashCid);
        console.log('🔗 Access Control CID:', cids.accessControlConditionsCid);
    } catch (error) {
        console.error('❌ An error occurred:', error.message);
    }
};

main();
