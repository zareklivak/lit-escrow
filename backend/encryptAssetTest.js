import dotenv from 'dotenv';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { encryptString } from '@lit-protocol/encryption';
import { LIT_NETWORK } from '@lit-protocol/constants';
import fs from 'fs/promises';
import axios from 'axios';
import FormData from 'form-data';

dotenv.config();

const initializeLitNodeClient = async () => {
    const litNodeClient = new LitNodeClientNodeJs({ litNetwork: LIT_NETWORK.DatilDev });
    await litNodeClient.connect();
    return litNodeClient;
};

const uploadToPinata = async (fileName, data) => {
    const formData = new FormData();
    formData.append('file', Buffer.from(JSON.stringify({
        encryptedString: data.ciphertext,
        encryptedSymmetricKey: data.dataToEncryptHash
    })), fileName);

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
            ...formData.getHeaders(),
            pinata_api_key: process.env.PINATA_API_KEY,
            pinata_secret_api_key: process.env.PINATA_API_SECRET,
        },
    });
    return response.data.IpfsHash;
};

const main = async () => {
    try {
        console.log('Starting encryption process...');
        const litNodeClient = await initializeLitNodeClient();
        console.log('Lit client connected');

        const contractAddress = (await fs.readFile('contractAddress.txt', 'utf8')).trim();
        console.log('Contract address:', contractAddress);

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
        console.log('Access conditions set');

        console.log('Starting encryption...');
        const asset = 'This is the secret asset to be revealed upon fund release.';
        const encryptedResult = await encryptString(
            { accessControlConditions, dataToEncrypt: asset },
            litNodeClient
        );
        console.log('Encryption completed');
        console.log('Encrypted result:', encryptedResult);

        console.log('Uploading to Pinata...');
        const ciphertextCid = await uploadToPinata('encryptedAsset.json', encryptedResult);
        console.log('Upload complete:', ciphertextCid);

        await fs.writeFile('cids.json', JSON.stringify({ ciphertextCid }, null, 2));
        console.log('Process complete');
    } catch (error) {
        console.error('Error in encryption process:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

main().catch(console.error);