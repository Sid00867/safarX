import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import QRCode from "react-native-qrcode-svg"; // expo install react-native-qrcode-svg
import { supabase } from "@/lib/supabase"; // adjust path if needed

export default function ProfileScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 1. Get current logged-in user from Supabase Auth
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          setLoading(false);
          return;
        }

        // 2. Query `users` table by user_id (foreign key to auth.users)
        const { data, error } = await supabase
          .from("users")
          .select("name, phone, email, walletAddress, user_Id") // 👈 notice user_Id
          .eq("user_Id", user.id) // 👈 match exactly
          .single();

        if (error) throw error;

        setUserData(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No user found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile</Text>
      <Text style={styles.detail}>Name: {userData.name}</Text>
      <Text style={styles.detail}>Phone: {userData.phone}</Text>
      <Text style={styles.detail}>Email: {userData.email}</Text>
      <Text style={styles.detail}>Wallet: {userData.walletAddress}</Text>

      <View style={{ marginTop: 20 }}>
        <QRCode
          value={JSON.stringify({
            userId: userData.user_Id,
            walletAddress: userData.walletAddress,
          })}
          size={180}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  text: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  detail: {
    fontSize: 16,
    marginTop: 5,
  },
});
