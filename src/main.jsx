"use no memo";
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PanelStandaloneApp } from './editorSprites/Workspace/panels/panelStandaloneApp.jsx'

// Si la URL trae ?panel=<id>, esta ventana es una popped — renderizamos solo
// el panel correspondiente en lugar del editor completo.
const esVentanaPopped = (() => {
  try {
    return !!new URLSearchParams(window.location.search).get('panel')
  } catch {
    return false
  }
})()

createRoot(document.getElementById('root')).render(
  esVentanaPopped ? <PanelStandaloneApp /> : <App />
)
