import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * En Android, ni `behavior="height"` ni `behavior="padding"` de
 * `KeyboardAvoidingView` empujan lo suficiente en una pantalla común bajo
 * edge-to-edge (ver #118/#119 en `docs/DECISIONS.md`: los dos se probaron y
 * el campo seguía tapado) — acá se mide el alto real del teclado directo de
 * los eventos nativos (`keyboardDidShow`/`keyboardDidHide`) y se aplica a
 * mano (`paddingBottom`/`marginBottom`) sobre el contenedor, sin pasar por
 * `KeyboardAvoidingView`. Confirmado funcionando en `NoteDetailScreen`
 * (#120) y reusado por `KeyboardFloatingOverlay` (#131).
 */
export function useAndroidKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
