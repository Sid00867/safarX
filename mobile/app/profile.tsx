import { View, Text, StyleSheet, Button } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>👤 Profile Screen</Text>
      <Text style={{ marginTop: 10 }}>User details and settings go here.</Text>
      <Button
        title="Edit Profile"
        onPress={() => alert("Edit Profile pressed")}
      />
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
