import { View, Text, Button, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

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
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Ionicons
          name="person-circle-outline"
          size={32}
          color="black"
          onPress={() => router.push("/profile")}
        />

        <Image
          style={styles.logo}
          source={require("../assets/images/SafarXLogo.png")}
          contentFit="contain"
          transition={300}
        />

        <Text style={styles.sosButton} onPress={() => router.push("/sos")}>
          SOS
        </Text>
      </View>

      <View style={styles.body}>
        <Text>Welchjhome Home</Text>
        <Button title="Log Out" onPress={handleLogout} />
        <Button title="Itenary" onPress={() => router.push("/itenary")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 15,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  logo: {
    width: 120, // adjust as needed
    height: 40,
  },
  sosButton: {
    backgroundColor: "red",
    color: "white",
    fontWeight: "bold",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
