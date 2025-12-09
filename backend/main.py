from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from typing import List, Dict, Any

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Japanese Stock Demo API"}

@app.get("/api/history/{ticker}")
def get_stock_history(ticker: str, period: str = "1y"):
    """
    Fetch historical data for a given ticker.
    Ticker should be the symbol, e.g., '7203.T' for Toyota.
    """
    try:
        # Append .T if not present (common for Japanese stocks in yfinance)
        if not ticker.endswith(".T") and ticker.isdigit():
            ticker = f"{ticker}.T"
        
        stock = yf.Ticker(ticker)
        # Fetch history
        hist = stock.history(period=period)
        
        if hist.empty:
            raise HTTPException(status_code=404, detail="No data found for ticker")
        
        # Reset index to make Date a column and convert to records
        hist.reset_index(inplace=True)
        
        # Convert Timestamp to string
        hist['Date'] = hist['Date'].dt.strftime('%Y-%m-%d')
        
        # Calculate Indicators
        # SMA
        hist['SMA25'] = hist['Close'].rolling(window=25).mean()
        hist['SMA75'] = hist['Close'].rolling(window=75).mean()
        
        # MACD
        exp12 = hist['Close'].ewm(span=12, adjust=False).mean()
        exp26 = hist['Close'].ewm(span=26, adjust=False).mean()
        hist['MACD'] = exp12 - exp26
        hist['Signal'] = hist['MACD'].ewm(span=9, adjust=False).mean()
        hist['Histogram'] = hist['MACD'] - hist['Signal']
        
        # RSI (14-period)
        delta = hist['Close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = (-delta).where(delta < 0, 0)
        avg_gain = gain.rolling(window=14).mean()
        avg_loss = loss.rolling(window=14).mean()
        rs = avg_gain / avg_loss
        hist['RSI'] = 100 - (100 / (1 + rs))
        
        # Fill NaNs (JSON doesn't like NaNs)
        hist = hist.fillna(0)
        
        # Replace Infinity with 0
        import numpy as np
        hist = hist.replace([np.inf, -np.inf], 0)

        # Select relevant columns
        data = hist[['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'SMA25', 'SMA75', 'MACD', 'Signal', 'Histogram', 'RSI']].to_dict(orient='records')
        
        # Get company name
        try:
            info = stock.info
            name = info.get('longName') or info.get('shortName') or ticker
        except:
            name = ticker
        
        return {
            "ticker": ticker,
            "name": name,
            "data": data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
