import { useEffect, useState } from "react";
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
import * as Location from "expo-location";

export default function SosScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch profile once
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          const { data: userRow, error } = await supabase
            .from("users")
            .select("name, phone")
            .eq("user_Id", user.id)
            .single();

          if (!error && userRow) {
            setName(userRow.name);
            setPhone(userRow.phone);
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, []);

  // 🔹 Refresh location every 10s
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission denied",
            "Location access is required for SOS"
          );
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        setTimestamp(new Date().toLocaleString());
      } catch (err) {
        console.error("Error fetching location:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation(); // run once on mount
    interval = setInterval(fetchLocation, 10000); // repeat every 10s

    return () => clearInterval(interval);
  }, []);

  async function handleConfirmSOS() {
    if (!latitude || !longitude) {
      Alert.alert("Error", "Location not available yet.");
      return;
    }

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
        return;
      }

      Alert.alert("SOS Sent", "Authorities are being contacted.", [
        {
          text: "OK",
          onPress: async () => {
            const phoneNumber = "tel:112";
            if (await Linking.canOpenURL(phoneNumber)) {
              await Linking.openURL(phoneNumber);
            }
            router.push("/home");
          },
        },
      ]);
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
        <View style={{ width: 32 }} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title}>⚠️ SOS Confirmation</Text>
        <Text style={styles.subtitle}>
          Are you sure you want to place an SOS Alert?
        </Text>

        <View style={styles.detailsBox}>
          <Text>Name: {name}</Text>
          <Text>Phone: {phone}</Text>
          {loading ? (
            <Text>Fetching location...</Text>
          ) : latitude && longitude ? (
            <>
              <Text>Latitude: {latitude.toFixed(5)}</Text>
              <Text>Longitude: {longitude.toFixed(5)}</Text>
              <Text>Timestamp: {timestamp}</Text>
            </>
          ) : (
            <Text>Location unavailable</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: loading ? "gray" : "red" },
          ]}
          onPress={handleConfirmSOS}
          disabled={loading}
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
