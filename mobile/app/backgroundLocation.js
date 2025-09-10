import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { SupabaseClient } from "@supabase/supabase-js";

const LOCATION_TASK_NAME = "background-location-task";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background task error:", error);
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;

      console.log("📍 Background location:", latitude, longitude);

      // 👤 Get logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("⚠️ No user logged in, skipping insert");
        return;
      }

      // 👉 Insert into Supabase table
      const { error: insertError } = await supabase.from("locations").insert({
        user_id: user.id,
        latitude,
        longitude,
      });

      if (insertError) {
        console.error("❌ Error inserting location:", insertError.message);
      } else {
        console.log("✅ Location saved to Supabase");
      }
    }
  }
});

export async function startBackgroundLocation() {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    console.log("Permission denied");
    return;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 3 * 60 * 1000,
    distanceInterval: 0,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Location Tracking",
      notificationBody: "Tracking location every 3 minutes",
    },
  });
}
