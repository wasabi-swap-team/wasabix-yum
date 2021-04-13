import chai from "chai";
import chaiSubset from "chai-subset";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
import { ContractFactory, Signer, utils } from "ethers";
import { TransmuterD8 } from "../../types/TransmuterD8";
import { YumVesperVaultD8 } from "../../types/YumVesperVaultD8";
import { WaBtcToken } from "../../types/WaBtcToken";
import { Erc20Mock } from "../../types/Erc20Mock";
import { ZERO_ADDRESS } from "../utils/helpers";
import { VesperVaultAdapterMock } from "../../types/VesperVaultAdapterMock";
const { parseUnits } = utils;

chai.use(solidity);
chai.use(chaiSubset);

const { expect } = chai;

let YumVesperVaultD8Factory: ContractFactory;
let WaBTCFactory: ContractFactory;
let ERC20MockFactory: ContractFactory;
let VesperVaultAdapterMockFactory: ContractFactory;
let TransmuterD8Factory: ContractFactory;

describe("YumVesperVaultD8", () => {
  let signers: Signer[];

  before(async () => {
    YumVesperVaultD8Factory = await ethers.getContractFactory("YumVesperVaultD8");
    TransmuterD8Factory = await ethers.getContractFactory("TransmuterD8");
    WaBTCFactory = await ethers.getContractFactory("WaBtcToken");
    ERC20MockFactory = await ethers.getContractFactory("ERC20Mock");
    VesperVaultAdapterMockFactory = await ethers.getContractFactory(
      "VesperVaultAdapterMock"
    );
  });

  beforeEach(async () => {
    signers = await ethers.getSigners();
  });

  describe("constructor", async () => {
    let deployer: Signer;
    let governance: Signer;
    let sentinel: Signer;
    let token: Erc20Mock;
    let waBtc: WaBtcToken;
    
    beforeEach(async () => {
      [deployer, governance, sentinel, ...signers] = signers;

      token = (await ERC20MockFactory.connect(deployer).deploy(
        "Mock WBTC",
        "WBTC",
        8
      )) as Erc20Mock;

      waBtc = (await WaBTCFactory.connect(deployer).deploy()) as WaBtcToken;
    });

    context("when governance is the zero address", () => {
      it("reverts", async () => {
        expect(
          YumVesperVaultD8Factory.connect(deployer).deploy(
            token.address,
            waBtc.address,
            ZERO_ADDRESS,
            await sentinel.getAddress()
          )
        ).revertedWith("YumVesperVaultD8: governance address cannot be 0x0.");
      });
    });
  });

  describe("update YumVesperVaultD8 addys and variables", () => {
    let deployer: Signer;
    let governance: Signer;
    let newGovernance: Signer;
    let rewards: Signer;
    let sentinel: Signer;
    let transmuter: Signer;
    let token: Erc20Mock;
    let waBtc: WaBtcToken;
    let yumVesperVaultD8: YumVesperVaultD8;

    beforeEach(async () => {
      [
        deployer,
        governance,
        newGovernance,
        rewards,
        sentinel,
        transmuter,
        ...signers
      ] = signers;

      token = (await ERC20MockFactory.connect(deployer).deploy(
        "Mock WBTC",
        "WBTC",
        8
      )) as Erc20Mock;

      waBtc = (await WaBTCFactory.connect(deployer).deploy()) as WaBtcToken;

      yumVesperVaultD8 = (await YumVesperVaultD8Factory.connect(deployer).deploy(
        token.address,
        waBtc.address,
        await governance.getAddress(),
        await sentinel.getAddress()
      )) as YumVesperVaultD8;

    });

    describe("set governance", () => {
      context("when caller is not current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(deployer)));

        it("reverts", async () => {
          expect(
            yumVesperVaultD8.setPendingGovernance(await newGovernance.getAddress())
          ).revertedWith("YumVesperVaultD8: only governance");
        });
      });

      context("when caller is current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(governance)));

        it("reverts when setting governance to zero address", async () => {
          expect(yumVesperVaultD8.setPendingGovernance(ZERO_ADDRESS)).revertedWith(
            "YumVesperVaultD8: governance address cannot be 0x0."
          );
        });

        it("updates rewards", async () => {
          await yumVesperVaultD8.setRewards(await rewards.getAddress());
          expect(await yumVesperVaultD8.rewards()).equal(await rewards.getAddress());
        });
      });
    });

    describe("set transmuter", () => {
      context("when caller is not current governance", () => {
        it("reverts", async () => {
          expect(
            yumVesperVaultD8.setTransmuter(await transmuter.getAddress())
          ).revertedWith("YumVesperVaultD8: only governance");
        });
      });

      context("when caller is current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(governance)));

        it("reverts when setting transmuter to zero address", async () => {
          expect(yumVesperVaultD8.setTransmuter(ZERO_ADDRESS)).revertedWith(
            "YumVesperVaultD8: transmuter address cannot be 0x0."
          );
        });

        it("updates transmuter", async () => {
          await yumVesperVaultD8.setTransmuter(await transmuter.getAddress());
          expect(await yumVesperVaultD8.transmuter()).equal(
            await transmuter.getAddress()
          );
        });
      });
    });

    describe("set rewards", () => {
      context("when caller is not current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(deployer)));

        it("reverts", async () => {
          expect(yumVesperVaultD8.setRewards(await rewards.getAddress())).revertedWith(
            "YumVesperVaultD8: only governance"
          );
        });
      });

      context("when caller is current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(governance)));

        it("reverts when setting rewards to zero address", async () => {
          expect(yumVesperVaultD8.setRewards(ZERO_ADDRESS)).revertedWith(
            "YumVesperVaultD8: rewards address cannot be 0x0."
          );
        });

        it("updates rewards", async () => {
          await yumVesperVaultD8.setRewards(await rewards.getAddress());
          expect(await yumVesperVaultD8.rewards()).equal(await rewards.getAddress());
        });
      });
    });

    describe("set peformance fee", () => {
      context("when caller is not current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(deployer)));

        it("reverts", async () => {
          expect(yumVesperVaultD8.setHarvestFee(1)).revertedWith(
            "YumVesperVaultD8: only governance"
          );
        });
      });

      context("when caller is current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(governance)));

        it("reverts when performance fee greater than maximum", async () => {
          const MAXIMUM_VALUE = await yumVesperVaultD8.PERCENT_RESOLUTION();
          expect(yumVesperVaultD8.setHarvestFee(MAXIMUM_VALUE.add(1))).revertedWith(
            "YumVesperVaultD8: harvest fee above maximum"
          );
        });

        it("updates performance fee", async () => {
          await yumVesperVaultD8.setHarvestFee(1);
          expect(await yumVesperVaultD8.harvestFee()).equal(1);
        });
      });
    });

    describe("set collateralization limit", () => {
      context("when caller is not current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(deployer)));

        it("reverts", async () => {
          const collateralizationLimit = await yumVesperVaultD8.MINIMUM_COLLATERALIZATION_LIMIT();
          expect(
            yumVesperVaultD8.setCollateralizationLimit(collateralizationLimit)
          ).revertedWith("YumVesperVaultD8: only governance");
        });
      });

      context("when caller is current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(governance)));

        it("reverts when performance fee less than minimum", async () => {
          const MINIMUM_LIMIT = await yumVesperVaultD8.MINIMUM_COLLATERALIZATION_LIMIT();
          expect(
            yumVesperVaultD8.setCollateralizationLimit(MINIMUM_LIMIT.sub(1))
          ).revertedWith("YumVesperVaultD8: collateralization limit below minimum.");
        });

        it("reverts when performance fee greater than maximum", async () => {
          const MAXIMUM_LIMIT = await yumVesperVaultD8.MAXIMUM_COLLATERALIZATION_LIMIT();
          expect(
            yumVesperVaultD8.setCollateralizationLimit(MAXIMUM_LIMIT.add(1))
          ).revertedWith("YumVesperVaultD8: collateralization limit above maximum");
        });

        it("updates collateralization limit", async () => {
          const collateralizationLimit = await yumVesperVaultD8.MINIMUM_COLLATERALIZATION_LIMIT();
          await yumVesperVaultD8.setCollateralizationLimit(collateralizationLimit);
          expect(await yumVesperVaultD8.collateralizationLimit()).containSubset([
            collateralizationLimit,
          ]);
        });
      });
    });
  });

  describe("vault actions", () => {
    let deployer: Signer;
    let governance: Signer;
    let sentinel: Signer;
    let rewards: Signer;
    let transmuter: Signer;
    let minter: Signer;
    let user: Signer;
    let token: Erc20Mock;
    let waBtc: WaBtcToken;
    let yumVesperVaultD8: YumVesperVaultD8;
    let adapter: VesperVaultAdapterMock;
    let harvestFee = 1000;
    let pctReso = 10000;
    let transmuterContract: TransmuterD8;

    beforeEach(async () => {
      [
        deployer,
        governance,
        sentinel,
        rewards,
        transmuter,
        minter,
        user,
        ...signers
      ] = signers;

      token = (await ERC20MockFactory.connect(deployer).deploy(
        "Mock DAI",
        "DAI",
        18
      )) as Erc20Mock;

      waBtc = (await WaBTCFactory.connect(deployer).deploy()) as WaBtcToken;

      yumVesperVaultD8 = (await YumVesperVaultD8Factory.connect(deployer).deploy(
        token.address,
        waBtc.address,
        await governance.getAddress(),
        await sentinel.getAddress()
      )) as YumVesperVaultD8;

      await yumVesperVaultD8
        .connect(governance)
        .setTransmuter(await transmuter.getAddress());
      await yumVesperVaultD8
        .connect(governance)
        .setRewards(await rewards.getAddress());
      await yumVesperVaultD8.connect(governance).setHarvestFee(harvestFee);
      transmuterContract = (await TransmuterD8Factory.connect(deployer).deploy(
        waBtc.address,
        token.address,
        await governance.getAddress()
      )) as TransmuterD8;
      await yumVesperVaultD8.connect(governance).setTransmuter(transmuterContract.address);
      await transmuterContract.connect(governance).setWhitelist(yumVesperVaultD8.address, true);
      await token.mint(await minter.getAddress(), parseUnits("10000", 8));
      await token.connect(minter).approve(yumVesperVaultD8.address, parseUnits("10000", 8));
    });

    describe("migrate", () => {
      beforeEach(async () => {
        adapter = (await VesperVaultAdapterMockFactory.connect(deployer).deploy(
          token.address
        )) as VesperVaultAdapterMock;

        await yumVesperVaultD8.connect(governance).initialize(adapter.address);
      });

      context("when caller is not current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(deployer)));

        it("reverts", async () => {
          expect(yumVesperVaultD8.migrate(adapter.address)).revertedWith(
            "YumVesperVaultD8: only governance"
          );
        });
      });

      context("when caller is current governance", () => {
        beforeEach(() => (yumVesperVaultD8 = yumVesperVaultD8.connect(governance)));

        context("when adapter is zero address", async () => {
          it("reverts", async () => {
            expect(yumVesperVaultD8.migrate(ZERO_ADDRESS)).revertedWith(
              "YumVesperVaultD8: active vault address cannot be 0x0."
            );
          });
        });

        context("when adapter token mismatches", () => {
          const tokenAddress = ethers.utils.getAddress(
            "0xffffffffffffffffffffffffffffffffffffffff"
          );

          let invalidAdapter: VesperVaultAdapterMock;

          beforeEach(async () => {
            invalidAdapter = (await VesperVaultAdapterMockFactory.connect(
              deployer
            ).deploy(tokenAddress)) as VesperVaultAdapterMock;
          });

          it("reverts", async () => {
            expect(yumVesperVaultD8.migrate(invalidAdapter.address)).revertedWith(
              "YumVesperVaultD8: token mismatch"
            );
          });
        });

        context("when conditions are met", () => {
          beforeEach(async () => {
            await yumVesperVaultD8.migrate(adapter.address);
          });

          it("increments the vault count", async () => {
            expect(await yumVesperVaultD8.vaultCount()).equal(2);
          });

          it("sets the vaults adapter", async () => {
            expect(await yumVesperVaultD8.getVaultAdapter(0)).equal(adapter.address);
          });
        });
      });
    });

    describe("flush funds", () => {
      let adapter: VesperVaultAdapterMock;

      context("when the YumVesperVaultD8 is not initialized", () => {
        it("reverts", async () => {
          expect(yumVesperVaultD8.flush()).revertedWith("YumVesperVaultD8: not initialized.");
        });
      });

      context("when there is at least one vault to flush to", () => {
        context("when there is one vault", () => {
          let adapter: VesperVaultAdapterMock;
          let mintAmount = parseUnits("5000", 8);

          beforeEach(async () => {
            adapter = (await VesperVaultAdapterMockFactory.connect(deployer).deploy(
              token.address
            )) as VesperVaultAdapterMock;
          });

          beforeEach(async () => {
            await token.mint(yumVesperVaultD8.address, mintAmount);

            await yumVesperVaultD8.connect(governance).initialize(adapter.address);

            await yumVesperVaultD8.flush();
          });

          it("flushes funds to the vault", async () => {
            expect(await token.balanceOf(adapter.address)).equal(mintAmount);
          });
        });

        context("when there are multiple vaults", () => {
          let inactiveAdapter: VesperVaultAdapterMock;
          let activeAdapter: VesperVaultAdapterMock;
          let mintAmount = parseUnits("5000", 8);

          beforeEach(async () => {
            inactiveAdapter = (await VesperVaultAdapterMockFactory.connect(
              deployer
            ).deploy(token.address)) as VesperVaultAdapterMock;

            activeAdapter = (await VesperVaultAdapterMockFactory.connect(
              deployer
            ).deploy(token.address)) as VesperVaultAdapterMock;

            await token.mint(yumVesperVaultD8.address, mintAmount);

            await yumVesperVaultD8
              .connect(governance)
              .initialize(inactiveAdapter.address);

            await yumVesperVaultD8.connect(governance).migrate(activeAdapter.address);

            await yumVesperVaultD8.flush();
          });

          it("flushes funds to the active vault", async () => {
            expect(await token.balanceOf(activeAdapter.address)).equal(
              mintAmount
            );
          });
        });
      });
    });

    describe("deposit and withdraw tokens", () => {
      let depositAmt = parseUnits("5000", 8);
      let mintAmt = parseUnits("1000", 8);
      let ceilingAmt = parseUnits("10000", 8);
      let collateralizationLimit = "200000000"; // this should be set in the deploy sequence
      beforeEach(async () => {
        adapter = (await VesperVaultAdapterMockFactory.connect(deployer).deploy(
          token.address
        )) as VesperVaultAdapterMock;
        await yumVesperVaultD8.connect(governance).initialize(adapter.address);
        await yumVesperVaultD8
          .connect(governance)
          .setCollateralizationLimit(collateralizationLimit);
        await waBtc.connect(deployer).setWhitelist(yumVesperVaultD8.address, true);
        await waBtc.connect(deployer).setCeiling(yumVesperVaultD8.address, ceilingAmt);
        await token.mint(await minter.getAddress(), depositAmt);
        await token.connect(minter).approve(yumVesperVaultD8.address, parseUnits("100000000", 8));
        await waBtc.connect(minter).approve(yumVesperVaultD8.address, parseUnits("100000000", 8));
      });

      it("deposited amount is accounted for correctly", async () => {
        // let address = await deployer.getAddress();
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        expect(
          await yumVesperVaultD8
            .connect(minter)
            .getCdpTotalDeposited(await minter.getAddress())
        ).equal(depositAmt);
      });

      it("deposits token and then withdraws all", async () => {
        let balBefore = await token.balanceOf(await minter.getAddress());
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        await yumVesperVaultD8.connect(minter).withdraw(depositAmt);
        let balAfter = await token.balanceOf(await minter.getAddress());
        expect(balBefore).equal(balAfter);
      });

      it("reverts when withdrawing too much", async () => {
        let overdraft = depositAmt.add(parseUnits("1000", 8));
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        expect(yumVesperVaultD8.connect(minter).withdraw(overdraft)).revertedWith("ERC20: transfer amount exceeds balance");
      });

      it("reverts when cdp is undercollateralized", async () => {
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        expect(yumVesperVaultD8.connect(minter).withdraw(depositAmt)).revertedWith("Action blocked: unhealthy collateralization ratio");
      });
      
      it("deposits, mints, repays, and withdraws", async () => {
        let balBefore = await token.balanceOf(await minter.getAddress());
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        await yumVesperVaultD8.connect(minter).repay(0, mintAmt);
        await yumVesperVaultD8.connect(minter).withdraw(depositAmt);
        let balAfter = await token.balanceOf(await minter.getAddress());
        expect(balBefore).equal(balAfter);
      });

      it("deposits 5000 DAI, mints 1000 alUSD, and withdraws 3000 DAI", async () => {
        let withdrawAmt = depositAmt.sub(mintAmt.mul(2));
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        await yumVesperVaultD8.connect(minter).withdraw(withdrawAmt);
        expect(await token.balanceOf(await minter.getAddress())).equal(
          parseUnits("13000", 8)
        );
      });

      describe("flushActivator", async () => {
        beforeEach(async () => {
          await token.connect(deployer).approve(yumVesperVaultD8.address, parseUnits("1", 8));
          await token.mint(await deployer.getAddress(), parseUnits("1", 8));
          await token.mint(await minter.getAddress(), parseUnits("100000", 8));
          await yumVesperVaultD8.connect(deployer).deposit(parseUnits("1", 8));
        });

        it("deposit() flushes funds if amount >= flushActivator", async () => {
          let balBeforeWhale = await token.balanceOf(adapter.address);
          await yumVesperVaultD8.connect(minter).deposit(parseUnits("100000", 8));
          let balAfterWhale = await token.balanceOf(adapter.address);
          expect(balBeforeWhale).equal(0);
          expect(balAfterWhale).equal(parseUnits("100001", 8));
        });

        it("deposit() does not flush funds if amount < flushActivator", async () => {
          let balBeforeWhale = await token.balanceOf(adapter.address);
          await yumVesperVaultD8.connect(minter).deposit(parseUnits("99999", 8));
          let balAfterWhale = await token.balanceOf(adapter.address);
          expect(balBeforeWhale).equal(0);
          expect(balAfterWhale).equal(0);
        });
      })
    });

    describe("repay and liquidate tokens", () => {
      let depositAmt = parseUnits("5000", 8);
      let mintAmt = parseUnits("1000", 8);
      let ceilingAmt = parseUnits("10000", 8);
      let collateralizationLimit = "200000000"; // this should be set in the deploy sequence
      beforeEach(async () => {
        adapter = (await VesperVaultAdapterMockFactory.connect(deployer).deploy(
          token.address
        )) as VesperVaultAdapterMock;
        await yumVesperVaultD8.connect(governance).initialize(adapter.address);
        await yumVesperVaultD8
          .connect(governance)
          .setCollateralizationLimit(collateralizationLimit);
        await waBtc.connect(deployer).setWhitelist(yumVesperVaultD8.address, true);
        await waBtc.connect(deployer).setCeiling(yumVesperVaultD8.address, ceilingAmt);
        await token.mint(await minter.getAddress(), ceilingAmt);
        await token.connect(minter).approve(yumVesperVaultD8.address, ceilingAmt);
        await waBtc.connect(minter).approve(yumVesperVaultD8.address, parseUnits("100000000", 8));
        await token.connect(minter).approve(transmuterContract.address, ceilingAmt);
        await waBtc.connect(minter).approve(transmuterContract.address, depositAmt);
      });
      it("repay with dai reverts when nothing is minted and transmuter has no waBtc deposits", async () => {
        await yumVesperVaultD8.connect(minter).deposit(depositAmt.sub(parseUnits("1000", 8)))
        expect(yumVesperVaultD8.connect(minter).repay(mintAmt, 0)).revertedWith("SafeMath: subtraction overflow")
      })
      it("liquidate max amount possible if trying to liquidate too much", async () => {
        let liqAmt = depositAmt;
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        await transmuterContract.connect(minter).stake(mintAmt);
        await yumVesperVaultD8.connect(minter).liquidate(liqAmt);
        const transBal = await token.balanceOf(transmuterContract.address);
        expect(transBal).equal(mintAmt);
      })
      it("liquidates funds from vault if not enough in the buffer", async () => {
        let liqAmt = parseUnits("600", 8);
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        await yumVesperVaultD8.connect(governance).flush();
        await yumVesperVaultD8.connect(minter).deposit(mintAmt.div(2));
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        await transmuterContract.connect(minter).stake(mintAmt);
        const yumVesperVaultD8TokenBalPre = await token.balanceOf(yumVesperVaultD8.address);
        await yumVesperVaultD8.connect(minter).liquidate(liqAmt);
        const yumVesperVaultD8TokenBalPost = await token.balanceOf(yumVesperVaultD8.address);
        console.log("pre", yumVesperVaultD8TokenBalPre.toString(), yumVesperVaultD8TokenBalPost.toString())
        const transmuterEndingTokenBal = await token.balanceOf(transmuterContract.address);
        expect(yumVesperVaultD8TokenBalPost).equal(0);
        expect(transmuterEndingTokenBal).equal(liqAmt);
      })
      it("liquidates the minimum necessary from the yumVesperVaultD8 buffer", async () => {
        let dep2Amt = parseUnits("500", 8);
        let liqAmt = parseUnits("200", 8);
        await yumVesperVaultD8.connect(minter).deposit(parseUnits("2000", 8));
        await yumVesperVaultD8.connect(governance).flush();
        await yumVesperVaultD8.connect(minter).deposit(dep2Amt);
        await yumVesperVaultD8.connect(minter).mint(parseUnits("1000", 8));
        await transmuterContract.connect(minter).stake(parseUnits("1000", 8));
        const yumVesperVaultD8TokenBalPre = await token.balanceOf(yumVesperVaultD8.address);
        await yumVesperVaultD8.connect(minter).liquidate(liqAmt);
        const yumVesperVaultD8TokenBalPost = await token.balanceOf(yumVesperVaultD8.address);

        const transmuterEndingTokenBal = await token.balanceOf(transmuterContract.address);
        expect(yumVesperVaultD8TokenBalPost).equal(dep2Amt.sub(liqAmt));
        expect(transmuterEndingTokenBal).equal(liqAmt);
      })
      it("deposits, mints waBtc, repays, and has no outstanding debt", async () => {
        await yumVesperVaultD8.connect(minter).deposit(depositAmt.sub(parseUnits("1000", 8)));
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        await transmuterContract.connect(minter).stake(mintAmt);
        await yumVesperVaultD8.connect(minter).repay(mintAmt, 0);
        expect(await yumVesperVaultD8.connect(minter).getCdpTotalDebt(await minter.getAddress())).equal(0)
      })
      it("deposits, mints, repays, and has no outstanding debt", async () => {
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        await yumVesperVaultD8.connect(minter).repay(0, mintAmt);
        expect(
          await yumVesperVaultD8
            .connect(minter)
            .getCdpTotalDebt(await minter.getAddress())
        ).equal(0);
      });
      it("deposits, mints waBtc, repays with waBtc and DAI, and has no outstanding debt", async () => {
        await yumVesperVaultD8.connect(minter).deposit(depositAmt.sub(parseUnits("1000", 8)));
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        await transmuterContract.connect(minter).stake(parseUnits("500", 8));
        await yumVesperVaultD8.connect(minter).repay(parseUnits("500", 8), parseUnits("500", 8));
        expect(await yumVesperVaultD8.connect(minter).getCdpTotalDebt(await minter.getAddress())).equal(0)
      })

      it("deposits and liquidates DAI", async () => {
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        await yumVesperVaultD8.connect(minter).mint(mintAmt);
        await transmuterContract.connect(minter).stake(mintAmt);
        await yumVesperVaultD8.connect(minter).liquidate(mintAmt);
        expect( await yumVesperVaultD8.connect(minter).getCdpTotalDeposited(await minter.getAddress())).equal(depositAmt.sub(mintAmt))
      });
    });

    describe("mint", () => {
      let depositAmt = parseUnits("5000", 8);
      let mintAmt = parseUnits("1000", 8);
      let ceilingAmt = parseUnits("1000", 8);

      beforeEach(async () => {
        adapter = (await VesperVaultAdapterMockFactory.connect(deployer).deploy(
          token.address
        )) as VesperVaultAdapterMock;

        await yumVesperVaultD8.connect(governance).initialize(adapter.address);

        await waBtc.connect(deployer).setCeiling(yumVesperVaultD8.address, ceilingAmt);
        await token.mint(await minter.getAddress(), depositAmt);
        await token.connect(minter).approve(yumVesperVaultD8.address, depositAmt);
      });

      it("reverts if the YumVesperVaultD8 is not whitelisted", async () => {
        await yumVesperVaultD8.connect(minter).deposit(depositAmt);
        expect(yumVesperVaultD8.connect(minter).mint(mintAmt)).revertedWith(
          "WaBTC: Yum Vault is not whitelisted"
        );
      });

      context("is whiltelisted", () => {
        beforeEach(async () => {
          await waBtc.connect(deployer).setWhitelist(yumVesperVaultD8.address, true);
        });

        it("reverts if the YumVesperVaultD8 is blacklisted", async () => {
        
          await waBtc.connect(deployer).setBlacklist(yumVesperVaultD8.address);
          await yumVesperVaultD8.connect(minter).deposit(depositAmt);
          expect(yumVesperVaultD8.connect(minter).mint(mintAmt)).revertedWith(
            "WaBTC: Yum Vault is blacklisted"
          );
        });
  
        it("reverts when trying to mint too much", async () => {
          expect(yumVesperVaultD8.connect(minter).mint(parseUnits("2000", 8))).revertedWith(
            "Loan-to-value ratio breached"
          );
        });
  
        it("reverts if the ceiling was breached", async () => {
          let lowCeilingAmt = parseUnits("100", 8);
          await waBtc
            .connect(deployer)
            .setCeiling(yumVesperVaultD8.address, lowCeilingAmt);
          await yumVesperVaultD8.connect(minter).deposit(depositAmt);
          expect(yumVesperVaultD8.connect(minter).mint(mintAmt)).revertedWith(
            "WaBTC: Yum Vault's ceiling was breached"
          );
        });
  
        it("mints successfully to depositor", async () => {
          let balBefore = await token.balanceOf(await minter.getAddress());
          await yumVesperVaultD8.connect(minter).deposit(depositAmt);
          await yumVesperVaultD8.connect(minter).mint(mintAmt);
          let balAfter = await token.balanceOf(await minter.getAddress());
  
          expect(balAfter).equal(balBefore.sub(depositAmt));
          expect(await waBtc.balanceOf(await minter.getAddress())).equal(mintAmt);
        });
      });
    });

    describe("harvest", () => {
      let depositAmt = parseUnits("5000", 8);
      let mintAmt = parseUnits("1000", 8);
      let stakeAmt = mintAmt.div(2);
      let ceilingAmt = parseUnits("10000", 8);
      let yieldAmt = parseUnits("100", 8);

      beforeEach(async () => {
        adapter = (await VesperVaultAdapterMockFactory.connect(deployer).deploy(
          token.address
        )) as VesperVaultAdapterMock;

        await waBtc.connect(deployer).setWhitelist(yumVesperVaultD8.address, true);
        await yumVesperVaultD8.connect(governance).initialize(adapter.address);
        await waBtc.connect(deployer).setCeiling(yumVesperVaultD8.address, ceilingAmt);
        await token.mint(await user.getAddress(), depositAmt);
        await token.connect(user).approve(yumVesperVaultD8.address, depositAmt);
        await waBtc.connect(user).approve(transmuterContract.address, depositAmt);
        await yumVesperVaultD8.connect(user).deposit(depositAmt);
        await yumVesperVaultD8.connect(user).mint(mintAmt);
        await transmuterContract.connect(user).stake(stakeAmt);
        await yumVesperVaultD8.flush();
      });

      it("harvests yield from the vault", async () => {
        await token.mint(adapter.address, yieldAmt);
        await yumVesperVaultD8.harvest(0);
        let transmuterBal = await token.balanceOf(transmuterContract.address);
        expect(transmuterBal).equal(yieldAmt.sub(yieldAmt.div(pctReso/harvestFee)));
        let vaultBal = await token.balanceOf(adapter.address);
        expect(vaultBal).equal(depositAmt);
      })

      it("sends the harvest fee to the rewards address", async () => {
        await token.mint(adapter.address, yieldAmt);
        await yumVesperVaultD8.harvest(0);
        let rewardsBal = await token.balanceOf(await rewards.getAddress());
        expect(rewardsBal).equal(yieldAmt.mul(100).div(harvestFee));
      })

      it("does not update any balances if there is nothing to harvest", async () => {
        let initTransBal = await token.balanceOf(transmuterContract.address);
        let initRewardsBal = await token.balanceOf(await rewards.getAddress());
        await yumVesperVaultD8.harvest(0);
        let endTransBal = await token.balanceOf(transmuterContract.address);
        let endRewardsBal = await token.balanceOf(await rewards.getAddress());
        expect(initTransBal).equal(endTransBal);
        expect(initRewardsBal).equal(endRewardsBal);
      })
    })
  });
});
