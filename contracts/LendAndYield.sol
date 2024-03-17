// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakingContract {
    IERC20 public token; // The ERC20 token being staked
    address public owner; // The owner of the contract
    mapping(address => uint256) public stakes; // Maps user addresses to their stakes
    mapping(address => uint256) public stakingTime; // Maps user addresses to their staking time
    uint256 public stakingDuration = 30 days; // Define the staking duration
    uint256 public rewardPercentage = 5; // Define the reward percentage

    event Staked(address indexed user, uint256 amount, uint256 time);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);

    constructor(address _token) {
        token = IERC20(_token);
        owner = msg.sender;
    }

    // Modifier to restrict access to the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Function to stake tokens
    function stake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        stakes[msg.sender] += amount;
        stakingTime[msg.sender] = block.timestamp; // Record staking time
        emit Staked(msg.sender, amount, block.timestamp);
    }

    // Function to unstake tokens
    function unstake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(stakes[msg.sender] >= amount, "Insufficient balance");
        require(block.timestamp >= stakingTime[msg.sender] + stakingDuration, "Staking period not expired");

        uint256 reward = (amount * rewardPercentage) / 100;
        uint256 totalAmount = amount + reward;

        stakes[msg.sender] -= amount;
        require(token.transfer(msg.sender, totalAmount), "Transfer failed");

        emit Unstaked(msg.sender, amount, reward);
    }

    // Function to withdraw any tokens accidentally sent to the contract
    function withdrawTokens(address _token, uint256 amount) external onlyOwner {
        require(_token != address(token), "Cannot withdraw staking token");
        IERC20(_token).transfer(owner, amount);
    }

    // Function to get the current stake of a user
    function getStake(address user) external view returns (uint256) {
        return stakes[user];
    }
}
