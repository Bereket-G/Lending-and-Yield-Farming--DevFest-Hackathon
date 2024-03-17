// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract StakingContract is Pausable {
    IERC20 public token; // The ERC20 token being staked
    IERC20 public collateralToken; // The ERC20 token being staked
    address public owner; // The owner of the contract
    mapping(address => uint256) public stakes; // Maps user addresses to their stakes
    mapping(address => uint256) public stakingTime; // Maps user addresses to their staking time
    uint256 public stakingDuration = 30 days; // Define the staking duration
    uint256 public rewardPercentage = 5; // Define the reward percentage
    mapping(address => uint256) public debtRegister;


    uint256 public THRESHOLD_TO_PAUSE = 100000000; // Define the reward percentage

    event Staked(address indexed user, uint256 amount, uint256 time);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);

    constructor(address _token, address _collateralToken) {
        token = IERC20(_token);
        owner = msg.sender;
        collateralToken = IERC20(_collateralToken);
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

        if( amount > THRESHOLD_TO_PAUSE) {
            _pause();
        }

        uint256 reward = (amount * rewardPercentage) / 100;
        uint256 totalAmount = amount + reward;

        stakes[msg.sender] -= amount;
        require(token.transfer(msg.sender, totalAmount), "Transfer failed");

        emit Unstaked(msg.sender, amount, reward);
    }

    // Function to get the current stake of a user
    function getStake(address user) external view returns (uint256) {
        return stakes[user];
    }

    function borrow(uint256 _amount) external {

        if(_amount > THRESHOLD_TO_PAUSE) {
            _pause();
        }

        require(collateralToken.transferFrom(msg.sender, address(this), _amount), "Collateral token transfer failed");

        debtRegister[msg.sender] += _amount;

        // Assuming 1-1 exchange rate
        token.transfer(msg.sender, _amount);
    }

    function payBack(uint256 _amount) external {
        require(debtRegister[msg.sender] >= _amount, "Exceeds debt balance");

        // Calculate fee (10%)
        uint256 fee = (_amount * 10) / 100;
        uint256 repayAmount = _amount - fee;

        debtRegister[msg.sender] -= _amount;
        // Transfer back the remaining amount after deducting the fee
        token.transferFrom(msg.sender, address(this), _amount);

        // Revert back the collateralToken
        collateralToken.transfer(msg.sender, repayAmount);
    }
}
