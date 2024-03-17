import { expect } from "chai";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import BN from "bn.js";

function toBN(number: any): BN {
    return new BN(number.toString())
}

describe("StakingContract", () => {
    const setupFixture = deployments.createFixture(async () => {
        await deployments.fixture();
        const signers = await getNamedAccounts();

        const owner = signers.deployer;

        const LendERC20Token = await ethers.getContractFactory("LendToken");
        const LendErc20Token = await LendERC20Token.deploy("LendToken", "LND", "18", ethers.parseEther("100000000"));

        const CollateralERC20Token = await ethers.getContractFactory("CollateralToken");
        const CollateralErc20Token = await CollateralERC20Token.deploy("CollateralToken", "CT", "18", ethers.parseEther("100000000"));

        const StakingContract = await ethers.getContractFactory("StakingContract");
        const contract = await StakingContract.deploy(LendErc20Token.getAddress(), CollateralErc20Token.getAddress());

        return {
            contract,
            LendErc20Token: LendErc20Token,
            CollateralErc20Token: CollateralErc20Token,
            deployer: signers.deployer,
            accounts: await ethers.getSigners(),
        };
    });

    it("Should stake tokens", async () => {
        const { contract, LendErc20Token, accounts } = await setupFixture();

        const amountToStake = ethers.parseEther("100");

        await LendErc20Token.connect(accounts[0]).transfer(accounts[1].address, amountToStake);

        await LendErc20Token.connect(accounts[1]).approve(contract.getAddress(), amountToStake);
        await contract.connect(accounts[1]).stake(amountToStake);

        expect(await contract.getStake(accounts[1].address)).to.equal(amountToStake);
    });

    it("Should unstake tokens and receive interest", async () => {
        const { contract, LendErc20Token, accounts } = await setupFixture();

        const amountToStake = ethers.parseEther("100");

        await LendErc20Token.connect(accounts[0]).transfer(accounts[1].address, amountToStake);

        await LendErc20Token.connect(accounts[1]).approve(contract.getAddress(), amountToStake);
        await contract.connect(accounts[1]).stake(amountToStake);

        const initialBalance = toBN(await LendErc20Token.balanceOf(accounts[1].address));
        const stakingDuration = 30 * 24 * 60 * 60; // 30 days in seconds
        await ethers.provider.send("evm_increaseTime", [stakingDuration]); // Increase time to pass staking duration
        await ethers.provider.send("evm_mine", []); // Mine a new block to update block.timestamp

        const expectedInterest = toBN(amountToStake).mul(toBN(5)).div(toBN(100)); // 5% interest
        await LendErc20Token.transfer(contract.getAddress(), expectedInterest.toString());

        await contract.connect(accounts[1]).unstake(amountToStake);

        const finalBalance = toBN(await LendErc20Token.balanceOf(accounts[1].address));
        expect(finalBalance.sub(initialBalance)).to.equal(toBN(amountToStake).add(expectedInterest));
    });

    it("Should not allow unstaking before staking period expires", async () => {
        const { contract, LendErc20Token, accounts } = await setupFixture();

        const amountToStake = ethers.parseEther("100");

        await LendErc20Token.connect(accounts[0]).transfer(accounts[1].address, amountToStake);

        await LendErc20Token.connect(accounts[1]).approve(contract.getAddress(), amountToStake);
        await contract.connect(accounts[1]).stake(amountToStake);

        await expect(contract.connect(accounts[1]).unstake(amountToStake)).to.be.revertedWith("Staking period not expired");
    });

    it.skip("Should borrow tokens and pay back with fee", async () => {
        const { contract, LendErc20Token, CollateralErc20Token, accounts } = await setupFixture();

        const collateralAmount = ethers.parseEther("1000");
        const borrowAmount = ethers.parseEther("100");

        // Transfer collateral tokens to the contract
        await CollateralErc20Token.connect(accounts[0]).approve(contract.getAddress(), collateralAmount);

        // User borrows tokens
        await contract.connect(accounts[1]).borrow(borrowAmount);

        // Check if the user's debt balance has been updated
        expect(await contract.debtRegister(accounts[1].address)).to.equal(borrowAmount);

        // Check if the user received the borrowed tokens
        expect(await LendErc20Token.balanceOf(accounts[1].address)).to.equal(borrowAmount);

        // Pay back the borrowed amount with fee
        await LendErc20Token.connect(accounts[1]).approve(contract.getAddress(), borrowAmount);
        await contract.connect(accounts[1]).payBack(borrowAmount);

        // Check if the user's debt balance has been reduced
        expect(await contract.debtRegister(accounts[1].address)).to.equal(0);

        // Check if the user received the appropriate amount after deducting the fee
        const expectedBalance = toBN(borrowAmount).sub((toBN(borrowAmount).mul(toBN(10)).div(toBN(100)))); // 10% fee
        expect(await LendErc20Token.balanceOf(accounts[1].address)).to.equal(expectedBalance);
    });
});
