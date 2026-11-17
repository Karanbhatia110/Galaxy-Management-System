import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value by the specified delay.
 *
 * @param {any} value - The value to debounce.
 * @param {number} delay - Delay in milliseconds (default: 500ms).
 * @returns {any} The debounced value.
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   // This runs only after the user stops typing for 300ms
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
export { useDebounce };
