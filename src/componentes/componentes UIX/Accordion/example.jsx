import React, { useState } from 'react';
import { Accordion, AccordionItem } from './Accordion';

export const AccordionExample = () => {
  const [acordeonControlado, setAcordeonControlado] = useState(false);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>Ejemplos de Componente Acordeón</h2>
      
      <h3>Uso Básico</h3>
      <Accordion>
        <AccordionItem title="Sección 1">
          <p>Este es el contenido de la sección 1. Puede contener cualquier elemento React.</p>
        </AccordionItem>
        <AccordionItem title="Sección 2">
          <p>Este es el contenido de la sección 2. Los items del acordeón funcionan independientemente por defecto.</p>
          <ul>
            <li>Elemento de lista 1</li>
            <li>Elemento de lista 2</li>
          </ul>
        </AccordionItem>
      </Accordion>

      <h3>Componente Controlado</h3>
      <Accordion>
        <AccordionItem 
          title="Sección Controlada"
          isOpen={acordeonControlado}
          onChange={setAcordeonControlado}
        >
          <p>Este ítem del acordeón es controlado desde el componente padre.</p>
          <button onClick={() => setAcordeonControlado(false)}>
            Cerrar programáticamente
          </button>
        </AccordionItem>
      </Accordion>

      <h3>Con Clase Personalizada</h3>
      <Accordion className="acordeon-personalizado">
        <AccordionItem 
          title="Sección con Estilos Personalizados"
          className="item-personalizado"
        >
          <p>Este acordeón tiene clases CSS personalizadas para estilizado adicional.</p>
        </AccordionItem>
      </Accordion>

      <h3>Comportamiento de Acordeón Exclusivo</h3>
      <Accordion>
        <AccordionItem 
          title="Primer Ítem"
          isOpen={acordeonControlado}
          onChange={(isOpen) => setAcordeonControlado(isOpen)}
        >
          <p>Cuando este ítem se abre, cierra los demás.</p>
        </AccordionItem>
        <AccordionItem 
          title="Segundo Ítem"
          isOpen={!acordeonControlado}
          onChange={(isOpen) => setAcordeonControlado(!isOpen)}
        >
          <p>Este es el segundo ítem del acordeón exclusivo.</p>
        </AccordionItem>
      </Accordion>
    </div>
  );
};