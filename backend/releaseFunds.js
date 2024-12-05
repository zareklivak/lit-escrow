import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const releaseFunds = async () => {
    try {
        console.log('🔄 Initializing release workflow...');

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
        const isFundsReleased = await contract.isFundsReleased();
        console.log(`📜 Escrow State (Before Release): isFundsReleased = ${isFundsReleased}`);

        if (isFundsReleased) {
            console.error('❌ Funds have already been released. Aborting...');
            return;
        }

        // Call the releaseFunds function on the escrow contract
        console.log('💸 Preparing to release funds...');
        const tx = await contract.releaseFunds();

        console.log('⏳ Transaction sent. Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!');
        console.log(`   🔗 Transaction Hash: ${receipt.transactionHash}`);
        console.log(`   🔗 Block Number: ${receipt.blockNumber}`);

        // Add transaction link for the Sepolia network
        const transactionLink = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
        console.log(`   🌐 View on Etherscan: ${transactionLink}`);

        // Get the updated state of the escrow contract
        const updatedIsFundsReleased = await contract.isFundsReleased();
        console.log(`📜 Escrow State (After Release): isFundsReleased = ${updatedIsFundsReleased}`);

        if (updatedIsFundsReleased) {
            console.log('🎉 Funds successfully released to the seller.');
        } else {
            console.error('⚠️ Funds release state not updated as expected. Please investigate.');
        }
    } catch (error) {
        console.error('❌ Error during the release workflow:', error.message);
        process.exit(1);
    }
};

// Execute the release workflow
releaseFunds();
