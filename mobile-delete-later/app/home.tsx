import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocationService } from "./providers/LocationProvider";

export default function HomeScreen() {
  const location = useLocationService();

  return (
    <View style={styles.container}>
      <Text style={styles.title}> Home</Text>
      {location ? (
        <>
          <Text style={styles.text}>Latitude: {location.latitude}</Text>
          <Text style={styles.text}>Longitude: {location.longitude}</Text>
        </>
      ) : (
        <Text style={styles.text}>Fetching location...</Text>
      )}
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
  },
});
