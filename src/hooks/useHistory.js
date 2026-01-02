// src/hooks/useHistory.js
import { useState, useCallback } from 'react';

export default function useHistory(initialState) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const currentState = history[index];

  const pushState = useCallback((newState) => {
    setHistory((prev) => {
      // If we are in the middle of history and modify state,
      // discard the "future" states
      const newHistory = prev.slice(0, index + 1);
      return [...newHistory, newState];
    });
    setIndex((prev) => prev + 1);
  }, [index]);

  const undo = useCallback(() => {
    setIndex((prev) => {
      if (prev > 0) return prev - 1;
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => {
      if (prev < history.length - 1) return prev + 1;
      return prev;
    });
  }, [history.length]);

  const resetHistory = useCallback((newState) => {
    setHistory([newState]);
    setIndex(0);
  }, []);

  return {
    state: currentState,
    pushState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    resetHistory
  };
}