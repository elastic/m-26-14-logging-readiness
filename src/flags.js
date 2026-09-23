// Build-time flags (Vite inlines import.meta.env.* at build time).
// DC-8 (LRA change review, 2026-09-18): the field-enablement pages are an
// internal surface. A build without VITE_ENABLEMENT=on ships no route to them.
export const ENABLEMENT_ON = import.meta.env.VITE_ENABLEMENT === 'on'
