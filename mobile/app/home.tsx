import { View, Text, Button } from "react-native";
import { supabase } from "../lib/supabase";

export default function HomeScreen() {
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Welcome to the Home screen!</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
