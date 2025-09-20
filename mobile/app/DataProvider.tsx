import React, {
  createContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import NetInfo from "@react-native-community/netinfo";
import axios from "axios";

type DataContextType = {
  networkConnectivity: number;
  accVsLoc: number;
  timeSinceLastPing: number;
  gpsAccuracy: number[];
  areaRisk: string;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

type Props = { children: ReactNode };

export const DataProvider = ({ children }: Props) => {
  const [networkConnectivity, setNetworkConnectivity] = useState(1);
  const [accelerometerData, setAccelerometerData] = useState<{
    x: number;
    y: number;
    z: number;
  }>({ x: 0, y: 0, z: 0 });
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [accVsLoc, setAccVsLoc] = useState(1);
  const [timeSinceLastPing, setTimeSinceLastPing] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number[]>([]);
  const [lastSuccessfulPingTime, setLastSuccessfulPingTime] = useState(
    Date.now()
  );
  const [areaRisk, setAreaRisk] = useState("low"); // placeholder

  const lastGpsSampleTime = useRef(0);

  // Network connectivity listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkConnectivity(state.isConnected ? 1 : 0);
      console.log(
        "Network connectivity state changed:",
        state.isConnected ? 1 : 0
      );
    });
    return () => unsubscribe();
  }, []);

  // Location watcher
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted");
        return;
      }
      console.log("Location permission granted. Starting location watcher...");
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (loc) => {
          setLocation(loc);
          console.log("Location update:", loc.coords);

          if (
            gpsAccuracy.length === 0 ||
            Date.now() - lastGpsSampleTime.current >= 60000
          ) {
            lastGpsSampleTime.current = Date.now();
            setGpsAccuracy((prev) => {
              const accuracy = loc.coords.accuracy ?? 0;
              const newArr = [...prev, accuracy];
              if (newArr.length > 5) newArr.shift();
              console.log("GPS accuracy sampled:", newArr);
              return newArr;
            });
          }
        }
      );
      return () => subscription.remove();
    })();
  }, []);

  // Accelerometer listener
  useEffect(() => {
    Accelerometer.setUpdateInterval(1000);
    console.log("Starting accelerometer listener...");
    const subscription = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
      console.log("Accelerometer data:", data);
    });
    return () => {
      subscription.remove();
      console.log("Accelerometer listener removed");
    };
  }, []);

  // Calculate acc_vs_loc consistency
  useEffect(() => {
    if (!location) return;
    const accMagnitude = Math.sqrt(
      accelerometerData.x ** 2 +
        accelerometerData.y ** 2 +
        accelerometerData.z ** 2
    );
    const locGood = (location?.coords?.accuracy ?? 1000) < 20;
    const newAccVsLoc = accMagnitude > 0.02 && locGood ? 1 : 0;
    setAccVsLoc(newAccVsLoc);
    console.log("Calculated acc_vs_loc:", newAccVsLoc);
  }, [accelerometerData, location]);

  // Timer for sending data every 5 minutes (adjust as needed)
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();
      const secondsSinceLastPing = Math.floor(
        (now - lastSuccessfulPingTime) / 1000
      );
      setTimeSinceLastPing(secondsSinceLastPing);

      const payload = {
        network_connectivity_state: networkConnectivity,
        acc_vs_loc: accVsLoc,
        time_since_last_successful_ping: secondsSinceLastPing,
        gps_accuracy:
          gpsAccuracy.length === 5
            ? gpsAccuracy
            : [...gpsAccuracy, ...Array(5 - gpsAccuracy.length).fill(0)],
        area_risk: areaRisk,
      };

      console.log("Sending data payload to backend:", payload);

      try {
        await axios.post("http://192.168.1.10:8000/api/data", payload);
        console.log("Data sent successfully");
        setLastSuccessfulPingTime(now);
        setGpsAccuracy([]);
      } catch (error) {
        console.error("Error sending data", error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(interval);
      console.log("Data send interval cleared");
    };
  }, [
    networkConnectivity,
    accVsLoc,
    gpsAccuracy,
    areaRisk,
    lastSuccessfulPingTime,
  ]);

  return (
    <DataContext.Provider
      value={{
        networkConnectivity,
        accVsLoc,
        timeSinceLastPing,
        gpsAccuracy,
        areaRisk,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = React.useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};
