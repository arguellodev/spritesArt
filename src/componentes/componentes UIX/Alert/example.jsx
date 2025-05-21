import React, { useState } from 'react';
import { Alert } from './Alert';

const AlertExample = () => {
  const [mostrarAlerta, setMostrarAlerta] = useState(true);
  const [mostrarAlertaPersonalizada, setMostrarAlertaPersonalizada] = useState(true);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>Ejemplos de Componente Alert</h2>

      <h3>Alertas Básicas</h3>
      <Alert type="info" title="Información">
        Este es un mensaje de información para el usuario.
      </Alert>

      <Alert type="success" title="¡Éxito!">
        La operación se completó correctamente.
      </Alert>

      <Alert type="warning" title="Advertencia">
        Esto es una advertencia importante.
      </Alert>

      <Alert type="error" title="Error">
        Ha ocurrido un problema en el sistema.
      </Alert>

      <h3>Alerta Cerrable</h3>
      {mostrarAlerta && (
        <Alert 
          type="info" 
          title="Alerta importante" 
          onClose={() => setMostrarAlerta(false)}
        >
          Este mensaje puede ser cerrado haciendo click en la X.
        </Alert>
      )}
      <button onClick={() => setMostrarAlerta(true)}>
        Mostrar alerta nuevamente
      </button>

      <h3>Alerta sin Título</h3>
      <Alert type="info">
        Este es un mensaje simple sin título.
      </Alert>

      <h3>Alerta Personalizada</h3>
      {mostrarAlertaPersonalizada && (
        <Alert 
          type="error"
          title="Personalizada"
          className="alerta-especial"
          onClose={() => setMostrarAlertaPersonalizada(false)}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '10px' }}>⚠️</span>
            <span>Esta alerta tiene contenido y estilos personalizados</span>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default AlertExample