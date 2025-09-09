import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";
// Default marker icon
const defaultIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function LiveMapView() {
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // fetch locations
      const { data: locationData, error: locError } = await supabase
        .from("locations")
        .select("id, latitude, longitude, user_Id");

      if (locError) {
        console.error("Error fetching locations:", locError);
        return;
      }

      // fetch users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_Id, name, email, phone");

      if (userError) {
        console.error("Error fetching users:", userError);
        return;
      }

      setLocations(locationData);
      setUsers(userData);
    };

    fetchData();
  }, []);

  // helper: get user info by matching user_Id
  const getUserInfo = (userId) => {
    const user = users.find((u) => u.user_Id === userId);
    return user ? user : null;
  };

  return (
    <MapContainer
      center={[20.5937, 78.9629]} // India center
      zoom={5}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {locations.map((loc) => {
        const user = getUserInfo(loc.user_Id);
        return (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={defaultIcon}
          >
            <Popup>
              {user ? (
                <div>
                  <b>{user.name}</b> <br />
                  {user.email} <br />
                  {user.phone}
                </div>
              ) : (
                <div>Unknown User</div>
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default LiveMapView;
