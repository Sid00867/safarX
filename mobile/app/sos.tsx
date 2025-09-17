import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState, useEffect } from "react";
import * as Location from "expo-location";

export default function SosScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState(0.0);
  const [longitude, setLongitude] = useState(0.0);
  const [userId, setUserId] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [locationLoading, setLocationLoading] = useState(true);

  // Fetch user details from Supabase
  useEffect(() => {
    async function fetchUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: userRow, error } = await supabase
          .from("users")
          .select("id, name, phone")
          .eq("user_Id", user.id)
          .single();

        if (error) console.error("Error fetching user data:", error.message);
        else {
          setName(userRow.name);
          setPhone(userRow.phone);
        }
      }
    }
    fetchUserData();
  }, []);

  // Get current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      setTimestamp(new Date().toLocaleString());
      setLocationLoading(false);
    })();
  }, []);

  async function handleConfirmSOS() {
    try {
      const { error } = await supabase.from("sos_alerts").insert([
        {
          user_Id: userId,
          name,
          latitude,
          longitude,
        },
      ]);

      if (error) {
        console.error("Error inserting SOS alert:", error.message);
      } else {
        console.log("SOS Alert placed successfully.");

        // Show popup confirmation
        Alert.alert(
          "✅ SOS Sent",
          "Your SOS alert has been placed and authorities are being contacted.",
          [
            {
              text: "OK",
              onPress: async () => {
                // Dial emergency number 112
                const phoneNumber = "tel:112";
                const supported = await Linking.canOpenURL(phoneNumber);
                if (supported) {
                  await Linking.openURL(phoneNumber);
                } else {
                  Alert.alert(
                    "Error",
                    "Unable to dial emergency number on this device."
                  );
                }

                // Redirect back to home screen
                router.push("/home");
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error("Unexpected error inserting SOS alert:", err);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={28}
          color="black"
          onPress={() => router.push("/home")}
        />
        <Link href={"/home"}>
          <Image
            style={styles.logo}
            source={require("../assets/images/SafarXLogo.png")}
            contentFit="contain"
            transition={300}
          />
        </Link>
        <View style={{ width: 32 }} /> {/* spacer for alignment */}
      </View>

      {/* Body Content */}
      <View style={styles.body}>
        <Text style={styles.title}>⚠️ SOS Confirmation</Text>
        <Text style={styles.subtitle}>
          Are you sure you want to place an SOS Alert?
        </Text>

        <View style={styles.detailsBox}>
          <Text>Name: {name}</Text>
          <Text>Phone: {phone}</Text>
          {locationLoading ? (
            <Text>Fetching location...</Text>
          ) : (
            <>
              <Text>Latitude: {latitude.toFixed(5)}</Text>
              <Text>Longitude: {longitude.toFixed(5)}</Text>
              <Text>Timestamp: {timestamp}</Text>
            </>
          )}
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "gray",
            marginTop: 20,
            lineHeight: 18,
          }}
        >
          ⚠️ Important Information{"\n"}• By sending an SOS alert, your current
          location and basic details (name & phone number) will be shared with
          the nearest authorities and emergency contacts.{"\n"}• Ensure that you
          use this feature only in real emergencies (threat to life, health, or
          safety).{"\n"}• False or prank alerts may result in penalties under
          applicable laws.{"\n"}• Network or GPS issues may affect location
          accuracy.{"\n"}• This app is a support tool. Always follow local
          emergency procedures (e.g., calling 112 in India).
          {"\n\n"}
          By confirming, you agree that:{"\n"}• You consent to sharing your
          details with relevant authorities for emergency response.{"\n"}• The
          app team is not liable for delays or failures due to technical/network
          limitations.{"\n"}• Misuse of this feature can lead to suspension of
          your account and possible legal action.{"\n"}
        </Text>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: locationLoading ? "gray" : "red" },
          ]}
          onPress={handleConfirmSOS}
          disabled={locationLoading}
        >
          <Text style={styles.confirmButtonText}>Confirm SOS</Text>
        </TouchableOpacity>
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
    width: 120,
    height: 40,
  },
  body: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
    color: "gray",
  },
  detailsBox: {
    width: "100%",
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  confirmButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
