import { type FormEvent, useEffect, useMemo, useState } from 'react';
import './styles/app.base.css';
import './styles/app.modern.css';
import { PortfolioAllocation } from './features/portfolio/PortfolioAllocation';
import type { PortfolioSummary } from './features/portfolio/types';
import { formatCurrency } from './shared/utils/format';

type Tab = 'collection' | 'portfolio';

type LoginFormState = {
  email: string;
  password: string;
};

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

type AuthResponse = {
  accessToken: string;
  user: SessionUser;
};

type CollectionItem = {
  id: string;
  cardId: string;
  name: string;
  quantity: number;
  finish: string;
  usd?: number | null;
  usdFoil?: number | null;
  setCode: string;
  collectorNumber: string;
  acquiredPrice?: number | null;
};

type CollectionResponse = {
  items: CollectionItem[];
  total: number;
  page: number;
  pageSize: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const NAV_TABS: Array<{ id: Tab; label: string; description: string }> = [
  { id: 'collection', label: 'Your Collection', description: 'Browse the cards you already own.' },
  { id: 'portfolio', label: 'Allocation Breakdown', description: 'See how your collection’s value is distributed.' },
];

function App() {
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('collection');

  const [collectionData, setCollectionData] = useState<CollectionResponse | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('');
  const [collectionFinishFilter, setCollectionFinishFilter] = useState<string>('ALL');

  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadCollection();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (activeTab === 'portfolio' && !portfolioSummary && !portfolioLoading) {
      void loadPortfolio();
    }
  }, [session, activeTab, portfolioSummary, portfolioLoading]);

  const handleInputChange =
    (field: keyof LoginFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    const endpoint = mode === 'login' ? 'login' : 'register';

    try {
      const response = await apiRequest<AuthResponse>(`/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSession(response.user);
      setMode('login');
      setActiveTab('collection');
      setForm({ email: '', password: '' });
      setPortfolioSummary(null);
      await loadCollection();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to process request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleDiscordLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/discord`;
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, false);
    } catch {
      // ignore logout errors
    } finally {
      setSession(null);
      setCollectionData(null);
      setPortfolioSummary(null);
      setActiveTab('collection');
    }
  };

  const loadCollection = async () => {
    setCollectionLoading(true);
    setCollectionError(null);
    try {
      const data = await apiRequest<CollectionResponse>('/collection?pageSize=100');
      setCollectionData(data);
    } catch (error) {
      setCollectionError(error instanceof Error ? error.message : 'Unable to load collection.');
    } finally {
      setCollectionLoading(false);
    }
  };

  const loadPortfolio = async () => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      const summary = await apiRequest<PortfolioSummary>('/portfolio/summary');
      setPortfolioSummary(summary);
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'Unable to load allocation breakdown.');
    } finally {
      setPortfolioLoading(false);
    }
  };

  const refreshSession = async () => {
    setLoadingSession(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      const payload: { authenticated: boolean; user?: SessionUser } = await response.json();
      if (payload.authenticated && payload.user) {
        setSession(payload.user);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  };

  const finishOptions = useMemo(() => {
    if (!collectionData?.items) return [] as string[];
    return Array.from(new Set(collectionData.items.map((item) => item.finish))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [collectionData]);

  const filteredCollectionItems = useMemo(() => {
    if (!collectionData?.items) return [] as CollectionItem[];
    const term = collectionSearchTerm.trim().toLowerCase();

    return collectionData.items.filter((item) => {
      const matchesTerm =
        term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        item.setCode.toLowerCase().includes(term) ||
        item.collectorNumber.toLowerCase().includes(term);
      const matchesFinish = collectionFinishFilter === 'ALL' || item.finish === collectionFinishFilter;
      return matchesTerm && matchesFinish;
    });
  }, [collectionData, collectionSearchTerm, collectionFinishFilter]);

  const collectionValue = useMemo(() => {
    if (!filteredCollectionItems.length) {
      return { total: 0, unique: 0 };
    }
    const total = filteredCollectionItems.reduce((sum, item) => {
      const price = resolveMarketPrice(item);
      return sum + price * item.quantity;
    }, 0);
    return { total: Number(total.toFixed(2)), unique: filteredCollectionItems.length };
  }, [filteredCollectionItems]);

  if (loadingSession) {
    return (
      <div className="app-shell">
        <p className="muted">Loading MTG Portfolio…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell">
        <div className="auth-wrapper">
          <div className="auth-card">
            <div className="auth-brand">
              <span className="badge">MTG Portfolio</span>
              <h1>Sign in to manage your cards.</h1>
              <p>Built for collectors who want clarity without the noise.</p>
            </div>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleInputChange('email')}
                autoComplete="email"
                required
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password123!"
                value={form.password}
                onChange={handleInputChange('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />

              {authError ? <p className="panel error">{authError}</p> : null}

              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <p className="auth-switch">
                {mode === 'login' ? 'Need an account?' : 'Already registered?'}{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setAuthError(null);
                  }}
                >
                  {mode === 'login' ? 'Create one' : 'Sign in instead'}
                </button>
              </p>

              {mode === 'login' ? (
                <>
                  <div className="oauth-divider">
                    <span />
                    <p>or continue with</p>
                    <span />
                  </div>
                  <div className="oauth-buttons">
                    <button type="button" onClick={handleGoogleLogin}>
                      <span aria-hidden>🔮</span> Google
                    </button>
                    <button type="button" onClick={handleDiscordLogin}>
                      <span aria-hidden>🪄</span> Discord
                    </button>
                  </div>
                </>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="header-top">
            <div className="brand">
              <h1>MTG Portfolio</h1>
              <span className="muted">Hi {session.email}</span>
            </div>
            <button type="button" className="ghost-button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
          <nav className="nav-tabs">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <small>{tab.description}</small>
              </button>
            ))}
          </nav>
        </header>

        <main className="dashboard-body">
          {activeTab === 'collection' ? (
            <section className="dashboard-section">
              <div className="section-toolbar collection-toolbar">
                <div className="stat-card">
                  <p>Portfolio Value</p>
                  <h3>{formatCurrency(collectionValue.total)}</h3>
                  <span>{collectionValue.unique} cards shown</span>
                </div>
                <div className="collection-actions">
                  <input
                    type="search"
                    placeholder="Search by card, set, or collector #"
                    value={collectionSearchTerm}
                    onChange={(event) => setCollectionSearchTerm(event.target.value)}
                    aria-label="Search your collection"
                  />
                  <select
                    value={collectionFinishFilter}
                    onChange={(event) => setCollectionFinishFilter(event.target.value)}
                    aria-label="Filter by finish"
                  >
                    <option value="ALL">All finishes</option>
                    {finishOptions.map((finish) => (
                      <option key={finish} value={finish}>
                        {finish === 'NONFOIL'
                          ? 'Non-foil'
                          : finish
                              .split('_')
                              .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                              .join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {collectionLoading ? (
                <div className="panel muted">Loading your collection…</div>
              ) : collectionError ? (
                <div className="panel error">{collectionError}</div>
              ) : filteredCollectionItems.length > 0 ? (
                <div className="panel overflow">
                  <table className="collection-table">
                    <thead>
                      <tr>
                        <th>Card</th>
                        <th>Qty</th>
                        <th>Finish</th>
                        <th>Market price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCollectionItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="card-cell">
                              {item.imageSmall ? (
                                <img
                                  src={item.imageSmall}
                                  alt={item.name}
                                  loading="lazy"
                                  decoding="async"
                                  width={80}
                                  height={112}
                                />
                              ) : (
                                <span className="card-placeholder">{item.name.slice(0, 2).toUpperCase()}</span>
                              )}
                              <div>
                                <strong>{item.name}</strong>
                                <small>{item.setCode.toUpperCase()} · #{item.collectorNumber}</small>
                                {item.acquiredPrice != null ? (
                                  <span className="muted">Cost basis {formatCurrency(item.acquiredPrice)}</span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td>{item.quantity}</td>
                          <td>{item.finish}</td>
                          <td>{formatCurrency(resolveMarketPrice(item))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : collectionData && collectionData.items.length > 0 ? (
                <div className="panel muted empty-state">
                  <h3>No cards match your filters.</h3>
                  <p>Try a different search term or reset the finish filter.</p>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setCollectionSearchTerm('');
                      setCollectionFinishFilter('ALL');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="panel muted empty-state">
                  <h3>Your collection is empty.</h3>
                  <p>Use the backend import tools to seed data, then refresh this page.</p>
                  <button type="button" className="ghost-button" onClick={() => void loadCollection()}>
                    Refresh
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="dashboard-section">
              <PortfolioAllocation
                summary={portfolioSummary}
                loading={portfolioLoading}
                error={portfolioError}
                onRetry={() => {
                  setPortfolioSummary(null);
                  void loadPortfolio();
                }}
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

function resolveMarketPrice(item: CollectionItem): number {
  if (item.usdFoil != null && item.finish === 'FOIL') {
    return Number(item.usdFoil) || 0;
  }
  if (item.usd != null) {
    return Number(item.usd) || 0;
  }
  return 0;
}

async function apiRequest<T>(path: string, init?: RequestInit, parseJson = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Request failed.';
    if (parseJson) {
      const errorBody = await response.json().catch(() => null);
      if (errorBody && typeof errorBody === 'object' && 'message' in errorBody) {
        message = String(errorBody.message);
      }
    }
    throw new Error(message);
  }

  if (!parseJson) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
