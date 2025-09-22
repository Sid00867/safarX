import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";

const defaultIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const sosIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function LiveMapView() {
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);

  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || `Lat: ${lat}, Lng: ${lng}`;
    } catch (err) {
      console.error("Error fetching address:", err);
      return `Lat: ${lat}, Lng: ${lng}`;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: locationData, error: locError } = await supabase
        .from("locations")
        .select("id, latitude, longitude, user_Id");
      if (locError) {
        console.error("Error fetching locations:", locError);
        return;
      }

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

  useEffect(() => {
    const fetchSOS = async () => {
      const { data, error } = await supabase
        .from("sos_alerts")
        .select("id, user_Id, latitude, longitude, created_at");

      if (error) {
        console.error("Error fetching SOS alerts:", error);
        return;
      }

      const withDetails = await Promise.all(
        data.map(async (alert) => {
          const user = users.find((u) => u.user_Id === alert.user_Id);
          const address = await fetchAddress(alert.latitude, alert.longitude);
          return { ...alert, user, address };
        })
      );

      setSosAlerts(withDetails);
    };

    if (users.length > 0) {
      fetchSOS();
    }
  }, [users]);

  const handleDeleteSOS = async (id) => {
    const { error } = await supabase.from("sos_alerts").delete().eq("id", id);
    if (error) {
      console.error("Error deleting SOS alert:", error);
    } else {
      setSosAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }
  };

  const getUserInfo = (userId) => {
    const user = users.find((u) => u.user_Id === userId);
    return user ? user : null;
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Left: Map */}
      <div style={{ flex: 3 }}>
        <MapContainer
          center={[20.5937, 78.9629]} 
          zoom={5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Normal user locations */}
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

          {/* SOS alerts as red markers */}
          {sosAlerts.map((alert) => (
            <Marker
              key={`sos-${alert.id}`}
              position={[alert.latitude, alert.longitude]}
              icon={sosIcon}
            >
              <Popup>
                {alert.user ? (
                  <div>
                    <b>{alert.user.name}</b> <br />
                    {alert.user.email} <br />
                    {alert.user.phone} <br />
                    📍 {alert.address}
                  </div>
                ) : (
                  <div>Unknown SOS User</div>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Right: SOS Alerts Panel */}
      <div
        style={{
          flex: 1,
          borderLeft: "1px solid #ccc",
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        <h3>SOS Alerts</h3>
        {sosAlerts.length === 0 ? (
          <p>No active SOS alerts</p>
        ) : (
          sosAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                position: "relative",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <button
                onClick={() => handleDeleteSOS(alert.id)}
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  border: "none",
                  background: "transparent",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  color: "#555",
                }}
              >
                ×
              </button>
              {alert.user ? (
                <>
                  <b>{alert.user.name}</b> <br />
                  {alert.user.email} <br />
                  {alert.user.phone} <br />
                </>
              ) : (
                <b>Unknown SOS User</b>
              )}
              📍 {alert.address}
              <br />
              <small>{new Date(alert.created_at).toLocaleString()}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LiveMapView;
