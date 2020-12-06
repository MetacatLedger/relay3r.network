var Web3 = require("web3");

//Keeoer core contracts
const Keep3rV1HelperLegacyV1 = artifacts.require("Keep3rV1HelperLegacyV1");
const Keep3rV1Library = artifacts.require("Keep3rV1Library");
const Relay3rV2 = artifacts.require("Relay3rV2");
const Keep3rV1JobRegistry = artifacts.require("Keep3rV1JobRegistry");
const Keep3rV1HelperNew = artifacts.require("Keep3rV1HelperNew");
//Extra contracts
// const Governance = artifacts.require("Governance")
//Migration contracts
const TokenMigrator = artifacts.require("TokenMigratorCustomizable");
const LiqMigratorNew = artifacts.require("LiqMigratorNew");
//Mock testing token contract
const BurnableToken = artifacts.require("BurnableToken");
//Liquidty rewards
const RlrUniRewards = artifacts.require("RlrUniRewards");
const RlrMooniRewards = artifacts.require("RlrMooniRewards");

//Jobs
const UnitradeExecutorRLRV6 = artifacts.require("UnitradeExecutorRLRV6");
const UniswapV2SlidingOracle = artifacts.require("UniswapV2SlidingOracle");
const CoreFlashArbRelayerV3 = artifacts.require("CoreFlashArbRelayerV3");
const GetBackETHRelayer = artifacts.require("GetBackETHRelayer");
const BACFarmerRelayer = artifacts.require("BACFarmerRelayerv3");
const RelayerV1Oracle = artifacts.require("RelayerV1Oracle");

//LP contracts
// const GetRL3RLPs = artifacts.require("GetRelay3rLPTokens");
// const TokenHelper = artifacts.require("TokenHelper");

const Addrs = require("../constants/constants").Addrs;

/* Various deploy stages */
const InitialDeployWithMigrator = false;
const TestMigrator = false;
const DeployLiqMigrator = false;
const DeployLegacyHelper = false;
const DeployNewCoreJob = false;
const DeployNewUnitradeJob = false;
const DeployGBETHJob = false;
const DeployBACFarmerJob = false;
const DeployLiqMiner = false;
const DeployCHIJobs = false;
const DeployRelayerV1Oracle = false;
const DeployNewHelper =true;
const testLiqMinerPhase = false;

