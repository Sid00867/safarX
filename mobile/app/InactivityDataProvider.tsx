import React, {
  createContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import { AppState, AppStateStatus } from "react-native";

type InactivityDataType = {
  hour: number;
  motion_state: number;
  displacement_m: number;
  time_since_last_interaction_min: number;
  missed_ping_count: number;
  area_risk: string;
  battery_level_percent: number;
  is_expected_active: number;
};

const InactivityContext = createContext<InactivityDataType | undefined>(
  undefined
);

type Props = { children: ReactNode };

export const InactivityProvider = ({ children }: Props) => {
  const [motionState, setMotionState] = useState<number>(0);
  const [displacement, setDisplacement] = useState<number>(0);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const [missedPingCount, setMissedPingCount] = useState<number>(0);
  const [batteryLevelPercent, setBatteryLevelPercent] = useState<number>(100);
  const [areaRisk, setAreaRisk] = useState<string>("high");
  const [isExpectedActive, setIsExpectedActive] = useState<number>(0);

  const accelerometerDataRef = useRef({ x: 0, y: 0, z: 0 });

  // Location and motion detection
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted");
        return;
      }

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000 },
        (loc) => {
          const speed = loc.coords.speed ?? 0;
          const isMovingGps = speed > 1;

          if (lastLocationRef.current) {
            const earthRadiusMeters = 6371000;
            const toRadians = (deg: number) => (deg * Math.PI) / 180;

            const lat1 = toRadians(lastLocationRef.current.coords.latitude);
            const lon1 = toRadians(lastLocationRef.current.coords.longitude);
            const lat2 = toRadians(loc.coords.latitude);
            const lon2 = toRadians(loc.coords.longitude);

            const deltaLat = lat2 - lat1;
            const deltaLon = lon2 - lon1;

            const a =
              Math.sin(deltaLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = earthRadiusMeters * c;

            console.log(
              "Calculated distance:",
              distance,
              "Accuracy:",
              loc.coords.accuracy
            );

            if ((loc.coords.accuracy ?? 1000) < 100 && distance > 2) {
              setDisplacement((prev) => prev + distance);
            }
          }

          lastLocationRef.current = loc;

          // Accelerometer magnitude
          const data = accelerometerDataRef.current;
          const accMagnitude = Math.sqrt(
            data.x ** 2 + data.y ** 2 + data.z ** 2
          );
          const isMovingAcc = accMagnitude > 0.2;

          // Fallback: if moving but GPS accuracy is poor, increment small displacement
          if (isMovingAcc && (loc.coords.accuracy ?? 1000) > 100) {
            setDisplacement((prev) => prev + 1);
            console.log("Fallback displacement +1 (poor GPS, motion detected)");
          }

          setMotionState(isMovingGps || isMovingAcc ? 1 : 0);
        }
      );

      return () => subscription.remove();
    })();
  }, []);

  // Accelerometer listener
  useEffect(() => {
    Accelerometer.setUpdateInterval(1000);
    const sub = Accelerometer.addListener((data) => {
      accelerometerDataRef.current = data;
    });
    return () => sub.remove();
  }, []);

  // Battery info
  useEffect(() => {
    async function fetchBattery() {
      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevelPercent(Math.round(level * 100));
    }
    fetchBattery();
  }, []);

  // Track app state
  useEffect(() => {
    const onAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        setLastInteractionTime(Date.now());
      }
    };
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, []);

  // Send inactivity data every 1 min
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();
      const timeSinceLastInteractionMin = Math.floor(
        (Date.now() - lastInteractionTime) / 60000
      );

      const payload = {
        hour,
        motion_state: motionState,
        displacement_m: Math.round(displacement),
        time_since_last_interaction_min: timeSinceLastInteractionMin,
        missed_ping_count: missedPingCount,
        area_risk: areaRisk,
        battery_level_percent: batteryLevelPercent,
        is_expected_active: isExpectedActive,
      };

      console.log("Sending inactivity payload:", payload);

      try {
        await fetch("http://192.168.1.10:8000/api/inactivity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setDisplacement(0); // reset after sending
      } catch (error) {
        console.error("Error sending inactivity:", error);
      }
    }, 1 * 60 * 1000);

    return () => clearInterval(interval);
  }, [
    motionState,
    displacement,
    lastInteractionTime,
    missedPingCount,
    areaRisk,
    batteryLevelPercent,
    isExpectedActive,
  ]);

  return (
    <InactivityContext.Provider
      value={{
        hour: new Date().getHours(),
        motion_state: motionState,
        displacement_m: displacement,
        time_since_last_interaction_min: Math.floor(
          (Date.now() - lastInteractionTime) / 60000
        ),
        missed_ping_count: missedPingCount,
        area_risk: areaRisk,
        battery_level_percent: batteryLevelPercent,
        is_expected_active: isExpectedActive,
      }}
    >
      {children}
    </InactivityContext.Provider>
  );
};

export const useInactivityContext = () => {
  const context = React.useContext(InactivityContext);
  if (!context)
    throw new Error(
      "useInactivityContext must be used within InactivityProvider"
    );
  return context;
};
