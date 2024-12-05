import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { decryptToString } from '@lit-protocol/encryption';
import { LIT_ABILITY, LIT_NETWORK } from '@lit-protocol/constants';
import { createSiweMessageWithRecaps, generateAuthSig } from '@lit-protocol/auth-helpers';
import { LocalStorage } from 'node-localstorage';
import fs from 'fs/promises';
import axios from 'axios';

dotenv.config();

const localStorage = new LocalStorage('./lit_storage.db');

const initializeLitNodeClient = async () => {
    console.log('🔄 Connecting to the Lit Protocol network...');
    const litNodeClient = new LitNodeClientNodeJs({
        litNetwork: LIT_NETWORK.DatilDev,
        storageProvider: { provider: localStorage },
    });
    await litNodeClient.connect();
    console.log('✅ Connected to the Lit network.');
    return litNodeClient;
};

const fetchFromIPFS = async (cid) => {
    try {
        const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
        return response.data;
    } catch (error) {
        throw new Error(`IPFS fetch failed for CID: ${cid}`);
    }
};

const main = async () => {
    try {
        // Load encrypted asset and access control conditions
        const cids = JSON.parse(await fs.readFile('cids.json', 'utf8'));
        const accessControlConditions = await fetchFromIPFS(cids.accessControlConditionsCid);
        const encryptedAsset = await fetchFromIPFS(cids.encryptedAssetCid);

        // Initialize LitNodeClient
        const litNodeClient = await initializeLitNodeClient();

        // Generate session signatures using createSiweMessageWithRecaps
        const sessionSigs = await litNodeClient.getSessionSigs({
            chain: 'ethereum',
            resourceAbilityRequests: [
                {
                    resource: `lit-accesscontrolcondition://${cids.accessControlConditionsCid}`,
                    ability: LIT_ABILITY.AccessControlConditionDecryption,
                },
            ],
            authNeededCallback: async ({ uri, expiration, resources }) => {
                const wallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY);

                // Create the SIWE message with required parameters
                const siweMessage = await createSiweMessageWithRecaps({
                    uri,
                    expiration,
                    resources,
                    walletAddress: wallet.address,
                    nonce: await litNodeClient.getLatestBlockhash(),
                });

                // Generate the AuthSig using the prepared SIWE message
                return generateAuthSig({
                    signer: wallet,
                    toSign: siweMessage,
                });
            },
        });

        console.log('✅ Session Signatures obtained:', sessionSigs);

        // Decrypt the encrypted asset
        const decryptedAsset = await decryptToString(
            {
                accessControlConditions,
                chain: 'ethereum',
                encryptedString: encryptedAsset.ciphertext,
                encryptedSymmetricKey: encryptedAsset.encryptedSymmetricKey,
                sessionSigs,
            },
            litNodeClient
        );

        console.log('🎉 Decrypted Asset:', decryptedAsset);
    } catch (error) {
        console.error('❌ Decryption failed:', error.message);
        console.error('Full Error:', error);
    }
};

main();
