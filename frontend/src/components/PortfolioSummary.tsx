"use client";

import React from 'react';

interface HoldingInfo {
    quantity: number;
    avgCost: number;
}

interface PortfolioSummaryProps {
    cash: number;
    holdings: { [ticker: string]: HoldingInfo };
    currentPrices: { [ticker: string]: number };
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
    cash,
    holdings,
    currentPrices
}) => {
    // Calculate totals
    let holdingsValue = 0;
    let totalProfitLoss = 0;

    Object.entries(holdings).forEach(([ticker, holding]) => {
        if (holding.quantity > 0) {
            const currentValue = holding.quantity * (currentPrices[ticker] || 0);
            const costBasis = holding.quantity * holding.avgCost;
            holdingsValue += currentValue;
            totalProfitLoss += currentValue - costBasis;
        }
    });

    const totalValue = cash + holdingsValue;
    const plColorClass = totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Portfolio</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                    <div className="text-sm text-gray-500">Total Value</div>
                    <div className="text-2xl font-bold text-gray-900">
                        ¥{totalValue.toLocaleString()}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <div className="text-sm text-gray-500">Cash</div>
                    <div className="text-2xl font-bold text-gray-900">
                        ¥{cash.toLocaleString()}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <div className="text-sm text-gray-500">Holdings Value</div>
                    <div className="text-2xl font-bold text-gray-900">
                        ¥{holdingsValue.toLocaleString()}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <div className="text-sm text-gray-500">Unrealized P/L</div>
                    <div className={`text-2xl font-bold ${plColorClass}`}>
                        {totalProfitLoss >= 0 ? '+' : ''}¥{totalProfitLoss.toLocaleString()}
                    </div>
                </div>
            </div>

            {Object.entries(holdings).filter(([, h]) => h.quantity > 0).length > 0 && (
                <div className="mt-6">
                    <h3 className="font-semibold mb-2">Current Holdings</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2">Ticker</th>
                                    <th className="px-4 py-2">Quantity</th>
                                    <th className="px-4 py-2">Avg Cost</th>
                                    <th className="px-4 py-2">Current Price</th>
                                    <th className="px-4 py-2">Value</th>
                                    <th className="px-4 py-2">P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(holdings)
                                    .filter(([, h]) => h.quantity > 0)
                                    .map(([ticker, holding]) => {
                                        const currentPrice = currentPrices[ticker] || 0;
                                        const value = holding.quantity * currentPrice;
                                        const costBasis = holding.quantity * holding.avgCost;
                                        const pl = value - costBasis;
                                        const plPercent = costBasis > 0 ? (pl / costBasis) * 100 : 0;
                                        const rowPlColor = pl >= 0 ? 'text-green-600' : 'text-red-600';

                                        return (
                                            <tr key={ticker} className="bg-white border-b">
                                                <td className="px-4 py-2 font-medium text-gray-900">{ticker}</td>
                                                <td className="px-4 py-2">{holding.quantity.toLocaleString()}</td>
                                                <td className="px-4 py-2">¥{holding.avgCost.toLocaleString()}</td>
                                                <td className="px-4 py-2">¥{currentPrice.toLocaleString()}</td>
                                                <td className="px-4 py-2">¥{value.toLocaleString()}</td>
                                                <td className={`px-4 py-2 font-semibold ${rowPlColor}`}>
                                                    {pl >= 0 ? '+' : ''}¥{pl.toLocaleString()} ({plPercent.toFixed(2)}%)
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioSummary;
