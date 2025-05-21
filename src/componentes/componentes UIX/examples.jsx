import React, { useState } from 'react';
import { Accordion, AccordionItem } from "./Accordion/Accordion";
import { Alert } from "./Alert/Alert"; // Asegúrate de que la ruta sea correcta
import { AccordionExample } from './Accordion/example';
import AlertExample from './Alert/example';
import AvatarExample from './Avatar/example';
import NavbarDemo from './Navbar/example';
const Examples = () => {
 
  return (
    <div className="main-examples-container">
     <NavbarDemo/>
    </div>
  );
};



export default Examples;