'use client';


import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Shield, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFlaggedCount } from '@/hooks/useModeration';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuestionsDropdown, CoursesDropdown, MobileQuestionsMenu, MobileCoursesMenu } from '@/components/layout/NavDropdown';
import Image from 'next/image';

const GOOGLE_ICON = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';

export default function Navbar() {
  const { user, profile, isAdmin, isLoading, signInWithGoogle, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: flaggedCount = 0 } = useFlaggedCount(isAdmin);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.webp" alt="TechnoManagers" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="text-lg font-heading font-bold tracking-tight">
            <span className="text-gradient-brand">TECHNO</span>
            <span className="text-foreground">MANAGERS</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          <QuestionsDropdown active={pathname === '/questions'} />
          <CoursesDropdown active={pathname === '/courses'} />
          <Link
            href="/coaching"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              pathname === '/coaching'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Coaching
          </Link>
          <Link
            href="/events"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              pathname === '/events'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Events
          </Link>
          <Link
            href="/cohort"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              pathname === '/cohort'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Cohort
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#1A7AE8] to-[#00C2FF] animate-pulse leading-none">
              NEW
            </span>
          </Link>
          <a
            href="https://www.technomanagers.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            Blogs
          </a>
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="relative">
                  <Button size="sm" className="bg-accent text-white hover:bg-accent/90 rounded-full gap-1.5 text-xs font-semibold">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Button>
                  {flaggedCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive border-2 border-background" />
                  )}
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-secondary focus:outline-none focus:ring-2 focus:ring-ring">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                        {profile?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              onClick={signInWithGoogle}
              variant="outline"
              className="gap-2 border-border bg-background hover:bg-muted text-foreground font-medium"
            >
              <Image src={GOOGLE_ICON} alt="Google" width={16} height={16} className="h-4 w-4" />
              Sign in
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          <MobileQuestionsMenu onClose={() => setMobileOpen(false)} />
          <MobileCoursesMenu onClose={() => setMobileOpen(false)} />
          <Link
            href="/coaching"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Coaching
          </Link>
          <Link
            href="/events"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Events
          </Link>
          <Link
            href="/cohort"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Cohort
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#1A7AE8] to-[#00C2FF] animate-pulse leading-none">
              NEW
            </span>
          </Link>
          <a
            href="https://www.technomanagers.com/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Blogs
          </a>
          {!isLoading && isAdmin && (
            <Link href="/admin" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="bg-accent text-white w-full gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Button>
            </Link>
          )}
          {!isLoading && user ? (
            <Button variant="outline" className="w-full gap-2" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          ) : !isLoading ? (
            <Button className="w-full gap-2" variant="outline" onClick={signInWithGoogle}>
              <Image src={GOOGLE_ICON} alt="Google" width={16} height={16} className="h-4 w-4" />
              Sign in
            </Button>
          ) : null}
        </div>
      )}
    </nav>
  );
}
