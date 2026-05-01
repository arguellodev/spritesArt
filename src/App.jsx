import React from 'react';
import './App.css';
import EditorMain from './editorSprites/Editor/editorMain';
import { LanguageProvider } from './editorSprites/i18n/LanguageContext';

function App() {

  // Renderizado de la interfaz
  return (
    <LanguageProvider>
      <div className='App'>
        <EditorMain></EditorMain>
      </div>
    </LanguageProvider>
  );
}

export default App;