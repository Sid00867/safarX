import { View, Text, Button } from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();
  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
      } else {
        console.log("User signed out successfully.");
        router.push("/onboard");
      }
    } catch (err) {
      console.error("An unexpected error occurred during logout:", err);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Welcome Home</Text>
      <Button title="Log Out" onPress={handleLogout} />
    </View>
  );
}
