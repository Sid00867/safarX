const hre = require("hardhat");

async function main() {
  const SafarXID = await hre.ethers.getContractFactory("SafarXID");
  const safarx = await SafarXID.deploy();

  await safarx.waitForDeployment(); // ✅ replaces safarx.deployed()

  console.log("SafarXID deployed to:", await safarx.getAddress()); // ✅ .address → .getAddress()
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
