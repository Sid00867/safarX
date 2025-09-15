import { ethers } from "ethers";

// Generates a new wallet with random private key
export function generateSimpleWallet() {
  const wallet = ethers.Wallet.createRandom();
  return wallet;
}
