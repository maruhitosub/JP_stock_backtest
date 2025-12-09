import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database
export interface BacktestState {
    id?: string;
    session_id: string;
    ticker: string;
    current_date: string;
    portfolio_cash: number;
    portfolio_holdings: Record<string, { quantity: number; avgCost: number }>;
    pending_orders: Array<{
        id: string;
        ticker: string;
        action: 'buy' | 'sell';
        orderType: 'market' | 'limit' | 'stop';
        quantity: number;
        targetPrice: number;
        createdAt: string;
    }>;
    updated_at?: string;
}
