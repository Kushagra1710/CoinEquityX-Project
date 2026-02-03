import { useState, useMemo, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Autocomplete, ToggleButton, ToggleButtonGroup,
    Typography, Stack, Box, CircularProgress, Alert
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useVirtualTrading } from '../context/VirtualTradingContext';
import { usePortfolio } from '../state/PortfolioContext';
import { getListings, API_BASE } from '../api';

// Fetch function for stocks search
const searchStocks = async (query: string) => {
    if (!query) return [];
    // Use relative path proxy
    const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    return Array.isArray(json) ? json : [];
};

const getStockQuote = async (symbol: string) => {
    const res = await fetch(`/api/stock/quote?symbol=${encodeURIComponent(symbol)}`);
    return await res.json();
}

const getCryptoQuote = async (id: string) => {
    const res = await fetch(`/api/quote?id=${id}`);
    const json = await res.json();
    return json?.data?.[id]?.quote?.USD?.price || 0;
}

// Top stocks to show when search is empty
const POPULAR_STOCKS = [
    { description: 'APPLE INC', symbol: 'AAPL', type: 'Common Stock' },
    { description: 'MICROSOFT CORP', symbol: 'MSFT', type: 'Common Stock' },
    { description: 'NVIDIA CORP', symbol: 'NVDA', type: 'Common Stock' },
    { description: 'AMAZON.COM INC', symbol: 'AMZN', type: 'Common Stock' },
    { description: 'ALPHABET INC-CL A', symbol: 'GOOGL', type: 'Common Stock' },
    { description: 'TESLA INC', symbol: 'TSLA', type: 'Common Stock' },
    { description: 'META PLATFORMS INC-CLASS A', symbol: 'META', type: 'Common Stock' },
    { description: 'NETFLIX INC', symbol: 'NFLX', type: 'Common Stock' },
    { description: 'AMD', symbol: 'AMD', type: 'Common Stock' },
    { description: 'INTEL CORP', symbol: 'INTC', type: 'Common Stock' }
];