module.exports = async function (deployer) {
  // Deploy token with library
  if (InitialDeployWithMigrator) {
    //Deploy v2 token
    await deployer.deploy(Keep3rV1Library);
    await deployer.link(Keep3rV1Library, Relay3rV2);
    await deployer.deploy(Relay3rV2);
    const RelayerTokenD = await Relay3rV2.deployed();

    const InitiaLSupply = Web3.utils.toWei("109965", "ether");
    //Mint initial supply
    await RelayerTokenD.mint(InitiaLSupply); //109965 RLR

    //Deploy helper
    await deployer.deploy(Keep3rV1HelperLegacyV1);
    const keeperHelperD = await Keep3rV1HelperLegacyV1.deployed();
    // console.log(`KEEPER HELPER IS ${keeperHelperD.address}`);
    await keeperHelperD.setToken(RelayerTokenD.address);
    //Set helper on keeper token
    await RelayerTokenD.setKeep3rHelper(keeperHelperD.address);

    //Deploy UniswapV2SlidingOracle
    await deployer.deploy(UniswapV2SlidingOracle, RelayerTokenD.address);
    const UniswapV2SlidingOracleJob = await UniswapV2SlidingOracle.deployed();
    //Add to jobs on keeper token
    await RelayerTokenD.addJob(UniswapV2SlidingOracleJob.address);

    //Deploy UnitradeJob
    await deployer.deploy(UnitradeExecutorRLRV6, RelayerTokenD.address);
    const UnitradeJob = await UnitradeExecutorRLRV6.deployed();
    //Add to jobs on keeper token
    await RelayerTokenD.addJob(UnitradeJob.address);

    //Deploy CoreFlashArbRelay3r
    await deployer.deploy(
      CoreFlashArbRelayerV3,
      RelayerTokenD.address,
      Addrs.CoreFlashArb[1],
      Addrs.CoreToken[1]
    );
    const CoreFlashArbRelayerV3 = await CoreFlashArbRelayerV3.deployed();
    //Add to jobs on keeper token
    await RelayerTokenD.addJob(CoreFlashArbRelayerV3.address);

    //Deploy keeper job registry
    await deployer.deploy(Keep3rV1JobRegistry);
    const KeeperJobRegistryD = await Keep3rV1JobRegistry.deployed();

    //Add job data
    await KeeperJobRegistryD.add(
      UniswapV2SlidingOracleJob.address,
      "UniswapV2SlidingOracle",
      "",
      "https://github.com/relay3r-network/relay3r-jobs/blob/main/src/jobs/uniswapv2slidingoracle.js"
    );

    await KeeperJobRegistryD.add(
      UnitradeJob.address,
      "UnitradeExecutorRLRV6",
      "",
      "https://github.com/relay3r-network/relay3r-jobs/blob/main/src/jobs/unitraderelay3r.js"
    );

    await KeeperJobRegistryD.add(
      CoreFlashArbRelayerV3.address,
      "CoreFlashArbRelayerV3",
      "",
      "https://github.com/relay3r-network/relay3r-jobs/blob/main/src/jobs/coreflasharbrelay3r.js"
    );

    //Add 5 RLR on Unitrade Job
    await RelayerTokenD.addRLRCredit(
      UnitradeJob.address,
      Web3.utils.toWei("5", "ether")
    );
    //Add 12 RLR on UniswapV2SlidingOracleJob Job
    await RelayerTokenD.addRLRCredit(
      UniswapV2SlidingOracleJob.address,
      Web3.utils.toWei("15", "ether")
    );

    //Add 10 RLR on CoreFlashArbRelay3rJob Job
    await RelayerTokenD.addRLRCredit(
      CoreFlashArbRelayerV3imizedV2Job.address,
      Web3.utils.toWei("15", "ether")
    );

    //Deploy migrator
    await deployer.deploy(TokenMigrator);
    const TokenMigratorD = await TokenMigrator.deployed();

    await TokenMigratorD.SetOriginToken(Addrs.RL3RToken[1]);
    await TokenMigratorD.SetSwapToken(RelayerTokenD.address);
    await TokenMigratorD.setBurn(true);
    //Now send supply of relayer tokens to migrator
    await RelayerTokenD.transfer(
      TokenMigratorD.address,
      Web3.utils.toWei("109965", "ether")
    );

    // //Add 8 RLR on SushiswapV2Keep3r Job
    // await RelayerTokenD.addRLRCredit(
    //   SushiswapV2Keep3rJob.address,
    //   Web3.utils.toWei("8", "ether")
    // );
    // //Add 10 RLR on YearnV1EarnKeep3rJob Job
    // await RelayerTokenD.addCredit(
    //   YearnV1EarnKeep3rJob.address,
    //   Web3.utils.toWei("10", "ether")
    // );
  } else if (TestMigrator) {
    //Deploy TokenMigrator
    await deployer.deploy(TokenMigrator);
    const TokenMigratorD = await TokenMigrator.deployed();

    ///Now deploy test token 1
    await deployer.deploy(BurnableToken, "TestToken1", "TXS");
    const Token1 = await BurnableToken.deployed();
    await deployer.deploy(BurnableToken, "TestToken2", "TXSS");
    const Token2 = await BurnableToken.deployed();

    await TokenMigratorD.SetOriginToken(Token1.address);
    await TokenMigratorD.SetSwapToken(Token2.address);

    //Now transfer 1k tokens of token2 to migrator
    await Token2.transfer(
      TokenMigratorD.address,
      Web3.utils.toWei("1000", "ether")
    );
    //Approve 1k tokens to migrator contract
    await Token1.approve(
      TokenMigratorD.address,
      Web3.utils.toWei("1000", "ether")
    );
    //Swap 1k tokens to token2
    // await TokenMigratorD.unpauseSwap();
    await TokenMigratorD.swapTokens(Web3.utils.toWei("1000", "ether"));

    const Token1SupplyAfterMigrate = await Token1.totalSupply();
    const Token2SupplyAfterMigrate = await Token2.totalSupply();

    //Check if migration was successful
    console.log(Token1SupplyAfterMigrate.toString() === "0"); //Supply of token 1 to be 0 after migration
    console.log(
      Token2SupplyAfterMigrate.toString() === "1000000000000000000000"
    ); //supply of token 2 to be 1k after migration
  } else if (DeployLiqMigrator) {
    await deployer.deploy(LiqMigratorNew);
  } else if (DeployLegacyHelper) {
    const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
    await deployer.deploy(Keep3rV1HelperLegacyV1);
    const keeperHelperD = await Keep3rV1HelperLegacyV1.deployed();
    await RelayerTokenD.setKeep3rHelper(keeperHelperD.address);
  } else if (DeployNewCoreJob) {
    const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
    const KeeperJobRegistryD = await Keep3rV1JobRegistry.at(
      Addrs.Keep3rV1JobRegistry[1]
    );

    //Deploy CoreFlashArbRelay3rNew
    await deployer.deploy(
      CoreFlashArbRelayerV3,
      RelayerTokenD.address,
      Addrs.CoreFlashArb[1],
      Addrs.CoreToken[1]
    );
    const CoreFlashArbRelayerV3Job = await CoreFlashArbRelayerV3.deployed();
    //Remove old job
    await RelayerTokenD.removeJob("0x7905AAE5E92D9Ff324d0b2Ae5220e2Bb0078553a");
    //Add to jobs on keeper token
    await RelayerTokenD.addJob(CoreFlashArbRelayerV3Job.address);
    //Add 1 RLR on CoreFlashArbRelay3rNew Job
    await RelayerTokenD.addRLRCredit(
      CoreFlashArbRelayerV3Job.address,
      Web3.utils.toWei("1", "ether")
    );
    //Add to registry
    await KeeperJobRegistryD.add(
      CoreFlashArbRelayerV3Job.address,
      "CoreFlashArbRelayerV3",
      "",
      "https://github.com/relay3r-network/relay3r-jobs/blob/main/src/jobs/coreflasharbrelay3r.js"
    );
  } else if (DeployLiqMiner) {
    //Init RLR Interface
    const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
    //Deploy uniswap reward contract
    await deployer.deploy(RlrUniRewards);
    const RlrUniMine = await RlrUniRewards.deployed();
    // //Deploy mooniswap reward contract
    // await deployer.deploy(RlrMooniRewards);
    // const RlrMooniMine = await RlrMooniRewards.deployed();
      //Follow mainnet procedure
      //Send 4450 RLR to UniPool Rewards
      // RelayerTokenD.transfer(
      //   RlrUniMine.address,
      //   Web3.utils.toWei("4450", "ether")
      // );
      // //Send 4450 RLR to MooniPool Rewards
      // RelayerTokenD.transfer(
      //   RlrMooniMine.address,
      //   Web3.utils.toWei("4450", "ether")
      // );
      //Init slow rewards on both pools
      await RlrUniMine.initRewardSlow();
      // await RlrMooniMine.initRewardSlow();
  }
  else if (testLiqMinerPhase) {
      //Deploy uniswap reward contract
      await deployer.deploy(RlrUniRewards);
      const RlrUniMine = await RlrUniRewards.deployed();
      //deploy token to add liq to
      await deployer.deploy(BurnableToken, "RelayerReward", "RLRW");
      const Token1 = await BurnableToken.deployed();

      await deployer.deploy(BurnableToken, "RLRMockLP", "RLP");
      const TokenLP = await BurnableToken.deployed();

      //Set reward token
      await RlrUniMine.setRewardToken(Token1.address);
      await RlrUniMine.setLPToken(TokenLP.address);
      //Mint 89k tokens to transfer to rewards
      await Token1.mint(Web3.utils.toWei("4450", "ether"));
      //Now transfer 89k tokens of token1 to reward pool
      await Token1.transfer(
        RlrUniMine.address,
        Web3.utils.toWei("4450", "ether")
      );
      //Init slow rewardrate
      await RlrUniMine.initRewardSlow();
      // //Init normal reward rate
      // await RlrUniMine.initReward();
    }
    else if (DeployBACFarmerJob) {
      const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
      const KeeperJobRegistryD = await Keep3rV1JobRegistry.at(
        Addrs.Keep3rV1JobRegistry[1]
      );
      //Deploy BACFarmerRelayer
      await deployer.deploy(
        BACFarmerRelayer,
        RelayerTokenD.address,
        Addrs.BACFarmer[1]
      );

      const BACFarmerRelayerJob = await BACFarmerRelayer.deployed();
      //Add to jobs on keeper token
      await RelayerTokenD.addJob(BACFarmerRelayerJob.address);
      //Add 50 RLR on BACFarmerRelayer Job
      await RelayerTokenD.addRLRCredit(
        BACFarmerRelayerJob.address,
        Web3.utils.toWei("50", "ether")
      );
      //Add to registry
      await KeeperJobRegistryD.add(
        BACFarmerRelayerJob.address,
        "BACFarmerRelayerv3",
        "",
        "https://github.com/relay3r-network/relay3r-jobs/blob/new-combined/src/jobs/relayer/BACFarmerRelayerJob.js"
      );
    }
    else if (DeployGBETHJob) {
      const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
      const KeeperJobRegistryD = await Keep3rV1JobRegistry.at(
        Addrs.Keep3rV1JobRegistry[1]
      );

      //Deploy GetBackETHRelayer
      await deployer.deploy(
        GetBackETHRelayer,
        RelayerTokenD.address,
        Addrs.GetBackETHHelperV2[1]
      );

      const GetBackETHRelayerJob = await GetBackETHRelayer.deployed();
      //Add to jobs on keeper token
      await RelayerTokenD.addJob(GetBackETHRelayerJob.address);
      //Add 1 RLR on UnitradeExecutorRLRV6 Job
      await RelayerTokenD.addRLRCredit(
        GetBackETHRelayerJob.address,
        Web3.utils.toWei("50", "ether")
      );
      //Add to registry
      await KeeperJobRegistryD.add(
        GetBackETHRelayerJob.address,
        "GetBackETHRelayer",
        "",
        "https://github.com/relay3r-network/relay3r-jobs/blob/new-combined/src/jobs/relayer/GetBackETHRelayerJob.js"
      );
    }
    else if (DeployNewUnitradeJob) {
      const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
      const KeeperJobRegistryD = await Keep3rV1JobRegistry.at(
        Addrs.Keep3rV1JobRegistry[1]
      );

      await RelayerTokenD.removeJob("0x34bcA098B78E2291E6b8E321Cc9bfB9F451713A3");

      //Deploy UnitradeExecutorRLRV6
      await deployer.deploy(
        UnitradeExecutorRLRV6,
        RelayerTokenD.address
      );

      const UnitradeExecutorRLRV6Job = await UnitradeExecutorRLRV6.deployed();
      //Add to jobs on keeper token
      await RelayerTokenD.addJob(UnitradeExecutorRLRV6Job.address);
      // //Add 1 RLR on UnitradeExecutorRLRV6 Job
      // await RelayerTokenD.addRLRCredit(
      //   UnitradeExecutorRLRV6Job.address,
      //   Web3.utils.toWei("150", "ether")
      // );
      //Add to registry
      await KeeperJobRegistryD.add(
        UnitradeExecutorRLRV6Job.address,
        "UnitradeExecutorRLRV6",
        "",
        "https://github.com/relay3r-network/relay3r-jobs/blob/new-combined/src/jobs/relayer/UnitradeRelayerJob.js"
      );
    }

    else if (DeployCHIJobs) {
        const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
        const KeeperJobRegistryD = await Keep3rV1JobRegistry.at(
          Addrs.Keep3rV1JobRegistry[1]
        );
        //Remove old unitrade job
        await RelayerTokenD.removeJob("0x743bbe8416a9f1a6ff71d19f1e39F287C8225459");
        //Remove old corearb job
        await RelayerTokenD.removeJob("0x7A2369056c20270778651cba53F5A860ed2E29Cc");

        //Deploy UnitradeExecutorRLRV6
        await deployer.deploy(
          UnitradeExecutorRLRV6,
          RelayerTokenD.address
        );

        const UnitradeExecutorRLRV6Job = await UnitradeExecutorRLRV6.deployed();
        //Add to jobs on keeper token
        await RelayerTokenD.addJob(UnitradeExecutorRLRV6Job.address);
        // //Add 1 RLR on UnitradeExecutorRLRV6 Job
        await RelayerTokenD.addRLRCredit(
          UnitradeExecutorRLRV6Job.address,
          Web3.utils.toWei("50", "ether")
        );
        //Add to registry
        await KeeperJobRegistryD.add(
          UnitradeExecutorRLRV6Job.address,
          "UnitradeExecutorRLRV6",
          "",
          "https://github.com/relay3r-network/relay3r-jobs/blob/new-combined/src/jobs/relayer/UnitradeRelayerJob.js"
        );

        //Deploy CoreFlashArbRelayerV3
        await deployer.deploy(
          CoreFlashArbRelayerV3,
          RelayerTokenD.address,
          Addrs.CoreFlashArb[1]
        );

        const CoreFlashArbRelayerV3Job = await CoreFlashArbRelayerV3.deployed();
        //Add to jobs on keeper token
        await RelayerTokenD.addJob(CoreFlashArbRelayerV3Job.address);
        //Add 50 RLR on CoreFlashArbRelayerV3 Job
        await RelayerTokenD.addRLRCredit(
          CoreFlashArbRelayerV3Job.address,
          Web3.utils.toWei("50", "ether")
        );
        //Add to registry
        await KeeperJobRegistryD.add(
          CoreFlashArbRelayerV3Job.address,
          "CoreFlashArbRelayerV3",
          "",
          "https://github.com/relay3r-network/relay3r-jobs/blob/new-combined/src/jobs/relayer/CoreFlashArbRelayerJob.js"
        );
    }
    else if (DeployRelayerV1Oracle) {
      const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
      const KeeperJobRegistryD = await Keep3rV1JobRegistry.at(
        Addrs.Keep3rV1JobRegistry[1]
      );
      //Remove uniswap oracle job
      await RelayerTokenD.removeJob("0x89d278c57cDef0c1cA588B95191d7759AC797A0c");
      //Remove old relayer oracle job
      await RelayerTokenD.removeJob("0xB98f3F6EeB490545940Cc8BA6AD68B49e071B2a7");

      //Deploy RelayerV1Oracle
      await deployer.deploy(
        RelayerV1Oracle
      );

      const RelayerV1OracleJob = await RelayerV1Oracle.deployed();
      //Add to jobs on keeper token
      await RelayerTokenD.addJob(RelayerV1OracleJob.address);
      //Add 200 RLR on RelayerV1Oracle Job
      await RelayerTokenD.addRLRCredit(
        RelayerV1OracleJob.address,
        Web3.utils.toWei("200", "ether")
      );
      //Add to registry
      await KeeperJobRegistryD.add(
        RelayerV1OracleJob.address,
        "RelayerV1Oracle",
        "",
        "https://github.com/relay3r-network/relay3r-jobs/blob/new-combined/src/jobs/relayer/RelayerV1OracleJob.js"
      );
    }
    else if (DeployNewHelper){
      const RelayerTokenD = await Relay3rV2.at(Addrs.RLRToken[1]);
      await deployer.deploy(Keep3rV1HelperNew);
      const helperNew = await Keep3rV1HelperNew.deployed();
      await RelayerTokenD.setKeep3rHelper(helperNew.address);
    }
};
