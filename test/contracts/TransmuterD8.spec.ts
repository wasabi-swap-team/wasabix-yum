import chai from "chai";
import chaiSubset from "chai-subset";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
import { ContractFactory, Signer, BigNumber, utils } from "ethers";
import { WaBtcToken } from "../../types/WaBtcToken";
import { YumVesperVaultD8 } from "../../types/YumVesperVaultD8";
import { VesperVaultAdapterMock } from "../../types/VesperVaultAdapterMock";
import { Erc20Mock } from "../../types/Erc20Mock";
import { parseUnits } from "ethers/lib/utils";
import { MAXIMUM_U256, mineBlocks } from "../utils/helpers";
import { TransmuterD8 } from "../../types/TransmuterD8";

chai.use(solidity);
chai.use(chaiSubset);

const { expect } = chai;

let YumVesperVaultD8Factory: ContractFactory;
let TransmuterD8Factory: ContractFactory;
let ERC20MockFactory: ContractFactory;
let WaBTCFactory: ContractFactory;
let VesperVaultAdapterMockFactory: ContractFactory;

describe("TransmuterD8", () => {
  let deployer: Signer;
  let depositor: Signer;
  let signers: Signer[];
  let yumVesperVaultD8: YumVesperVaultD8;
  let governance: Signer;
  let minter: Signer;
  let rewards: Signer;
  let sentinel: Signer;
  let user: Signer;
  let mockYumVesperVaultD8: Signer;
  let token: Erc20Mock;
  let transmuter: TransmuterD8;
  let adapter: VesperVaultAdapterMock;
  let waBtc: WaBtcToken;
  let harvestFee = 1000;
  let ceilingAmt = utils.parseUnits("10000000", 8);
  let collateralizationLimit = "200000000";
  let mintAmount = 5000;
  let mockYumVesperVaultD8Address;
  let preTestTotalWaBtcSupply: BigNumber;

  before(async () => {
    TransmuterD8Factory = await ethers.getContractFactory("TransmuterD8");
    ERC20MockFactory = await ethers.getContractFactory("ERC20Mock");
    WaBTCFactory = await ethers.getContractFactory("WaBtcToken");
    YumVesperVaultD8Factory = await ethers.getContractFactory("YumVesperVaultD8");
    VesperVaultAdapterMockFactory = await ethers.getContractFactory(
      "VesperVaultAdapterMock"
    );
  });

  beforeEach(async () => {
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    [
      deployer,
      rewards,
      depositor,
      sentinel,
      minter,
      governance,
      mockYumVesperVaultD8,
      user,
      ...signers
    ] = await ethers.getSigners();

    token = (await ERC20MockFactory.connect(deployer).deploy(
      "Mock DAI",
      "DAI",
      18
    )) as Erc20Mock;

    waBtc = (await WaBTCFactory.connect(deployer).deploy()) as WaBtcToken;

    mockYumVesperVaultD8Address = await mockYumVesperVaultD8.getAddress();

    yumVesperVaultD8 = (await YumVesperVaultD8Factory.connect(deployer).deploy(
      token.address,
      waBtc.address,
      await governance.getAddress(),
      await sentinel.getAddress()
    )) as YumVesperVaultD8;
    transmuter = (await TransmuterD8Factory.connect(deployer).deploy(
      waBtc.address,
      token.address,
      await governance.getAddress()
    )) as TransmuterD8;
    await transmuter.connect(governance).setTransmutationPeriod(40320);
    await yumVesperVaultD8.connect(governance).setTransmuter(transmuter.address);
    await yumVesperVaultD8.connect(governance).setRewards(await rewards.getAddress());
    await yumVesperVaultD8.connect(governance).setHarvestFee(harvestFee);
    await transmuter.connect(governance).setWhitelist(mockYumVesperVaultD8Address, true);

    adapter = (await VesperVaultAdapterMockFactory.connect(deployer).deploy(
      token.address
    )) as VesperVaultAdapterMock;
    await yumVesperVaultD8.connect(governance).initialize(adapter.address);
    await yumVesperVaultD8
      .connect(governance)
      .setCollateralizationLimit(collateralizationLimit);
    await waBtc.connect(deployer).setWhitelist(yumVesperVaultD8.address, true);
    await waBtc.connect(deployer).setCeiling(yumVesperVaultD8.address, ceilingAmt);
    await token.mint(mockYumVesperVaultD8Address, utils.parseUnits("10000",8));
    await token.connect(mockYumVesperVaultD8).approve(transmuter.address, MAXIMUM_U256);

    await token.mint(await depositor.getAddress(), utils.parseUnits("20000",8));
    await token.mint(await minter.getAddress(), utils.parseUnits("20000",8));
    await token.connect(depositor).approve(transmuter.address, MAXIMUM_U256);
    await waBtc.connect(depositor).approve(transmuter.address, MAXIMUM_U256);
    await token.connect(depositor).approve(yumVesperVaultD8.address, MAXIMUM_U256);
    await waBtc.connect(depositor).approve(yumVesperVaultD8.address, MAXIMUM_U256);
    await token.connect(minter).approve(transmuter.address, MAXIMUM_U256);
    await waBtc.connect(minter).approve(transmuter.address, MAXIMUM_U256);
    await token.connect(minter).approve(yumVesperVaultD8.address, MAXIMUM_U256);
    await waBtc.connect(minter).approve(yumVesperVaultD8.address, MAXIMUM_U256);

    await yumVesperVaultD8.connect(depositor).deposit(utils.parseUnits("10000",8));
    await yumVesperVaultD8.connect(depositor).mint(utils.parseUnits("5000",8));

    await yumVesperVaultD8.connect(minter).deposit(utils.parseUnits("10000",8));
    await yumVesperVaultD8.connect(minter).mint(utils.parseUnits("5000",8));

    transmuter = transmuter.connect(depositor)

    preTestTotalWaBtcSupply = await waBtc.totalSupply();
  });

  describe("stake()", () => {

    it("stakes 1000 waBtc and reads the correct amount", async () => {
      await transmuter.stake(1000);
      expect(
        await transmuter.depositedWaTokens(await depositor.getAddress())
      ).equal(1000);
    });

    it("stakes 1000 waBtc two times and reads the correct amount", async () => {
      await transmuter.stake(1000);
      await transmuter.stake(1000);
      expect(
        await transmuter.depositedWaTokens(await depositor.getAddress())
      ).equal(2000);
    });

  });

  describe("unstake()", () => {

    it("reverts on depositing and then unstaking balance greater than deposit", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      expect(transmuter.unstake(utils.parseUnits("2000",8))).revertedWith(
        "TransmuterD8: unstake amount exceeds deposited amount"
      );
    });

    it("deposits and unstakes 1000 waBtc", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await transmuter.unstake(utils.parseUnits("1000",8));
      expect(
        await transmuter.depositedWaTokens(await depositor.getAddress())
      ).equal(0);
    });

    it("deposits 1000 waBtc and unstaked 500 waBtc", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await transmuter.unstake(utils.parseUnits("500",8));
      expect(
        await transmuter.depositedWaTokens(await depositor.getAddress())
      ).equal(utils.parseUnits("500",8));
    });

  });

  describe("distributes correct amount", () => {
    let distributeAmt = utils.parseUnits("1000",8);
    let stakeAmt = utils.parseUnits("1000",8);
    let transmutationPeriod = 20;

    beforeEach(async () => {
      await transmuter.connect(governance).setTransmutationPeriod(transmutationPeriod);
      await token.mint(await minter.getAddress(), utils.parseUnits("20000",8));
      await token.connect(minter).approve(transmuter.address, MAXIMUM_U256);
      await waBtc.connect(minter).approve(transmuter.address, MAXIMUM_U256);
      await token.connect(minter).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await waBtc.connect(minter).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await yumVesperVaultD8.connect(minter).deposit(utils.parseUnits("10000",8));
      await yumVesperVaultD8.connect(minter).mint(utils.parseUnits("5000",8));
      await token.mint(await rewards.getAddress(), utils.parseUnits("20000",8));
      await token.connect(rewards).approve(transmuter.address, MAXIMUM_U256);
      await waBtc.connect(rewards).approve(transmuter.address, MAXIMUM_U256);
      await token.connect(rewards).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await waBtc.connect(rewards).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await yumVesperVaultD8.connect(rewards).deposit(utils.parseUnits("10000",8));
      await yumVesperVaultD8.connect(rewards).mint(utils.parseUnits("5000",8));
    });

    it("deposits 100000 waBtc, distributes 1000 WBTC, and the correct amount of tokens are distributed to depositor", async () => {
      let numBlocks = 5;
      await transmuter.connect(depositor).stake(stakeAmt);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await mineBlocks(ethers.provider, numBlocks);
      let userInfo = await transmuter.userInfo(await depositor.getAddress());
      // pendingdivs should be (distributeAmt * (numBlocks / transmutationPeriod))
      expect(userInfo.pendingdivs).equal(distributeAmt.div(4));
    });

    it("two people deposit equal amounts and recieve equal amounts in distribution", async () => {
      await transmuter.connect(depositor).stake(utils.parseUnits("1000",8));
      await transmuter.connect(minter).stake(utils.parseUnits("1000",8));
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await mineBlocks(ethers.provider, 10);
      let userInfo1 = await transmuter.userInfo(await depositor.getAddress());
      let userInfo2 = await transmuter.userInfo(await minter.getAddress());
      expect(userInfo1.pendingdivs).gt(0);
      expect(userInfo1.pendingdivs).equal(userInfo2.pendingdivs);
    });

    it("deposits of 500, 250, and 250 from three people and distribution is correct", async () => {
      await transmuter.connect(depositor).stake(utils.parseUnits("500",8));
      await transmuter.connect(minter).stake(utils.parseUnits("250",8));
      await transmuter.connect(rewards).stake(utils.parseUnits("250",8));
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await mineBlocks(ethers.provider, 10);
      let userInfo1 = await transmuter.userInfo(await depositor.getAddress());
      let userInfo2 = await transmuter.userInfo(await minter.getAddress());
      let userInfo3 = await transmuter.userInfo(await rewards.getAddress());
      let user2: BigNumber = userInfo2.pendingdivs;
      let user3: BigNumber = userInfo3.pendingdivs;
      let sumOfTwoUsers = user2.add(user3);
      expect(userInfo1.pendingdivs).gt(0);
      expect(sumOfTwoUsers).equal(userInfo1.pendingdivs);
    });

  });

  describe("transmute() claim() transmuteAndClaim()", () => {
    let distributeAmt = utils.parseUnits("500",8);
    let transmutedAmt = BigNumber.from("1240000");

    it("transmutes the correct amount", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await mineBlocks(ethers.provider, 10);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await transmuter.transmute();
      let userInfo = await transmuter.userInfo(await depositor.getAddress());
      expect(userInfo.realised).equal(transmutedAmt);
    });

    it("burns the supply of waBtc on transmute()", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await mineBlocks(ethers.provider, 10);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await transmuter.transmute();
      let waBtcTokenSupply = await waBtc.totalSupply();
      expect(waBtcTokenSupply).equal(preTestTotalWaBtcSupply.sub(transmutedAmt));
    });

    it("moves WBTC from pendingdivs to inbucket upon staking more", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await mineBlocks(ethers.provider, 10);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await transmuter.stake(utils.parseUnits("100",8));
      let userInfo = await transmuter.userInfo(await depositor.getAddress());
      expect(userInfo.inbucket).equal(transmutedAmt);
    });

    it("transmutes and claims using transmute() and then claim()", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await mineBlocks(ethers.provider, 10);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      let tokenBalanceBefore = await token.connect(depositor).balanceOf(await depositor.getAddress());
      await transmuter.transmute();
      await transmuter.claim();
      let tokenBalanceAfter = await token.connect(depositor).balanceOf(await depositor.getAddress());
      expect(tokenBalanceAfter).equal(tokenBalanceBefore.add(transmutedAmt));
    });

    it("transmutes and claims using transmuteAndClaim()", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await mineBlocks(ethers.provider, 10);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      let tokenBalanceBefore = await token.connect(depositor).balanceOf(await depositor.getAddress());
      await transmuter.transmuteAndClaim();
      let tokenBalanceAfter = await token.connect(depositor).balanceOf(await depositor.getAddress());
      expect(tokenBalanceAfter).equal(tokenBalanceBefore.add(transmutedAmt));
    });

    it("transmutes the full buffer if a complete phase has passed", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await transmuter.connect(governance).setTransmutationPeriod(10);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await mineBlocks(ethers.provider, 11);
      let tokenBalanceBefore = await token.connect(depositor).balanceOf(await depositor.getAddress());
      await transmuter.connect(depositor).transmuteAndClaim();
      let tokenBalanceAfter = await token.connect(depositor).balanceOf(await depositor.getAddress());
      expect(tokenBalanceAfter).equal(tokenBalanceBefore.add(distributeAmt));
    });

    it("transmutes the staked amount and distributes overflow if a bucket overflows", async () => {
      // 1) DEPOSITOR stakes 100 dai
      // 2) distribution of 90 dai, let transmutation period pass
      // DEPOSITOR gets 90 dai
      // 3) MINTER stakes 200 dai
      // 4) distribution of 60 dai, let transmutation period pass
      // DEPOSITOR gets 20 dai, MINTER gets 40 dai
      // 5) USER stakes 200 dai (to distribute allocations)
      // 6) transmute DEPOSITOR, bucket overflows by 10 dai
      // MINTER gets 5 dai, USER gets 5 dai
      let distributeAmt0 = utils.parseUnits("90",8)
      let distributeAmt1 = utils.parseUnits("60",8)
      let depStakeAmt0 = utils.parseUnits("100",8)
      let depStakeAmt1 = utils.parseUnits("200",8)
      await transmuter.connect(governance).setTransmutationPeriod(10);
      await token.connect(minter).approve(transmuter.address, MAXIMUM_U256);
      await waBtc.connect(minter).approve(transmuter.address, MAXIMUM_U256);
      await waBtc.connect(user).approve(transmuter.address, MAXIMUM_U256);
      await token.connect(minter).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await token.connect(user).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await waBtc.connect(minter).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await waBtc.connect(user).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await token.mint(await minter.getAddress(), utils.parseUnits("20000",8));
      await yumVesperVaultD8.connect(minter).deposit(utils.parseUnits("10000",8));
      await yumVesperVaultD8.connect(minter).mint(utils.parseUnits("5000",8));
      await token.mint(await user.getAddress(), utils.parseUnits("20000",8));
      await yumVesperVaultD8.connect(user).deposit(utils.parseUnits("10000",8));
      await yumVesperVaultD8.connect(user).mint(utils.parseUnits("5000",8));

      // user 1 deposit
      await transmuter.connect(depositor).stake(depStakeAmt0);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt0);
      await mineBlocks(ethers.provider, 10);

      // user 2 deposit
      await transmuter.connect(minter).stake(depStakeAmt1);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt1);
      await mineBlocks(ethers.provider, 10);

      await transmuter.connect(user).stake(depStakeAmt1);

      let minterInfo = await transmuter.userInfo(await minter.getAddress());
      let minterBucketBefore = minterInfo.inbucket;
      await transmuter.connect(depositor).transmuteAndClaim();
      minterInfo = await transmuter.userInfo(await minter.getAddress());
      let userInfo = await transmuter.userInfo(await user.getAddress());

      let minterBucketAfter = minterInfo.inbucket;
      expect(minterBucketAfter).equal(minterBucketBefore.add(parseUnits("5",8)));
      expect(userInfo.inbucket).equal(parseUnits("5",8));
    });

  });

  describe("transmuteClaimAndWithdraw()", () => {
    let distributeAmt = utils.parseUnits("500",8);
    let transmutedAmt = BigNumber.from("620000");
    let waBtcBalanceBefore: BigNumber;
    let tokenBalanceBefore: BigNumber;

    beforeEach(async () => {
      tokenBalanceBefore = await token.connect(depositor).balanceOf(await depositor.getAddress());
      waBtcBalanceBefore = await waBtc.connect(depositor).balanceOf(await depositor.getAddress());
      await transmuter.stake(utils.parseUnits("1000",8));
      await transmuter.connect(minter).stake(utils.parseUnits("1000",8));
      await mineBlocks(ethers.provider, 10);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await transmuter.transmuteClaimAndWithdraw();
    })

    it("has a staking balance of 0 waBtc after transmuteClaimAndWithdraw()", async () => {
      let userInfo = await transmuter.userInfo(await depositor.getAddress());
      expect(userInfo.depositedAl).equal(0);
      expect(await transmuter.depositedWaTokens(await depositor.getAddress())).equal(0);
    });

    it("returns the amount of waBtc staked less the transmuted amount", async () => {
      let waBtcBalanceAfter = await waBtc.connect(depositor).balanceOf(await depositor.getAddress());
      expect(waBtcBalanceAfter).equal(waBtcBalanceBefore.sub(transmutedAmt))
    });

    it("burns the correct amount of transmuted waBtc using transmuteClaimAndWithdraw()", async () => {
      let alUSDTokenSupply = await waBtc.totalSupply();
      expect(alUSDTokenSupply).equal(preTestTotalWaBtcSupply.sub(transmutedAmt));
    });

    it("successfully sends WBTC to owner using transmuteClaimAndWithdraw()", async () => {
      let tokenBalanceAfter = await token.connect(depositor).balanceOf(await depositor.getAddress());
      expect(tokenBalanceAfter).equal(tokenBalanceBefore.add(transmutedAmt));
    });

  });

  describe("exit()", () => {
    let distributeAmt = utils.parseUnits("500",8);
    let transmutedAmt = BigNumber.from("620000");
    let waBtcBalanceBefore: BigNumber;
    let tokenBalanceBefore: BigNumber;

    beforeEach(async () => {
      tokenBalanceBefore = await token.connect(depositor).balanceOf(await depositor.getAddress());
      waBtcBalanceBefore = await waBtc.connect(depositor).balanceOf(await depositor.getAddress());
      await transmuter.stake(utils.parseUnits("1000",8));
      await transmuter.connect(minter).stake(utils.parseUnits("1000",8));
      await mineBlocks(ethers.provider, 10);
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await transmuter.exit();
    })

    it("transmutes and then withdraws waBtc from staking", async () => {
      let waBtcBalanceAfter = await waBtc.connect(depositor).balanceOf(await depositor.getAddress());
      expect(waBtcBalanceAfter).equal(waBtcBalanceBefore.sub(transmutedAmt));
    });

    it("transmutes and claimable WBTC moves to realised value", async () => {
      let userInfo = await transmuter.userInfo(await depositor.getAddress());
      expect(userInfo.realised).equal(transmutedAmt);
    })

    it("does not claim the realized tokens", async () => {
      let tokenBalanceAfter = await token.connect(depositor).balanceOf(await depositor.getAddress());
      expect(tokenBalanceAfter).equal(tokenBalanceBefore);
    })

  })

  describe("forceTransmute()", () => {
    let distributeAmt = utils.parseUnits("5000",8);

    beforeEach(async () => {
      transmuter.connect(governance).setTransmutationPeriod(10);
      await token.mint(await minter.getAddress(), utils.parseUnits("20000",8));
      await token.connect(minter).approve(transmuter.address, MAXIMUM_U256);
      await waBtc.connect(minter).approve(transmuter.address, MAXIMUM_U256);
      await token.connect(minter).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await waBtc.connect(minter).approve(yumVesperVaultD8.address, MAXIMUM_U256);
      await yumVesperVaultD8.connect(minter).deposit(utils.parseUnits("10000",8));
      await yumVesperVaultD8.connect(minter).mint(utils.parseUnits("5000",8));
      await transmuter.connect(depositor).stake(utils.parseUnits(".01",8));
    });

    it("User 'depositor' has waBtc overfilled, user 'minter' force transmutes user 'depositor' and user 'depositor' has WBTC sent to his address", async () => {
      await transmuter.connect(minter).stake(utils.parseUnits("10",8));
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await mineBlocks(ethers.provider, 10);
      let tokenBalanceBefore = await token.connect(depositor).balanceOf(await depositor.getAddress());
      await transmuter.connect(minter).forceTransmute(await depositor.getAddress());
      let tokenBalanceAfter = await token.connect(depositor).balanceOf(await depositor.getAddress());
      expect(tokenBalanceBefore).equal(tokenBalanceAfter.sub(utils.parseUnits("0.01",8)));
    });

    it("User 'depositor' has waBtc overfilled, user 'minter' force transmutes user 'depositor' and user 'minter' overflow added inbucket", async () => {
      await transmuter.connect(minter).stake(utils.parseUnits("10",8));
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await mineBlocks(ethers.provider, 10);
      await transmuter.connect(minter).forceTransmute(await depositor.getAddress());
      let userInfo = await transmuter.connect(minter).userInfo(await minter.getAddress());
      // TODO calculate the expected value
      expect(userInfo.inbucket).equal("499998999999");
    });

    it("you can force transmute yourself", async () => {
      await transmuter.connect(minter).stake(utils.parseUnits("1",8));
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await mineBlocks(ethers.provider, 10);
      let tokenBalanceBefore = await token.connect(depositor).balanceOf(await depositor.getAddress());
      await transmuter.connect(depositor).forceTransmute(await depositor.getAddress());
      let tokenBalanceAfter = await token.connect(depositor).balanceOf(await depositor.getAddress());
      expect(tokenBalanceBefore).equal(tokenBalanceAfter.sub(utils.parseUnits("0.01",8)));
    });

    it("you can force transmute yourself even when you are the only one in the transmuter", async () => {
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, distributeAmt);
      await mineBlocks(ethers.provider, 10);
      let tokenBalanceBefore = await token.connect(depositor).balanceOf(await depositor.getAddress());
      await transmuter.connect(depositor).forceTransmute(await depositor.getAddress());
      let tokenBalanceAfter = await token.connect(depositor).balanceOf(await depositor.getAddress());
      expect(tokenBalanceBefore).equal(tokenBalanceAfter.sub(utils.parseUnits("0.01",8)));
    });

    it("reverts when you are not overfilled", async () => {
      await transmuter.connect(minter).stake(utils.parseUnits("1000",8));
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, utils.parseUnits("1000",8));
      expect(transmuter.connect(minter).forceTransmute(await depositor.getAddress())).revertedWith("TransmuterD8: !overflow");
    });

  });
  //not sure what this is actually testing.... REEEE
  describe("Multiple Users displays all overfilled users", () => {

    it("returns userInfo", async () => {
      await transmuter.stake(utils.parseUnits("1000",8));
      await transmuter.connect(minter).stake(utils.parseUnits("1000",8));
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, utils.parseUnits("5000",8));
      let multipleUsers = await transmuter.getMultipleUserInfo(0, 1);
      let userList = multipleUsers.theUserData;
      expect(userList.length).equal(2)
    })

  })

  describe("distribute()", () => {
    let transmutationPeriod = 20;

    beforeEach(async () => {
      await transmuter.connect(governance).setTransmutationPeriod(transmutationPeriod);
    })

    it("must be whitelisted to call distribute", async () => {
      await transmuter.connect(depositor).stake(utils.parseUnits("1000",8));
      expect(
        transmuter.connect(depositor).distribute(yumVesperVaultD8.address, utils.parseUnits("1000",8))
      ).revertedWith("TransmuterD8: !whitelisted")
    });

    it("increases buffer size, but does not immediately increase allocations", async () => {
      await transmuter.connect(depositor).stake(utils.parseUnits("1000",8));
      await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, utils.parseUnits("1000",8))
      let userInfo = await transmuter.userInfo(await depositor.getAddress());
      let bufferInfo = await transmuter.bufferInfo();

      expect(bufferInfo._buffer).equal(utils.parseUnits("1000",8));
      expect(bufferInfo._deltaBlocks).equal(0);
      expect(bufferInfo._toDistribute).equal(0);
      expect(userInfo.pendingdivs).equal(0);
      expect(userInfo.depositedAl).equal(utils.parseUnits("1000",8));
      expect(userInfo.inbucket).equal(0);
      expect(userInfo.realised).equal(0);
    });

    describe("userInfo()", async () => {

      it("distribute increases allocations if the buffer is already > 0", async () => {
        let blocksMined = 10;
        let stakeAmt = utils.parseUnits("1000",8);
        await transmuter.connect(depositor).stake(stakeAmt);
        await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, utils.parseUnits("1000",8))
        await mineBlocks(ethers.provider, blocksMined);
        let userInfo = await transmuter.userInfo(await depositor.getAddress());
        let bufferInfo = await transmuter.bufferInfo();
  
        // 2 = transmutationPeriod / blocksMined
        expect(bufferInfo._buffer).equal(stakeAmt);
        expect(userInfo.pendingdivs).equal(stakeAmt.div(2));
        expect(userInfo.depositedAl).equal(stakeAmt);
        expect(userInfo.inbucket).equal(0);
        expect(userInfo.realised).equal(0);
      });
  
      it("increases buffer size, and userInfo() shows the correct state without an extra nudge", async () => {
        let stakeAmt = utils.parseUnits("1000",8);
        await transmuter.connect(depositor).stake(stakeAmt);
        await transmuter.connect(mockYumVesperVaultD8).distribute(mockYumVesperVaultD8Address, stakeAmt)
        await mineBlocks(ethers.provider, 10);
        let userInfo = await transmuter.userInfo(await depositor.getAddress());
        let bufferInfo = await transmuter.bufferInfo();
  
        expect(bufferInfo._buffer).equal("100000000000");
        expect(userInfo.pendingdivs).equal(stakeAmt.div(2));
        expect(userInfo.depositedAl).equal(stakeAmt);
        expect(userInfo.inbucket).equal(0);
        expect(userInfo.realised).equal(0);
      });
    })
  });
});
