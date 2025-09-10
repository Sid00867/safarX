import React from "react";
import logo from "/SafarXLogo.png";

export default function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <img src={logo} alt="Logo" style={{ height: "40px" }} />
      </div>
      <div style={styles.buttons}>
        <button style={styles.button}>Button 1</button>
        <button style={styles.button}>Button 2</button>
        <button style={styles.button}>Button 3</button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    backgroundColor: "#ffffffff",
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
