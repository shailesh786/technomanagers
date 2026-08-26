'use client';

/**
 * app/global-error.tsx — last-resort boundary for errors thrown by the root
 * layout itself. Nothing from the app (fonts, Tailwind, components) can be
 * assumed alive here, so it is a self-contained html/body with inline styles.
 */

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fff',
          color: '#0f172a',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 480 }}>
          <p style={{ fontWeight: 800, letterSpacing: '0.02em', marginBottom: 16 }}>TECHNOMANAGERS</p>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ color: '#475569', margin: '0 0 20px' }}>
            An unexpected error stopped the site from loading. It's usually temporary.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#0b2b6b',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: 10,
            }}
          >
            Try again
          </button>
          <a href="/" style={{ color: '#0b2b6b', fontSize: 14, fontWeight: 600 }}>
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
