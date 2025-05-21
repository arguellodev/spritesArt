import React from 'react';
import { Avatar } from './Avatar';


const AvatarExample = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>Ejemplos de Componente Avatar</h2>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div>
          <h3>Avatares con Imagen</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Avatar 
              src="https://i.pravatar.cc/150?img=1" 
              alt="Usuario Ejemplo"
              size="sm"
            />
            <Avatar 
              src="https://i.pravatar.cc/150?img=3" 
              alt="Usuario Ejemplo"
              size="md"
            />
            <Avatar 
              src="https://i.pravatar.cc/150?img=5" 
              alt="Usuario Ejemplo"
              size="lg"
            />
            <Avatar 
              src="https://i.pravatar.cc/150?img=7" 
              alt="Usuario Ejemplo"
              size="xl"
            />
          </div>
        </div>

        <div>
          <h3>Avatares con Iniciales</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Avatar 
              initials="JP" 
              size="sm"
              shape="circle"
            />
            <Avatar 
              alt="María García"
              size="md"
              shape="square"
            />
            <Avatar 
              alt="Carlos Pérez López"
              size="lg"
              shape="circle"
            />
            <Avatar 
              initials="AD"
              size="xl"
              shape="square"
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Estados del Avatar</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Avatar 
            src="https://i.pravatar.cc/150?img=10" 
            alt="En línea"
            status="online"
          />
          <Avatar 
            src="https://i.pravatar.cc/150?img=11" 
            alt="Ausente"
            status="away"
          />
          <Avatar 
            src="https://i.pravatar.cc/150?img=12" 
            alt="Ocupado"
            status="busy"
          />
          <Avatar 
            src="https://i.pravatar.cc/150?img=13" 
            alt="Desconectado"
            status="offline"
          />
          <Avatar 
            initials="NM"
            status="online"
            statusPosition="top-right"
          />
        </div>
      </div>

      <div>
        <h3>Avatar Personalizado</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Avatar 
            src="https://i.pravatar.cc/150?img=33" 
            alt="Usuario Premium"
            size="lg"
            className="avatar-premium"
            status="online"
          />
          <Avatar 
            initials="VIP"
            size="lg"
            shape="circle"
            className="avatar-vip"
            status="busy"
            statusPosition="top-left"
          />
        </div>
      </div>
    </div>
  );
};

export default AvatarExample;