import React, {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import * as Location from "expo-location";
import { supabase } from "@/lib/supabase";

type GeoFenceContextType = {
  lat: number | null;
  lon: number | null;
  is_geofenced: boolean;
  safety_score: number | null;
  risk_level: string | null;
};

const GeoFenceContext = createContext<GeoFenceContextType | undefined>(
  undefined
);

type Props = { children: ReactNode };

const toRad = (value: number) => (value * Math.PI) / 180;

const getDistanceFromLatLonInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const GeoFenceProvider = ({ children }: Props) => {
  const [locationState, setLocationState] = useState<GeoFenceContextType>({
    lat: null,
    lon: null,
    is_geofenced: false,
    safety_score: null,
    risk_level: null,
  });

  const previousLocation = useRef<{ lat: number; lon: number } | null>(null);
  const lastInteractionTime = useRef<Date>(new Date());

  const getAreaRisk = (score: number | null): string => {
    if (score === null) return "unknown";
    if (score >= 80) return "low";
    if (score >= 40) return "med";
    return "high";
  };

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // Monitor user location changes to update lastInteractionTime
  useEffect(() => {
    const watchSubscription = Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, distanceInterval: 1 },
      () => {
        lastInteractionTime.current = new Date();
      }
    );
    return () => {
      watchSubscription.then((sub) => sub.remove());
    };
  }, []);

  // Run full process: get location, geofence, calculate safety, collect data, send anomaly
  const runFullProcess = async () => {
    console.log("[GeoFence] Starting full process...");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("[GeoFence] Location permission not granted");
        return;
      }

      console.log("[GeoFence] Getting current location...");
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const latitude = loc.coords.latitude;
      const longitude = loc.coords.longitude;
      console.log(
        `[GeoFence] Current location: lat=${latitude}, lon=${longitude}`
      );

      let displacement_m = 5;
      if (locationState.lat !== null && locationState.lon !== null) {
        displacement_m = getDistanceFromLatLonInMeters(
          locationState.lat,
          locationState.lon,
          latitude,
          longitude
        );
      }
      console.log(
        `[GeoFence] Displacement since last location: ${displacement_m.toFixed(
          2
        )} meters`
      );

      setLocationState((prev) => ({ ...prev, lat: latitude, lon: longitude }));

      console.log("[GeoFence] Fetching geofences from Supabase...");
      const { data: geofences, error } = await supabase
        .from("geofences")
        .select("latitude, longitude, radius");
      if (error) {
        console.error("[GeoFence] Supabase fetch error:", error.message);
        setLocationState((prev) => ({
          ...prev,
          is_geofenced: false,
          safety_score: null,
          risk_level: null,
        }));
        return;
      }

      let inside = false;
      if (geofences) {
        for (const fence of geofences) {
          const distance = getDistanceFromLatLonInMeters(
            latitude,
            longitude,
            fence.latitude,
            fence.longitude
          );
          console.log(
            `[GeoFence] Distance to geofence (${fence.latitude},${
              fence.longitude
            }): ${distance.toFixed(2)}m (radius: ${fence.radius}m)`
          );
          if (distance <= fence.radius) {
            inside = true;
            console.log("[GeoFence] User is inside a geofenced region.");
            break;
          }
        }
      }
      if (!inside) {
        console.log("[GeoFence] User is NOT inside any geofenced region.");
      }
      await fetchSafetyScore(latitude, longitude, inside, displacement_m);
    } catch (e) {
      console.error("[GeoFence] Error in full process:", e);
    }
  };

  const fetchSafetyScore = async (
    lat: number,
    lon: number,
    isGeofenced: boolean,
    displacement_m: number
  ) => {
    console.log("[GeoFence] Sending location & geofence to safety API...");
    try {
      const response = await fetch("http://10.102.7.25:8000/calculate_safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, is_geofenced: isGeofenced }),
      });

      if (!response.ok) {
        console.error("[GeoFence] Safety API returned error:", response.status);
        setLocationState((prev) => ({
          ...prev,
          safety_score: null,
          risk_level: null,
        }));
        return;
      }
      const data = await response.json();
      console.log(
        `[GeoFence] Safety score received: ${data.safety_score}, risk level: ${data.risk_level}`
      );

      setLocationState((prev) => ({
        ...prev,
        lat,
        lon,
        is_geofenced: isGeofenced,
        safety_score: data.safety_score,
        risk_level: data.risk_level,
      }));

      await collectGPSSamplesAndSend({
        lat,
        lon,
        is_geofenced: isGeofenced,
        safety_score: data.safety_score,
      });

      collectAndSendInactivityData(data.safety_score, displacement_m);
    } catch (e) {
      console.error("[GeoFence] Error fetching safety score:", e);
      setLocationState((prev) => ({
        ...prev,
        safety_score: null,
        risk_level: null,
      }));
    }
  };

  const collectGPSSamplesAndSend = async ({
    lat,
    lon,
    is_geofenced,
    safety_score,
  }: {
    lat: number;
    lon: number;
    is_geofenced: boolean;
    safety_score: number;
  }) => {
    console.log("[GeoFence] Collecting GPS accuracy samples...");
    const samples = [];
    const intervalMs = 120000;

    for (let i = 0; i < 5; i++) {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        const accuracy = position.coords.accuracy ?? 0;
        samples.push(accuracy);
        console.log(
          `[GeoFence] GPS accuracy sample ${i + 1}: ${accuracy} meters`
        );
        if (i < 4) await delay(intervalMs);
      } catch (e) {
        console.error("[GeoFence] Error collecting GPS sample:", e);
      }
    }

    sendAnomalyData(1, 1, 12, samples, getAreaRisk(safety_score));
  };

  const sendAnomalyData = async (
    network_connectivity_state: number,
    acc_vs_loc: number,
    time_since_last_successful_ping: number,
    gpsSamples: number[],
    area_risk: string
  ) => {
    const payload = {
      network_connectivity_state,
      acc_vs_loc,
      time_since_last_successful_ping,
      gps_accuracy: gpsSamples,
      area_risk,
    };
    console.log("[GeoFence] Sending dropoff anomaly data:", payload);

    try {
      const res = await fetch("http://10.102.7.25:8000/api/dropoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        console.log("[GeoFence] Successfully sent dropoff anomaly data");
      } else {
        console.error(
          "[GeoFence] Failed sending dropoff anomaly data",
          res.status
        );
      }
    } catch (e) {
      console.error("[GeoFence] Error sending dropoff anomaly data:", e);
    }
  };

  const collectAndSendInactivityData = async (
    safety_score: number,
    displacement_m: number
  ) => {
    const inactivityIntervalMs = 600000;
    const collectAndSend = async () => {
      const hour = new Date().getHours();
      const motion_state = 1;
      const timeSinceLastInteraction = Math.floor(
        (Date.now() - lastInteractionTime.current.getTime()) / 60000
      );
      const missed_ping_count = 0;
      const battery_level_percent = 85;
      const is_expected_active = 1;

      const inactivityPayload = {
        hour,
        motion_state,
        displacement_m,
        time_since_last_interaction_min: timeSinceLastInteraction,
        missed_ping_count,
        area_risk: getAreaRisk(safety_score),
        battery_level_percent,
        is_expected_active,
      };

      console.log(
        "[GeoFence] Sending inactivity anomaly data:",
        inactivityPayload
      );

      try {
        const res = await fetch("http://10.102.7.25:8000/api/inactivity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inactivityPayload),
        });
        if (res.ok) {
          console.log("[GeoFence] Successfully sent inactivity anomaly data");
        } else {
          console.error(
            "[GeoFence] Failed sending inactivity anomaly data",
            res.status
          );
        }
      } catch (e) {
        console.error("[GeoFence] Error sending inactivity anomaly data:", e);
      }
    };

    await collectAndSend();
    setInterval(collectAndSend, inactivityIntervalMs);
  };

  useEffect(() => {
    runFullProcess();
    const intervalId = setInterval(runFullProcess, 600000); // 10 mins
    return () => clearInterval(intervalId);
  }, []);

  return (
    <GeoFenceContext.Provider value={locationState}>
      {children}
    </GeoFenceContext.Provider>
  );
};

export const useGeoFenceContext = (): GeoFenceContextType => {
  const context = React.useContext(GeoFenceContext);
  if (!context)
    throw new Error(
      "useGeoFenceContext must be used within a GeoFenceProvider"
    );
  return context;
};
