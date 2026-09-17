// filepath: src/hooks/use-barcode-scanner.ts
import { useEffect, useRef } from "react";

export interface UseBarcodeScannerOptions {
  /**
   * Callback invocado cuando se detecta un código de barras escaneado correctamente.
   */
  onScan: (barcode: string) => void;
  /**
   * Longitud mínima del código de barras (por defecto 3).
   */
  minLength?: number;
  /**
   * Umbral máximo en milisegundos entre pulsaciones para considerarlo entrada de escáner hardware (por defecto 50ms).
   */
  maxIntervalMs?: number;
  /**
   * Si la escucha global de eventos está activa (por defecto true).
   */
  enabled?: boolean;
  /**
   * Teclas de terminación que envían el búfer cargado (por defecto ['Enter']).
   */
  endKeys?: string[];
}

/**
 * Hook reutilizable para capturar lectura de código de barras mediante escáner hardware (USB/HID/Serial).
 * Distingue el tipeo manual humano de la ráfaga de alta velocidad del lector óptico.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 3,
  maxIntervalMs = 50,
  enabled = true,
  endKeys = ["Enter"],
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Si la tecla es una tecla de finalización (ej: Enter)
      if (endKeys.includes(event.key)) {
        if (bufferRef.current.length >= minLength) {
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = "";
          onScan(scannedCode);
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // Si la diferencia de tiempo es mayor a 50ms, la ráfaga del escáner finalizó o fue tipeo humano
      if (timeDiff > maxIntervalMs) {
        bufferRef.current = "";
      }

      // Concatenar únicamente caracteres imprimibles
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onScan, minLength, maxIntervalMs, enabled, endKeys]);
}

export default useBarcodeScanner;
