import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = "https://sfimbdeizwgzfaydkyhl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmaW1iZGVpendnemZheWRreWhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg5MTI3MSwiZXhwIjoyMDcyNDY3MjcxfQ.ZIZBsd57pyvlVqeDoNk7h5Cg8W78ShdxttOnWnZfDQU";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function GeofenceForm() {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    latitude: "",
    longitude: "",
    radius: ""
  });

  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Submitting...");

    const { data, error } = await supabase.from("geofences").insert([
      {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius)
      }
    ]);

    if (error) {
      setStatus(`❌ Error: ${error.message}`);
    } else {
      setStatus("✅ Geofence added successfully!");
      setFormData({
        name: "",
        type: "",
        description: "",
        latitude: "",
        longitude: "",
        radius: ""
      });
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "20px auto", fontFamily: "Arial" }}>
      <h2>Add Geofence</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
          step="any"
          name="latitude"
          placeholder="Latitude"
          value={formData.latitude}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          step="any"
          name="longitude"
          placeholder="Longitude"
          value={formData.longitude}
          onChange={handleChange}
          required
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
  );
}
