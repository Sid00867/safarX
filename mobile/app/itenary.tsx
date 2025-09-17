import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput as RNTextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TextInput, IconButton, Button, List } from "react-native-paper";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

// Utility for local YYYY-MM-DD
function toLocalYMD(date: Date) {
  const d = new Date(date.getTime());
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Nominatim API search function
async function fetchNominatimPlaces(query: string | number | boolean) {
  if (!query) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&addressdetails=1&limit=5`;
    const response = await fetch(url, {
      headers: { "User-Agent": "SafarX-App/1.0" }, // polite user agent
    });
    if (!response.ok) throw new Error("Place search failed");
    const data = await response.json();
    return data; // array of place objects
  } catch (err) {
    console.warn("Nominatim fetch error:", err.message);
    return [];
  }
}

export default function TripPlannerScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  function generateDays() {
    if (!startDate || !endDate)
      return Alert.alert("Error", "Set start and end dates");
    if (startDate > endDate)
      return Alert.alert("Error", "Start date can't be after end date");
    const temp = [];
    let current = new Date(startDate.getTime());
    let i = 1;
    while (current <= endDate) {
      temp.push({
        id: `${toLocalYMD(current)}_${i}_${Date.now()}`,
        date: new Date(current.getTime()),
        activities: [],
      });
      current.setDate(current.getDate() + 1);
      i++;
    }
    setDays(temp);
  }

  function addActivity(dayId: any) {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? {
              ...d,
              activities: [
                ...d.activities,
                {
                  id: Date.now().toString() + "_" + Math.random(),
                  place: "",
                  lat: null,
                  lng: null,
                  time: new Date(),
                  showTimePicker: false,
                  searchQuery: "",
                  searchResults: [],
                  showSearch: false,
                },
              ],
            }
          : d
      )
    );
  }

  function updateActivity(
    dayId: any,
    activityId: any,
    field: string,
    value: number | boolean | Date | never[]
  ) {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? {
              ...d,
              activities: d.activities.map((a: { id: any }) =>
                a.id === activityId ? { ...a, [field]: value } : a
              ),
            }
          : d
      )
    );
  }

  function removeActivity(dayId: any, activityId: any) {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? {
              ...d,
              activities: d.activities.filter(
                (a: { id: any }) => a.id !== activityId
              ),
            }
          : d
      )
    );
  }

  function onDateChange(
    setFunc: {
      (value: React.SetStateAction<Date>): void;
      (value: React.SetStateAction<Date>): void;
      (arg0: any): void;
    },
    value: Date
  ) {
    setFunc(value);
    setDays([]);
  }

  async function handleSaveTrip() {
    if (!title) return Alert.alert("Error", "Trip title missing");
    if (!days.length) return Alert.alert("Error", "No days generated");
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return Alert.alert("Not logged in");
      }
      // Insert trip
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert([
          {
            user_id: user.id,
            title,
            start_date: toLocalYMD(startDate),
            end_date: toLocalYMD(endDate),
          },
        ])
        .select()
        .single();

      if (tripError) throw tripError;

      // Day and itinerary insertion
      await Promise.all(
        days.map(async (day, i) => {
          const { data: tripDay, error: dayError } = await supabase
            .from("trip_days")
            .insert([
              {
                trip_id: trip.id,
                day_number: i + 1,
                date: toLocalYMD(day.date),
              },
            ])
            .select()
            .single();
          if (dayError) throw dayError;

          if (day.activities.length) {
            const items = day.activities.map(
              (a: {
                place: any;
                time: { toTimeString: () => string | any[] };
                lat: any;
                lng: any;
              }) => ({
                day_id: tripDay.id,
                place_name: a.place,
                visit_time: a.time.toTimeString().slice(0, 8),
                lat: a.lat,
                lng: a.lng,
              })
            );
            if (
              items.some(
                (item: { place_name: any; lat: null; lng: null }) =>
                  !item.place_name || item.lat == null || item.lng == null
              )
            )
              throw new Error(
                "All places must be selected and have coordinates"
              );
            const { error: itemsError } = await supabase
              .from("itinerary_items")
              .insert(items);
            if (itemsError) throw itemsError;
          }
        })
      );
      setLoading(false);
      Alert.alert("Success", "✅ Trip & Itinerary saved!");
      router.push("/trips");
    } catch (err) {
      setLoading(false);
      console.error("Error saving trip:", err.message);
      Alert.alert("Error", `❌ Failed to save trip: ${err.message}`);
    }
  }

  // Fetch Nominatim places on query update
  async function searchPlaces(
    dayId: any,
    activityId: any,
    query: string | number | boolean | any[]
  ) {
    updateActivity(dayId, activityId, "searchQuery", query);
    if (query.length < 3) {
      updateActivity(dayId, activityId, "searchResults", []);
      updateActivity(dayId, activityId, "showSearch", false);
      return;
    }
    const results = await fetchNominatimPlaces(query);
    updateActivity(dayId, activityId, "searchResults", results);
    updateActivity(dayId, activityId, "showSearch", true);
  }

  const renderDay = useCallback(
    ({ item: day }) => (
      <View style={styles.dayCard}>
        <Text style={styles.dayTitle}>
          Day {day.id.split("_")[1]} – {day.date.toDateString()}
        </Text>
        {day.activities.map(
          (a: {
            id: React.Key | null | undefined;
            searchQuery: string | undefined;
            searchResults: any[];
            showSearch: any;
            time: Date;
            showTimePicker: any;
          }) => (
            <View key={a.id} style={styles.activityRow}>
              <View style={{ flex: 1 }}>
                <RNTextInput
                  placeholder="Search Place"
                  style={styles.autocompleteInput}
                  value={a.searchQuery}
                  onChangeText={(text) => searchPlaces(day.id, a.id, text)}
                  onBlur={() => {
                    setTimeout(() => {
                      updateActivity(day.id, a.id, "showSearch", false);
                    }, 200); // small delay to allow press
                  }}
                  onFocus={() => {
                    if (a.searchResults.length > 0)
                      updateActivity(day.id, a.id, "showSearch", true);
                  }}
                />
                {a.showSearch && a.searchResults.length > 0 && (
                  <View style={styles.autocompleteDropdown}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {a.searchResults.map(
                        (place: {
                          place_id: React.Key | null | undefined;
                          display_name:
                            | string
                            | number
                            | bigint
                            | boolean
                            | React.ReactElement<
                                unknown,
                                string | React.JSXElementConstructor<any>
                              >
                            | Iterable<React.ReactNode>
                            | React.ReactPortal
                            | Promise<
                                | string
                                | number
                                | bigint
                                | boolean
                                | React.ReactPortal
                                | React.ReactElement<
                                    unknown,
                                    string | React.JSXElementConstructor<any>
                                  >
                                | Iterable<React.ReactNode>
                                | null
                                | undefined
                              >
                            | null
                            | undefined;
                          lat: string;
                          lon: string;
                        }) => (
                          <TouchableOpacity
                            key={place.place_id}
                            style={styles.autocompleteItem}
                            onPress={() => {
                              updateActivity(
                                day.id,
                                a.id,
                                "place",
                                place.display_name
                              );
                              updateActivity(
                                day.id,
                                a.id,
                                "lat",
                                parseFloat(place.lat)
                              );
                              updateActivity(
                                day.id,
                                a.id,
                                "lng",
                                parseFloat(place.lon)
                              );
                              updateActivity(
                                day.id,
                                a.id,
                                "searchQuery",
                                place.display_name
                              );
                              updateActivity(day.id, a.id, "showSearch", false);
                            }}
                          >
                            <Text>{place.display_name}</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() =>
                  updateActivity(day.id, a.id, "showTimePicker", true)
                }
                style={{ marginLeft: 10 }}
              >
                <Text style={{ paddingHorizontal: 6 }}>
                  ⏰ {a.time.toLocaleTimeString()}
                </Text>
              </TouchableOpacity>
              {a.showTimePicker && (
                <DateTimePicker
                  value={a.time}
                  mode="time"
                  onChange={(e, date) => {
                    updateActivity(day.id, a.id, "showTimePicker", false);
                    if (date) updateActivity(day.id, a.id, "time", date);
                  }}
                />
              )}
              <IconButton
                icon="close"
                size={22}
                onPress={() => removeActivity(day.id, a.id)}
                style={styles.closeButton}
                accessibilityLabel="Remove Place"
              />
            </View>
          )
        )}
        <Button
          mode="contained-tonal"
          style={styles.addPlaceButton}
          onPress={() => addActivity(day.id)}
        >
          ➕ Add Place
        </Button>
      </View>
    ),
    [days]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.heading}>Plan Your Trip</Text>
        <TextInput
          mode="outlined"
          style={styles.input}
          placeholder="Trip Title"
          value={title}
          onChangeText={setTitle}
        />
        <TouchableOpacity
          onPress={() => setShowStartPicker(true)}
          style={styles.dateButton}
        >
          <Text>📅 Start Date: {startDate.toDateString()}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={(e, date) => {
              setShowStartPicker(false);
              if (date) onDateChange(setStartDate, date);
            }}
          />
        )}
        <TouchableOpacity
          onPress={() => setShowEndPicker(true)}
          style={styles.dateButton}
        >
          <Text>📅 End Date: {endDate.toDateString()}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={(e, date) => {
              setShowEndPicker(false);
              if (date) onDateChange(setEndDate, date);
            }}
          />
        )}
        <Button
          mode="contained"
          style={styles.generateButton}
          onPress={generateDays}
        >
          Generate Days
        </Button>
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={days}
          keyExtractor={(item) => item.id}
          renderItem={renderDay}
        />
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <Button
            mode="contained"
            style={styles.saveButton}
            onPress={handleSaveTrip}
          >
            Save Trip
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#f5f8fa" },
  heading: { fontSize: 28, fontWeight: "700", marginBottom: 22, color: "#333" },
  input: {
    borderWidth: 0,
    backgroundColor: "#eaf0f6",
    padding: 13,
    marginVertical: 10,
    borderRadius: 16,
    fontSize: 16,
  },
  dayCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginVertical: 14,
    shadowColor: "#708090",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dayTitle: {
    fontWeight: "700",
    marginBottom: 12,
    fontSize: 18,
    color: "#444",
  },
  activityRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eaf0f6",
    borderRadius: 12,
    padding: 8,
  },
  autocompleteInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  autocompleteDropdown: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: 150,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 9999,
    elevation: 5,
  },
  autocompleteItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
  },
  closeButton: { marginLeft: 6 },
  dateButton: {
    backgroundColor: "#eaf0f6",
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
  },
  generateButton: {
    marginVertical: 10,
    borderRadius: 30,
    paddingVertical: 4,
  },
  addPlaceButton: {
    marginTop: 10,
    borderRadius: 30,
    backgroundColor: "#eaf0f6",
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 4,
    borderRadius: 30,
    backgroundColor: "#007bff",
  },
});
