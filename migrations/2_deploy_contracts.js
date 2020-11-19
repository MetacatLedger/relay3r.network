var Web3 = require("web3");

//Keeoer core contracts
const Keep3rV1HelperLegacyV1 = artifacts.require("Keep3rV1HelperLegacyV1");
const Keep3rV1Library = artifacts.require("Keep3rV1Library");
const Relay3rV2 = artifacts.require("Relay3rV2");
const Keep3rV1JobRegistry = artifacts.require("Keep3rV1JobRegistry");
// const Governance = artifacts.require("Governance")
const TokenMigrator = artifacts.require("TokenMigratorCustomizable");
const MockBurnableToken = artifacts.require("BurnableToken");

//Jobs
const UnitradeRelay3r = artifacts.require("UnitradeRelay3r");
const UniswapV2SlidingOracle = artifacts.require("UniswapV2SlidingOracle");
const CoreFlashArbRelay3rOpt = artifacts.require("CoreFlashArbRelay3rOpt");

//LP contracts
// const GetRL3RLPs = artifacts.require("GetRelay3rLPTokens");
// const TokenHelper = artifacts.require("TokenHelper");

const Addrs = require("../constants/constants").Addrs;

const LiqMigratorNew = artifacts.require("LiqMigratorNew");

/* Various deploy stages */
const InitialDeployWithMigrator = false;
const TestMigrator = false;
const DeployLiqMigrator = false;
const DeployLegacyHelper =false;
const DeployNewCoreJob = true;

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
    await deployer.deploy(UnitradeRelay3r, RelayerTokenD.address);
    const UnitradeJob = await UnitradeRelay3r.deployed();
    //Add to jobs on keeper token
    await RelayerTokenD.addJob(UnitradeJob.address);

    //Deploy CoreFlashArbRelay3r
    await deployer.deploy(CoreFlashArbRelay3rOpt, RelayerTokenD.address,Addrs.CoreFlashArb[1],Addrs.CoreToken[1]);
    const CoreFlashArbRelay3rOpt = await CoreFlashArbRelay3rOpt.deployed();
    //Add to jobs on keeper token
    await RelayerTokenD.addJob(CoreFlashArbRelay3rOpt.address);

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
      "UnitradeRelay3r",
      "",
      "https://github.com/relay3r-network/relay3r-jobs/blob/main/src/jobs/unitraderelay3r.js"
    );

    await KeeperJobRegistryD.add(
      CoreFlashArbRelay3rOpt.address,
      "CoreFlashArbRelay3rOpt",
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
      CoreFlashArbRelay3rOptimizedV2Job.address,
      Web3.utils.toWei("15", "ether")
    );

    //Deploy migrator
    await deployer.deploy(TokenMigrator);
    const TokenMigratorD = await TokenMigrator.deployed();

    await TokenMigratorD.SetOriginToken(Addrs.RL3RToken[1]);
    await TokenMigratorD.SetSwapToken(RelayerTokenD.address);
    await TokenMigratorD.setBurn(true);
    //Now send supply of relayer tokens to migrator
    await RelayerTokenD.transfer(TokenMigratorD.address,Web3.utils.toWei("109965", "ether"));

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
  }

  else if (TestMigrator){
    //Deploy TokenMigrator
    await deployer.deploy(TokenMigrator);
    const TokenMigratorD = await TokenMigrator.deployed();

    ///Now deploy test token 1
    await deployer.deploy(MockBurnableToken,"TestToken1","TXS");
    const Token1 = await MockBurnableToken.deployed();
    await deployer.deploy(MockBurnableToken,"TestToken2","TXSS");
    const Token2 = await MockBurnableToken.deployed();

    await TokenMigratorD.SetOriginToken(Token1.address);
    await TokenMigratorD.SetSwapToken(Token2.address);

    //Now transfer 1k tokens of token2 to migrator
    await Token2.transfer(TokenMigratorD.address,Web3.utils.toWei("1000", "ether"));
    //Approve 1k tokens to migrator contract
    await Token1.approve(TokenMigratorD.address,Web3.utils.toWei("1000", "ether"));
    //Swap 1k tokens to token2
    // await TokenMigratorD.unpauseSwap();
    await TokenMigratorD.swapTokens(Web3.utils.toWei("1000", "ether"));

    const Token1SupplyAfterMigrate = await Token1.totalSupply()
    const Token2SupplyAfterMigrate = await Token2.totalSupply()

    //Check if migration was successful
    console.log(Token1SupplyAfterMigrate.toString() === "0")//Supply of token 1 to be 0 after migration
    console.log(Token2SupplyAfterMigrate.toString() === "1000000000000000000000") //supply of token 2 to be 1k after migration

  }
  else if (DeployLiqMigrator){
    await deployer.deploy(LiqMigratorNew);
  }

  else if (DeployLegacyHelper){
    const RelayerTokenD = await Relay3rV2.at("0x5b3F693EfD5710106eb2Eac839368364aCB5a70f");
    await deployer.deploy(Keep3rV1HelperLegacyV1);
    const keeperHelperD = await Keep3rV1HelperLegacyV1.deployed();
    await RelayerTokenD.setKeep3rHelper(keeperHelperD.address);

  }

  else if (DeployNewCoreJob){
    const RelayerTokenD = await Relay3rV2.at("0x5b3F693EfD5710106eb2Eac839368364aCB5a70f");
    const KeeperJobRegistryD = await Keep3rV1JobRegistry.at("0x3eB195B8BC0653E67f0aD14E0111755E01921B7D");

    //Deploy CoreFlashArbRelay3rNew
    await deployer.deploy(CoreFlashArbRelay3rOpt, RelayerTokenD.address,Addrs.CoreFlashArb[1],Addrs.CoreToken[1]);
    const CoreFlashArbRelay3rOptJob = await CoreFlashArbRelay3rOpt.deployed();
    //Add to jobs on keeper token
    await RelayerTokenD.addJob(CoreFlashArbRelay3rOptJob.address);
    //Add 15 RLR on CoreFlashArbRelay3rNew Job
    await RelayerTokenD.addRLRCredit(
      CoreFlashArbRelay3rOptJob.address,
        Web3.utils.toWei("15", "ether")
    );
    //Add to registry
    await KeeperJobRegistryD.add(
      CoreFlashArbRelay3rOptJob.address,
      "CoreFlashArbRelay3rOpt",
      "",
      "https://github.com/relay3r-network/relay3r-jobs/blob/main/src/jobs/coreflasharbrelay3r.js"
    );
  }

};
