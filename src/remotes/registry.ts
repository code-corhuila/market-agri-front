import type { ComponentType } from 'react';
import type { Role } from '../core/auth/session';

export interface Portal {
  name: 'auth' | 'catalog' | 'transactions';
  /** Name for the person, used in the loading and "not available" notices. */
  title: string;
  /** Where the container mounts it; the portal owns every route below. */
  path: string;
  requiresSession: boolean;
  /** Downloads the portal only when its route opens (shareStrategy 'loaded-first'). */
  load: () => Promise<{ default: ComponentType }>;
}

/** The portals of this delivery (ADR-021). Their remoteEntry URLs live in vite.config.ts. */
export const PORTALS: Portal[] = [
  {
    name: 'auth',
    title: 'Inicio de sesión',
    path: '/login',
    requiresSession: false,
    load: () => import('auth/App'),
  },
  {
    name: 'catalog',
    title: 'Catálogo',
    path: '/catalogo',
    requiresSession: false,
    load: () => import('catalog/App'),
  },
  {
    name: 'transactions',
    title: 'Transacciones',
    path: '/transacciones',
    requiresSession: true,
    load: () => import('transactions/App'),
  },
];

export interface NavItem {
  to: string;
  label: string;
  /** Who sees it: a list of roles, 'anyone', or 'visitor' (only without a session). */
  audience: Role[] | 'anyone' | 'visitor';
}

/** Header navigation by role; each link opens a route of a portal. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/catalogo', label: 'Catálogo', audience: 'anyone' },
  { to: '/catalogo/mis-productos', label: 'Mis productos', audience: ['PRODUCER'] },
  { to: '/transacciones', label: 'Mis compras', audience: ['BUYER'] },
  { to: '/transacciones/ventas', label: 'Mis ventas', audience: ['PRODUCER'] },
  { to: '/transacciones/admin', label: 'Administración', audience: ['ADMIN'] },
  { to: '/login', label: 'Ingresar', audience: 'visitor' },
];

export function navItemsFor(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter(({ audience }) => {
    if (audience === 'anyone') return true;
    if (audience === 'visitor') return role === undefined;
    return role !== undefined && audience.includes(role);
  });
}
