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

        const StakingContract = await ethers.getContractFactory("StakingContract");
        const contract = await StakingContract.deploy(LendErc20Token.getAddress());

        return {
            contract,
            LendErc20Token: LendErc20Token,
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
});
