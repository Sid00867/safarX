import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import GeofenceForm from './Components/GeofenceForm' // ✅ import the f./Components/GeofenceForm

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <GeofenceForm />
    </>
  )
}

export default App
