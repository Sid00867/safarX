import { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
  };

  const signUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Login / Register</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <Button title="Login" onPress={signIn} />
      <Button
        title="Register"
        onPress={() => {
          router.push("/register");
        }}
      />
      <Button
        title="Login"
        onPress={() => {
          router.push("/login");
        }}
      />
      <Text style={{ textAlign: "center", marginVertical: 10 }}>OR</Text>
      <Button title="Register" onPress={signUp} />
    </View>
  );
}
