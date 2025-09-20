import { ethers } from "ethers";

// Generate a new random wallet
export const generateSimpleWallet = () => {
  return ethers.Wallet.createRandom();
};
