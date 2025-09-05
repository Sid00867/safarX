const hre = require("hardhat");

async function main() {
  const SafarXID = await hre.ethers.getContractFactory("SafarXID");
  const safarx = await SafarXID.deploy();

  await safarx.deployed();
  console.log("SafarXID deployed to:", safarx.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
