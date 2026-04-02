import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useBookSearch, BookSuggestion } from "@/hooks/useBookSearch";
import { Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: BookSuggestion) => void;
  placeholder?: string;
  id?: string;
  maxLength?: number;
  skipSearch?: boolean;
}

export function BookAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  id,
  maxLength,
}: BookAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(false);
  const { suggestions, isLoading } = useBookSearch(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ignoreNextFocusRef = useRef(false);

  // After a user picks a suggestion, hide suggestions until they type again.
  const visibleSuggestions = hasSelected ? [] : suggestions;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown when we have suggestions (but not after selection)
  useEffect(() => {
    if (hasSelected) return;
    
    if (visibleSuggestions.length > 0 && value.length >= 2) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [visibleSuggestions.length, value, hasSelected]);

  const handleSelect = (suggestion: BookSuggestion) => {
    // We're about to focus the input programmatically; prevent onFocus from re-opening the dropdown.
    ignoreNextFocusRef.current = true;
    setHasSelected(true);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onChange(suggestion.title);
    onSelect?.(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || visibleSuggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < visibleSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : visibleSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(visibleSuggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => {
            setHasSelected(false);
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (ignoreNextFocusRef.current) {
              ignoreNextFocusRef.current = false;
              return;
            }

            if (!hasSelected && visibleSuggestions.length > 0 && value.length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          className="pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && visibleSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {visibleSuggestions.map((suggestion, index) => (
              <li
                key={suggestion.key}
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-3 py-2 text-sm transition-colors",
                  highlightedIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{suggestion.title}</div>
                  {suggestion.author && (
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.author}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
