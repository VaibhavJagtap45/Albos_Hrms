'use client';
import { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand  = (lo, hi)    => Math.random() * (hi - lo) + lo;

/* ── Palette — galaxy purple spectrum ──────────────────────────────────── */
const PALETTE = [
  [255, 255, 255],   // white
  [255, 255, 255],   // white (double-weighted — most stars are white)
  [196, 181, 253],   // violet-300
  [165, 180, 252],   // indigo-300
  [240, 171, 252],   // fuchsia-300
  [167, 139, 250],   // violet-400
  [224, 231, 255],   // indigo-100
];

/* ══════════════════════════════════════════════════════════════════════════
   Star
   ══════════════════════════════════════════════════════════════════════════ */
class Star {
  constructor(W, H) { this.W = W; this.H = H; this.init(); }

  init() {
    this.x    = rand(0, this.W);
    this.y    = rand(0, this.H);
    const roll = Math.random();
    this.bright  = roll < 0.035;
    this.medium  = !this.bright && roll < 0.16;
    this.r       = this.bright  ? rand(1.8, 3.2)
                 : this.medium  ? rand(0.9, 1.7)
                 :                rand(0.25, 0.85);
    this.baseA   = this.bright  ? rand(0.72, 1.0)
                 : this.medium  ? rand(0.35, 0.72)
                 :                rand(0.15, 0.55);
    this.alpha   = this.baseA;
    /* multi-harmonic twinkling — feels organic */
    this.f1      = rand(0.18, 1.1);   // primary frequency Hz
    this.f2      = this.f1 * rand(1.8, 3.1); // overtone
    this.phi1    = rand(0, TAU);
    this.phi2    = rand(0, TAU);
    this.depth   = rand(0.35, 0.72);  // twinkling depth (fraction of baseA)
    this.color   = PALETTE[Math.floor(rand(0, PALETTE.length))];
    this.glowR   = this.r * (this.bright ? 9 : 3.5);
  }

  update(t) {
    const wave = (Math.sin(TAU * this.f1 * t + this.phi1)
                + Math.sin(TAU * this.f2 * t + this.phi2) * 0.45) / 1.45;
    this.alpha = clamp(this.baseA * (1 - this.depth * 0.5 + wave * this.depth * 0.5), 0.02, 1);
  }

  draw(ctx) {
    const [r, g, b] = this.color;
    const a = this.alpha;
    ctx.save();

    if (this.bright) {
      /* ── outer halo ──────────────────────────────── */
      const halo = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowR);
      halo.addColorStop(0,   `rgba(${r},${g},${b},${(a * 0.55).toFixed(3)})`);
      halo.addColorStop(0.4, `rgba(${r},${g},${b},${(a * 0.18).toFixed(3)})`);
      halo.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.glowR, 0, TAU);
      ctx.fill();

      /* ── diffraction spikes ───────────────────────── */
      const sp = this.r * 7 * a;
      ctx.globalAlpha = a * 0.45;
      ctx.strokeStyle = `rgba(${r},${g},${b},1)`;
      ctx.lineWidth   = 0.6;
      ctx.beginPath();
      ctx.moveTo(this.x - sp, this.y); ctx.lineTo(this.x + sp, this.y);
      ctx.moveTo(this.x, this.y - sp); ctx.lineTo(this.x, this.y + sp);
      /* diagonal mini-spikes */
      const ds = sp * 0.5;
      ctx.moveTo(this.x - ds, this.y - ds); ctx.lineTo(this.x + ds, this.y + ds);
      ctx.moveTo(this.x + ds, this.y - ds); ctx.lineTo(this.x - ds, this.y + ds);
      ctx.stroke();
    }

    /* ── core dot ──────────────────────────────────── */
    ctx.globalAlpha = a;
    ctx.fillStyle   = `rgba(${r},${g},${b},1)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.fill();

    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ShootingStar
   ══════════════════════════════════════════════════════════════════════════ */
class ShootingStar {
  constructor(W, H, delayOffset = 0) {
    this.W = W; this.H = H;
    this.reset(delayOffset);
  }

  reset(extraDelay = 0) {
    this.x      = rand(this.W * 0.05, this.W * 0.75);
    this.y      = rand(0, this.H * 0.42);
    this.angle  = rand(28, 52) * (Math.PI / 180);
    this.speed  = rand(500, 1100);          // px/s
    this.trailL = rand(90, 240);            // max trail px
    this.life   = 0;
    this.maxL   = this.trailL / this.speed + rand(0.08, 0.3);
    this.delay  = rand(2, 20) + extraDelay;
    this.alive  = false;
    this.hx = this.x; this.hy = this.y;
    this.tx = this.x; this.ty = this.y;
  }

  update(dt) {
    if (this.delay > 0) { this.delay -= dt; return; }
    this.alive = true;
    this.life += dt;
    if (this.life > this.maxL) { this.reset(); return; }

    const p = this.life / this.maxL;
    this.alpha = p < 0.08 ? p / 0.08
               : p > 0.65 ? clamp((1 - p) / 0.35, 0, 1)
               : 1;

    const dist  = this.speed * this.life;
    this.hx = this.x + Math.cos(this.angle) * dist;
    this.hy = this.y + Math.sin(this.angle) * dist;
    const tLen  = Math.min(this.trailL, dist);
    this.tx = this.hx - Math.cos(this.angle) * tLen;
    this.ty = this.hy - Math.sin(this.angle) * tLen;
  }

  draw(ctx) {
    if (!this.alive || this.delay > 0) return;
    ctx.save();

    /* trail gradient */
    const g = ctx.createLinearGradient(this.tx, this.ty, this.hx, this.hy);
    g.addColorStop(0,    `rgba(255,255,255,0)`);
    g.addColorStop(0.55, `rgba(196,181,253,${(this.alpha * 0.55).toFixed(3)})`);
    g.addColorStop(1,    `rgba(255,255,255,${this.alpha.toFixed(3)})`);
    ctx.strokeStyle = g;
    ctx.lineWidth   = 1.8;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(this.tx, this.ty);
    ctx.lineTo(this.hx, this.hy);
    ctx.stroke();

    /* head glow */
    const hg = ctx.createRadialGradient(this.hx, this.hy, 0, this.hx, this.hy, 7);
    hg.addColorStop(0, `rgba(255,255,255,${(this.alpha * 0.85).toFixed(3)})`);
    hg.addColorStop(1, `rgba(196,181,253,0)`);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(this.hx, this.hy, 7, 0, TAU);
    ctx.fill();

    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */
export default function StarField({ count = 320, shooterCount = 8, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let stars    = [];
    let shooters = [];
    let nebula   = null;   // offscreen nebula — drawn once, composited each frame
    let animId;
    let W = 0, H = 0;

    /* ── Build offscreen nebula ──────────────────────────────────────────── */
    function buildNebula(w, h) {
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const oc  = off.getContext('2d');
      const clouds = [
        { cx: 0.18, cy: 0.22, r: 0.42, cr: [139, 92, 246], a: 0.07  },
        { cx: 0.78, cy: 0.15, r: 0.35, cr: [99, 102, 241], a: 0.055 },
        { cx: 0.52, cy: 0.82, r: 0.38, cr: [217, 70, 239],  a: 0.048 },
        { cx: 0.92, cy: 0.60, r: 0.30, cr: [139, 92, 246], a: 0.042 },
        { cx: 0.06, cy: 0.68, r: 0.32, cr: [167, 139, 250], a: 0.045 },
        { cx: 0.40, cy: 0.38, r: 0.28, cr: [139, 92, 246], a: 0.030 },
      ];
      clouds.forEach(({ cx, cy, r, cr, a }) => {
        const radius = Math.min(w, h) * r;
        const grd = oc.createRadialGradient(cx*w, cy*h, 0, cx*w, cy*h, radius);
        grd.addColorStop(0,   `rgba(${cr[0]},${cr[1]},${cr[2]},${a})`);
        grd.addColorStop(0.5, `rgba(${cr[0]},${cr[1]},${cr[2]},${(a * 0.3).toFixed(4)})`);
        grd.addColorStop(1,   `rgba(${cr[0]},${cr[1]},${cr[2]},0)`);
        oc.fillStyle = grd;
        oc.fillRect(0, 0, w, h);
      });
      return off;
    }

    /* ── Resize ──────────────────────────────────────────────────────────── */
    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      stars    = Array.from({ length: count },       (_, i) => { const s = new Star(W, H); return s; });
      shooters = Array.from({ length: shooterCount }, (_, i) => new ShootingStar(W, H, i * 2.2));
      nebula   = buildNebula(W, H);
    }

    /* ── Animation loop ──────────────────────────────────────────────────── */
    let prevTs = 0;
    function frame(ts) {
      const t  = ts / 1000;
      const dt = prevTs ? clamp((ts - prevTs) / 1000, 0, 0.1) : 0.016;
      prevTs   = ts;

      ctx.clearRect(0, 0, W, H);

      /* nebula */
      ctx.globalAlpha = 1;
      ctx.drawImage(nebula, 0, 0);

      /* stars */
      stars.forEach(s => { s.update(t); s.draw(ctx); });

      /* shooters */
      shooters.forEach(s => { s.update(dt); s.draw(ctx); });

      animId = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [count, shooterCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        0,
        pointerEvents: 'none',
        display:       'block',
      }}
      className={className}
    />
  );
}
