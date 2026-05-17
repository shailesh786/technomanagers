/**
 * components/layout/Footer.tsx  —  Server Component ✅
 *
 * No 'use client' needed: zero state, zero hooks, zero event handlers.
 * next/link's <Link> is renderable by Server Components.
 *
 * Changes from src/components/layout/Footer.tsx:
 * - `import { Link } from 'react-router-dom'`  →  `import Link from 'next/link'`
 * - `<Link to="...">` props  →  `<Link href="...">`
 * - All other content identical.
 */

import Link from 'next/link';
import { Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-lg">TechnoManagers</h3>
            <p className="text-sm text-muted-foreground">
              Your go-to platform for Product Management interview prep and career coaching.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-heading font-semibold text-sm">Platform</h4>
            <div className="flex flex-col gap-2">
              <Link href="/questions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Questions</Link>
              <Link href="/courses" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Courses</Link>
              <Link href="/coaching" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Coaching</Link>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-heading font-semibold text-sm">Resources</h4>
            <div className="flex flex-col gap-2">
              <a href="https://topmate.io/technomanagers" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Topmate</a>
              <a href="https://www.youtube.com/@technomanagers" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                <Youtube className="h-4 w-4" /> YouTube
              </a>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-heading font-semibold text-sm">Connect</h4>
            <p className="text-sm text-muted-foreground">Business | Management | Technology</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © 2026 TechnoManagers. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
