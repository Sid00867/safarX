import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Supabase init
const supabaseUrl = "https://sfimbdeizwgzfaydkyhl.supabase.co";
const supabaseKey = "YOUR_SUPABASE_KEY_HERE";
const supabase = createClient(supabaseUrl, supabaseKey);

function LocationSelector({ onSelect }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function GeofenceForm() {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    radius: "",
  });

  const [status, setStatus] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocation) return;

    setStatus("Submitting...");

    const { error } = await supabase.from("geofences").insert([
      {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        radius: parseInt(formData.radius),
      },
    ]);

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("✅ Geofence added successfully!");
      setFormData({
        name: "",
        type: "",
        description: "",
        radius: "",
      });
      setSelectedLocation(null);
    }
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationSelector onSelect={setSelectedLocation} />

        {selectedLocation && (
          <Popup
            position={selectedLocation}
            onClose={() => setSelectedLocation(null)}
          >
            <div style={{ minWidth: "250px" }}>
              <h3>Add Geofence</h3>
              {/* Display Lat/Lng */}
              <p>
                <b>Latitude:</b> {selectedLocation.lat.toFixed(6)} <br />
                <b>Longitude:</b> {selectedLocation.lng.toFixed(6)}
              </p>
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Geofence Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="type"
                  placeholder="Type"
                  value={formData.type}
                  onChange={handleChange}
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  value={formData.description}
                  onChange={handleChange}
                />
                <input
                  type="number"
                  name="radius"
                  placeholder="Radius (meters)"
                  value={formData.radius}
                  onChange={handleChange}
                  required
                />
                <button type="submit">Add Geofence</button>
              </form>
              {status && <p>{status}</p>}
            </div>
          </Popup>
        )}
      </MapContainer>
    </div>
  );
}
