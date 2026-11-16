import { ReactNode, useState } from 'react';

/**
 * Estado del panel flotante compartido por una pantalla entera (hub de
 * Anotaciones/Trackers, o Favoritos), para que cada card que lo necesite
 * (anotación, comentario de tracker, descripción de mood) empuje su propio
 * contenido ahí en vez de abrir su propio `Modal` — ver #131 en
 * `docs/DECISIONS.md`: un `Modal` por card resultó en el primer toque
 * sobre un botón perdiéndose siempre (bug conocido de Android,
 * `facebook/react-native#28871`), porque la ventana nativa del diálogo se
 * come ese primer toque para cerrar el teclado antes de que llegue a React
 * Native. Al no haber ningún `Modal` de por medio acá, ese problema no
 * existe.
 *
 * Cada card se identifica con una `key` propia (p. ej. `note-${id}`) para
 * saber si es ella la que está mostrando contenido ahora mismo
 * (`isOpen(key)`) — así puede seguir actualizando ese contenido con
 * `update` a medida que cambia su estado local, sin pisar a otra card que
 * haya abierto el panel mientras tanto.
 */
export function useFloatingOverlay() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [content, setContent] = useState<ReactNode | null>(null);
  const [heightPercent, setHeightPercent] = useState(50);

  function open(key: string, node: ReactNode, heightPct = 50) {
    setActiveKey(key);
    setContent(node);
    setHeightPercent(heightPct);
  }

  function update(key: string, node: ReactNode) {
    if (activeKey === key) setContent(node);
  }

  function close() {
    setActiveKey(null);
    setContent(null);
  }

  return {
    isOpen: (key: string) => activeKey === key,
    visible: activeKey != null,
    content,
    heightPercent,
    open,
    update,
    close,
  };
}

export type FloatingOverlay = ReturnType<typeof useFloatingOverlay>;
