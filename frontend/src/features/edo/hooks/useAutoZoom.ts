// src/hooks/editorHooks/useAutoZoom.ts

import { useState, useEffect, useCallback, type RefObject } from "react";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

interface UseAutoZoomReturn {
  zoom: number;
  autoZoom: number;
  isManualZoom: boolean;
  setZoom: (value: number, manual?: boolean) => void;
  resetZoom: () => void;
}

export function useAutoZoom(
  containerRef: RefObject<HTMLDivElement>,
): UseAutoZoomReturn {
  const [zoom, setZoomState] = useState(1);
  const [autoZoom, setAutoZoom] = useState(1);
  const [isManualZoom, setIsManualZoom] = useState(false);

  // Функция расчета авто-зума
  const calculateAutoZoom = useCallback(() => {
    if (!containerRef.current) return 1;

    const container = containerRef.current;
    const availableWidth = container.clientWidth - 100; // padding
    const availableHeight = container.clientHeight - 100;

    const scaleX = availableWidth / A4_WIDTH;
    const scaleY = availableHeight / A4_HEIGHT;

    // Не больше 1.5 и не меньше 0.3
    return Math.max(0.3, Math.min(scaleX, scaleY, 1.5));
  }, [containerRef]);

  // Пересчет при ресайзе окна
  useEffect(() => {
    const handleResize = () => {
      const newAutoZoom = calculateAutoZoom();
      setAutoZoom(newAutoZoom);

      // Если не в ручном режиме, применяем авто-зум
      if (!isManualZoom) {
        setZoomState(newAutoZoom);
      }
    };

    // Начальный расчет
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateAutoZoom, isManualZoom]);

  // Основная функция установки зума
  const setZoom = useCallback((value: number, manual: boolean = true) => {
    console.log("🔍 setZoom called:", value, "manual:", manual); // Debug

    setZoomState(value);
    setIsManualZoom(manual);
  }, []);

  // Сброс к авто-зуму
  const resetZoom = useCallback(() => {
    const newAutoZoom = calculateAutoZoom();
    setAutoZoom(newAutoZoom);
    setZoomState(newAutoZoom);
    setIsManualZoom(false);
  }, [calculateAutoZoom]);

  return {
    zoom,
    autoZoom,
    isManualZoom,
    setZoom,
    resetZoom,
  };
}
