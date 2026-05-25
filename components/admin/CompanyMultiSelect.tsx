'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveCompanies, useCreateCompany } from '@/hooks/useCompanies';
import { toast } from 'sonner';

/**
 * Multi-select searchable company picker with pills + inline create.
 * - Selected companies render as removable chips inside the input area.
 * - Typing filters existing companies (case-insensitive).
 * - If the typed value doesn't match an existing company, an
 *   "+ Add 'X' as new company" option appears at the bottom of the dropdown.
 */
export default function CompanyMultiSelect({
  value,
  onChange,
  placeholder = 'Search and select companies...',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const { data: companies = [], isLoading } = useActiveCompanies();
  const createCompany = useCreateCompany();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLower = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );

  const queryTrim = query.trim();

  const matches = useMemo(() => {
    const q = queryTrim.toLowerCase();
    return companies
      .filter((c) => !selectedLower.has(c.name.toLowerCase()))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) : true))
      .slice(0, 10);
  }, [companies, queryTrim, selectedLower]);

  const exactExists = useMemo(
    () => companies.some((c) => c.name.toLowerCase() === queryTrim.toLowerCase()) ||
          selectedLower.has(queryTrim.toLowerCase()),
    [companies, queryTrim, selectedLower],
  );
  const showAddNew = queryTrim.length > 0 && !exactExists;
  const totalOptions = matches.length + (showAddNew ? 1 : 0);

  // Reset active index when options change
  useEffect(() => {
    setActiveIdx(0);
  }, [query, matches.length, showAddNew]);

  // Outside click closes
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const addCompany = (name: string) => {
    if (selectedLower.has(name.toLowerCase())) return;
    onChange([...value, name]);
    setQuery('');
    inputRef.current?.focus();
  };

  const removeCompany = (name: string) => {
    onChange(value.filter((v) => v !== name));
    inputRef.current?.focus();
  };

  const createAndAdd = async (name: string) => {
    try {
      await createCompany.mutateAsync({ name });
      addCompany(name);
      toast.success(`Added "${name}" to companies`);
    } catch (e: any) {
      // If duplicate (case-insensitive), treat as silent success and just add
      if (e?.message?.toLowerCase().includes('duplicate') || e?.code === '23505') {
        addCompany(name);
      } else {
        toast.error(e?.message || 'Could not create company');
      }
    }
  };

  const pickActive = () => {
    if (totalOptions === 0) return;
    if (showAddNew && activeIdx === matches.length) {
      createAndAdd(queryTrim);
    } else {
      const m = matches[activeIdx];
      if (m) addCompany(m.name);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div
        className={cn(
          'min-h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm',
          'flex flex-wrap gap-1.5 items-center cursor-text',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        )}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
          >
            {name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeCompany(name);
              }}
              className="hover:bg-primary/20 rounded-full p-0.5 -mr-0.5"
              aria-label={`Remove ${name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && query === '' && value.length > 0) {
              removeCompany(value[value.length - 1]);
              return;
            }
            if (!open || totalOptions === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, totalOptions - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              pickActive();
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[140px] outline-none bg-transparent text-sm"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border bg-popover shadow-lg">
          {isLoading && (
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading companies…
            </div>
          )}
          {!isLoading && matches.length === 0 && !showAddNew && (
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Search className="h-3 w-3" />
              {queryTrim ? 'No matches' : 'Type to search…'}
            </div>
          )}
          {matches.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addCompany(c.name);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm transition-colors',
                i === activeIdx ? 'bg-muted' : 'hover:bg-muted/60',
              )}
            >
              {c.name}
            </button>
          ))}
          {showAddNew && (
            <>
              {matches.length > 0 && <div className="border-t" />}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  createAndAdd(queryTrim);
                }}
                onMouseEnter={() => setActiveIdx(matches.length)}
                disabled={createCompany.isPending}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors',
                  activeIdx === matches.length ? 'bg-muted' : 'hover:bg-muted/60',
                )}
              >
                {createCompany.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add &ldquo;{queryTrim}&rdquo; as new company
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
