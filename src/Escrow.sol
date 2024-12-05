// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title Escrow
 * @dev A simple escrow contract where a buyer deposits funds that are released to the seller upon condition fulfillment.
 */
contract Escrow {
    address public buyer;
    address payable public seller;
    uint256 public amount;
    bool public isFundsReleased;
    bool public isFundsDeposited;

    event Deposited(address indexed buyer, uint256 amount);
    event FundsReleased(address indexed seller, uint256 amount);
    event Refunded(address indexed buyer, uint256 amount);

    /**
     * @dev Initializes the contract with the seller's address.
     * The buyer is the deployer of the contract.
     * @param _seller Address of the seller.
     */
    constructor(address payable _seller) {
        buyer = msg.sender;
        seller = _seller;
        isFundsReleased = false;
        isFundsDeposited = false;
    }

    /**
     * @dev Allows the buyer to deposit funds into the escrow.
     */
    function deposit() external payable {
        require(msg.sender == buyer, "Only buyer can deposit");
        require(!isFundsDeposited, "Funds already deposited");
        require(msg.value > 0, "Deposit must be greater than zero");

        amount = msg.value;
        isFundsDeposited = true;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Releases funds to the seller. Can be called by the buyer after receiving the asset.
     */
    function releaseFunds() external {
        require(msg.sender == buyer, "Only buyer can release funds");
        require(isFundsDeposited, "No funds to release");
        require(!isFundsReleased, "Funds already released");

        isFundsReleased = true;
        seller.transfer(amount);

        emit FundsReleased(seller, amount);
    }

    /**
     * @dev Refunds the buyer. Can be called by the seller if the transaction is canceled.
     */
    function refundBuyer() external {
        require(msg.sender == seller, "Only seller can refund");
        require(isFundsDeposited, "No funds to refund");
        require(!isFundsReleased, "Funds already released");

        isFundsDeposited = false;
        payable(buyer).transfer(amount);

        emit Refunded(buyer, amount);
    }
}
