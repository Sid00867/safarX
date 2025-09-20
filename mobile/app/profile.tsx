import { View, Text, StyleSheet, Button } from "react-native";
import axios from "axios";

export default function ProfileScreen() {
  const handleCheck = async () => {
    try {
      await axios.post("http://192.168.1.10:8000/api/data", {
        network_connectivity_state: 1,
        acc_vs_loc: 0,
        time_since_last_successful_ping: 20,
        gps_accuracy: [1.1, 2.2, 3.3, 4.4, 5.5],
        area_risk: "low",
      });
      console.log("✅ Data sent successfully");
    } catch (error: any) {
      console.error("❌ Error sending data:", error.message);
      if (error.response) {
        console.log("Response:", error.response.data);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>👤 Profile Screen</Text>
      <Text style={{ marginTop: 10 }}>User details and settings go here.</Text>
      <Button title="Edit Phelllprofile" onPress={handleCheck} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 22,
    fontWeight: "bold",
  },
});
