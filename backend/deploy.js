import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs/promises';

// Load compiled contract ABI and bytecode
const contractJSON = JSON.parse(await fs.readFile('../out/Escrow.sol/Escrow.json', 'utf8'));

const deploy = async () => {
    try {
        // Setup provider and wallet
        const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API_URL);
        const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY, provider);
        const sellerAddress = new ethers.Wallet(process.env.SELLER_PRIVATE_KEY).address;

        // Create contract factory
        const factory = new ethers.ContractFactory(contractJSON.abi, contractJSON.bytecode.object, buyerWallet);

        // Deploy contract
        console.log('Deploying contract...');
        const contract = await factory.deploy(sellerAddress);
        await contract.deployed();
        console.log(`Contract deployed at address: ${contract.address}`);

        // Save contract address for later use
        await fs.writeFile('contractAddress.txt', contract.address);

        // Print link to Sepolia scanner
        const sepoliaExplorerLink = `https://sepolia.etherscan.io/address/${contract.address}`;
        console.log(`${sepoliaExplorerLink}`);
    } catch (error) {
        console.error('Error deploying contract:', error);
        process.exit(1);
    }
};

deploy();
