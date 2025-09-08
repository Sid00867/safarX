import React, { useState } from "react";
import { supabase } from "../lib/supabase";

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
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        radius: Number(formData.radius)
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
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
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
