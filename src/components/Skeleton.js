import React from 'react';

/* ── Shimmer keyframe injected once ── */
const shimmerStyle = `
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;
let styleInjected = false;
function ensureStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement('style');
  el.textContent = shimmerStyle;
  document.head.appendChild(el);
}

const shimmer = {
  background: 'linear-gradient(90deg, #f0f2f8 25%, #e4e7f0 50%, #f0f2f8 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.6s ease infinite',
};

/* ── Primitives ── */
export function SkeletonLine({ width = '100%', height = 13, style = {} }) {
  ensureStyle();
  return (
    <div style={{ width, height, borderRadius: 6, ...shimmer, ...style }} />
  );
}

export function SkeletonAvatar({ size = 40, style = {} }) {
  ensureStyle();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, ...shimmer, ...style }} />
  );
}

export function SkeletonRect({ width = '100%', height = 120, radius = 12, style = {} }) {
  ensureStyle();
  return (
    <div style={{ width, height, borderRadius: radius, ...shimmer, ...style }} />
  );
}

/* ── Composite: Feed Post Card ── */
export function SkeletonPostCard() {
  ensureStyle();
  return (
    <div style={{
      background: 'white', border: '1px solid #edeff4', borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
        <SkeletonAvatar size={44} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonLine width="50%" height={12} />
          <SkeletonLine width="30%" height={10} />
        </div>
      </div>
      {/* Image */}
      <SkeletonRect height={200} radius={0} />
      {/* Content */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonLine width="85%" height={14} />
        <SkeletonLine width="70%" height={12} />
        <SkeletonLine width="55%" height={12} />
      </div>
      {/* Actions */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #edeff4', display: 'flex', gap: 12 }}>
        <SkeletonRect width={90} height={34} radius={8} />
        <SkeletonRect width={110} height={34} radius={8} />
      </div>
    </div>
  );
}

/* ── Composite: Table Row ── */
export function SkeletonTableRow({ cols = 5 }) {
  ensureStyle();
  return (
    <tr>
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          {i === 1
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SkeletonAvatar size={30} />
                <SkeletonLine width={90} height={11} />
              </div>
            : <SkeletonLine width={i === 0 ? 24 : '70%'} height={11} />
          }
        </td>
      ))}
    </tr>
  );
}

/* ── Composite: Book Card ── */
export function SkeletonBookCard() {
  ensureStyle();
  return (
    <div style={{ background: 'white', border: '1px solid #edeff4', borderRadius: 16, overflow: 'hidden' }}>
      <SkeletonRect height={180} radius={0} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonLine width="80%" height={13} />
        <SkeletonLine width="50%" height={11} />
        <SkeletonRect width="100%" height={34} radius={8} style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}

/* ── Composite: Stat Card ── */
export function SkeletonStatCard() {
  ensureStyle();
  return (
    <div style={{ background: 'white', border: '1px solid #edeff4', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SkeletonAvatar size={36} style={{ borderRadius: 8 }} />
      <SkeletonLine width="50%" height={24} style={{ marginTop: 4 }} />
      <SkeletonLine width="70%" height={11} />
    </div>
  );
}
