import { act, render, screen } from '@testing-library/react';
import { clearSession, setSession } from '../../../src/core/auth/session';
import { useSession } from '../../../src/core/auth/useSession';

function WhoIsIn() {
  const session = useSession();
  return <p>{session ? session.user.name : 'Sin sesión'}</p>;
}

describe('useSession', () => {
  it('re-renders when the session starts and when it ends', () => {
    render(<WhoIsIn />);
    expect(screen.getByText('Sin sesión')).toBeInTheDocument();

    act(() =>
      setSession({
        accessToken: 't',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        user: { id: 'u-1', name: 'José Muñoz', email: 'jose@example.co', role: 'BUYER' },
      }),
    );
    expect(screen.getByText('José Muñoz')).toBeInTheDocument();

    act(() => clearSession());
    expect(screen.getByText('Sin sesión')).toBeInTheDocument();
  });
});
