import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import {
    LitAccessControlConditionResource,
    createSiweMessage,
    generateAuthSig,
} from '@lit-protocol/auth-helpers';
import fs from 'fs/promises';
import axios from 'axios';

dotenv.config();

/**
 * Initialize LitNodeClient
 */
const initializeLitNodeClient = async () => {
    console.log('🔄 Connecting to the Lit Protocol network...');
    const litNodeClient = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev, // Use DatilDev for testing
        debug: false,
    });
    await litNodeClient.connect();
    console.log('✅ Connected to the Lit network.');
    return litNodeClient;
};

/**
 * Fetch data from IPFS
 */
const fetchFromIPFS = async (cid) => {
    try {
        console.log(`🔄 Fetching data from IPFS (CID: ${cid})...`);
        const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
        console.log(`✅ Successfully fetched data for CID: ${cid}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Failed to fetch from IPFS (CID: ${cid}):`, error.message);
        throw new Error(`IPFS fetch failed for CID: ${cid}`);
    }
};

/**
 * Generate Session Signatures
 */
const generateSessionSignatures = async (litNodeClient, ethersSigner, accessControlCid) => {
    console.log('🔏 Generating session signatures...');
    return await litNodeClient.getSessionSigs({
        chain: 'ethereum',
        expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        resourceAbilityRequests: [
            {
                resource: new LitAccessControlConditionResource(accessControlCid),
                ability: LIT_ABILITY.AccessControlConditionDecryption,
            },
        ],
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
            console.log('📜 Preparing to sign session auth message...');
            console.log('   🔗 URI:', uri);
            console.log('   🕒 Expiration:', expiration);
            console.log('   📋 Resource Requests:', resourceAbilityRequests);

            const toSign = await createSiweMessage({
                uri,
                expiration,
                resources: resourceAbilityRequests,
                walletAddress: ethersSigner.address,
                nonce: await litNodeClient.getLatestBlockhash(),
                litNodeClient,
            });

            console.log('🖊️ Signing message:', toSign);
            return await generateAuthSig({
                signer: ethersSigner,
                toSign,
            });
        },
    });
};

/**
 * Main function to decrypt the asset
 */
const main = async () => {
    try {
        console.log('🚀 Starting decryption workflow...');
        const cids = JSON.parse(await fs.readFile('cids.json', 'utf8'));
        console.log('🔗 Loaded CIDs:', cids);

        const accessControlConditions = await fetchFromIPFS(cids.accessControlConditionsCid);
        const encryptedAsset = await fetchFromIPFS(cids.encryptedAssetCid);
        console.log('🛡️ Access Control Conditions:', JSON.stringify(accessControlConditions, null, 2));

        const litNodeClient = await initializeLitNodeClient();

        // Initialize Ethereum Signer
        const ethersSigner = new ethers.Wallet(
            process.env.BUYER_PRIVATE_KEY,
            new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API_URL)
        );
        console.log(`🔑 Ethers Signer Address: ${ethersSigner.address}`);

        // Generate Session Signatures
        const sessionSigs = await generateSessionSignatures(
            litNodeClient,
            ethersSigner,
            cids.accessControlConditionsCid
        );

        console.log('✅ Session Signatures obtained:', JSON.stringify(sessionSigs, null, 2));

        // Decrypt the asset
        console.log('🔓 Attempting to decrypt the asset...');
        const decryptedAsset = await litNodeClient.decryptToString(
            {
                accessControlConditions,
                chain: 'ethereum',
                encryptedString: encryptedAsset.ciphertext,
                encryptedSymmetricKey: encryptedAsset.encryptedSymmetricKey,
                sessionSigs,
            },
            litNodeClient
        );

        console.log('🎉 Successfully decrypted the asset:', decryptedAsset);
    } catch (error) {
        console.error('❌ Decryption failed:', error.message);
        console.error('🔍 Debugging info:', error.stack);
    }
};

// Execute the decryption workflow
main();
