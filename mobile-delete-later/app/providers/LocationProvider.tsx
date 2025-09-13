import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import * as Location from "expo-location";
import { supabase } from "@/lib/supabase";

// Define the type for location data
type LocationData = {
  latitude: number;
  longitude: number;
} | null;

const LocationContext = createContext<LocationData>(null);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState<LocationData>(null);

  // ✅ Get user once
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        setUser(data.user);
      } else {
        console.error("Error fetching user:", error);
      }
    };
    getUser();
  }, []);

  // ✅ Start location tracking once when user exists
  useEffect(() => {
    if (!user) return;

    let intervalId: ReturnType<typeof setInterval>;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission denied");
        return;
      }

      intervalId = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const { coords } = loc;
          console.log("Location:", coords);

          // ✅ Update context state
          setLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });

          // ✅ Insert or update in DB
          const { error } = await supabase.from("locations").upsert(
            [
              {
                user_Id: user.id, // 👈 matches your DB column
                latitude: coords.latitude,
                longitude: coords.longitude,
                recorded_at: new Date().toISOString(),
              },
            ],
            { onConflict: "user_Id" } // 👈 must match your column name too
          );

          if (error) {
            console.error("Error saving location:", error);
          }
        } catch (err) {
          console.error("Error fetching location:", err);
        }
      }, 15000);
    };

    startTracking();

    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <LocationContext.Provider value={location}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationService = () => useContext(LocationContext);
