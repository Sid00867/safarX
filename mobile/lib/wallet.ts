import { ethers } from "ethers";

export function generateSimpleWallet() {
  const wallet = ethers.Wallet.createRandom();
  return { address: wallet.address };
}
