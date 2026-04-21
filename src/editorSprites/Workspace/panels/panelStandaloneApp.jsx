"use no memo";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LayerColor from "../customTool/layerColor";
import {
  iniciarBridge,
  suscribir,
  publicar,
  llamarCallback,
  panelIdDeUrl,
  transporteActual,
} from "./panelBridge";
import "./panelFrame.css";

// App minimalista que corre en una ventana popped. Renderiza un único panel
// según ?panel=<id>, se conecta al bridge para recibir el snapshot inicial y
// patches subsecuentes del host, y proxea callbacks via bridge.
export function PanelStandaloneApp() {
  const panelId = useMemo(() => panelIdDeUrl(), []);
  const [snapshot, setSnapshot] = useState(null);
  const [estadoConexion, setEstadoConexion] = useState("conectando");
  const reintentoRef = useRef(null);

  useEffect(() => {
    if (!panelId) return undefined;
    iniciarBridge();
    console.log(`[popped:${panelId}] inicializado, pidiendo snapshot al host…`);

    const solicitar = () => publicar({ tipo: "state/pedir", panelId });
    solicitar();
    reintentoRef.current = setInterval(solicitar, 1500);

    const desuscribir = suscribir((msg) => {
      if (!msg || msg.panelId !== panelId) return;
      console.log(`[popped:${panelId}] msg recibido:`, msg.tipo);
      if (msg.tipo === "state/snapshot" || msg.tipo === "state/patch") {
        setSnapshot((prev) => ({ ...(prev || {}), ...(msg.payload || msg.patch || {}) }));
        if (reintentoRef.current) {
          clearInterval(reintentoRef.current);
          reintentoRef.current = null;
        }
        setEstadoConexion("conectado");
      }
      if (msg.tipo === "panel/cerrado") {
        setEstadoConexion("host-desconectado");
      }
    });

    const onBeforeUnload = () => {
      publicar({ tipo: "panel/standalone-cerrado", panelId });
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      desuscribir();
      if (reintentoRef.current) clearInterval(reintentoRef.current);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [panelId]);

  if (!panelId) {
    return <CartelCentral titulo="Sin panel" mensaje="No se especificó ?panel=<id>." />;
  }

  if (!snapshot) {
    const transporte = transporteActual();
    const bridgeOk = typeof window !== "undefined" && !!window.pixcalliBridge;
    return (
      <CartelCentral
        titulo="Conectando…"
        mensaje={
          estadoConexion === "host-desconectado"
            ? "La ventana principal se desconectó."
            : `Esperando estado desde la ventana principal.\npanelId=${panelId}\ntransporte=${transporte || "?"}\npreload=${bridgeOk ? "OK" : "NO DISPONIBLE"}`
        }
      />
    );
  }

  if (panelId === "layerColor") {
    return <PoppedLayerColor snapshot={snapshot} />;
  }
  if (panelId === "playAnimation") {
    return <PoppedBitmapViewer snapshot={snapshot} titulo="Animación" />;
  }
  if (panelId === "viewportNavigator") {
    return <PoppedBitmapViewer snapshot={snapshot} titulo="Navegador" />;
  }
  return <CartelCentral titulo="Panel desconocido" mensaje={panelId} />;
}

function CartelCentral({ titulo, mensaje }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        background: "#1e1e1e",
        color: "#eaeaea",
        padding: 24,
        textAlign: "center",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16, opacity: 0.85, textTransform: "uppercase", letterSpacing: 2 }}>
        {titulo}
      </h2>
      <p style={{ marginTop: 12, opacity: 0.7, fontSize: 13, whiteSpace: "pre-line" }}>{mensaje}</p>
    </div>
  );
}

function PoppedLayerColor({ snapshot }) {
  const {
    tool,
    toolParameters,
    currentFrame,
    activeLayerId,
    isPressed,
    eyeDropperColor,
    fnIds,
  } = snapshot;

  const setToolParameters = useCallback(
    (nuevoOUpdater) => {
      // Si es función, la evaluamos local y mandamos el resultado.
      if (typeof nuevoOUpdater === "function") {
        const siguiente = nuevoOUpdater(toolParameters);
        return llamarCallback(fnIds.setToolParameters, [siguiente]);
      }
      return llamarCallback(fnIds.setToolParameters, [nuevoOUpdater]);
    },
    [fnIds, toolParameters]
  );

  const getLayerPixelData = useCallback(
    (...args) => llamarCallback(fnIds.getLayerPixelData, args, 3000),
    [fnIds]
  );

  const paintPixelsRGBA = useCallback(
    (...args) => llamarCallback(fnIds.paintPixelsRGBA, args, 5000),
    [fnIds]
  );

  if (!fnIds) {
    return <CartelCentral titulo="Color" mensaje="Cargando callbacks…" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1e1e1e" }}>
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #333",
          fontFamily: "'Inter', Arial, sans-serif",
          color: "#eaeaea",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: "uppercase",
          opacity: 0.85,
          background: "#2a2a2a",
        }}
      >
        Color (ventana independiente)
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <LayerColor
          tool={tool}
          toolParameters={toolParameters}
          setToolParameters={setToolParameters}
          getLayerPixelData={getLayerPixelData}
          paintPixelsRGBA={paintPixelsRGBA}
          currentFrame={currentFrame}
          activeLayerId={activeLayerId}
          isPressed={isPressed || null}
          eyeDropperColor={eyeDropperColor}
        />
      </div>
    </div>
  );
}

// Viewer genérico que dibuja el último ImageBitmap recibido desde el host.
// Sirve como popped simplificado para PlayAnimation y ViewportNavigator
// mientras la app principal es quien sigue siendo autoritativa sobre la data.
function PoppedBitmapViewer({ snapshot, titulo }) {
  const canvasRef = useRef(null);
  const [segundosDesde, setSegundosDesde] = useState(null);
  const ultimaActualizacionRef = useRef(null);

  useEffect(() => {
    const desuscribir = suscribir((msg) => {
      if (msg.tipo !== "canvas/frame") return;
      if (msg.panelId !== snapshot.panelId) return;
      const canvas = canvasRef.current;
      const bmp = msg.bitmap;
      if (!canvas || !bmp) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
        canvas.width = bmp.width;
        canvas.height = bmp.height;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0);
      ultimaActualizacionRef.current = Date.now();
      setSegundosDesde(0);
      if (typeof bmp.close === "function") {
        try {
          bmp.close();
        } catch {
          // no-op
        }
      }
    });
    return desuscribir;
  }, [snapshot.panelId]);

  useEffect(() => {
    const id = setInterval(() => {
      const t = ultimaActualizacionRef.current;
      if (t == null) return;
      setSegundosDesde(Math.max(0, Math.round((Date.now() - t) / 100) / 10));
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1e1e1e", color: "#eaeaea" }}>
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #333",
          fontFamily: "'Inter', Arial, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: "uppercase",
          opacity: 0.85,
          background: "#2a2a2a",
        }}
      >
        {titulo} (vista remota)
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 12,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            imageRendering: "pixelated",
            border: "1px solid #333",
            background: "#111",
          }}
        />
      </div>
      <div style={{ fontSize: 11, padding: "4px 12px", opacity: 0.6 }}>
        {segundosDesde != null ? `Actualizado hace ${segundosDesde}s` : "Esperando datos del host…"}
      </div>
    </div>
  );
}
