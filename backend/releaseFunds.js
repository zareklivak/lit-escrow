// releaseFunds.js
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const releaseFunds = async () => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API_URL);
    const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY, provider);

    const contractAddress = fs.readFileSync('contractAddress.txt', 'utf8').trim();
    const contractJSON = JSON.parse(fs.readFileSync('../out/Escrow.sol/Escrow.json', 'utf8'));

    const contract = new ethers.Contract(contractAddress, contractJSON.abi, buyerWallet);

    // Release funds
    const tx = await contract.releaseFunds();
    await tx.wait();
    console.log('Funds released to the seller.');
};

releaseFunds().catch((error) => {
    console.error(error);
    process.exit(1);
});