export function TradeModal({ open, onClose, defaultMode }: { open: boolean; onClose: () => void, defaultMode?: 'crypto' | 'stock' }) {
    const { portfolio, executeTrade } = useVirtualTrading();
    const { currency, fxRates } = usePortfolio();

    // Currency Formatter
    const formatMoney = (amountInUsd: number) => {
        const rate = fxRates[currency] || 1;
        const value = amountInUsd * rate;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 2
        }).format(value);
    };

    const [mode, setMode] = useState<'crypto' | 'stock'>(defaultMode || 'crypto');
    const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [quantity, setQuantity] = useState<string>('');
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [quotePrice, setQuotePrice] = useState<number | null>(null);
    const [stockQuery, setStockQuery] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && defaultMode) {
            setMode(defaultMode);
        }
    }, [open, defaultMode]);

    // Crypto Listings
    const { data: cryptoListings } = useQuery({
        queryKey: ['listings'],
        queryFn: getListings,
        enabled: mode === 'crypto' && open
    });

    const cryptos = useMemo(() => cryptoListings?.data || [], [cryptoListings]);

    // Stock Search
    // Simple de-bouncing by relying on React query's intrinsic behavior or user delay
    // Ideally use useDebounce, but for now passing query directly
    const { data: stockOptions, isLoading: searchingStocks } = useQuery({
        queryKey: ['stockSearch', stockQuery],
        queryFn: () => searchStocks(stockQuery),
        enabled: mode === 'stock' && stockQuery.length > 1 && open
    });


    const handleAssetSelect = async (asset: any) => {
        setSelectedAsset(asset);
        setError('');
        if (!asset) {
            setQuotePrice(null);
            return;
        }

        setLoadingQuote(true);
        try {
            if (mode === 'crypto') {
                if (asset.quote?.USD?.price) {
                    setQuotePrice(asset.quote.USD.price);
                } else {
                    const p = await getCryptoQuote(asset.id);
                    setQuotePrice(p);
                }
            } else {
                // Stock
                const q = await getStockQuote(asset.symbol);
                if (q.c) setQuotePrice(q.c);
                else throw new Error("Failed to get price");
            }
        } catch (e) {
            setError("Could not fetch latest price");
            setQuotePrice(null);
        } finally {
            setLoadingQuote(false);
        }
    };



    const handleExecute = async () => {
        if (!selectedAsset || !quotePrice || !quantity) return;

        try {
            let assetId = mode === 'crypto' ? String(selectedAsset.id) : selectedAsset.symbol;
            let symbol = mode === 'crypto' ? selectedAsset.symbol : selectedAsset.symbol;
            let name = mode === 'crypto' ? selectedAsset.name : selectedAsset.description;

            await executeTrade({
                id: assetId,
                symbol,
                name,
                type: mode,
                price: quotePrice
            }, tradeType, Number(quantity));
            onClose();
            // Reset form
            setQuantity('');
            setSelectedAsset(null);
            setQuotePrice(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    // Calculate totals
    const totalValue = quotePrice && quantity ? (quotePrice * Number(quantity)) : 0;
    const canAfford = tradeType === 'BUY' ? (totalValue <= portfolio.cashBalance) : true;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Execute Virtual Trade</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={2}>
                        <ToggleButtonGroup
                            value={tradeType}
                            exclusive
                            onChange={(_, v) => v && setTradeType(v)}
                            fullWidth
                            color={tradeType === 'BUY' ? 'success' : 'error'}
                        >
                            <ToggleButton value="BUY">BUY</ToggleButton>
                            <ToggleButton value="SELL">SELL</ToggleButton>
                        </ToggleButtonGroup>

                        <ToggleButtonGroup
                            value={mode}
                            exclusive
                            onChange={(_, v) => {
                                if (v) {
                                    setMode(v);
                                    setSelectedAsset(null);
                                    setQuotePrice(null);
                                }
                            }}
                            fullWidth
                        >
                            <ToggleButton value="crypto">Crypto</ToggleButton>
                            <ToggleButton value="stock">Stock</ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>

                    {mode === 'crypto' ? (
                        <Autocomplete
                            options={cryptos}
                            getOptionLabel={(option) => `${option.name} (${option.symbol})`}
                            renderInput={(params) => <TextField {...params} label="Select Crypto" />}
                            onChange={(_, v) => handleAssetSelect(v)}
                            value={selectedAsset}
                        />
                    ) : (
                        <Autocomplete
                            options={stockQuery.length > 1 ? (Array.isArray(stockOptions) ? stockOptions : []) : POPULAR_STOCKS}
                            getOptionLabel={(option) => `${option.description} (${option.symbol})`}
                            onInputChange={(_, v) => setStockQuery(v)}
                            onChange={(_, v) => handleAssetSelect(v)}
                            renderInput={(params) => <TextField {...params} label="Search Stock" InputProps={{
                                ...params.InputProps, endAdornment: (
                                    <>
                                        {searchingStocks ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                )
                            }} />}
                            loading={searchingStocks}
                            value={selectedAsset}
                            filterOptions={(x) => x}
                        />
                    )}

                    {
                        selectedAsset && (
                            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #ddd' }}>
                                <Typography variant="body2" color="text.secondary">Current Price</Typography>
                                <Typography variant="h5">
                                    {loadingQuote ? <CircularProgress size={20} /> : (quotePrice ? formatMoney(quotePrice) : '--')}
                                </Typography>
                            </Box>
                        )
                    }

                    <TextField
                        label="Quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        fullWidth
                    />

                    <Box>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2">Available Cash:</Typography>
                            <Typography variant="body2" fontWeight="bold">{formatMoney(portfolio.cashBalance)}</Typography>
                        </Stack>
                        {quotePrice && quantity && (
                            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                                <Typography variant="body1">Total:</Typography>
                                <Typography variant="h6" color={canAfford ? 'text.primary' : 'error'}>
                                    {formatMoney(totalValue)}
                                </Typography>
                            </Stack>
                        )}
                    </Box>

                    {error && <Alert severity="error">{error}</Alert>}

                </Stack >
            </DialogContent >
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleExecute}
                    disabled={!selectedAsset || !quotePrice || !quantity || (tradeType === 'BUY' && !canAfford)}
                    color={tradeType === 'BUY' ? 'success' : 'error'}
                >
                    Confirm {tradeType}
                </Button>
            </DialogActions>
        </Dialog >
    );
}
