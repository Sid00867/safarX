import { useState } from 'react'
import React from "react";
import LiveMapView from "./Components/LiveMapView";
import GeofenceForm from './Components/GeofenceForm' 

function App() {
  return (
    <>
      <LiveMapView />
      <GeofenceForm />
    </>
  );
}

export default App;
