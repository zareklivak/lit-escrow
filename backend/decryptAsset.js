import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { decryptToString } from '@lit-protocol/encryption';
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { LitAccessControlConditionResource, createSiweMessageWithRecaps, generateAuthSig } from '@lit-protocol/auth-helpers';
import fs from 'fs/promises';
import axios from 'axios';

dotenv.config();

const initializeLitNodeClient = async () => {
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: LIT_NETWORK.DatilDev });
    await litNodeClient.connect();
    return litNodeClient;
};

const getSessionSigs = async (litNodeClient, accessControlConditions) => {
    const wallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY);
    const latestBlockhash = await litNodeClient.getLatestBlockhash();

    const authNeededCallback = async (params) => {
        const toSign = await createSiweMessageWithRecaps({
            uri: params.uri,
            expiration: params.expiration,
            resources: params.resourceAbilityRequests,
            walletAddress: wallet.address,
            nonce: latestBlockhash,
            litNodeClient,
        });

        return await generateAuthSig({
            signer: wallet,
            toSign,
        });
    };

    const litResource = new LitAccessControlConditionResource('*');

    return await litNodeClient.getSessionSigs({
        chain: 'ethereum',
        resourceAbilityRequests: [{
            resource: litResource,
            ability: LIT_ABILITY.AccessControlConditionDecryption,
        }],
        authNeededCallback,
    });
};

const fetchFromIPFS = async (cid) => {
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        responseType: 'text',
        transformResponse: [(data) => data]
    });
    return JSON.parse(response.data);
};

const main = async () => {
    try {
        const contractAddress = (await fs.readFile('contractAddress.txt', 'utf8')).trim();
        const accessControlConditions = [{
            contractAddress,
            standardContractType: '',
            chain: 'ethereum',
            method: 'isFundsReleased',
            parameters: [],
            returnValueTest: {
                comparator: '=',
                value: 'true'
            }
        }];

        const litNodeClient = await initializeLitNodeClient();
        const sessionSigs = await getSessionSigs(litNodeClient, accessControlConditions);
        const cids = JSON.parse(await fs.readFile('cids.json', 'utf8'));
        const encryptedData = await fetchFromIPFS(cids.ciphertextCid);

        console.log('Encrypted Data:', encryptedData);

        const decryptedString = await decryptToString(
            {
                accessControlConditions,
                chain: 'ethereum',
                sessionSigs,
                encryptedSymmetricKey: encryptedData.encryptedSymmetricKey,
                encryptedString: encryptedData.encryptedString,
            },
            litNodeClient
        );

        console.log('Decrypted Asset:', decryptedString);
        return decryptedString;
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
};

main();