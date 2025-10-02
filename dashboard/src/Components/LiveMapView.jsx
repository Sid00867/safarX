import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sfimbdeizwgzfaydkyhl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmaW1iZGVpendnemZheWRreWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4OTEyNzEsImV4cCI6MjA3MjQ2NzI3MX0.-YZUaVWtUTuY6HFUknujReLTejKS69HfHBvzR0AfUPg";
const supabase = createClient(supabaseUrl, supabaseKey);

const defaultIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [1, -34],
});

const sosIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-red.png",
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [1, -34],
});

function LiveMapView() {
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);

  // Fetch address from coordinates
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

  // Fetch locations and users
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

  // Fetch SOS alerts
  const fetchSOS = async () => {
    if (users.length === 0) return;

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

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh locations every 15s
  useEffect(() => {
    const locInterval = setInterval(() => {
      fetchData();
    }, 15000);
    return () => clearInterval(locInterval);
  }, []);

  // Auto-refresh SOS alerts every 15s (after users loaded)
  useEffect(() => {
    if (users.length === 0) return;
    fetchSOS(); // fetch immediately once users are loaded

    const sosInterval = setInterval(() => {
      fetchSOS();
    }, 15000);

    return () => clearInterval(sosInterval);
  }, [users]);

  // Delete SOS alert
  const handleDeleteSOS = async (id) => {
    const { error } = await supabase.from("sos_alerts").delete().eq("id", id);
    if (error) {
      console.error("Error deleting SOS alert:", error);
    } else {
      setSosAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }
  };

  // Get user info for a location
  const getUserInfo = (userId) => {
    return users.find((u) => u.user_Id === userId) || null;
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Inter, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Left: Map */}
      <div style={{ flex: 1, borderRight: "1px solid #eee" }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
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
                    {alert.address}
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
          padding: "1.5rem",
          overflowY: "auto",
          background: "#f5f8ff",
        }}
      >
        <h3
          style={{
            marginBottom: "1.5rem",
            fontSize: "1.4rem",
            color: "#1e40af",
          }}
        >
          SOS Alerts
        </h3>

        {sosAlerts.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", marginTop: "2rem" }}>
            No active SOS alerts
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 16px",
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  color: "#1e3a8a",
                  fontSize: "0.95rem",
                }}
              >
                <th style={{ padding: "1rem" }}>Name</th>
                <th style={{ padding: "1rem" }}>Email</th>
                <th style={{ padding: "1rem" }}>Phone</th>
                <th style={{ padding: "1rem" }}>Location</th>
                <th style={{ padding: "1rem", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sosAlerts.map((alert, index) => (
                <React.Fragment key={alert.id}>
                  <tr
                    style={{
                      background: index % 2 === 0 ? "#fff" : "#e6efff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "0.2s",
                      height: "60px",
                    }}
                    onClick={(e) => {
                      const detailsRow = e.currentTarget.nextElementSibling.style;
                      detailsRow.display =
                        detailsRow.display === "table-row" ? "none" : "table-row";
                    }}
                  >
                    <td style={{ padding: "1rem", fontWeight: 600 }}>
                      {alert.user ? alert.user.name : "Unknown SOS User"}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#444" }}>
                      {alert.user?.email || ""}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#444" }}>
                      {alert.user?.phone || ""}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#444" }}>
                      {alert.address}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSOS(alert.id);
                        }}
                        style={{
                          border: "none",
                          background: "#1e40af",
                          color: "#fff",
                          fontSize: "0.85rem",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) => (e.target.style.background = "#1d4ed8")}
                        onMouseOut={(e) => (e.target.style.background = "#1e40af")}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  <tr style={{ display: "none" }}>
                    <td
                      colSpan="5"
                      style={{
                        padding: "1rem 2rem",
                        background: "#dbe7ff",
                        borderRadius: "0 0 10px 10px",
                        fontSize: "0.9rem",
                        color: "#333",
                      }}
                    >
                      <div style={{ marginBottom: "6px" }}>
                        <strong>Time:</strong> {new Date(alert.created_at).toLocaleString()}
                      </div>
                      <div>
                        <strong>User ID:</strong> {alert.user?.user_Id || "N/A"}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default LiveMapView;
