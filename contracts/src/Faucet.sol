// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Faucet
 * @notice A location-based faucet contract that allows users to mine tokens
 * @dev Each faucet is deployed individually at a specific location
 */
contract Faucet {
    // Reentrancy guard
    bool private locked;
    // The amount of tokens that can be mined per transaction
    uint256 public immutable MINE_AMOUNT;
    
    // The owner/creator of the faucet
    address public immutable owner;
    
    // Total amount deposited in the faucet
    uint256 public totalDeposited;
    
    // Total amount mined from the faucet
    uint256 public totalMined;
    
    // Events
    event Deposited(address indexed depositor, uint256 amount);
    event Claimed(address indexed claimer, uint256 amount);
    event FaucetDepleted();
    
    /**
     * @notice Constructor - sets the mine amount and owner
     * @param _mineAmount The amount of tokens (in wei) that can be mined per transaction
     */
    constructor(uint256 _mineAmount) {
        require(_mineAmount > 0, "Mine amount must be greater than 0");
        MINE_AMOUNT = _mineAmount;
        owner = msg.sender;
    }
    
    /**
     * @notice Receive function to accept native token deposits
     */
    receive() external payable {
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    /**
     * @notice Fallback function to accept native token deposits
     */
    fallback() external payable {
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    /**
     * @notice Get the current balance of the faucet
     * @return The current balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Get the remaining balance available for mining
     * @return The remaining balance in wei
     */
    function getRemainingBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Claim accumulated tokens from the faucet
     * @param amount The amount of tokens to claim (in wei)
     * @dev Transfers the claimed amount to the caller if conditions are met
     */
    function claim(uint256 amount) external {
        // Reentrancy guard
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        
        // Check if faucet has enough balance
        require(address(this).balance >= amount, "Faucet has insufficient balance");
        require(amount > 0, "Amount must be greater than 0");
        
        // Update totals
        totalMined += amount;
        
        // Transfer tokens to claimer
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        // Release lock
        locked = false;
        
        emit Claimed(msg.sender, amount);
        
        // Emit depletion event if faucet is now empty
        if (address(this).balance < MINE_AMOUNT) {
            emit FaucetDepleted();
        }
    }
    
    /**
     * @notice Allow owner to withdraw remaining funds (emergency only)
     * @dev Only callable by the owner
     */
    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdraw failed");
        
        locked = false;
    }
}

