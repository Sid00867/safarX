import React from "react";
import { View, Text, StyleSheet } from "react-native";

const getBarColor = (score: number) => {
  if (score < 40) return "#EF5350"; // red (low)
  if (score < 70) return "#FFD600"; // yellow (mid)
  return "#66BB6A"; // green (high)
};

export default function ScoreBar({ score = 0 }) {
  const progress = Math.max(0, Math.min(score, 100));
  return (
    <View style={styles.container}>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {
              width: `${progress}%`,
              backgroundColor: getBarColor(progress),
            },
          ]}
        />
        <Text style={styles.scoreText}>{progress}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 8,
    alignItems: "center",
  },
  barBackground: {
    width: "90%",
    height: 24,
    backgroundColor: "#E0E0E0",
    borderRadius: 12,
    justifyContent: "center",
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 24,
    borderRadius: 12,
  },
  scoreText: {
    color: "#111",
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
    fontSize: 14,
    zIndex: 1,
  },
});
