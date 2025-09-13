import React, { useEffect, useState } from "react";
import { Slot, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { View, ActivityIndicator } from "react-native";
import { LocationProvider } from "./providers/LocationProvider";
import { ThirdwebProvider, metamaskWallet } from "@thirdweb-dev/react-native";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace("/home");
      } else {
        router.replace("/auth");
      }
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThirdwebProvider
      activeChain="sepolia" // use Sepolia testnet
      supportedWallets={[metamaskWallet()]}
    >
      <LocationProvider>
        {" "}
        <Slot />
      </LocationProvider>
    </ThirdwebProvider>
  );
}
