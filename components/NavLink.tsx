'use client';

/**
 * components/NavLink.tsx  —  Client Component ✅
 *
 * Needs 'use client': uses usePathname() from next/navigation to detect
 * the active route for applying activeClassName.
 *
 * Changes from src/components/NavLink.tsx:
 * - Removed react-router-dom dependency entirely
 * - Uses next/link <Link> instead of react-router-dom's <NavLink>
 * - Active detection: usePathname() === href  (replaces router's isActive)
 * - Prop rename: `to` → `href` to match next/link API
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface NavLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  href: string;
  className?: string;
  activeClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, className, activeClassName, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = 'NavLink';

export { NavLink };
