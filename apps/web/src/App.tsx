import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
  imageNormal?: string;
  usd?: number;
  usdFoil?: number;
};

type CatalogApiItem = {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  image_uris?: {
    small?: string;
    normal?: string;
  };
  prices?: {
    usd?: number | string;
    usd_foil?: number | string;
  };
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
  language: 'en',
  acquiredPrice: '',
};

const BINDER_PAGE_SIZE = 9;

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
  const [collectionView, setCollectionView] = useState<'table' | 'binder'>('table');
  const [binderPage, setBinderPage] = useState(1);
  const [binderFlipDirection, setBinderFlipDirection] = useState<'forward' | 'backward' | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CatalogCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);
  const [addForm, setAddForm] = useState(defaultAddForm);
  const [importPayload, setImportPayload] = useState('');
  const [importing, setImporting] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versionResults, setVersionResults] = useState<CatalogCard[]>([]);
  const [versionBaseCard, setVersionBaseCard] = useState<CatalogCard | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CollectionItem | null>(null);
  const [editForm, setEditForm] = useState(defaultAddForm);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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
    if (!userMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!session) {
      resetDashboardState();
      return;
    }
    if (activeTab === 'collection') {
      void loadCollection();
      void loadPortfolio({ silent: true });
    } else if (activeTab === 'portfolio') {
      void loadPortfolio();
    } else if (activeTab === 'marketplace') {
      void loadMarketplace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, activeTab, showMineOnly]);

  useEffect(() => {
    setUserMenuOpen(false);
    setCollectionMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!showAddModal) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setSearchLoading(true);
      void (async () => {
        try {
          const response = await apiRequest<{ items: CatalogApiItem[] }>(
            `/catalog/search?q=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          );
          const mapped = dedupeCatalogResults(response.items ?? []);
          setSearchResults(mapped);
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          setToast(error instanceof Error ? error.message : 'Unable to search catalog.');
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, showAddModal]);

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
      setBinderPage(1);
    } catch (error) {
      setCollectionError(error instanceof Error ? error.message : 'Unable to load collection.');
    } finally {
      setCollectionLoading(false);
    }
  };

  const loadPortfolio = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setPortfolioLoading(true);
      setPortfolioError(null);
    }
    try {
      const summary = await apiRequest<PortfolioSummary>('/portfolio/summary');
      setPortfolioSummary(summary);
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'Unable to load portfolio summary.');
    } finally {
      if (!silent) {
        setPortfolioLoading(false);
      }
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

  const handleAddCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCard) return;
    const payload = {
      cardId: selectedCard.id,
      quantity: addForm.quantity,
      finish: addForm.finish,
      condition: addForm.condition,
      language: addForm.language,
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
      setAddForm({ ...defaultAddForm });
      setSearchResults([]);
      setSearchQuery('');
      await loadCollection();
      await loadPortfolio({ silent: true });
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
      await loadPortfolio({ silent: true });
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

  const goToNextBinderPage = () => {
    if (binderPage >= binderTotalPages) return;
    setBinderFlipDirection('forward');
    setBinderPage((previous) => Math.min(previous + 1, binderTotalPages));
  };

  const goToPreviousBinderPage = () => {
    if (binderPage <= 1) return;
    setBinderFlipDirection('backward');
    setBinderPage((previous) => Math.max(previous - 1, 1));
  };

  const openVersionSelection = async (card: CatalogCard) => {
    setSelectedCard(null);
    setVersionBaseCard(card);
    setVersionResults([]);
    setVersionError(null);
    setShowVersionModal(true);
    setVersionLoading(true);
    try {
      const response = await apiRequest<{ items: CatalogApiItem[] }>(`/catalog/${card.id}/prints`);
      const mapped = (response.items ?? []).map(mapCatalogItem);
      setVersionResults(mapped);
    } catch (error) {
      setVersionError(error instanceof Error ? error.message : 'Unable to load printings.');
    } finally {
      setVersionLoading(false);
    }
  };

  const handleSelectVersion = (card: CatalogCard) => {
    setSelectedCard(card);
    setShowVersionModal(false);
    setSearchResults([]);
    setSearchQuery(card.name);
  };

  const handleOpenEditModal = (entry: CollectionItem) => {
    setEditingEntry(entry);
    setEditForm({
      quantity: entry.quantity,
      finish: entry.finish,
      condition: entry.condition,
      language: entry.language ?? 'en',
      acquiredPrice: entry.acquiredPrice != null ? String(entry.acquiredPrice) : '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingEntry) return;
    const payload = {
      quantity: editForm.quantity,
      finish: editForm.finish,
      condition: editForm.condition,
      language: editForm.language,
      acquiredPrice:
        editForm.acquiredPrice === '' ? null : Number.parseFloat(editForm.acquiredPrice),
    };
    try {
      await apiRequest(`/collection/${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setToast(`${editingEntry.name} updated.`);
      setShowEditModal(false);
      setEditingEntry(null);
      setEditForm({ ...defaultAddForm });
      await loadCollection();
      await loadPortfolio({ silent: true });
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to update entry.');
    }
  };

  const handleDeleteEntry = async (entry: CollectionItem) => {
    const confirmed = window.confirm(`Remove ${entry.name} from your collection?`);
    if (!confirmed) return;
    try {
      await apiRequest(`/collection/${entry.id}`, {
        method: 'DELETE',
      });
      setToast(`${entry.name} removed from your collection.`);
      await loadCollection();
      await loadPortfolio({ silent: true });
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to remove entry.');
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

  const trendMap = useMemo(() => {
    const map = new Map<string, 'up' | 'down'>();
    if (!portfolioSummary) return map;
    portfolioSummary.movers.gainers.forEach((mover) => {
      map.set(mover.id, 'up');
      map.set(mover.cardId, 'up');
    });
    portfolioSummary.movers.losers.forEach((mover) => {
      map.set(mover.id, 'down');
      map.set(mover.cardId, 'down');
    });
    return map;
  }, [portfolioSummary]);

  const binderTotalPages = useMemo(() => {
    if (!collectionData?.items?.length) return 1;
    return Math.max(1, Math.ceil(collectionData.items.length / BINDER_PAGE_SIZE));
  }, [collectionData]);

  const binderItems = useMemo(() => {
    if (!collectionData?.items) return [] as CollectionItem[];
    const startIndex = (binderPage - 1) * BINDER_PAGE_SIZE;
    return collectionData.items.slice(startIndex, startIndex + BINDER_PAGE_SIZE);
  }, [collectionData, binderPage]);

  useEffect(() => {
    if (collectionView === 'binder') {
      setBinderPage(1);
    }
  }, [collectionView]);

  useEffect(() => {
    if (binderPage <= binderTotalPages) {
      return;
    }
    setBinderPage(binderTotalPages);
  }, [binderPage, binderTotalPages]);

  useEffect(() => {
    if (!binderFlipDirection) return;
    const timeout = window.setTimeout(() => setBinderFlipDirection(null), 600);
    return () => window.clearTimeout(timeout);
  }, [binderFlipDirection]);

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
      <div className="section-toolbar collection-toolbar">
        <div className="stat-card">
          <p>Total Portfolio Value</p>
          <h3>{formatCurrency(collectionValue.total)}</h3>
          <span>{collectionValue.unique} unique cards</span>
        </div>
        <div className="collection-actions">
          <div className="view-toggle">
            <button
              type="button"
              className={collectionView === 'table' ? 'active' : ''}
              onClick={() => setCollectionView('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={collectionView === 'binder' ? 'active' : ''}
              onClick={() => setCollectionView('binder')}
            >
              Binder
            </button>
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
      </div>

      {collectionLoading ? (
        <div className="panel muted">Loading your library…</div>
      ) : collectionError ? (
        <div className="panel error">{collectionError}</div>
      ) : collectionData && collectionData.items.length > 0 ? (
        collectionView === 'table' ? (
          <div className="panel overflow">
            <table className="collection-table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Qty</th>
                  <th>Finish</th>
                  <th>Market price</th>
                  <th>Trend</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {collectionData.items.map((item) => {
                  const price = resolveMarketPrice(item);
                  const trend = trendMap.get(item.id) ?? trendMap.get(item.cardId);
                  const trendClass = trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'trend-flat';
                  const trendLabel = trend === 'up' ? 'Upward trend' : trend === 'down' ? 'Downward trend' : 'Stable';
                  const trendSymbol = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '▬';
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="card-cell">
                          {item.imageSmall ? (
                            <img src={item.imageSmall} alt={item.name} />
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
                      <td>{formatCurrency(price)}</td>
                      <td>
                        <span className={`trend ${trendClass}`} aria-label={trendLabel}>
                          {trendSymbol}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <div className="row-actions">
                          <button type="button" className="ghost-button" onClick={() => handleOpenEditModal(item)}>
                            Update
                          </button>
                          <button
                            type="button"
                            className="ghost-button danger"
                            onClick={() => handleDeleteEntry(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="binder-mode">
            <div className={`binder-page ${binderFlipDirection ? `flip-${binderFlipDirection}` : ''}`}>
              {binderItems.map((item) => (
                <figure key={item.id} className="binder-card">
                  {item.imageSmall ? (
                    <img src={item.imageSmall} alt={item.name} />
                  ) : (
                    <div className="binder-placeholder">{item.name.slice(0, 2).toUpperCase()}</div>
                  )}
                  <figcaption>
                    <strong>{item.name}</strong>
                    <small>{formatCurrency(resolveMarketPrice(item))}</small>
                  </figcaption>
                </figure>
              ))}
              {binderItems.length < BINDER_PAGE_SIZE
                ? Array.from({ length: BINDER_PAGE_SIZE - binderItems.length }).map((_, index) => (
                    <div key={`binder-placeholder-${index}`} className="binder-card placeholder" />
                  ))
                : null}
            </div>
            <div className="binder-controls">
              <button type="button" onClick={goToPreviousBinderPage} disabled={binderPage === 1}>
                ‹
              </button>
              <span>
                Page {binderPage} / {binderTotalPages}
              </span>
              <button type="button" onClick={goToNextBinderPage} disabled={binderPage === binderTotalPages}>
                ›
              </button>
            </div>
          </div>
        )
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
        <div className="header-top">
          <div className="brand">
            <span className="badge">MTG Portfolio</span>
            <h1>Command Center</h1>
          </div>
          <div className="user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="icon-button"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((previous) => !previous)}
            >
              ⋯
            </button>
            {userMenuOpen && (
              <div className="dropdown-menu align-right" role="menu">
                <div className="dropdown-meta">
                  <strong>{session?.name ?? session?.email}</strong>
                  <span>{session?.email}</span>
                </div>
                <button type="button" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            )}
          </div>
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
          <div className="stack">
            <label htmlFor="search">Search the catalog</label>
            <input
              id="search"
              type="text"
              placeholder="Start typing a card name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {!selectedCard ? (
              <div className="search-results">
                {searchLoading ? (
                  <p className="muted">Searching…</p>
                ) : searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((card) => (
                      <li key={card.id}>
                        <button type="button" onClick={() => openVersionSelection(card)}>
                          {card.imageSmall ? (
                            <img src={card.imageSmall} alt={card.name} />
                          ) : (
                            <span className="card-placeholder">{card.name.slice(0, 2).toUpperCase()}</span>
                          )}
                          <div>
                            <strong>{card.name}</strong>
                            <small>{card.set.toUpperCase()} · #{card.collectorNumber}</small>
                          </div>
                          <span className="chevron">Select</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : searchQuery.trim().length >= 2 ? (
                  <p className="muted">No matches found. Try refining your search.</p>
                ) : (
                  <p className="muted">Type at least two letters to search Scryfall.</p>
                )}
              </div>
            ) : null}
          </div>

          {selectedCard ? (
            <form className="stack" onSubmit={handleAddCard}>
              <div className="selected-card summary">
                {selectedCard.imageSmall ? (
                  <img src={selectedCard.imageSmall} alt={selectedCard.name} />
                ) : (
                  <span className="card-placeholder">{selectedCard.name.slice(0, 2).toUpperCase()}</span>
                )}
                <div>
                  <strong>{selectedCard.name}</strong>
                  <span>{selectedCard.set.toUpperCase()} · #{selectedCard.collectorNumber}</span>
                  <span className="muted">
                    Market price {formatCurrency(selectedCard.usd ?? selectedCard.usdFoil ?? 0)}
                  </span>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => openVersionSelection(selectedCard)}
                  >
                    Choose a different printing
                  </button>
                </div>
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
                  Language
                  <select
                    value={addForm.language}
                    onChange={(event) => setAddForm((previous) => ({ ...previous, language: event.target.value }))}
                  >
                    <option value="en">English</option>
                    <option value="ja">Japanese</option>
                    <option value="es">Spanish</option>
                    <option value="de">German</option>
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
                  Clear selection
                </button>
              </div>
            </form>
          ) : null}
        </Modal>
      ) : null}

      {showVersionModal ? (
        <Modal
          title={versionBaseCard ? `Select a printing for ${versionBaseCard.name}` : 'Select a printing'}
          onClose={() => closeVersionModal()}
        >
          {versionLoading ? (
            <p className="muted">Loading printings…</p>
          ) : versionError ? (
            <div className="panel error">{versionError}</div>
          ) : versionResults.length > 0 ? (
            <ul className="version-grid">
              {versionResults.map((version) => (
                <li key={version.id}>
                  <button
                    type="button"
                    className={selectedCard?.id === version.id ? 'active' : ''}
                    onClick={() => handleSelectVersion(version)}
                  >
                    {version.imageSmall ? (
                      <img src={version.imageSmall} alt={version.name} />
                    ) : (
                      <span className="card-placeholder">{version.name.slice(0, 2).toUpperCase()}</span>
                    )}
                    <div>
                      <strong>{version.set.toUpperCase()}</strong>
                      <span>#{version.collectorNumber}</span>
                      <small>
                        {version.usd != null ? formatCurrency(version.usd) : '—'}
                        {version.usdFoil != null ? ` · Foil ${formatCurrency(version.usdFoil)}` : ''}
                      </small>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No other printings were found.</p>
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

      {showEditModal && editingEntry ? (
        <Modal title={`Update ${editingEntry.name}`} onClose={() => closeEditModal()}>
          <form className="stack" onSubmit={handleEditSubmit}>
            <div className="selected-card summary">
              {editingEntry.imageSmall ? (
                <img src={editingEntry.imageSmall} alt={editingEntry.name} />
              ) : (
                <span className="card-placeholder">{editingEntry.name.slice(0, 2).toUpperCase()}</span>
              )}
              <div>
                <strong>{editingEntry.name}</strong>
                <span>{editingEntry.setCode.toUpperCase()} · #{editingEntry.collectorNumber}</span>
                <span className="muted">Currently {editingEntry.quantity} copy/copies</span>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={editForm.quantity}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      quantity: Number.parseInt(event.target.value, 10) || 1,
                    }))
                  }
                />
              </label>
              <label>
                Finish
                <select
                  value={editForm.finish}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, finish: event.target.value }))}
                >
                  <option value="NONFOIL">Non-foil</option>
                  <option value="FOIL">Foil</option>
                  <option value="ETCHED">Etched</option>
                </select>
              </label>
              <label>
                Condition
                <select
                  value={editForm.condition}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, condition: event.target.value }))}
                >
                  <option value="NM">Near Mint</option>
                  <option value="LP">Lightly Played</option>
                  <option value="MP">Moderately Played</option>
                  <option value="HP">Heavily Played</option>
                  <option value="DMG">Damaged</option>
                </select>
              </label>
              <label>
                Language
                <select
                  value={editForm.language}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, language: event.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="ja">Japanese</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </select>
              </label>
              <label>
                Cost basis (optional)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editForm.acquiredPrice}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, acquiredPrice: event.target.value }))}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="submit" className="primary-button">
                Save changes
              </button>
              <button type="button" className="ghost-button" onClick={() => closeEditModal()}>
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
    setAddForm({ ...defaultAddForm });
    setShowVersionModal(false);
    setVersionBaseCard(null);
    setVersionResults([]);
    setVersionError(null);
  }

  function closeVersionModal() {
    setShowVersionModal(false);
    setVersionError(null);
    setVersionResults([]);
    setVersionBaseCard(null);
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

  function closeEditModal() {
    setShowEditModal(false);
    setEditingEntry(null);
    setEditForm({ ...defaultAddForm });
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

function mapCatalogItem(item: CatalogApiItem): CatalogCard {
  const usd = item.prices?.usd;
  const usdFoil = item.prices?.usd_foil;
  return {
    id: item.id,
    name: item.name,
    set: item.set,
    collectorNumber: item.collector_number,
    imageSmall: item.image_uris?.small,
    imageNormal: item.image_uris?.normal,
    usd: usd != null ? Number.parseFloat(String(usd)) : undefined,
    usdFoil: usdFoil != null ? Number.parseFloat(String(usdFoil)) : undefined,
  };
}

function dedupeCatalogResults(items: CatalogApiItem[]): CatalogCard[] {
  const map = new Map<string, CatalogCard>();
  items.forEach((item) => {
    const normalizedName = item.name.toLowerCase();
    const card = mapCatalogItem(item);
    if (!map.has(normalizedName)) {
      map.set(normalizedName, card);
      return;
    }
    const existing = map.get(normalizedName)!;
    const existingPrice = existing.usd ?? existing.usdFoil ?? 0;
    const candidatePrice = card.usd ?? card.usdFoil ?? 0;
    if (candidatePrice > existingPrice) {
      map.set(normalizedName, card);
    }
  });
  return Array.from(map.values());
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
