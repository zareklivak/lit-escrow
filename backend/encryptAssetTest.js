import dotenv from 'dotenv';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { encryptString } from '@lit-protocol/encryption';
import { LIT_NETWORK } from '@lit-protocol/constants';
import fs from 'fs/promises';
import axios from 'axios';
import FormData from 'form-data';

dotenv.config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    console.error('❌ Error: Pinata API Key and Secret are required in the .env file.');
    process.exit(1);
}

const initializeLitNodeClient = async () => {
    console.log('🔄 Connecting to the Lit Protocol network...');
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: LIT_NETWORK.DatilDev });
    await litNodeClient.connect();
    console.log('✅ Connected to the Lit network.');
    return litNodeClient;
};

const uploadToPinata = async (fileName, data) => {
    try {
        const formData = new FormData();
        formData.append('file', Buffer.from(data, 'utf8'), fileName);

        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            headers: {
                ...formData.getHeaders(),
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_API_SECRET,
            },
        });

        return response.data.IpfsHash;
    } catch (error) {
        throw new Error(`Failed to upload ${fileName}: ${error.message}`);
    }
};

const saveCIDsToFile = async (cids) => {
    const fileName = 'cids.json';
    await fs.writeFile(fileName, JSON.stringify(cids, null, 2));
};

const main = async () => {
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

    const litNodeClient = await initializeLitNodeClient();

    const asset = 'This is the secret asset.';
    const { ciphertext, encryptedSymmetricKey, dataToEncryptHash } = await encryptString(
        { accessControlConditions, dataToEncrypt: asset },
        litNodeClient
    );

    const encryptedAsset = {
        ciphertext,
        encryptedSymmetricKey,
        dataToEncryptHash,
    };

    const cids = {
        encryptedAssetCid: await uploadToPinata('encryptedAsset.json', JSON.stringify(encryptedAsset)),
        accessControlConditionsCid: await uploadToPinata('accessControlConditions.json', JSON.stringify(accessControlConditions)),
    };

    await saveCIDsToFile(cids);
};

main().catch(console.error);
