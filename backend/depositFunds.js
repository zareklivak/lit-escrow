import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const depositFunds = async () => {
    try {
        console.log('🔄 Initializing deposit workflow...');

        // Connect to the Ethereum network using Alchemy provider
        const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API_URL);

        // Setup the buyer's wallet
        const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY, provider);

        // Load contract details
        const contractAddress = (await fs.readFile('contractAddress.txt', 'utf8')).trim();
        const contractJSON = JSON.parse(await fs.readFile('../out/Escrow.sol/Escrow.json', 'utf8'));
        const contract = new ethers.Contract(contractAddress, contractJSON.abi, buyerWallet);

        console.log(`🔗 Escrow Contract Address: ${contractAddress}`);

        // Get the current state of the escrow contract
        const isFundsDeposited = await contract.isFundsDeposited();
        console.log(`📜 Escrow State (Before Deposit): isFundsDeposited = ${isFundsDeposited}`);

        if (isFundsDeposited) {
            console.error('❌ Funds have already been deposited. Aborting...');
            return;
        }

        // Specify deposit amount in Ether
        const depositAmount = '0.001'; // Example value, adjust as needed
        console.log(`💸 Preparing to deposit ${depositAmount} ETH...`);

        // Call the deposit function on the escrow contract
        const tx = await contract.deposit({
            value: ethers.utils.parseEther(depositAmount),
        });

        console.log('⏳ Transaction sent. Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!');
        console.log(`   🔗 Transaction Hash: ${receipt.transactionHash}`);
        console.log(`   🔗 Block Number: ${receipt.blockNumber}`);

        // Add transaction link for the Sepolia network
        const transactionLink = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
        console.log(`   🌐 View on Etherscan: ${transactionLink}`);

        // Get the updated state of the escrow contract
        const updatedIsFundsDeposited = await contract.isFundsDeposited();
        console.log(`📜 Escrow State (After Deposit): isFundsDeposited = ${updatedIsFundsDeposited}`);

        console.log('🎉 Funds successfully deposited into the escrow contract.');
    } catch (error) {
        console.error('❌ Error during the deposit workflow:', error.message);
        process.exit(1);
    }
};

// Execute the deposit workflow
depositFunds();
