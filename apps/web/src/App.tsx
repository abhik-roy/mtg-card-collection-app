import { type FormEvent, useEffect, useState } from 'react';
import './App.css';

type LoginFormState = {
  email: string;
  password: string;
};

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    picture?: string | null;
  };
};

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

function App() {
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const handleChange = (field: keyof LoginFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const refreshSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setSession(null);
        return;
      }
      const data = await response.json();
      if (data.authenticated) {
        setSession(data.user);
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error(error);
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(mode === 'login' ? 'Signing in…' : 'Creating your account…');

    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (mode === 'register' && Array.isArray(payload?.message)) {
          const first = payload.message[0];
          if (typeof first === 'string' && first.toLowerCase().includes('password')) {
            throw new Error('Password must be at least 8 characters long.');
          }
        }
        throw new Error(payload?.message ?? 'Request failed');
      }

      const data: AuthResponse = await response.json();
      setSession(data.user);
      setMessage(mode === 'login' ? `Welcome back, ${data.user.email}` : `Account created for ${data.user.email}`);
      setMode('login');
    } catch (error) {
      const readable = error instanceof Error ? error.message : 'Unable to process request';
      setMessage(readable);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSession(null);
      setMessage('Signed out successfully.');
    }
  };

  return (
    <main className="page">
      <section className="panel">
        <header className="panel__header">
          <span className="panel__badge">MTG Collection</span>
          <h1 className="panel__title">Welcome back</h1>
          <p className="panel__subtitle">
            Sign in to manage your collection, build decks, and keep an eye on price alerts.
          </p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="form__label" htmlFor="email">
            Email
          </label>
          <input
            className="form__input"
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange('email')}
            required
          />

          <label className="form__label" htmlFor="password">
            Password
          </label>
          <input
            className="form__input"
            id="password"
            name="password"
            type="password"
            placeholder="Password123!"
            value={form.password}
            onChange={handleChange('password')}
            required
          />

          <button className="form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <p className="auth-toggle">
            {mode === 'login' ? (
              <>
                Need an account?{' '}
                <button
                  type="button"
                  className="auth-toggle__button"
                  onClick={() => {
                    setMode('register');
                    setMessage(null);
                  }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already registered?{' '}
                <button
                  type="button"
                  className="auth-toggle__button"
                  onClick={() => {
                    setMode('login');
                    setMessage(null);
                  }}
                >
                  Sign in instead
                </button>
              </>
            )}
          </p>
        </form>

        <div className="divider">
          <span className="divider__line" />
          <span className="divider__label">or</span>
          <span className="divider__line" />
        </div>

        <button className="google-button" type="button" onClick={handleGoogleLogin}>
          <span aria-hidden>🔒</span> Continue with Google
        </button>

        {message && <p className="status">{message}</p>}

        {!loadingSession && session && (
          <div className="session">
            <p className="session__title">Signed in as</p>
            <div>
              <strong>{session.name ?? session.email}</strong>
              <div>{session.email}</div>
            </div>
            <button className="auth-toggle__button" type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        )}
      </section>

      <aside className="hero">
        <div className="hero__content">
          <h2>Track every card.</h2>
          <p>
            Sync your decks with your collection, monitor price alerts, and build the perfect list for your next FNM.
          </p>
        </div>
      </aside>
    </main>
  );
}

export default App;
