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
  const [gpsAccuracy, setGpsAccuracy] = useState<number[]>([]);
  const gpsAccuracyRef = useRef<number[]>([]);
  const [accVsLoc, setAccVsLoc] = useState(1);
  const [timeSinceLastPing, setTimeSinceLastPing] = useState(0);
  const [areaRisk, setAreaRisk] = useState("low");

  const lastSuccessfulPingTime = useRef(Date.now());
  const networkConnectivityRef = useRef(1);
  const accelerometerDataRef = useRef({ x: 0, y: 0, z: 0 });
  const locationRef = useRef<Location.LocationObject | null>(null);

  // Network listener updates ref
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      networkConnectivityRef.current = state.isConnected ? 1 : 0;
    });
    return () => unsubscribe();
  }, []);

  // Accelerometer updates ref
  useEffect(() => {
    Accelerometer.setUpdateInterval(1000);
    const subscription = Accelerometer.addListener((data) => {
      accelerometerDataRef.current = data;
    });
    return () => subscription.remove();
  }, []);

  // Location updates ref
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted");
        return;
      }
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (loc) => {
          locationRef.current = loc;
        }
      );
      return () => subscription.remove();
    })();
  }, []);

  // Helper to calculate acc_vs_loc
  const calcAccVsLoc = () => {
    const loc = locationRef.current;
    if (!loc) return 0;
    const data = accelerometerDataRef.current;
    const accMagnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
    const locGood = (loc.coords.accuracy ?? 1000) < 20;
    return accMagnitude > 0.02 && locGood ? 1 : 0;
  };

  // Function to send data
  const sendData = async (gpsArray: number[]) => {
    console.log("Attempting to send data...");

    const now = Date.now();
    const secondsSinceLastPing = Math.floor(
      (now - lastSuccessfulPingTime.current) / 1000
    );
    setTimeSinceLastPing(secondsSinceLastPing);

    const accLocVal = calcAccVsLoc();
    setAccVsLoc(accLocVal);

    const payload = {
      network_connectivity_state: networkConnectivityRef.current,
      acc_vs_loc: accLocVal,
      time_since_last_successful_ping: secondsSinceLastPing,
      gps_accuracy: gpsArray,
      area_risk: areaRisk,
    };

    console.log("Sending data payload to backend:", payload);

    try {
      await axios.post("http://192.168.1.10:8000/api/dropoff", payload);
      console.log("Data sent successfully");

      lastSuccessfulPingTime.current = now;
      setGpsAccuracy([]); // reset buffer
      gpsAccuracyRef.current = [];
    } catch (error: any) {
      if (error.response) {
        console.log("Response error:", error.response.data);
      } else if (error.request) {
        console.log("No response received:", error.request);
      } else {
        console.log("Axios error:", error.message);
      }
    }
  };

  // GPS accuracy sampling every 36 seconds , trigger send after 5 samples
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const accuracy = loc.coords.accuracy ?? 0;

        setGpsAccuracy((prev) => {
          const newArr = [...prev, accuracy];
          if (newArr.length > 5) newArr.shift();
          gpsAccuracyRef.current = newArr;
          console.log("GPS accuracy sampled:", newArr);

          // Trigger send when we have 5 samples
          if (newArr.length === 5) {
            sendData(newArr);
          }

          return newArr;
        });
      } catch (err) {
        console.warn("Failed to get GPS accuracy:", err);
      }
    }, 36000); // 36 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <DataContext.Provider
      value={{
        networkConnectivity: networkConnectivityRef.current,
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

export const useDataContext = (): DataContextType => {
  const context = React.useContext(DataContext);
  if (!context)
    throw new Error("useDataContext must be used within a DataProvider");
  return context;
};
