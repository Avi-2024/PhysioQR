import React, {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs  = 300,
  className,
  id           = 'search-input',
}: SearchInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value → local (e.g. when parent clears search)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(next);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange('');
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <span
        className="pointer-events-none absolute left-3 flex items-center text-gray-400"
        aria-hidden="true"
      >
        <Search size={16} />
      </span>

      <input
        id={id}
        type="search"
        role="searchbox"
        aria-label={placeholder}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9',
          'text-sm text-gray-900 placeholder:text-gray-400',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
        )}
      />

      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

SearchInput.displayName = 'SearchInput';

export { SearchInput };
export default SearchInput;
