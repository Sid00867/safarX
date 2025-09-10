import { useState } from "react";
import { View, TextInput, Button, Text, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { ethers } from "ethers";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";

// Contract ABI
import contractAbi from "./abis/SafarXID.json";

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

// Private key from Hardhat local node (account #0 usually)
const LOCAL_PRIVATE_KEY =
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const signUp = async () => {
    // Supabase signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert("Signup failed", error.message);
      return;
    }

    const user = data.user;

    if (user) {
      const { error: insertError } = await supabase.from("users").insert([
        {
          user_Id: user.id, // foreign key to auth.users
          name,
          email,
          phone,
        },
      ]);

      if (insertError) {
        alert(insertError.message);
      } else {
        alert("User registered successfully!");
      }
    }

    try {
      // Connect to Hardhat blockchain
      const provider = new ethers.JsonRpcProvider("http://192.168.1.7:8545");

      const wallet = new ethers.Wallet(LOCAL_PRIVATE_KEY, provider);

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractAbi.abi,
        wallet
      );

      // Hash phone
      const phoneHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        phone
      );

      // Call contract
      const tx = await contract.registerTourist(name, phoneHash);
      const receipt = await tx.wait();

      // QR payload
      const qrPayload = {
        address: wallet.address,
        name,
        txHash: receipt.hash,
      };

      // Navigate → Home, pass QR payload
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

      <Button title="Register" onPress={signUp} />
    </View>
  );
}
