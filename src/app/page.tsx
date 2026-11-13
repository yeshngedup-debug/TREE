/** 
 * L Tree — Homepage
 * Entrance animations, hero section, and CTA layout
 */

import { useEffect } from 'react';
import { motion } from 'motion/react';

export default function HomePage() {
  // Trigger entrance animations on mount
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from #2c1810 via #4a2c20 to #6b3f30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="hero mb-8">
          <h1 className="text-5xl font-bold text-gold mb-2">
            L Tree — Living Tree
          </h1>
          <p className="text-text secondary mb-6">
            Share your aspirations on the living tree
          </p>
        </header>

        <div className="grid-2-col">
          <div>
            <h3 className="text-xl font-bold text-gold mb-4">🌳 The Tree</h3>
            <p className="text-text/60">
              A real-time wishing tree where every leaf is a visitor's aspiration.
            </p>
            <a
              href="/tree"
              className="btn btn-primary mt-4"
            >
              View the Tree
            </a>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gold mb-4">📱 Submit via Phone</h3>
            <p className="text-text/60">
              Share your wish from any device. Your leaf will glow on the tree!
            </p>
            <a
              href="/phone"
              className="btn btn-secondary mt-4"
            >
              Submit Your Wish
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}