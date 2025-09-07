import { View, Text, Button } from "react-native";
import { supabase } from "../lib/supabase";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";

export default function HomeScreen() {
  const logout = async () => {
    await supabase.auth.signOut();
  };

  const { qrData } = useLocalSearchParams<{ qrData: string }>();

  let parsedQrData: { address: string; name: string; txHash: string } | null =
    null;

  if (qrData) {
    try {
      parsedQrData = JSON.parse(qrData);
    } catch (err) {
      console.error("Failed to parse QR data", err);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Welcome to the Home screen!
      </Text>

      {parsedQrData ? (
        <View style={{ alignItems: "center" }}>
          <Text style={{ marginBottom: 10 }}>
            Tourist Name: {parsedQrData.name}
          </Text>
          <Text style={{ marginBottom: 10 }}>
            Wallet Address: {parsedQrData.address}
          </Text>
          <Text style={{ marginBottom: 20 }}>
            Transaction Hash: {parsedQrData.txHash}
          </Text>

          <QRCode value={JSON.stringify(parsedQrData)} size={200} />
        </View>
      ) : (
        <Text>No QR data found</Text>
      )}

      <View style={{ marginTop: 30 }}>
        <Button title="Logout" onPress={logout} />
      </View>
    </View>
  );
}
