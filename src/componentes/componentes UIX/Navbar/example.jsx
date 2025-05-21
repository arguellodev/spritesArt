import { useState } from "react";
import Navbar from "./Navbar";


export default function NavbarDemo() {
    // Ejemplo de items para la navbar
    const navItems = [
      {
        label: 'Inicio',
        icon: '🏠',
        link: '#home'
      },
      {
        label: 'Productos',
        icon: '📦',
        dropdown: [
          { label: 'Categoría 1', icon: '🔹', onClick: () => console.log('Categoría 1') },
          { label: 'Categoría 2', icon: '🔹', onClick: () => console.log('Categoría 2') },
          { label: 'Categoría 3', icon: '🔹', onClick: () => console.log('Categoría 3') }
        ]
      },
      {
        label: 'Servicios',
        icon: '🔧',
        onClick: () => console.log('Servicios')
      },
      {
        label: 'Contacto',
        icon: '✉️',
        link: '#contact'
      },
      {
        label: 'Configuración',
        icon: '⚙️',
        dropdown: [
          { label: 'Perfil', icon: '👤', onClick: () => console.log('Perfil') },
          { label: 'Preferencias', icon: '🔧', onClick: () => console.log('Preferencias') },
          { label: 'Cerrar sesión', icon: '🚪', onClick: () => console.log('Cerrar sesión') }
        ]
      }
    ];
  
    // Estado para configurar la demostración
    const [navConfig, setNavConfig] = useState({
      variant: 'horizontal',
      theme: 'light',
      showOnlyIcons: false,
      twoColumns: false
    });
  
    // Demo para alternar configuraciones
    const handleConfigChange = (key, value) => {
      setNavConfig(prev => ({ ...prev, [key]: value }));
    };
  
    return (
      <div className="navbar-demo">
        <Navbar 
          logo={<div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>Logo</div>}
          items={navItems}
          variant={navConfig.variant}
          theme={navConfig.theme}
          showOnlyIcons={navConfig.showOnlyIcons}
          twoColumns={navConfig.twoColumns}
          onItemClick={(item) => console.log('Clicked item:', item)}
        />
        
        {/* Controles de demostración */}
        <div className="demo-controls" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2>Configuración de Navbar</h2>
          
          <div style={{ marginBottom: '1rem' }}>
            <h3>Orientación</h3>
            <label>
              <input 
                type="radio" 
                checked={navConfig.variant === 'horizontal'} 
                onChange={() => handleConfigChange('variant', 'horizontal')}
              /> Horizontal
            </label>
            <label style={{ marginLeft: '1rem' }}>
              <input 
                type="radio" 
                checked={navConfig.variant === 'vertical'} 
                onChange={() => handleConfigChange('variant', 'vertical')}
              /> Vertical
            </label>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <h3>Tema</h3>
            <label>
              <input 
                type="radio" 
                checked={navConfig.theme === 'light'} 
                onChange={() => handleConfigChange('theme', 'light')}
              /> Claro
            </label>
            <label style={{ marginLeft: '1rem' }}>
              <input 
                type="radio" 
                checked={navConfig.theme === 'dark'} 
                onChange={() => handleConfigChange('theme', 'dark')}
              /> Oscuro
            </label>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <h3>Opciones</h3>
            <label>
              <input 
                type="checkbox" 
                checked={navConfig.showOnlyIcons} 
                onChange={() => handleConfigChange('showOnlyIcons', !navConfig.showOnlyIcons)}
              /> Solo iconos
            </label>
            
            {navConfig.variant === 'vertical' && (
              <label style={{ marginLeft: '1rem' }}>
                <input 
                  type="checkbox" 
                  checked={navConfig.twoColumns} 
                  onChange={() => handleConfigChange('twoColumns', !navConfig.twoColumns)}
                /> Dos columnas
              </label>
            )}
          </div>
        </div>
      </div>
    );
  }