import "react-native-get-random-values";
import "react-native-crypto";
import { polyfillGlobals } from "react-native-polyfill-globals";

polyfillGlobals({
  Buffer: true,
  process: true,
  stream: true,
  events: true,
  util: true,
  assert: true,
});

import { useState } from "react";
import { View, TextInput, Button, Text, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { ethers } from "ethers";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import { EthereumProvider } from "@walletconnect/ethereum-provider";

// Contract ABI
import contractAbi from "./abis/SafarXID.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [wcProvider, setWcProvider] = useState<any>(null); // save WC provider for later use

  // 🔹 Step 1: Connect wallet with WalletConnect
  const connectWallet = async () => {
    try {
      const provider = await EthereumProvider.init({
        projectId: "885abe49049d48d03e5a1583b391b655", // WalletConnect Cloud projectId
        chains: [31337], // Hardhat local chainId
        optionalChains: [31337],
        showQrModal: true,
        rpcMap: {
          31337: "http://192.168.1.7:8545", // Hardhat RPC + local IP
        },
      });

      await provider.connect(); // open QR modal

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();
      const network = await ethersProvider.getNetwork();

      console.log("Wallet Address:", address);
      console.log("Chain ID:", network.chainId);

      if (network.chainId !== 31337n) {
        Alert.alert(
          "Wrong Network",
          "Please switch MetaMask to Hardhat (31337)"
        );
        return;
      }

      setWalletAddress(address);
      setWcProvider(provider); // store provider for later contract calls
      Alert.alert("Wallet Connected", `Address: ${address}`);
    } catch (err: any) {
      console.error("WalletConnect Error:", err);
      Alert.alert("Failed to connect wallet", err?.message || "Check console");
    }
  };

  // 🔹 Step 2: Sign up + call smart contract with signer
  const signUp = async () => {
    if (!walletAddress || !wcProvider) {
      Alert.alert("Please connect your MetaMask wallet first");
      return;
    }

    // Supabase signup
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert("Signup failed", error.message);
      return;
    }

    const user = data.user;
    if (user) {
      const { error: insertError } = await supabase.from("users").insert([
        {
          user_Id: user.id,
          name,
          email,
          phone,
          wallet: walletAddress,
        },
      ]);

      if (insertError) {
        Alert.alert("Database error", insertError.message);
      }
    }

    try {
      // Use the signer from WalletConnect provider
      const ethersProvider = new ethers.BrowserProvider(wcProvider);
      const signer = await ethersProvider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractAbi.abi,
        signer
      );

      // Hash phone before storing
      const phoneHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        phone
      );

      // Call contract
      const tx = await contract.registerTourist(name, phoneHash);
      const receipt = await tx.wait();

      const qrPayload = {
        address: walletAddress,
        name,
        txHash: receipt.hash,
      };

      router.push({
        pathname: "/home",
        params: { qrData: JSON.stringify(qrPayload) },
      });
    } catch (err: any) {
      console.error("Blockchain Error:", err);
      Alert.alert(
        "Blockchain registration failed",
        err?.message || "Check console"
      );
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Register</Text>

      <TextInput
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <TextInput
        placeholder="Mobile Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="numeric"
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />

      <Button title="Connect to MetaMask Wallet" onPress={connectWallet} />
      <Button title="Register" onPress={signUp} />
    </View>
  );
}
