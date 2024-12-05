import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { LIT_NETWORK } from '@lit-protocol/constants';
import { encryptString } from '@lit-protocol/encryption';
import { create } from 'ipfs-http-client';

dotenv.config();

/**
 * Initialize Lit Node Client
 */
const initializeLitNodeClient = async () => {
    console.log('Initializing Lit Node Client...');
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: LIT_NETWORK.DatilDev });
    await litNodeClient.connect();
    console.log('LitNodeClient connected.');
    return litNodeClient;
};

/**
 * Initialize IPFS Client
 */
const initializeIpfsClient = () => {
    try {
        console.log('Initializing IPFS Client...');
        const projectId = process.env.INFURA_PROJECT_ID;
        const projectSecret = process.env.INFURA_PROJECT_SECRET;

        if (!projectId || !projectSecret) {
            throw new Error('Infura Project ID and Secret are required in .env file.');
        }

        const auth = `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString('base64')}`;

        const ipfsClient = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https',
            headers: {
                Authorization: auth,
            },
        });

        console.log('IPFS Client initialized successfully.');
        return ipfsClient;
    } catch (error) {
        console.error('Error initializing IPFS Client:', error);
        throw error;
    }
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
 * Save Data to IPFS
 */
const saveToIPFS = async (data, fileName, ipfsClient) => {
    try {
        console.log(`Uploading ${fileName} to IPFS...`);
        const { cid } = await ipfsClient.add(data);
        console.log(`${fileName} uploaded to IPFS with CID:`, cid.toString());
        return cid.toString();
    } catch (error) {
        console.error(`Failed to upload ${fileName} to IPFS:`, error);
        throw new Error(`IPFS upload failed for ${fileName}.`);
    }
};

/**
 * Save Encryption Results to Files and IPFS
 */
const saveEncryptionResults = async (ciphertext, dataToEncryptHash, accessControlConditions, ipfsClient) => {
    try {
        console.log('Saving encrypted data and metadata to local files...');
        fs.writeFileSync('encryptedAsset.txt', ciphertext);
        fs.writeFileSync('dataToEncryptHash.txt', dataToEncryptHash);
        fs.writeFileSync(
            'accessControlConditions.json',
            JSON.stringify(accessControlConditions, null, 2)
        );

        console.log('Uploading encrypted data and metadata to IPFS...');
        const ciphertextCid = await saveToIPFS(ciphertext, 'encryptedAsset.txt', ipfsClient);
        const dataToEncryptHashCid = await saveToIPFS(dataToEncryptHash, 'dataToEncryptHash.txt', ipfsClient);
        const accessControlConditionsCid = await saveToIPFS(
            JSON.stringify(accessControlConditions, null, 2),
            'accessControlConditions.json',
            ipfsClient
        );

        console.log('Encryption complete. All data uploaded to IPFS successfully.');
        return {
            ciphertextCid,
            dataToEncryptHashCid,
            accessControlConditionsCid,
        };
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
        const ipfsClient = initializeIpfsClient();

        const contractAddress = '0x5F3933184A2BFEAc07d85c1D07a0787552F135B9';
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

        const asset = 'This is the secret asset to be revealed upon fund release.';
        console.log('Asset to encrypt:', asset);

        const { ciphertext, dataToEncryptHash } = await encryptAsset(
            litNodeClient,
            accessControlConditions,
            asset
        );

        if (!ciphertext || !dataToEncryptHash) {
            throw new Error('Encryption failed: outputs are undefined.');
        }

        const cids = await saveEncryptionResults(
            ciphertext,
            dataToEncryptHash,
            accessControlConditions,
            ipfsClient
        );

        console.log('CIDs for the uploaded data:', cids);
    } catch (error) {
        console.error('Error in encryptAsset function:', error);
        process.exit(1);
    }
};

main();
