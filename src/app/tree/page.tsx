/**
 * Public Wishing Tree Display
 * Shows the tree with all submitted leaves/aspirations
 * Visitors can view but not submit (public display)
 */

import { TreeSummary } from '@/lib/types';

export const metadata = {
  title: 'L Tree — Living Tree',
  description: 'A real-time wishing tree where every leaf is a visitor\'s aspiration',
};

export default function TreePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from #2c1810 via #4a2c20 to #6b3f30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-gold mb-2">
            L Tree — Living Tree
          </h1>
          <p className="text-text secondary mb-6">
            Every leaf is a wish carried on the wind
          </p>
        </header>

        <div className="relative h-[600px] w-full rounded-2xl overflow-hidden mb-8 shadow-2xl">
          {/* Tree canvas will be rendered by React Three Fiber or similar */}
          <div
            className="h-full w-full bg-gradient-to-br from #2d5a27 via #1b3a15 to #152510"
            aria-label="Tree display"
          />
          <p className="absolute inset-0 flex items-center justify-center text-white text-sm">
            Tree visualization
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">
            Recent Leaves
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Leaves will be populated by API data */}
            <div className="p-4 text-center text-text/50">
              No leaves yet. <a href="/phone?tree=global" className="text-gold">Submit your wish</a> to grow the tree.
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <QRCode
            size={128}
            value="https://l-tree.vercel.app/phone?tree=global"
          />
          <p className="mt-4 text-text/60 text-sm">
            Scan to submit a wish from your phone
          </p>
        </div>
      </div>
    </main>
  );
}

/* QRCode component - simple inline SVG */
function QRCode({ size = 128, value }: { size: number; value: string }) {
  return (
    <div
      className={`w-[${size}px] h-[${size}px] bg-white rounded-md flex items-center justify-center`
      }
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="text-black"
      >
        <rect width="32" height="32" fill="white" />
        {/* Simplified QR placeholder - in production use a QR library */}
        <circle cx="16" cy="16" r="8" fill="black" />
      </svg>
    </div>
  );
}