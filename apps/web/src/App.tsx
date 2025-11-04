import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import './App.css';

type Tab = 'collection' | 'portfolio' | 'marketplace';

type LoginFormState = {
  email: string;
  password: string;
};

type AuthResponse = {
  accessToken: string;
  user: SessionUser;
};

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
};

type CollectionItem = {
  id: string;
  cardId: string;
  name: string;
  quantity: number;
  finish: string;
  condition: string;
  language: string;
  location?: string;
  imageSmall?: string;
  usd?: number;
  usdFoil?: number;
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

type CatalogCard = {
  id: string;
  name: string;
  set: string;
  collectorNumber: string;
  imageSmall?: string;
};

type PortfolioSummary = {
  totals: {
    currentValue: number;
    costBasis: number;
    unrealizedGain: number;
    gainPercentage: number | null;
  };
  distributionBySet: Array<{
    setCode: string;
    totalValue: number;
    percentage: number;
  }>;
  topHoldings: PortfolioHolding[];
  movers: {
    gainers: PortfolioMover[];
    losers: PortfolioMover[];
  };
  lastUpdated: string;
};

type PortfolioHolding = {
  id: string;
  cardId: string;
  name: string;
  setCode: string;
  quantity: number;
  finish: string;
  imageSmall?: string;
  unitPrice: number;
  totalValue: number;
};

type PortfolioMover = PortfolioHolding & {
  costBasis: number;
  gain: number;
  gainPerUnit: number;
  gainPercentage: number;
};

type MarketplaceListing = {
  id: string;
  ownerId: string;
  type: 'BUY' | 'SELL';
  cardId: string | null;
  cardName: string;
  setCode: string | null;
  condition: string | null;
  quantity: number;
  price: number | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  seller: {
    email: string;
  };
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const NAV_TABS: Array<{ id: Tab; label: string; description: string }> = [
  { id: 'collection', label: 'Your Collection', description: 'Manage, import, and export your library.' },
  { id: 'portfolio', label: 'Portfolio Breakdown', description: 'Understand value, trends, and exposure.' },
  { id: 'marketplace', label: 'Buy / Sell', description: 'List cards and connect with other collectors.' },
];

const defaultAddForm = {
  quantity: 1,
  finish: 'NONFOIL',
  condition: 'NM',
  acquiredPrice: '',
};

function App() {
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('collection');

  const [collectionData, setCollectionData] = useState<CollectionResponse | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CatalogCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);
  const [addForm, setAddForm] = useState(defaultAddForm);
  const [importPayload, setImportPayload] = useState('');
  const [importing, setImporting] = useState(false);

  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingForm, setListingForm] = useState({
    type: 'SELL' as 'BUY' | 'SELL',
    cardName: '',
    cardId: '',
    setCode: '',
    condition: '',
    quantity: 1,
    price: '',
    notes: '',
  });
  const [showMineOnly, setShowMineOnly] = useState(false);

  const handleInputChange =
    (field: keyof LoginFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  useEffect(() => {
    void refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session) {
      resetDashboardState();
      return;
    }
    if (activeTab === 'collection') {
      void loadCollection();
    } else if (activeTab === 'portfolio') {
      void loadPortfolio();
    } else if (activeTab === 'marketplace') {
      void loadMarketplace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, activeTab, showMineOnly]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setToast(mode === 'login' ? 'Signing you in…' : 'Creating your account…');

    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const response = await apiRequest<AuthResponse>(`/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSession(response.user);
      setToast(mode === 'login' ? `Welcome back, ${response.user.email}` : `Account created for ${response.user.email}`);
      setMode('login');
      setActiveTab('collection');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to process request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, false);
    } catch (error) {
      console.error(error);
    } finally {
      setSession(null);
      setToast('Signed out successfully.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleDiscordLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/discord`;
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
      setPortfolioError(error instanceof Error ? error.message : 'Unable to load portfolio summary.');
    } finally {
      setPortfolioLoading(false);
    }
  };

  const loadMarketplace = async () => {
    setMarketplaceLoading(true);
    setMarketplaceError(null);
    try {
      const params = new URLSearchParams({
        pageSize: '50',
      });
      if (showMineOnly) {
        params.set('mine', 'true');
      }
      const data = await apiRequest<{ items: MarketplaceListing[] }>('/marketplace/listings?' + params.toString());
      setMarketplaceListings(data.items);
    } catch (error) {
      setMarketplaceError(error instanceof Error ? error.message : 'Unable to load marketplace listings.');
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const handleSearchCards = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      return;
    }
    setSearchLoading(true);
    try {
      const response = await apiRequest<{ items: CatalogCard[] }>(
        `/catalog/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      setSearchResults(response.items ?? []);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to search catalog.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCard) return;
    const payload = {
      cardId: selectedCard.id,
      quantity: addForm.quantity,
      finish: addForm.finish,
      condition: addForm.condition,
      acquiredPrice: addForm.acquiredPrice ? Number.parseFloat(addForm.acquiredPrice) : undefined,
    };
    try {
      await apiRequest('/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setToast(`Added ${addForm.quantity} × ${selectedCard.name} to your collection.`);
      setShowAddModal(false);
      setSelectedCard(null);
      setAddForm(defaultAddForm);
      setSearchResults([]);
      setSearchQuery('');
      await loadCollection();
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to add card.');
    }
  };

  const handleImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!importPayload.trim()) return;
    setImporting(true);
    try {
      await apiRequest('/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'auto', payload: importPayload }),
      });
      setToast('Import complete. Your collection has been updated.');
      setShowImportModal(false);
      setImportPayload('');
      await loadCollection();
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to import data.');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format: 'csv' | 'moxfield') => {
    try {
      const response = await fetch(`${API_BASE_URL}/collection/export?format=${format}&includePrices=true`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Export failed.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = format === 'csv' ? 'mtg-portfolio.csv' : 'mtg-portfolio.moxfield.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast(format === 'csv' ? 'Exported portfolio as CSV.' : 'Exported portfolio for Moxfield.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to export collection.');
    }
  };

  const handleCreateListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = {
      type: listingForm.type,
      cardName: listingForm.cardName,
      cardId: listingForm.cardId || undefined,
      setCode: listingForm.setCode || undefined,
      condition: listingForm.condition || undefined,
      quantity: listingForm.quantity,
      price: listingForm.price ? Number.parseFloat(listingForm.price) : undefined,
      notes: listingForm.notes || undefined,
    };
    try {
      await apiRequest('/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setToast('Listing published to the marketplace.');
      setShowListingModal(false);
      setListingForm({
        type: 'SELL',
        cardName: '',
        cardId: '',
        setCode: '',
        condition: '',
        quantity: 1,
        price: '',
        notes: '',
      });
      await loadMarketplace();
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to create listing.');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await apiRequest(`/marketplace/listings/${listingId}`, {
        method: 'DELETE',
      });
      setToast('Listing removed.');
      await loadMarketplace();
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to remove listing.');
    }
  };

  const collectionValue = useMemo(() => {
    if (!collectionData?.items) return { total: 0, unique: 0 };
    const total = collectionData.items.reduce((sum, item) => {
      const price = resolveMarketPrice(item);
      return sum + price * item.quantity;
    }, 0);
    return { total: Number(total.toFixed(2)), unique: collectionData.items.length };
  }, [collectionData]);

  const renderLoginView = () => (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="badge">MTG Portfolio</span>
          <h1>Command your collection.</h1>
          <p>Track value, analyze trends, and trade with confidence.</p>
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
                setToast(null);
              }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in instead'}
            </button>
          </p>

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
        </form>
      </div>
    </div>
  );

  const renderCollectionTab = () => (
    <div className="dashboard-section">
      <div className="section-toolbar">
        <div className="stat-card">
          <p>Total Portfolio Value</p>
          <h3>{formatCurrency(collectionValue.total)}</h3>
          <span>{collectionValue.unique} unique cards</span>
        </div>
        <div className="dropdown">
          <button
            type="button"
            className="primary-button"
            onClick={() => setCollectionMenuOpen((previous) => !previous)}
          >
            Manage Collection ▾
          </button>
          {collectionMenuOpen && (
            <div className="dropdown-menu" role="menu">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(true);
                  setCollectionMenuOpen(false);
                }}
              >
                Add card
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(true);
                  setCollectionMenuOpen(false);
                }}
              >
                Import bulk list
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectionMenuOpen(false);
                  void handleExport('csv');
                }}
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectionMenuOpen(false);
                  void handleExport('moxfield');
                }}
              >
                Export for Moxfield
              </button>
            </div>
          )}
        </div>
      </div>

      {collectionLoading ? (
        <div className="panel muted">Loading your library…</div>
      ) : collectionError ? (
        <div className="panel error">{collectionError}</div>
      ) : collectionData && collectionData.items.length > 0 ? (
        <div className="collection-grid">
          {collectionData.items.map((item) => (
            <article key={item.id} className="collection-card">
              <div className="card-thumb">
                {item.imageSmall ? (
                  <img src={item.imageSmall} alt={item.name} />
                ) : (
                  <span className="placeholder-art">{item.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="card-body">
                <header>
                  <h3>{item.name}</h3>
                  <span>{item.setCode.toUpperCase()} · #{item.collectorNumber}</span>
                </header>
                <dl className="card-meta">
                  <div>
                    <dt>Quantity</dt>
                    <dd>{item.quantity}</dd>
                  </div>
                  <div>
                    <dt>Finish</dt>
                    <dd>{item.finish}</dd>
                  </div>
                  <div>
                    <dt>Condition</dt>
                    <dd>{item.condition}</dd>
                  </div>
                  <div>
                    <dt>Unit value</dt>
                    <dd>{formatCurrency(resolveMarketPrice(item))}</dd>
                  </div>
                </dl>
                {item.acquiredPrice ? (
                  <footer>
                    <span>Cost basis</span>
                    <strong>{formatCurrency(item.acquiredPrice)}</strong>
                  </footer>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel muted empty-state">
          <h3>Start cataloguing your collection today!</h3>
          <p>
            Add your first card or import an existing list to begin tracking value and trends across your entire
            portfolio.
          </p>
          <button type="button" className="primary-button" onClick={() => setShowAddModal(true)}>
            Add your first card
          </button>
        </div>
      )}
    </div>
  );

  const renderPortfolioTab = () => (
    <div className="dashboard-section">
      {portfolioLoading ? (
        <div className="panel muted">Refreshing market data…</div>
      ) : portfolioError ? (
        <div className="panel error">{portfolioError}</div>
      ) : portfolioSummary ? (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <p>Current value</p>
              <h3>{formatCurrency(portfolioSummary.totals.currentValue)}</h3>
            </div>
            <div className="summary-card">
              <p>Cost basis</p>
              <h3>{formatCurrency(portfolioSummary.totals.costBasis)}</h3>
            </div>
            <div className="summary-card">
              <p>Unrealized gain</p>
              <h3 className={portfolioSummary.totals.unrealizedGain >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(portfolioSummary.totals.unrealizedGain)}
              </h3>
              <span>
                {portfolioSummary.totals.gainPercentage !== null
                  ? `${portfolioSummary.totals.gainPercentage.toFixed(2)}%`
                  : '—'}
              </span>
            </div>
            <div className="summary-card">
              <p>Last updated</p>
              <h4>{new Date(portfolioSummary.lastUpdated).toLocaleString()}</h4>
            </div>
          </div>

          <div className="section-split">
            <section>
              <header className="section-header">
                <h3>Allocation by set</h3>
              </header>
              {portfolioSummary.distributionBySet.length === 0 ? (
                <p className="muted">No value data yet.</p>
              ) : (
                <ul className="distribution-list">
                  {portfolioSummary.distributionBySet.map((item) => (
                    <li key={item.setCode}>
                      <div className="distribution-bar">
                        <span style={{ width: `${item.percentage}%` }} />
                      </div>
                      <div className="distribution-meta">
                        <strong>{item.setCode.toUpperCase()}</strong>
                        <span>{formatCurrency(item.totalValue)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <header className="section-header">
                <h3>Top holdings</h3>
              </header>
              <ul className="holding-list">
                {portfolioSummary.topHoldings.map((holding) => (
                  <li key={holding.id}>
                    <div>
                      <strong>{holding.name}</strong>
                      <small>{holding.quantity} × {formatCurrency(holding.unitPrice)}</small>
                    </div>
                    <span>{formatCurrency(holding.totalValue)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="section-split movers">
            <section>
              <header className="section-header">
                <h3>Top gainers</h3>
              </header>
              {portfolioSummary.movers.gainers.length === 0 ? (
                <p className="muted">Add cost basis to track gains.</p>
              ) : (
                <ul className="holding-list">
                  {portfolioSummary.movers.gainers.map((mover) => (
                    <li key={mover.id}>
                      <div>
                        <strong>{mover.name}</strong>
                        <small>{formatCurrency(mover.gainPerUnit)} / card</small>
                      </div>
                      <span className="positive">
                        +{formatCurrency(mover.gain)} ({mover.gainPercentage.toFixed(2)}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <header className="section-header">
                <h3>Top decliners</h3>
              </header>
              {portfolioSummary.movers.losers.length === 0 ? (
                <p className="muted">No losses recorded yet.</p>
              ) : (
                <ul className="holding-list">
                  {portfolioSummary.movers.losers.map((mover) => (
                    <li key={mover.id}>
                      <div>
                        <strong>{mover.name}</strong>
                        <small>{formatCurrency(mover.gainPerUnit)} / card</small>
                      </div>
                      <span className="negative">
                        {formatCurrency(mover.gain)} ({mover.gainPercentage.toFixed(2)}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : (
        <div className="panel muted">Add cards to your collection to unlock portfolio analytics.</div>
      )}
    </div>
  );

  const renderMarketplaceTab = () => (
    <div className="dashboard-section">
      <div className="section-toolbar marketplace-toolbar">
        <button type="button" className="primary-button" onClick={() => setShowListingModal(true)}>
          New listing
        </button>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showMineOnly}
            onChange={(event) => setShowMineOnly(event.target.checked)}
          />
          <span>Show my listings only</span>
        </label>
      </div>

      {marketplaceLoading ? (
        <div className="panel muted">Loading the marketplace…</div>
      ) : marketplaceError ? (
        <div className="panel error">{marketplaceError}</div>
      ) : marketplaceListings.length === 0 ? (
        <div className="panel muted empty-state">
          <h3>No listings yet.</h3>
          <p>Be the first to post a buy or sell offer to the MTG Portfolio marketplace.</p>
          <button type="button" className="primary-button" onClick={() => setShowListingModal(true)}>
            Create a listing
          </button>
        </div>
      ) : (
        <div className="listing-grid">
          {marketplaceListings.map((listing) => (
            <article key={listing.id} className="listing-card">
              <header>
                <span className={`chip ${listing.type === 'SELL' ? 'sell' : 'buy'}`}>
                  {listing.type === 'SELL' ? 'For sale' : 'Buying'}
                </span>
                <h3>{listing.cardName}</h3>
                {listing.setCode ? <small>{listing.setCode.toUpperCase()}</small> : null}
              </header>
              <dl>
                <div>
                  <dt>Quantity</dt>
                  <dd>{listing.quantity}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>{listing.price != null ? formatCurrency(listing.price) : 'Offer'}</dd>
                </div>
                {listing.condition ? (
                  <div>
                    <dt>Condition</dt>
                    <dd>{listing.condition}</dd>
                  </div>
                ) : null}
              </dl>
              {listing.notes ? <p className="listing-notes">{listing.notes}</p> : null}
              <footer>
                <span className="muted">Seller · {listing.seller.email}</span>
                {session?.id === listing.ownerId ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleDeleteListing(listing.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="brand">
          <span className="badge">MTG Portfolio</span>
          <h1>Command Center</h1>
        </div>
        <nav className="nav-tabs">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              className={tab.id === activeTab ? 'active' : ''}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </nav>
        <div className="user-chip">
          <div>
            <strong>{session?.name ?? session?.email}</strong>
            <span>{session?.email}</span>
          </div>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="dashboard-body">
        {activeTab === 'collection' && renderCollectionTab()}
        {activeTab === 'portfolio' && renderPortfolioTab()}
        {activeTab === 'marketplace' && renderMarketplaceTab()}
      </section>
    </div>
  );

  return (
    <div className="app-shell">
      {loadingSession ? <div className="panel muted">Checking your session…</div> : session ? renderDashboard() : renderLoginView()}

      {toast ? (
        <div className="toast" role="status">
          <p>{toast}</p>
          <button type="button" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      ) : null}

      {showAddModal ? (
        <Modal title="Add to collection" onClose={() => closeAddModal()}>
          <form className="stack" onSubmit={handleSearchCards}>
            <label htmlFor="search">Search the catalog</label>
            <div className="search-row">
              <input
                id="search"
                type="text"
                placeholder="Card name"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button type="submit" className="primary-button" disabled={searchLoading}>
                {searchLoading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>

          {selectedCard ? (
            <form className="stack" onSubmit={handleAddCard}>
              <div className="selected-card">
                <strong>{selectedCard.name}</strong>
                <span>{selectedCard.set.toUpperCase()} · #{selectedCard.collectorNumber}</span>
              </div>
              <div className="form-grid">
                <label>
                  Quantity
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={addForm.quantity}
                    onChange={(event) =>
                      setAddForm((previous) => ({ ...previous, quantity: Number.parseInt(event.target.value, 10) || 1 }))
                    }
                  />
                </label>
                <label>
                  Finish
                  <select
                    value={addForm.finish}
                    onChange={(event) => setAddForm((previous) => ({ ...previous, finish: event.target.value }))}
                  >
                    <option value="NONFOIL">Non-foil</option>
                    <option value="FOIL">Foil</option>
                    <option value="ETCHED">Etched</option>
                  </select>
                </label>
                <label>
                  Condition
                  <select
                    value={addForm.condition}
                    onChange={(event) => setAddForm((previous) => ({ ...previous, condition: event.target.value }))}
                  >
                    <option value="NM">Near Mint</option>
                    <option value="LP">Lightly Played</option>
                    <option value="MP">Moderately Played</option>
                    <option value="HP">Heavily Played</option>
                    <option value="DMG">Damaged</option>
                  </select>
                </label>
                <label>
                  Cost basis (optional)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={addForm.acquiredPrice}
                    onChange={(event) => setAddForm((previous) => ({ ...previous, acquiredPrice: event.target.value }))}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="primary-button">
                  Add to collection
                </button>
                <button type="button" className="ghost-button" onClick={() => setSelectedCard(null)}>
                  Choose a different card
                </button>
              </div>
            </form>
          ) : (
            <div className="search-results">
              {searchResults.length === 0 && !searchLoading ? (
                <p className="muted">Search for a card by name to add it to your collection.</p>
              ) : (
                searchResults.map((card) => (
                  <button
                    type="button"
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="search-result"
                  >
                    <strong>{card.name}</strong>
                    <span>{card.set.toUpperCase()} · #{card.collectorNumber}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </Modal>
      ) : null}

      {showImportModal ? (
        <Modal title="Bulk import" onClose={() => closeImportModal()}>
          <form className="stack" onSubmit={handleImport}>
            <p className="muted">
              Paste a plain text list (one card per line). We support arena, Moxfield, and Scryfall exports.
            </p>
            <textarea
              rows={8}
              placeholder="3 Stormchaser's Talent (BLB) 75"
              value={importPayload}
              onChange={(event) => setImportPayload(event.target.value)}
            />
            <div className="modal-actions">
              <button type="submit" className="primary-button" disabled={importing}>
                {importing ? 'Importing…' : 'Import'}
              </button>
              <button type="button" className="ghost-button" onClick={() => closeImportModal()}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showListingModal ? (
        <Modal title="New marketplace listing" onClose={() => closeListingModal()}>
          <form className="stack" onSubmit={handleCreateListing}>
            <div className="form-grid">
              <label>
                Listing type
                <select
                  value={listingForm.type}
                  onChange={(event) =>
                    setListingForm((previous) => ({ ...previous, type: event.target.value as 'BUY' | 'SELL' }))
                  }
                >
                  <option value="SELL">Sell</option>
                  <option value="BUY">Buy</option>
                </select>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={listingForm.quantity}
                  onChange={(event) =>
                    setListingForm((previous) => ({
                      ...previous,
                      quantity: Number.parseInt(event.target.value, 10) || 1,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Price (optional)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={listingForm.price}
                  onChange={(event) => setListingForm((previous) => ({ ...previous, price: event.target.value }))}
                />
              </label>
              <label>
                Condition (optional)
                <input
                  type="text"
                  value={listingForm.condition}
                  onChange={(event) => setListingForm((previous) => ({ ...previous, condition: event.target.value }))}
                />
              </label>
            </div>
            <label>
              Card name
              <input
                type="text"
                value={listingForm.cardName}
                onChange={(event) => setListingForm((previous) => ({ ...previous, cardName: event.target.value }))}
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Card ID (optional)
                <input
                  type="text"
                  value={listingForm.cardId}
                  onChange={(event) => setListingForm((previous) => ({ ...previous, cardId: event.target.value }))}
                />
              </label>
              <label>
                Set code (optional)
                <input
                  type="text"
                  value={listingForm.setCode}
                  onChange={(event) => setListingForm((previous) => ({ ...previous, setCode: event.target.value }))}
                />
              </label>
            </div>
            <label>
              Notes
              <textarea
                rows={3}
                value={listingForm.notes}
                onChange={(event) => setListingForm((previous) => ({ ...previous, notes: event.target.value }))}
              />
            </label>
            <div className="modal-actions">
              <button type="submit" className="primary-button">
                Publish listing
              </button>
              <button type="button" className="ghost-button" onClick={() => closeListingModal()}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );

  function closeAddModal() {
    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCard(null);
    setAddForm(defaultAddForm);
  }

  function closeImportModal() {
    setShowImportModal(false);
    setImportPayload('');
  }

  function closeListingModal() {
    setShowListingModal(false);
    setListingForm({
      type: 'SELL',
      cardName: '',
      cardId: '',
      setCode: '',
      condition: '',
      quantity: 1,
      price: '',
      notes: '',
    });
  }

  async function refreshSession() {
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
  }

  function resetDashboardState() {
    setActiveTab('collection');
    setCollectionData(null);
    setPortfolioSummary(null);
    setMarketplaceListings([]);
  }
}

function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header>
          <h2>{title}</h2>
          <button type="button" className="ghost-button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

async function apiRequest<T>(path: string, init: RequestInit = {}, parseJson = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const payload = await response.json();
      message = payload?.error?.message ?? payload?.message ?? JSON.stringify(payload);
    } catch {
      message = await response.text();
    }
    throw new Error(message || 'Request failed');
  }

  if (!parseJson) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

function resolveMarketPrice(item: Pick<CollectionItem, 'finish' | 'usd' | 'usdFoil'>): number {
  const finish = item.finish?.toUpperCase() ?? 'NONFOIL';
  const isFoil = finish === 'FOIL' || finish === 'ETCHED';
  const price = isFoil ? item.usdFoil ?? item.usd : item.usd ?? item.usdFoil;
  return price ?? 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default App;
