import { useState, useEffect, useMemo } from 'react';
import {
    Container, Grid, Card, CardContent, Typography, Button,
    Box, Table, TableBody, TableCell, TableHead, TableRow,
    Chip, IconButton, Alert, Stack
} from '@mui/material';
import { AccountBalanceWallet, AttachMoney, TrendingUp, Refresh, History } from '@mui/icons-material';
import { useVirtualTrading } from '../context/VirtualTradingContext';
import { usePortfolio } from '../state/PortfolioContext'; // Import global portfolio state
import { TradeModal } from '../components/TradeModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMarketMode } from '../context/MarketModeContext';

// Helper to fetch current prices for holdings to calculate real-time value
const usePortfolioValue = (holdings: any[]) => {
    const [currentValues, setCurrentValues] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchPrices = async () => {
            const newValues: Record<string, number> = {};
            // This is naive; in production, batch request or use existing query cache
            for (const h of holdings) {
                try {
                    let price = 0;
                    if (h.type === 'crypto') {
                        const res = await fetch(`/api/quote?id=${h.assetId}`);
                        const json = await res.json();
                        price = json?.data?.[h.assetId]?.quote?.USD?.price || 0;
                    } else {
                        const res = await fetch(`/api/stock/quote?symbol=${h.assetId}`);
                        const json = await res.json();
                        price = json?.c || 0;
                    }
                    newValues[h.assetId] = price;
                } catch (e) {
                    console.error(e);
                }
            }
            setCurrentValues(newValues);
        };
        if (holdings.length > 0) fetchPrices();
    }, [holdings]);

    return currentValues;
};

