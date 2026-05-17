'use client';

/**
 * components/questions/QuestionFilters.tsx  —  Client Component ✅
 *
 * Needs 'use client': useState for each popover's open state, TanStack Query
 * hooks (useRoles, useCategories, useCompaniesWithCounts), onChange/onClick
 * handlers on checkboxes and input fields.
 *
 * Changes from src/components/questions/QuestionFilters.tsx:
 * - Added 'use client' directive
 * - Hook imports: `@/hooks/...` → `@src/hooks/...` (hooks stay in src/ until Phase 6)
 * - `@/lib/utils` → `@/lib/utils` ✅ (resolves to root lib/utils.ts)
 * - `@/components/ui/popover` → `@/components/ui/popover` ✅
 * - All logic, JSX, and visual design UNCHANGED.
 */

import { useState } from 'react';
import { ChevronDown, X, Building2, SlidersHorizontal, Flame, Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRoles } from '@src/hooks/useRoles';
import { useCompaniesWithCounts } from '@src/hooks/useCompanies';
import { useCategories } from '@src/hooks/useCategories';

/* ─── Pill button ─── */
function FilterButton({
  active,
  label,
  icon,
  onClear,
  className,
}: {
  active?: boolean;
  label: string;
  icon?: React.ReactNode;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap cursor-pointer',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-foreground border-border hover:bg-muted/60',
        className,
      )}
    >
      {icon}
      <span className="truncate max-w-[140px]">{label}</span>
      {active && onClear ? (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClear();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-primary-foreground/20"
        >
          <X className="h-3 w-3" />
        </span>
      ) : (
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      )}
    </div>
  );
}

/* ─── ROLE FILTER ─── */
export function RoleFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const { data: roles = [] } = useRoles();
  const active = value !== '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <FilterButton
            active={active}
            label={active ? value : 'Role'}
            onClear={active ? () => { onChange(''); setOpen(false); } : undefined}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1.5" sideOffset={6}>
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => { onChange(value === r.name ? '' : r.name); setOpen(false); }}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
              value === r.name ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted',
            )}
          >
            <span className={cn(
              'h-3.5 w-3.5 rounded-full border',
              value === r.name ? 'border-primary bg-primary' : 'border-muted-foreground/40',
            )} />
            {r.name}
          </button>
        ))}
        {roles.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No roles available</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ─── COMPANY FILTER ─── */
export function CompanyFilter({
  value,
  onChange,
  includeDrafts = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  includeDrafts?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: companies = [], isLoading } = useCompaniesWithCounts(includeDrafts);
  const active = value.length > 0;
  const label = value.length === 0 ? 'Company' : value.length === 1 ? value[0] : `Company (${value.length})`;
  const filtered = companies.filter((c) => c.company_name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (company: string) => {
    onChange(value.includes(company) ? value.filter((c) => c !== company) : [...value, company]);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <div>
          <FilterButton
            active={active}
            label={label}
            icon={<Building2 className="h-3.5 w-3.5 shrink-0" />}
            onClear={active ? () => { onChange([]); setOpen(false); } : undefined}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2" sideOffset={6}>
        <div className="relative mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {filtered.map((c) => (
            <label key={c.company_name} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                checked={value.includes(c.company_name)}
                onChange={() => toggle(c.company_name)}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span className="flex-1 truncate">{c.company_name}</span>
              <span className="text-xs text-muted-foreground">({c.question_count})</span>
            </label>
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No matches</p>
          )}
          {isLoading && (
            <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─── CATEGORY FILTER ─── */
export function CategoryFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: categories = [], isLoading } = useCategories();
  const active = value.length > 0;
  const label = value.length === 0 ? 'Category' : value.length === 1 ? value[0] : `Category (${value.length})`;

  const toggle = (cat: string) => {
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <FilterButton
            active={active}
            label={label}
            onClear={active ? () => { onChange([]); setOpen(false); } : undefined}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2 max-h-80 overflow-y-auto" sideOffset={6}>
        {isLoading && (
          <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
        )}
        {!isLoading && categories.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No categories available</p>
        )}
        {categories.map((c) => (
          <label key={c.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm hover:bg-muted cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(c.name)}
              onChange={() => toggle(c.name)}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            <span className="truncate" title={c.name}>{c.name}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/* ─── GENERAL FILTER (Difficulty) ─── */
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export function GeneralFilter({
  difficulties,
  onDifficultiesChange,
}: {
  difficulties: string[];
  onDifficultiesChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = difficulties.length > 0;

  const toggleDiff = (d: string) => {
    onDifficultiesChange(
      difficulties.includes(d) ? difficulties.filter((x) => x !== d) : [...difficulties, d],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <FilterButton
            active={active}
            label={active ? `Filter (${difficulties.length})` : 'Filter'}
            icon={<SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />}
            onClear={active ? () => { onDifficultiesChange([]); setOpen(false); } : undefined}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2" sideOffset={6}>
        <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Difficulty</p>
        {DIFFICULTIES.map((d) => (
          <label key={d} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm hover:bg-muted cursor-pointer">
            <input
              type="checkbox"
              checked={difficulties.includes(d)}
              onChange={() => toggleDiff(d)}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            {d}
          </label>
        ))}
        {active && (
          <div className="mt-2 px-1">
            <button
              onClick={() => onDifficultiesChange([])}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ─── SORT FILTER ─── */
const SORT_OPTIONS = [
  { value: 'Hot', label: 'Hot', icon: <Flame className="h-3.5 w-3.5" /> },
  { value: 'Newest', label: 'Newest', icon: <Clock className="h-3.5 w-3.5" /> },
  { value: 'Oldest', label: 'Oldest', icon: <Clock className="h-3.5 w-3.5" /> },
];

export function SortFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((s) => s.value === value) || SORT_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted/60 whitespace-nowrap"
        >
          {current.icon}
          {current.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1.5" sideOffset={6}>
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => { onChange(s.value); setOpen(false); }}
            className={cn(
              'w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-sm transition-colors',
              value === s.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted',
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
