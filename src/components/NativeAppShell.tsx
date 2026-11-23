import { useEffect } from 'react';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeApp } from '@/lib/native';

export default function NativeAppShell() {
  useEffect(() => {
    if (!isNativeApp()) return;

    void StatusBar.setOverlaysWebView({ overlay: false });
    void StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    void StatusBar.setStyle({ style: Style.Dark });
    void SplashScreen.hide({ fadeOutDuration: 220 });

    void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => undefined);
    void Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => undefined);
  }, []);

  return null;
}