export default function VirtualTradingPage() {
    const { portfolio, resetPortfolio, refresh } = useVirtualTrading();
    const { currency, fxRates } = usePortfolio(); // Global currency context
    const { mode: marketMode } = useMarketMode();
    const [modalOpen, setModalOpen] = useState(false);

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

    // Filter holdings based on current market mode
    const filteredHoldings = useMemo(() =>
        portfolio.holdings.filter(h => h.type === marketMode),
        [portfolio.holdings, marketMode]);

    // Filter transactions based on current market mode
    const filteredTransactions = useMemo(() =>
        portfolio.transactions.filter(t => t.assetType === marketMode),
        [portfolio.transactions, marketMode]);

    const currentPrices = usePortfolioValue(filteredHoldings);

    // Calculate Totals for CURRENT MODE ONLY? 
    // Or Global? Usually users want to see the value of what they are looking at.
    // Let's show TOTAL ACCOUNT VALUE (Global) but break down the holdings list.
    // AND maybe a specific "Crypto Value" vs "Stock Value"? 
    // For simplicity and clarity, let's calculate the value of the FILTERED holdings.

    const holdingsValue = filteredHoldings.reduce((sum, h) => {
        const price = currentPrices[h.assetId] || h.avgPrice;
        return sum + (price * h.quantity);
    }, 0);

    // Global cash + Filtered Holdings Value = "Mode Specific Total"? 
    // No, Cash is shared. 
    // Total Account Value = Cash + All Holdings.
    // But user might be confused if "Total Value" doesn't match sum of table.
    // Let's keep "Total Account Value" global, but add a label "Cash (Shared)".

    // Actually, to fix the user's specific complaint "why same", they want separation.

    const globalHoldingsValue = portfolio.holdings.reduce((sum, h) => {
        // We need prices for ALL to get accurate global total, but usePortfolioValue only fetches for passed list.
        // If we want a true global total, we need prices for everything.
        // For now, let's just stick to showing what's relevant to the view.
        return sum + (h.avgPrice * h.quantity); // Approximate global if not fetching all live
    }, 0);

    const totalValue = portfolio.cashBalance + globalHoldingsValue; // Approximate
    // Better: just calculate for the view and labeled it "Crypto Portfolio Value" + "Cash"

    // Let's just use the filtered list for the table and charts.

    // Calculate Mode-Specific P/L
    const costBasis = filteredHoldings.reduce((sum, h) => sum + (h.avgPrice * h.quantity), 0);
    const totalPL = holdingsValue - costBasis;
    const totalPLPercent = costBasis > 0 ? (totalPL / costBasis) * 100 : 0;

    const chartData = filteredHoldings.map(h => ({
        name: h.symbol,
        value: (currentPrices[h.assetId] || h.avgPrice) * h.quantity
    }));

    if (portfolio.cashBalance > 0) {
        chartData.push({ name: 'Cash', value: portfolio.cashBalance });
    }

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 3 }} icon={<AccountBalanceWallet />}>
                Virtual Trading Practice Mode ({marketMode === 'crypto' ? 'Crypto' : 'Stocks'}): Trade with shared virtual balance.
            </Alert>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                {marketMode === 'crypto' ? 'Crypto' : 'Stock'} Only Value
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {formatMoney(holdingsValue)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                + {formatMoney(portfolio.cashBalance)} Cash (Shared)
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box>
                                    <Typography color="text.secondary" gutterBottom>Cash Balance (Shared)</Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {formatMoney(portfolio.cashBalance)}
                                    </Typography>
                                </Box>
                                <AttachMoney sx={{ fontSize: 40, opacity: 0.3 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box>
                                    <Typography color="text.secondary" gutterBottom>Mode P/L (Approx)</Typography>
                                    <Typography
                                        variant="h4"
                                        fontWeight="bold"
                                        color={totalPL >= 0 ? 'success.main' : 'error.main'}
                                    >
                                        {totalPL >= 0 ? '+' : ''}{formatMoney(Math.abs(totalPL))}
                                    </Typography>
                                    <Typography variant="body2" color={totalPLPercent >= 0 ? 'success.main' : 'error.main'}>
                                        {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
                                    </Typography>
                                </Box>
                                <TrendingUp sx={{ fontSize: 40, opacity: 0.3 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 3, background: 'linear-gradient(45deg, #212121 30%, #424242 90%)', color: 'white' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h5" gutterBottom>Execute {marketMode === 'crypto' ? 'Crypto' : 'Stock'} Trade</Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Buying/Selling will affect your shared cash balance.
                                    </Typography>
                                </Box>
                            </Stack>
                            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    onClick={() => setModalOpen(true)}
                                    sx={{ bgcolor: '#6C63FF', '&:hover': { bgcolor: '#5A52D5' } }}
                                >
                                    + New Trade
                                </Button>
                                <Button variant="outlined" color="inherit" onClick={resetPortfolio}>
                                    Reset All
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Your {marketMode === 'crypto' ? 'Crypto' : 'Stock'} Holdings</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Asset</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell align="right">Qty</TableCell>
                                        <TableCell align="right">Avg Price</TableCell>
                                        <TableCell align="right">Current</TableCell>
                                        <TableCell align="right">Value</TableCell>
                                        <TableCell align="right">P/L</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredHoldings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                No {marketMode} holdings yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredHoldings.map((h) => {
                                        const current = currentPrices[h.assetId] || h.avgPrice;
                                        const value = current * h.quantity;
                                        const cost = h.avgPrice * h.quantity;
                                        const pl = value - cost;
                                        const plPercent = (pl / cost) * 100;

                                        return (
                                            <TableRow key={`${h.type}-${h.assetId}`}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{h.symbol}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{h.name}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={h.type} size="small" color={h.type === 'crypto' ? 'primary' : 'secondary'} variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right">{h.quantity}</TableCell>
                                                <TableCell align="right">{formatMoney(h.avgPrice)}</TableCell>
                                                <TableCell align="right">{formatMoney(current)}</TableCell>
                                                <TableCell align="right">{formatMoney(value)}</TableCell>
                                                <TableCell align="right" sx={{ color: pl >= 0 ? 'success.main' : 'error.main' }}>
                                                    {pl >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card sx={{ mt: 3 }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                <History fontSize="small" />
                                <Typography variant="h6">Recent {marketMode === 'crypto' ? 'Crypto' : 'Stock'} Activity</Typography>
                            </Stack>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Time</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Asset</TableCell>
                                        <TableCell align="right">Qty</TableCell>
                                        <TableCell align="right">Price</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredTransactions.slice(0, 5).map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell>{new Date(t.timestamp).toLocaleTimeString()}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={t.type}
                                                    size="small"
                                                    color={t.type === 'BUY' ? 'success' : 'error'}
                                                    sx={{ minWidth: 60 }}
                                                />
                                            </TableCell>
                                            <TableCell>{t.symbol}</TableCell>
                                            <TableCell align="right">{t.quantity}</TableCell>
                                            <TableCell align="right">{formatMoney(t.price)}</TableCell>
                                            <TableCell align="right">{formatMoney(t.total)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">No recent activity</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                </Grid>

                <Grid item xs={12} md={4}>
                    <Card sx={{ height: 400 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>{marketMode === 'crypto' ? 'Crypto' : 'Stock'} Allocation</Typography>
                            <Box sx={{ height: 300, width: '100%' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatMoney(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                            <Stack spacing={1} sx={{ mt: -2, alignItems: 'center' }}>
                                <Typography variant="caption">Portfolio Allocation</Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <TradeModal open={modalOpen} onClose={() => setModalOpen(false)} defaultMode={marketMode} />
        </Box>
    );
}
