import { useState, useCallback, useRef } from "react";
import type {
  IEditorElement,
  IHistoryState,
} from "../utils/types/editor.types";

interface IUseHistoryReturn {
  history: IHistoryState[];
  index: number;
  saveToHistory: (els: IEditorElement[]) => void;
  undo: () => IEditorElement[];
  redo: () => IEditorElement[];
  canUndo: boolean;
  canRedo: boolean;
}

export const useHistory = (initial: IEditorElement[]): IUseHistoryReturn => {
  const initialState: IHistoryState = {
    elements: structuredClone(initial),
    timestamp: Date.now(),
  };

  const historyRef = useRef<IHistoryState[]>([initialState]);
  const indexRef = useRef<number>(0);

  const [historyState, setHistoryState] = useState<IHistoryState[]>(
    historyRef.current
  );
  const [indexState, setIndexState] = useState<number>(indexRef.current);

  const saveToHistory = useCallback((els: IEditorElement[]) => {
    const newState: IHistoryState = {
      elements: structuredClone(els),
      timestamp: Date.now(),
    };
    const sliced = historyRef.current.slice(0, indexRef.current + 1);
    const next = [...sliced, newState];
    if (next.length > 50) {
      // keep last 50
      next.shift();
    }
    historyRef.current = next;
    indexRef.current = historyRef.current.length - 1;
    setHistoryState(historyRef.current);
    setIndexState(indexRef.current);
  }, []);

  const undo = (): IEditorElement[] => {
    if (indexRef.current === 0)
      return structuredClone(historyRef.current[0].elements);
    indexRef.current = Math.max(0, indexRef.current - 1);
    setIndexState(indexRef.current);
    return structuredClone(historyRef.current[indexRef.current].elements);
  };

  const redo = (): IEditorElement[] => {
    if (indexRef.current >= historyRef.current.length - 1)
      return structuredClone(historyRef.current[indexRef.current].elements);
    indexRef.current = Math.min(
      historyRef.current.length - 1,
      indexRef.current + 1
    );
    setIndexState(indexRef.current);
    return structuredClone(historyRef.current[indexRef.current].elements);
  };

  return {
    history: historyState,
    index: indexState,
    saveToHistory,
    undo,
    redo,
    canUndo: indexState > 0,
    canRedo: indexState < historyState.length - 1,
  };
};
