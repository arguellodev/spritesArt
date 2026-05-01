import React from 'react';
import './App.css';
import EditorMain from './editorSprites/Editor/editorMain';
import { LanguageProvider } from './editorSprites/i18n/LanguageContext';
// Side-effect import: instala el logger global (monkeypatch de console.* +
// listeners de window error/unhandledrejection) y restaura logs persistidos.
import './editorSprites/devConsole/logger';

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