"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  Time,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ISeriesApi,
  SeriesType
} from 'lightweight-charts';

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
  RSI?: number;
}

interface StockChartProps {
  data: StockData[];
  currentDate?: string;
}

interface HorizontalLine {
  id: string;
  price: number;
  color: string;
}

type DrawingMode = 'none' | 'horizontal' | 'trendline';

const StockChart: React.FC<StockChartProps> = ({ data, currentDate }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Drawing state
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [horizontalLines, setHorizontalLines] = useState<HorizontalLine[]>([]);
  const [trendlinePoints, setTrendlinePoints] = useState<{ time: Time; value: number }[]>([]);
  const [trendlines, setTrendlines] = useState<{ id: string; points: { time: Time; value: number }[]; color: string }[]>([]);

  // Refs for accessing current state in callbacks
  const drawingModeRef = useRef<DrawingMode>('none');
  const trendlinePointsRef = useRef<{ time: Time; value: number }[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);

  useEffect(() => {
    trendlinePointsRef.current = trendlinePoints;
  }, [trendlinePoints]);

  // Filter data
  const displayData = currentDate
    ? data.filter(d => d.Date <= currentDate)
    : data;

  useEffect(() => {
    if (!chartContainerRef.current || !macdContainerRef.current || !rsiContainerRef.current) return;

    // --- Main Chart (Candlestick + SMA) ---
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: 'black',
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        borderColor: '#D1D5DB',
      },
      rightPriceScale: {
        borderColor: '#D1D5DB',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
    });
    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candlestickSeriesRef.current = candlestickSeries;

    const sma25Series = chart.addSeries(LineSeries, {
      color: '#2962FF',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const sma75Series = chart.addSeries(LineSeries, {
      color: '#FF6D00',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // --- MACD Chart ---
    const macdChart = createChart(macdContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: 'black',
      },
      width: macdContainerRef.current.clientWidth,
      height: 150,
      timeScale: {
        timeVisible: true,
        borderColor: '#D1D5DB',
      },
      rightPriceScale: {
        borderColor: '#D1D5DB',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
    });
    macdChartRef.current = macdChart;

    const macdSeries = macdChart.addSeries(LineSeries, {
      color: '#2962FF',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const signalSeries = macdChart.addSeries(LineSeries, {
      color: '#FF6D00',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const histogramSeries = macdChart.addSeries(HistogramSeries, {
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // --- Set Data ---
    const candleData = displayData.map(d => ({
      time: d.Date as Time,
      open: d.Open,
      high: d.High,
      low: d.Low,
      close: d.Close,
    }));
    candlestickSeries.setData(candleData);

    const sma25Data = displayData
      .filter(d => d.SMA25 !== undefined && d.SMA25 !== 0)
      .map(d => ({ time: d.Date as Time, value: d.SMA25! }));
    sma25Series.setData(sma25Data);

    const sma75Data = displayData
      .filter(d => d.SMA75 !== undefined && d.SMA75 !== 0)
      .map(d => ({ time: d.Date as Time, value: d.SMA75! }));
    sma75Series.setData(sma75Data);

    const macdData = displayData
      .filter(d => d.MACD !== undefined)
      .map(d => ({ time: d.Date as Time, value: d.MACD! }));
    macdSeries.setData(macdData);

    const signalData = displayData
      .filter(d => d.Signal !== undefined)
      .map(d => ({ time: d.Date as Time, value: d.Signal! }));
    signalSeries.setData(signalData);

    const histogramData = displayData
      .filter(d => d.Histogram !== undefined)
      .map(d => ({
        time: d.Date as Time,
        value: d.Histogram!,
        color: d.Histogram! >= 0 ? '#26a69a' : '#ef5350',
      }));
    histogramSeries.setData(histogramData);

    // --- RSI Chart ---
    const rsiChart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: 'black',
      },
      width: rsiContainerRef.current.clientWidth,
      height: 100,
      timeScale: {
        timeVisible: true,
        borderColor: '#D1D5DB',
      },
      rightPriceScale: {
        borderColor: '#D1D5DB',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
    });
    rsiChartRef.current = rsiChart;

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#9C27B0',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Overbought/Oversold lines
    const overboughtLine = rsiChart.addSeries(LineSeries, {
      color: '#ef5350',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const oversoldLine = rsiChart.addSeries(LineSeries, {
      color: '#26a69a',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const rsiData = displayData
      .filter(d => d.RSI !== undefined && d.RSI !== 0)
      .map(d => ({ time: d.Date as Time, value: d.RSI! }));
    rsiSeries.setData(rsiData);

    // Set horizontal lines at 70 and 30
    const lineData70 = displayData.map(d => ({ time: d.Date as Time, value: 70 }));
    const lineData30 = displayData.map(d => ({ time: d.Date as Time, value: 30 }));
    overboughtLine.setData(lineData70);
    oversoldLine.setData(lineData30);

    // --- Sync Time Scales ---
    const mainTimeScale = chart.timeScale();
    const macdTimeScale = macdChart.timeScale();
    const rsiTimeScale = rsiChart.timeScale();

    mainTimeScale.subscribeVisibleLogicalRangeChange(range => {
      if (range) {
        macdTimeScale.setVisibleLogicalRange(range);
        rsiTimeScale.setVisibleLogicalRange(range);
      }
    });

    macdTimeScale.subscribeVisibleLogicalRangeChange(range => {
      if (range) {
        mainTimeScale.setVisibleLogicalRange(range);
        rsiTimeScale.setVisibleLogicalRange(range);
      }
    });

    rsiTimeScale.subscribeVisibleLogicalRangeChange(range => {
      if (range) {
        mainTimeScale.setVisibleLogicalRange(range);
        macdTimeScale.setVisibleLogicalRange(range);
      }
    });

    // Handle Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
      if (macdContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth });
      }
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    // Draw horizontal lines
    horizontalLines.forEach(line => {
      candlestickSeries.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: '',
      });
    });

    // Draw trendlines
    trendlines.forEach(trendline => {
      const trendSeries = chart.addSeries(LineSeries, {
        color: trendline.color,
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      trendSeries.setData(trendline.points);
    });

    // Subscribe to chart click for drawing
    chart.subscribeClick((param) => {
      console.log('Chart clicked!', param);
      console.log('Current drawingMode:', drawingModeRef.current);

      if (drawingModeRef.current === 'none') {
        console.log('Drawing mode is none, ignoring click');
        return;
      }
      if (!param.point) {
        console.log('No point in param');
        return;
      }

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      console.log('Price from click:', price);
      if (price === null) {
        console.log('Price is null, ignoring');
        return;
      }

      if (drawingModeRef.current === 'horizontal') {
        console.log('Drawing horizontal line at price:', price);
        const newLine: HorizontalLine = {
          id: Date.now().toString(),
          price: price,
          color: '#FF9800',
        };
        setHorizontalLines(prev => [...prev, newLine]);
        setDrawingMode('none');
      } else if (drawingModeRef.current === 'trendline') {
        // For trendlines, we need a time value
        let time = param.time;
        console.log('param.logical:', param.logical, 'displayData.length:', displayData.length);

        if (!time && param.logical !== undefined) {
          // Clamp logical index to valid range
          let logicalIndex = Math.round(param.logical);
          if (logicalIndex < 0) logicalIndex = 0;
          if (logicalIndex >= displayData.length) logicalIndex = displayData.length - 1;

          if (displayData[logicalIndex]) {
            time = displayData[logicalIndex].Date as Time;
            console.log('Got time from clamped logical index:', logicalIndex, time);
          }
        }
        if (!time) {
          // Fallback: use coordinate to time
          const coordTime = chart.timeScale().coordinateToTime(param.point.x);
          if (coordTime) {
            time = coordTime;
            console.log('Got time from coordinate:', time);
          }
        }
        if (!time) {
          console.log('Could not get time for trendline - click on a candle');
          return;
        }
        console.log('Drawing trendline point at time:', time);
        const newPoint = { time: time, value: price };
        const currentPoints = trendlinePointsRef.current;
        const updated = [...currentPoints, newPoint];

        if (updated.length >= 2) {
          console.log('Creating trendline with 2 points');
          const newTrendline = {
            id: Date.now().toString(),
            points: updated.slice(0, 2),
            color: '#E91E63',
          };
          setTrendlines(t => [...t, newTrendline]);
          setTrendlinePoints([]);
          setDrawingMode('none');
        } else {
          console.log('First point set, waiting for second');
          setTrendlinePoints(updated);
        }
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      macdChart.remove();
      rsiChart.remove();
    };
  }, [displayData, horizontalLines, trendlines]); // Re-create chart when data or lines change


  const removeHorizontalLine = (id: string) => {
    setHorizontalLines(prev => prev.filter(l => l.id !== id));
  };

  const clearAllLines = () => {
    setHorizontalLines([]);
    setTrendlines([]);
    setTrendlinePoints([]);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">Price History & Indicators</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setDrawingMode(drawingMode === 'horizontal' ? 'none' : 'horizontal');
              setTrendlinePoints([]);
            }}
            className={`px-3 py-1 text-sm rounded ${drawingMode === 'horizontal' ? 'bg-orange-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            水平線
          </button>
          <button
            onClick={() => {
              setDrawingMode(drawingMode === 'trendline' ? 'none' : 'trendline');
              setTrendlinePoints([]);
            }}
            className={`px-3 py-1 text-sm rounded ${drawingMode === 'trendline' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            トレンドライン
          </button>
          <button
            onClick={clearAllLines}
            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            全消去
          </button>
        </div>
      </div>
      {drawingMode !== 'none' && (
        <div className="bg-yellow-100 text-yellow-800 text-sm p-2 rounded mb-2">
          {drawingMode === 'horizontal' && 'チャートをクリックして水平線を引く'}
          {drawingMode === 'trendline' && (
            trendlinePoints.length === 0
              ? 'トレンドラインの始点をクリック'
              : 'トレンドラインの終点をクリック'
          )}
        </div>
      )}
      <div className="flex gap-4 text-sm mb-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#2962FF' }}></span>
          SMA 25
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#FF6D00' }}></span>
          SMA 75
        </span>
      </div>
      <div ref={chartContainerRef} className="w-full cursor-crosshair" />
      <div className="flex gap-4 text-sm mt-4 mb-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#2962FF' }}></span>
          MACD
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#FF6D00' }}></span>
          Signal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-1 rounded" style={{ backgroundColor: '#26a69a' }}></span>
          /
          <span className="w-3 h-1 rounded" style={{ backgroundColor: '#ef5350' }}></span>
          Histogram
        </span>
      </div>
      <div ref={macdContainerRef} className="w-full" />
      <div className="flex gap-4 text-sm mt-4 mb-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#9C27B0' }}></span>
          RSI (14)
        </span>
        <span className="text-gray-500 text-xs">70: Overbought / 30: Oversold</span>
      </div>
      <div ref={rsiContainerRef} className="w-full" />
    </div>
  );
};

export default StockChart;
