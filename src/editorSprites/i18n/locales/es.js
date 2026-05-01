// Locale es — Castellano. Solo strings del menú superior + AboutModal.
// Mantén las claves en formato 'menu.archivo.guardar' (kebab-namespace.dot).

const es = {
  // ── Menús de la barra superior ──────────────────────────
  'menu.archivo': 'Archivo',
  'menu.editar': 'Editar',
  'menu.seleccion': 'Selección',
  'menu.vista': 'Vista',
  'menu.config': 'Configuración',
  'menu.ayuda': 'Ayuda',

  // ── Archivo ─────────────────────────────────────────────
  'file.new': 'Nuevo proyecto…',
  'file.open': 'Abrir proyecto…',
  'file.recent': 'Recientes',
  'file.save': 'Guardar proyecto',
  'file.import': 'Importar',
  'file.import.aseprite': 'Aseprite (.ase)',
  'file.import.gif': 'GIF animado',
  'file.import.image': 'Imagen como referencia',
  'file.export': 'Exportar',
  'file.export.animation': 'Animación / spritesheet…',
  'file.exit': 'Salir',
  'file.section.workspace': 'Espacio de trabajo',
  'file.section.io': 'Entrada / Salida',

  // ── Editar ──────────────────────────────────────────────
  'edit.undo': 'Deshacer',
  'edit.redo': 'Rehacer',
  'edit.cut': 'Cortar selección',
  'edit.copy': 'Copiar selección',
  'edit.duplicate': 'Duplicar selección',
  'edit.delete': 'Borrar pixeles seleccionados',
  'edit.fill': 'Rellenar selección',
  'edit.rotateLeft': 'Rotar 90° izquierda',
  'edit.rotateRight': 'Rotar 90° derecha',
  'edit.section.history': 'Historial',
  'edit.section.clipboard': 'Portapapeles',
  'edit.section.transform': 'Transformar',

  // ── Selección ───────────────────────────────────────────
  'sel.deselect': 'Deseleccionar',
  'sel.isolate': 'Aislar pixeles',
  'sel.exitIsolate': 'Salir del modo aislamiento',
  'sel.group': 'Agrupar',
  'sel.ungroup': 'Desagrupar',
  'sel.cropToSelection': 'Recortar canvas a selección',

  // ── Vista ───────────────────────────────────────────────
  'view.rulers': 'Reglas y guías',
  'view.onionSkin': 'Onion skin',
  'view.fullscreen': 'Pantalla completa',
  'view.filters': 'Abrir filtros…',
  'view.text': 'Insertar texto bitmap',
  'view.scripts': 'Script runner',
  'view.aiGen': 'Generador con IA',
  'view.threeD': 'Visualizador 3D',
  'view.section.canvas': 'Canvas',
  'view.section.tools': 'Herramientas',
  'view.section.creative': 'Creativas',

  // ── Configuración ───────────────────────────────────────
  'config.shortcuts': 'Atajos de teclado…',
  'config.language': 'Idioma',
  'config.language.es': 'Español',
  'config.language.en': 'English',
  'config.theme': 'Tema',
  'config.theme.dark': 'Oscuro (predeterminado)',
  'config.theme.light': 'Claro (próximamente)',

  // ── Ayuda ───────────────────────────────────────────────
  'help.about': 'Acerca de PixCalli Studio',
  'help.docs': 'Documentación',
  'help.shortcuts': 'Lista de atajos',

  // ── About modal ─────────────────────────────────────────
  'about.title': 'PixCalli Studio',
  'about.tagline': 'Editor de pixel art y animación, hecho con cariño.',
  'about.version': 'Versión',
  'about.poweredBy': 'Powered by Argánion',
  'about.builtWith': 'Construido con React, Pixi.js y WebGL',
  'about.thanks': 'Gracias por crear con nosotros',
  'about.close': 'Cerrar',

  // ── Confirmaciones / placeholders ───────────────────────
  'common.soon': 'Próximamente',
  'common.disabled.requiresSelection': 'Requiere una selección activa',
  'common.disabled.notImplemented': 'Función planificada',
};

export default es;
