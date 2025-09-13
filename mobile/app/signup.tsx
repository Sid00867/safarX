import React, { useState } from "react";
import { Text, View, TextInput, Button, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { generateSimpleWallet } from "@/lib/wallet";
import { ethers } from "ethers";
import SafarXID from "@/contracts/SafarXID.json"; // <-- ABI JSON (exported from Hardhat)

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3"; // Replace with your deployed contract address

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

      // Step 2: Generate local wallet for user
      const wallet = generateSimpleWallet();
      const walletAddress = wallet.address;

      // Save user in Supabase DB
      const { error: insertError } = await supabase.from("users").insert([
        {
          user_Id: user.id,
          name,
          email,
          phone,
          walletAddress,
        },
      ]);

      if (insertError) {
        Alert.alert("Database insert error", insertError.message);
        console.log(insertError);
        return;
      }

      console.log("✅ Supabase user + DB entry created:", {
        userId: user.id,
        name,
        email,
        phone,
        walletAddress,
      });

      // Step 3: Blockchain interaction
      // For dev/test: use local Hardhat RPC or Sepolia RPC
      const provider = new ethers.JsonRpcProvider(
        "https://sepolia.infura.io/v3/<YOUR_INFURA_KEY>"
      );
      const signer = new ethers.Wallet("<PRIVATE_KEY>", provider); // backend signer for registering tourists

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SafarXID.abi,
        signer
      );

      // Hash phone number before sending
      const phoneHash = ethers.keccak256(ethers.toUtf8Bytes(phone));

      const tx = await contract.registerTourist(name, phoneHash);
      console.log("⏳ Blockchain tx sent:", tx.hash);

      const receipt = await tx.wait();
      console.log("✅ Blockchain tx confirmed:", receipt);

      // Debugging: read back data from blockchain
      const tourist = await contract.getTourist(signer.address);
      console.log("📦 Tourist registered on-chain:", {
        name: tourist[0],
        phoneHash: tourist[1],
        createdAt: Number(tourist[2]),
      });

      // Step 4: Navigate user
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
