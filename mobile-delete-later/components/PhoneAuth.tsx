import React, { useState } from "react";
import { View, TextInput, Button, Alert, Text, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";

export default function PhoneAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState<any>(null);

  // Step 1: Send OTP
  const sendOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "OTP sent to " + phone);
    }
  };

  // Step 2: Verify OTP
  const verifyOtp = async () => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSession(data.session);
      Alert.alert("Logged in!", `Phone: ${data.user?.phone}`);
    }
  };

  return (
    <View style={styles.container}>
      {!session ? (
        <>
          <Text style={styles.label}>Enter Phone Number:</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91XXXXXXXXXX"
            keyboardType="phone-pad"
          />
          <Button title="Send OTP" onPress={sendOtp} />

          <Text style={styles.label}>Enter OTP:</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            placeholder="123456"
            keyboardType="numeric"
          />
          <Button title="Verify OTP" onPress={verifyOtp} />
        </>
      ) : (
        <Text style={styles.success}>✅ Logged in as {session.user.phone}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "white",
  },
  label: { marginTop: 12, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginVertical: 8,
    borderRadius: 5,
  },
  success: { marginTop: 20, fontSize: 16, fontWeight: "bold", color: "green" },
});
