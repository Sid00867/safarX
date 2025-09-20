import React, { useState } from "react";
import { Text, View, TextInput, Button, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { generateSimpleWallet } from "@/lib/wallet";
import { ethers } from "ethers";
import SafarXID from "@/contracts/SafarXID.json";

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3"; // Hardhat local deploy

const SignUpScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const router = useRouter();

  const handleSignUp = async () => {
    try {
      // Step 1: Supabase signup
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert("Signup failed", error.message);
        return;
      }

      const user = data.user;
      if (!user) return;

      // Step 2: Generate a unique wallet
      const wallet = generateSimpleWallet();
      const walletAddress = wallet.address;

      // Save wallet to Supabase
      const { error: insertError } = await supabase.from("users").insert([
        {
          user_Id: user.id,
          name,
          email,
          phone,
          walletAddress,
          privateKey: wallet.privateKey,
        },
      ]);
      if (insertError) throw insertError;

      console.log("✅ Supabase user + DB entry created:", {
        userId: user.id,
        name,
        email,
        phone,
        walletAddress,
      });

      // Step 3: Fund + register on Hardhat
      const provider = new ethers.JsonRpcProvider("http://192.168.1.10:8545/");

      // Fund new wallet with ETH from Hardhat default account
      const funder = new ethers.Wallet(
        "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
        provider
      );
      await funder.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("1.0"),
      });

      // Connect new wallet
      const signer = wallet.connect(provider);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SafarXID.abi,
        signer
      );

      // Hash phone before sending
      const phoneHash = ethers.keccak256(ethers.toUtf8Bytes(phone));

      const tx = await contract.registerTourist(name, phoneHash);
      console.log("⏳ Blockchain tx sent:", tx.hash);

      const receipt = await tx.wait();
      console.log("✅ Blockchain tx confirmed:", receipt);

      const tourist = await contract.getTourist(wallet.address);
      console.log("📦 Tourist registered on-chain:", {
        name: tourist[0],
        phoneHash: tourist[1],
        createdAt: Number(tourist[2]),
      });

      // Step 4: Navigate home
      router.push("/home");
    } catch (err: any) {
      console.error("❌ Error in handleSignUp:", err);
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Sign Up</Text>
      <TextInput
        placeholder="Enter your Full Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <TextInput
        placeholder="Enter your Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <TextInput
        placeholder="Enter your Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="numeric"
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <TextInput
        placeholder="Enter your Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <Button title="Sign Up" onPress={handleSignUp} />
    </View>
  );
};

export default SignUpScreen;
