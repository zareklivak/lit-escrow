// depositFunds.js
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const depositFunds = async () => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API_URL);
    const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY, provider);

    const contractAddress = fs.readFileSync('contractAddress.txt', 'utf8').trim();
    const contractJSON = JSON.parse(fs.readFileSync('../out/Escrow.sol/Escrow.json', 'utf8'));

    const contract = new ethers.Contract(contractAddress, contractJSON.abi, buyerWallet);

    // Deposit funds
    const tx = await contract.deposit({ value: ethers.utils.parseEther('0.001') });
    await tx.wait();
    console.log('Funds deposited.');
};

depositFunds().catch((error) => {
    console.error(error);
    process.exit(1);
});
