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
        console.log(`📤 Uploading "${fileName}" to Pinata...`);
        const formData = new FormData();
        formData.append('file', Buffer.from(JSON.stringify(data, null, 2), 'utf8'), fileName);

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
                returnValueTest: { comparator: '=', value: 'true' },
            },
        ];

        console.log('🛡️ Access Control Conditions:', JSON.stringify(accessControlConditions, null, 2));
        const litNodeClient = await initializeLitNodeClient();
        const asset = 'This is the secret asset to be revealed upon fund release.';

        const { ciphertext, dataToEncryptHash, encryptedSymmetricKey } = await encryptString(
            { accessControlConditions, dataToEncrypt: asset },
            litNodeClient
        );

        const encryptedAsset = { ciphertext, encryptedSymmetricKey, dataToEncryptHash };
        const cids = {
            encryptedAssetCid: await uploadToPinata('encryptedAsset.json', encryptedAsset),
            accessControlConditionsCid: await uploadToPinata('accessControlConditions.json', accessControlConditions),
        };

        await fs.writeFile('cids.json', JSON.stringify(cids, null, 2));
        console.log('✅ Workflow completed successfully.');
    } catch (error) {
        console.error('❌ An error occurred:', error.message);
    }
};

main();
