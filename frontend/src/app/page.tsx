"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import StockChart from '@/components/StockChart';
import TradingPanel, { PendingOrder, OrderType } from '@/components/TradingPanel';
import PortfolioSummary from '@/components/PortfolioSummary';
import TimeControls from '@/components/TimeControls';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Types
interface StockData {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  SMA25?: number;
  SMA75?: number;
  MACD?: number;
  Signal?: number;
  Histogram?: number;
}

interface Portfolio {
  cash: number;
  holdings: { [ticker: string]: { quantity: number; avgCost: number } };
}

const DEFAULT_TICKER = '7203.T'; // Toyota

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();

  // State
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [inputTicker, setInputTicker] = useState(DEFAULT_TICKER); // Separate state for input
  const [marketData, setMarketData] = useState<StockData[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash: 0,
    holdings: {}
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stockName, setStockName] = useState<string>(''); // Company name
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Set session ID from user id
  useEffect(() => {
    if (user?.id) {
      setSessionId(user.id);
    }
  }, [user]);

  // Load state from Supabase
  useEffect(() => {
    if (!sessionId || !user) return;

    const loadState = async () => {
      try {
        const { data, error } = await supabase
          .from('backtest_states')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (data && !error) {
          setTicker(data.ticker);
          setInputTicker(data.ticker);
          setCurrentDate(data.sim_date);
          setPortfolio({
            cash: Number(data.portfolio_cash),
            holdings: data.portfolio_holdings || {}
          });
          setPendingOrders(data.pending_orders || []);
        } else {
          // No data -> initialize with initialCash (from login page param or default 1,000,000)
          const initialCashParam = searchParams.get('initialCash');
          const initialCash = initialCashParam ? Number(initialCashParam) : 1000000;
          setPortfolio({ cash: initialCash, holdings: {} });
          setCurrentDate('');
        }
      } catch (err) {
        console.log('No existing state found, starting fresh');
        const initialCashParam = searchParams.get('initialCash');
        const initialCash = initialCashParam ? Number(initialCashParam) : 1000000;
        setPortfolio({ cash: initialCash, holdings: {} });
      } finally {
        setIsInitialized(true);
      }
    };

    loadState();
  }, [sessionId, user, searchParams]);

  // Save state to Supabase (debounced)
  useEffect(() => {
    if (!sessionId || !isInitialized || !currentDate) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('backtest_states')
          .upsert({
            session_id: sessionId,
            ticker,
            sim_date: currentDate,
            portfolio_cash: portfolio.cash,
            portfolio_holdings: portfolio.holdings,
            pending_orders: pendingOrders,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id'
          });

        if (error) {
          console.error('Failed to save state:', error);
        }
      } catch (err) {
        console.error('Error saving state:', err);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [sessionId, isInitialized, ticker, currentDate, portfolio, pendingOrders]);


  // Handle ticker submit
  const handleTickerSubmit = () => {
    const formattedTicker = inputTicker.toUpperCase();
    if (formattedTicker && formattedTicker !== ticker) {
      setTicker(formattedTicker);
    }
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const previousDate = currentDate; // Preserve current date
      try {
        const response = await fetch(`http://localhost:8000/api/history/${ticker}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setMarketData(data.data);
        setStockName(data.name || ticker); // Set company name
        // Set initial date only if not already set, or if the date is not in the new data
        if (data.data.length > 0) {
          const availableDates = data.data.map((d: StockData) => d.Date);
          if (!previousDate || !availableDates.includes(previousDate)) {
            // Start from 1 year ago or beginning
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const startDate = data.data.find((d: StockData) => new Date(d.Date) >= oneYearAgo) || data.data[0];
            setCurrentDate(startDate.Date);
          }
        }
      } catch (error) {
        console.error(error);
        alert('Failed to load stock data. Ensure backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  // Auto Play Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        handleNextDay();
      }, 1000); // 1 second per day
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentDate, marketData]);

  // Helpers
  const getCurrentPrice = useCallback(() => {
    if (!marketData.length || !currentDate) return 0;
    // Find exact match or previous closest
    const dayData = marketData.find(d => d.Date === currentDate);
    return dayData ? dayData.Close : 0;
  }, [marketData, currentDate]);

  const handleNextDay = () => {
    if (!marketData.length) return;
    const currentIndex = marketData.findIndex(d => d.Date === currentDate);
    if (currentIndex !== -1 && currentIndex < marketData.length - 1) {
      setCurrentDate(marketData[currentIndex + 1].Date);
    } else {
      setIsPlaying(false); // Stop at end
    }
  };

  const handleDateChange = (date: string) => {
    // Snap to nearest available date in data
    // For simplicity, just set it, but in reality we should find nearest trading day
    // Here we just check if it's in range
    if (marketData.length) {
      const min = marketData[0].Date;
      const max = marketData[marketData.length - 1].Date;
      if (date >= min && date <= max) {
        // Find closest date in data
        const closest = marketData.reduce((prev, curr) => {
          return (Math.abs(new Date(curr.Date).getTime() - new Date(date).getTime()) < Math.abs(new Date(prev.Date).getTime() - new Date(date).getTime()) ? curr : prev);
        });
        setCurrentDate(closest.Date);
      }
    }
  };

  // Trading Logic
  const handleBuy = (quantity: number) => {
    const price = getCurrentPrice();
    const cost = price * quantity;
    if (portfolio.cash >= cost) {
      setPortfolio(prev => {
        const existingHolding = prev.holdings[ticker] || { quantity: 0, avgCost: 0 };
        const totalQuantity = existingHolding.quantity + quantity;
        const totalCost = existingHolding.quantity * existingHolding.avgCost + cost;
        const newAvgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        return {
          cash: prev.cash - cost,
          holdings: {
            ...prev.holdings,
            [ticker]: { quantity: totalQuantity, avgCost: newAvgCost }
          }
        };
      });
    }
  };

  const handleSell = (quantity: number) => {
    const currentHolding = portfolio.holdings[ticker];
    if (currentHolding && currentHolding.quantity >= quantity) {
      const price = getCurrentPrice();
      const revenue = price * quantity;
      const remainingQuantity = currentHolding.quantity - quantity;
      setPortfolio(prev => ({
        cash: prev.cash + revenue,
        holdings: {
          ...prev.holdings,
          [ticker]: { quantity: remainingQuantity, avgCost: currentHolding.avgCost }
        }
      }));
    }
  };

  // Pending Order Handlers
  const handlePlacePendingOrder = (order: Omit<PendingOrder, 'id' | 'createdAt'>) => {
    const newOrder: PendingOrder = {
      ...order,
      id: Date.now().toString(),
      createdAt: currentDate,
    };
    setPendingOrders(prev => [...prev, newOrder]);
  };

  const handleCancelOrder = (orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Execute Pending Orders when date changes
  useEffect(() => {
    if (!currentDate || !marketData.length) return;

    const dayData = marketData.find(d => d.Date === currentDate);
    if (!dayData) return;

    const { High, Low } = dayData;

    setPendingOrders(prev => {
      const remaining: PendingOrder[] = [];

      for (const order of prev) {
        let shouldExecute = false;

        if (order.orderType === 'limit') {
          // Limit buy: execute if price drops to or below target
          // Limit sell: execute if price rises to or above target
          if (order.action === 'buy' && Low <= order.targetPrice) {
            shouldExecute = true;
          } else if (order.action === 'sell' && High >= order.targetPrice) {
            shouldExecute = true;
          }
        } else if (order.orderType === 'stop') {
          // Stop buy: execute if price rises to or above target
          // Stop sell: execute if price drops to or below target
          if (order.action === 'buy' && High >= order.targetPrice) {
            shouldExecute = true;
          } else if (order.action === 'sell' && Low <= order.targetPrice) {
            shouldExecute = true;
          }
        }

        if (shouldExecute) {
          // Execute the order at target price
          const executePrice = order.targetPrice;
          const cost = executePrice * order.quantity;

          if (order.action === 'buy') {
            setPortfolio(prevPortfolio => {
              if (prevPortfolio.cash < cost) return prevPortfolio; // Not enough cash
              const existingHolding = prevPortfolio.holdings[order.ticker] || { quantity: 0, avgCost: 0 };
              const totalQuantity = existingHolding.quantity + order.quantity;
              const totalCost = existingHolding.quantity * existingHolding.avgCost + cost;
              const newAvgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
              return {
                cash: prevPortfolio.cash - cost,
                holdings: {
                  ...prevPortfolio.holdings,
                  [order.ticker]: { quantity: totalQuantity, avgCost: newAvgCost }
                }
              };
            });
          } else {
            setPortfolio(prevPortfolio => {
              const holding = prevPortfolio.holdings[order.ticker];
              if (!holding || holding.quantity < order.quantity) return prevPortfolio; // Not enough shares
              return {
                cash: prevPortfolio.cash + cost,
                holdings: {
                  ...prevPortfolio.holdings,
                  [order.ticker]: { quantity: holding.quantity - order.quantity, avgCost: holding.avgCost }
                }
              };
            });
          }
        } else {
          remaining.push(order);
        }
      }

      return remaining;
    });
  }, [currentDate, marketData]);

  const currentPrice = getCurrentPrice();

  // Reset Account
  const handleResetAccount = () => {
    if (confirm('口座をリセットしますか？すべての取引履歴と保有株がリセットされます。')) {
      setPortfolio({ cash: INITIAL_CASH, holdings: {} });
      setPendingOrders([]);
      // Reset date to start
      if (marketData.length > 0) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const startDate = marketData.find(d => new Date(d.Date) >= oneYearAgo) || marketData[0];
        setCurrentDate(startDate.Date);
      }
    }
  };

  // Close All Positions
  const handleCloseAllPositions = () => {
    const holdingsEntries = Object.entries(portfolio.holdings).filter(([, h]) => h.quantity > 0);
    if (holdingsEntries.length === 0) {
      alert('保有株がありません。');
      return;
    }

    if (confirm('すべての保有株を現在価格で売却しますか？')) {
      let totalRevenue = 0;
      const newHoldings = { ...portfolio.holdings };

      for (const [holdTicker, holding] of holdingsEntries) {
        // Get price for each ticker (for current ticker, use currentPrice)
        let price = 0;
        if (holdTicker === ticker) {
          price = currentPrice;
        } else {
          // For other tickers, we'd need to fetch price. For simplicity, use avgCost (or 0)
          // In a real app, you'd fetch the current price for each ticker
          price = holding.avgCost; // Fallback to avgCost
        }
        totalRevenue += holding.quantity * price;
        newHoldings[holdTicker] = { quantity: 0, avgCost: holding.avgCost };
      }

      setPortfolio(prev => ({
        cash: prev.cash + totalRevenue,
        holdings: newHoldings
      }));

      // Cancel all pending orders
      setPendingOrders([]);
    }
  };


  if (loading || authLoading || !user) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">JP Stock Backtest Demo</h1>
            {stockName && <p className="text-lg text-gray-600">{stockName} ({ticker})</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Ticker:</span>
              <input
                type="text"
                value={inputTicker}
                onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleTickerSubmit()}
                onBlur={handleTickerSubmit}
                className="px-3 py-1 border rounded"
                placeholder="7203.T"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetAccount}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                リセット
              </button>
              <button
                onClick={signOut}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        <PortfolioSummary
          cash={portfolio.cash}
          holdings={portfolio.holdings}
          currentPrices={{ [ticker]: currentPrice }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StockChart
              data={marketData}
              currentDate={currentDate}
            />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <TimeControls
              currentDate={currentDate}
              minDate={marketData[0]?.Date || ''}
              maxDate={marketData[marketData.length - 1]?.Date || ''}
              onDateChange={handleDateChange}
              onNextDay={handleNextDay}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
            />
            <TradingPanel
              ticker={ticker}
              currentPrice={currentPrice}
              cash={portfolio.cash}
              onBuy={handleBuy}
              onSell={handleSell}
              onPlacePendingOrder={handlePlacePendingOrder}
              maxSellQuantity={portfolio.holdings[ticker]?.quantity || 0}
              pendingOrders={pendingOrders.filter(o => o.ticker === ticker)}
              onCancelOrder={handleCancelOrder}
              onCloseAllPositions={handleCloseAllPositions}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
