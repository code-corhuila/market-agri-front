import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Source: market-agri-docs 12-ux-ui/design-system.md, "Design tokens". The distributed interface
// reuses the monolith's values without changing any of them.
const DESIGN_SYSTEM_TOKENS: Record<string, string> = {
  '--color-primary': '#2e7d32',
  '--color-primary-hover': '#256428',
  '--color-primary-active': '#1e5321',
  '--color-primary-contrast': '#ffffff',
  '--color-primary-subtle': '#eaf3ea',
  '--color-bg': '#f6f7f5',
  '--color-surface': '#ffffff',
  '--color-surface-sunken': '#f0f2ef',
  '--color-border': '#e0e3dd',
  '--color-border-strong': '#c8ccc4',
  '--color-text': '#1b1e1a',
  '--color-text-muted': '#575d53',
  '--color-text-subtle': '#838a7d',
  '--color-success': '#2e7d32',
  '--color-success-bg': '#e7f4e8',
  '--color-warning': '#9a5b00',
  '--color-warning-bg': '#fdf1dd',
  '--color-danger': '#b3261e',
  '--color-danger-bg': '#fbe9e7',
  '--color-info': '#1f6feb',
  '--color-info-bg': '#e8f0fe',
  '--font-sans':
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  '--text-xs': '0.75rem',
  '--text-sm': '0.8125rem',
  '--text-base': '0.9375rem',
  '--text-lg': '1.125rem',
  '--text-xl': '1.375rem',
  '--text-2xl': '1.75rem',
  '--leading-tight': '1.25',
  '--leading-normal': '1.55',
  '--space-1': '0.25rem',
  '--space-2': '0.5rem',
  '--space-3': '0.75rem',
  '--space-4': '1rem',
  '--space-5': '1.5rem',
  '--space-6': '2rem',
  '--space-8': '3rem',
  '--radius-sm': '6px',
  '--radius-md': '10px',
  '--radius-lg': '14px',
  '--radius-full': '999px',
  '--shadow-sm': '0 1px 2px rgba(20, 30, 18, 0.06), 0 1px 3px rgba(20, 30, 18, 0.08)',
  '--shadow-md': '0 4px 12px rgba(20, 30, 18, 0.1)',
  '--container-max': '1080px',
  '--header-h': '56px',
};

// Prettier writes CSS strings with single quotes ("Segoe UI" → 'Segoe UI'): same value.
const sameQuotes = (value: string) => value.replaceAll('"', "'");

function declaredTokens(cssFile: string): Map<string, string> {
  const css = readFileSync(resolve(__dirname, '../../src/styles', cssFile), 'utf8');
  const tokens = new Map<string, string>();
  for (const [, name = '', value = ''] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(name, sameQuotes(value.trim()));
  }
  return tokens;
}

describe('design tokens', () => {
  it('declares every token of the design system with its exact value', () => {
    const tokens = declaredTokens('tokens.css');
    for (const [name, value] of Object.entries(DESIGN_SYSTEM_TOKENS)) {
      expect(tokens.get(name), name).toBe(sameQuotes(value));
    }
  });

  it('declares no token that the design system does not define', () => {
    const extra = [...declaredTokens('tokens.css').keys()].filter(
      (name) => !(name in DESIGN_SYSTEM_TOKENS),
    );
    expect(extra).toEqual([]);
  });
});

describe('index.html', () => {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

  it('declares Spanish as the page language', () => {
    expect(html).toMatch(/<html lang="es">/);
  });

  it('links the brand favicon', () => {
    expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon.svg" \/>/);
  });
});
