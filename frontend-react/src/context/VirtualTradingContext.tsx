import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getVirtualPortfolio, saveVirtualPortfolio } from '../api';

export type VirtualHolding = {
    assetId: string; // symbol for stocks, id/symbol for crypto
    type: 'crypto' | 'stock';
    symbol: string;
    name: string;
    quantity: number;
    avgPrice: number;
};

export type VirtualTransaction = {
    id: string;
    type: 'BUY' | 'SELL';
    assetId: string;
    assetType: 'crypto' | 'stock';
    symbol: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    timestamp: string;
};

type VirtualPortfolioState = {
    cashBalance: number;
    holdings: VirtualHolding[];
    transactions: VirtualTransaction[];
};

type VirtualTradingContextType = {
    portfolio: VirtualPortfolioState;
    loading: boolean;
    executeTrade: (
        asset: { id: string; symbol: string; name: string; type: 'crypto' | 'stock'; price: number },
        type: 'BUY' | 'SELL',
        quantity: number
    ) => Promise<void>;
    resetPortfolio: () => Promise<void>;
    refresh: () => Promise<void>;
};

const VirtualTradingContext = createContext<VirtualTradingContextType | undefined>(undefined);

export function VirtualTradingProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [portfolio, setPortfolio] = useState<VirtualPortfolioState>({
        cashBalance: 1000000,
        holdings: [],
        transactions: [],
    });
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        if (!user) return;
        try {
            const data = await getVirtualPortfolio(user.uid);
            if (data) {
                setPortfolio({
                    cashBalance: data.cashBalance ?? 1000000,
                    holdings: Array.isArray(data.holdings) ? data.holdings : [],
                    transactions: Array.isArray(data.transactions) ? data.transactions : [],
                });
            }
        } catch (err) {
            console.error("Failed to load virtual portfolio", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, [user]);

    const executeTrade = async (
        asset: { id: string; symbol: string; name: string; type: 'crypto' | 'stock'; price: number },
        type: 'BUY' | 'SELL',
        quantity: number
    ) => {
        if (quantity <= 0) throw new Error("Invalid quantity");

        const totalCost = asset.price * quantity;
        let newCashBalance = portfolio.cashBalance;
        let newHoldings = [...portfolio.holdings];

        if (type === 'BUY') {
            if (totalCost > newCashBalance) throw new Error("Insufficient funds");
            newCashBalance -= totalCost;

            const existingIndex = newHoldings.findIndex(h => h.assetId === asset.id && h.type === asset.type);
            if (existingIndex >= 0) {
                const h = newHoldings[existingIndex];
                const newQty = h.quantity + quantity;
                const newAvg = ((h.quantity * h.avgPrice) + totalCost) / newQty;
                newHoldings[existingIndex] = { ...h, quantity: newQty, avgPrice: newAvg };
            } else {
                newHoldings.push({
                    assetId: asset.id,
                    type: asset.type,
                    symbol: asset.symbol,
                    name: asset.name,
                    quantity: quantity,
                    avgPrice: asset.price
                });
            }
        } else {
            const existingIndex = newHoldings.findIndex(h => h.assetId === asset.id && h.type === asset.type);
            if (existingIndex === -1 || newHoldings[existingIndex].quantity < quantity) {
                throw new Error("Insufficient quantity to sell");
            }

            const h = newHoldings[existingIndex];
            newCashBalance += totalCost;
            const newQty = h.quantity - quantity;

            if (newQty === 0) {
                newHoldings.splice(existingIndex, 1);
            } else {
                newHoldings[existingIndex] = { ...h, quantity: newQty };
            }
        }

        const transaction: VirtualTransaction = {
            id: crypto.randomUUID(),
            type,
            assetId: asset.id,
            assetType: asset.type,
            symbol: asset.symbol,
            name: asset.name,
            quantity,
            price: asset.price,
            total: totalCost,
            timestamp: new Date().toISOString()
        };

        const newTransactions = [transaction, ...portfolio.transactions];
        const newState = { cashBalance: newCashBalance, holdings: newHoldings, transactions: newTransactions };

        setPortfolio(newState);
        await saveVirtualPortfolio(newState, user?.uid);
    };

    const resetPortfolio = async () => {
        const newState = {
            cashBalance: 1000000,
            holdings: [],
            transactions: []
        };
        setPortfolio(newState);
        await saveVirtualPortfolio(newState, user?.uid);
    };

    return (
        <VirtualTradingContext.Provider value={{ portfolio, loading, executeTrade, resetPortfolio, refresh }}>
            {children}
        </VirtualTradingContext.Provider>
    );
}

export function useVirtualTrading() {
    const ctx = useContext(VirtualTradingContext);
    if (!ctx) throw new Error("useVirtualTrading must be used within VirtualTradingProvider");
    return ctx;
}
