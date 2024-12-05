// deploy.js
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// Load compiled contract ABI and bytecode
const contractJSON = JSON.parse(fs.readFileSync('../out/Escrow.sol/Escrow.json', 'utf8'));

const deploy = async () => {
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
    fs.writeFileSync('contractAddress.txt', contract.address);
};

deploy().catch((error) => {
    console.error(error);
    process.exit(1);
});
