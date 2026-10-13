import * as shellUi from '../../../src/shared/ui';

// What the portals import from `shell/ui` (ADR-021, design-system.md "Components"). The toast is
// used through the container's provider: a portal gets useToast, never a provider of its own.
describe('shell/ui', () => {
  it.each(['PageHeader', 'Breadcrumbs', 'ConfirmDialog', 'useToast'])('exposes %s', (name) => {
    expect(shellUi).toHaveProperty(name);
  });

  it('does not expose a second toast provider', () => {
    expect(shellUi).not.toHaveProperty('ToastProvider');
  });
});
