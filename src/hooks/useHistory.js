// src/hooks/useHistory.js
import { useState, useCallback } from 'react';

const MAX_HISTORY = 20; // Limit undo steps to conserve memory

export default function useHistory(initialState) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const currentState = history[index];

  const pushState = useCallback((newState) => {
    setHistory((prev) => {
      // 1. Slice current future out
      let newHistory = prev.slice(0, index + 1);
      // 2. Add new state
      newHistory.push(newState);
      // 3. Limit size by shifting from front if needed
      if (newHistory.length > MAX_HISTORY) {
         newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
      }
      return newHistory;
    });
    // Update index (clamped to length)
    setIndex((prev) => {
       const nextIndex = prev + 1;
       return nextIndex >= MAX_HISTORY ? MAX_HISTORY - 1 : nextIndex;
    });
  }, [index]);

  const undo = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => Math.min(history.length - 1, prev + 1));
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