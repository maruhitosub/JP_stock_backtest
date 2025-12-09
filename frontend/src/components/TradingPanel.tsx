"use client";

import React, { useState } from 'react';

export type OrderType = 'market' | 'limit' | 'stop';

export interface PendingOrder {
    id: string;
    ticker: string;
    action: 'buy' | 'sell';
    orderType: OrderType;
    quantity: number;
    targetPrice: number;
    createdAt: string;
}

interface TradingPanelProps {
    ticker: string;
    currentPrice: number;
    cash: number;
    onBuy: (quantity: number) => void;
    onSell: (quantity: number) => void;
    onPlacePendingOrder: (order: Omit<PendingOrder, 'id' | 'createdAt'>) => void;
    maxSellQuantity: number;
    pendingOrders: PendingOrder[];
    onCancelOrder: (orderId: string) => void;
    onCloseAllPositions: () => void;
}

const TradingPanel: React.FC<TradingPanelProps> = ({
    ticker,
    currentPrice,
    cash,
    onBuy,
    onSell,
    onPlacePendingOrder,
    maxSellQuantity,
    pendingOrders,
    onCancelOrder,
    onCloseAllPositions
}) => {
    const [quantity, setQuantity] = useState<number>(100);
    const [action, setAction] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<OrderType>('market');
    const [targetPrice, setTargetPrice] = useState<number>(currentPrice);

    // Update target price when current price changes
    React.useEffect(() => {
        if (orderType === 'market') {
            setTargetPrice(currentPrice);
        }
    }, [currentPrice, orderType]);

    const totalCost = quantity * (orderType === 'market' ? currentPrice : targetPrice);
    const canBuy = action === 'buy' && totalCost <= cash;
    const canSell = action === 'sell' && quantity <= maxSellQuantity;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (orderType === 'market') {
            // Execute immediately
            if (action === 'buy' && canBuy) {
                onBuy(quantity);
            } else if (action === 'sell' && canSell) {
                onSell(quantity);
            }
        } else {
            // Place pending order
            onPlacePendingOrder({
                ticker,
                action,
                orderType,
                quantity,
                targetPrice,
            });
        }
    };

    const getOrderTypeLabel = (type: OrderType) => {
        switch (type) {
            case 'market': return '成行';
            case 'limit': return '指値';
            case 'stop': return '逆指値';
        }
    };

    const getOrderDescription = () => {
        if (orderType === 'limit') {
            return action === 'buy'
                ? `価格が ¥${targetPrice.toLocaleString()} 以下になったら買い`
                : `価格が ¥${targetPrice.toLocaleString()} 以上になったら売り`;
        } else if (orderType === 'stop') {
            return action === 'buy'
                ? `価格が ¥${targetPrice.toLocaleString()} 以上になったら買い`
                : `価格が ¥${targetPrice.toLocaleString()} 以下になったら売り`;
        }
        return '';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Trading</h2>

            {/* Buy/Sell Toggle */}
            <div className="flex gap-4 mb-4">
                <button
                    className={`flex-1 py-2 rounded-md font-semibold ${action === 'buy'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    onClick={() => setAction('buy')}
                >
                    Buy
                </button>
                <button
                    className={`flex-1 py-2 rounded-md font-semibold ${action === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    onClick={() => setAction('sell')}
                >
                    Sell
                </button>
            </div>

            {/* Order Type Toggle */}
            <div className="flex gap-2 mb-4">
                {(['market', 'limit', 'stop'] as OrderType[]).map((type) => (
                    <button
                        key={type}
                        className={`flex-1 py-1 px-2 rounded text-sm font-medium ${orderType === type
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        onClick={() => setOrderType(type)}
                    >
                        {getOrderTypeLabel(type)}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                    </label>
                    <input
                        type="number"
                        min="100"
                        step="100"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Target Price (for limit/stop orders) */}
                {orderType !== 'market' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Target Price (¥)
                        </label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">{getOrderDescription()}</p>
                    </div>
                )}

                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Current Price</span>
                        <span className="font-medium">¥{currentPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                        <span>Total (Est.)</span>
                        <span>¥{totalCost.toLocaleString()}</span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={orderType === 'market' ? (action === 'buy' ? !canBuy : !canSell) : false}
                    className={`w-full py-3 rounded-md font-bold text-white transition-colors ${action === 'buy'
                        ? (orderType !== 'market' || canBuy)
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-300 cursor-not-allowed'
                        : (orderType !== 'market' || canSell)
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-red-300 cursor-not-allowed'
                        }`}
                >
                    {orderType === 'market'
                        ? (action === 'buy' ? 'Place Buy Order' : 'Place Sell Order')
                        : `Place ${getOrderTypeLabel(orderType)} Order`}
                </button>

                <div className="mt-4 text-xs text-gray-500 text-center">
                    {action === 'buy'
                        ? `Available Cash: ¥${cash.toLocaleString()}`
                        : `Available to Sell: ${maxSellQuantity.toLocaleString()} shares`
                    }
                </div>
            </form>

            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                    <h3 className="font-semibold mb-2">Pending Orders</h3>
                    <div className="space-y-2">
                        {pendingOrders.map((order) => (
                            <div
                                key={order.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                            >
                                <div>
                                    <span className={`font-medium ${order.action === 'buy' ? 'text-blue-600' : 'text-red-600'}`}>
                                        {order.action === 'buy' ? 'Buy' : 'Sell'}
                                    </span>
                                    <span className="mx-1">{order.quantity} @ ¥{order.targetPrice.toLocaleString()}</span>
                                    <span className="text-gray-500">({getOrderTypeLabel(order.orderType)})</span>
                                </div>
                                <button
                                    onClick={() => onCancelOrder(order.id)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                >
                                    Cancel
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Close All Positions */}
            <div className="mt-6 pt-4 border-t">
                <button
                    onClick={onCloseAllPositions}
                    className="w-full py-2 bg-orange-500 text-white rounded-md font-semibold hover:bg-orange-600 transition-colors"
                >
                    全決済
                </button>
            </div>
        </div>
    );
};

export default TradingPanel;
