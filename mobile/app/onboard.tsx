import React from "react";
import { Text } from "react-native";
import { View, Button } from "react-native";
import { useRouter } from "expo-router";

const OnboardScreen = () => {
  const router = useRouter();

  const handleSignInClick = () => {
    router.navigate("/signin");
  };

  const handleSignUpClick = () => {
    router.navigate("/signup");
  };
  return (
    <View>
      <Text>Get Started!</Text>
      <Button title="Sign Up" onPress={handleSignUpClick} />
      <Button title="Sign In" onPress={handleSignInClick} />
    </View>
  );
};

export default OnboardScreen;
