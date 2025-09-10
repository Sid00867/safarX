import { useState } from "react";
import React from "react";
import GeofenceForm from "./Components/GeofenceForm";
import LiveMapView from "./Components/LiveMapView";
import Tourists from "./Components/Tourists";
import logo from "/SafarXLogo.png";

function App() {
  const [page, setPage] = useState("live");

  return (
    <>
      <header style={styles.header}>
        <div style={styles.logo}>
          <img src={logo} alt="Logo" style={{ height: "40px" }} />
        </div>
        <div style={styles.buttons}>
          <button style={styles.button} onClick={() => setPage("live")}>
            Real-Time Map
          </button>
          <button style={styles.button} onClick={() => setPage("geofence")}>
            Geofence Management
          </button>
          <button style={styles.button} onClick={() => setPage("tourist")}>
            Tourist Registry
          </button>
        </div>
      </header>

      {page === "live" && <LiveMapView />}
      {page === "geofence" && <GeofenceForm />}
      {page === "tourist" && <Tourists />}
    </>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #ddd",
  },
  logo: {
    fontSize: "20px",
    fontWeight: "bold",
  },
  buttons: {
    display: "flex",
    gap: "10px",
  },
  button: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "4px",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
  },
};

export default App;
