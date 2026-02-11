/**
 * Daily Summary Calculation
 * 
 * Calculates daily trading statistics and performance metrics.
 * 
 * Requirements: 15.9, 16.6
 */

import { Duration, Timestamp } from '../types/timestamp';
import type { Trade } from '../risk/types';
import type { DailySummary } from './types';

/**
 * Calculate daily summary from trades
 * 
 * Requirement 15.9: Daily summary with P&L, balance, Brier score, statistics
 * Requirement 16.6: Include top performing market
 * 
 * @param trades - All trades for the day
 * @param startingBalance - Balance at start of day
 * @param brierScore - Brier score for the day
 * @param date - Date for the summary (YYYY-MM-DD format)
 * @returns Daily summary data
 */
export function calculateDailySummary(
  trades: Trade[],
  startingBalance: number,
  brierScore: number,
  date: string
): DailySummary {
  // Filter trades for the day (already filtered by caller)
  const dayTrades = trades;
  
  // Calculate total P&L
  const totalPnL = dayTrades.reduce((sum, trade) => {
    return sum + (trade.pnl ?? 0);
  }, 0);
  
  // Calculate current balance
  const currentBalance = startingBalance + totalPnL;
  
  // Calculate P&L percentage
  const totalPnLPercent = startingBalance > 0 
    ? (totalPnL / startingBalance) * 100 
    : 0;
  
  // Count winning and losing trades
  const winningTrades = dayTrades.filter(t => (t.pnl ?? 0) > 0).length;
  const losingTrades = dayTrades.filter(t => (t.pnl ?? 0) < 0).length;
  const totalTrades = dayTrades.length;
  
  // Calculate win rate
  const winRate = totalTrades > 0 
    ? (winningTrades / totalTrades) * 100 
    : 0;
  
  // Calculate average EV (not available from trades, would need signals)
  // For now, set to 0 - this should be calculated from signal data
  const averageEV = 0;
  
  // Calculate average hold time
  const holdTimes = dayTrades.map(trade => {
    // For now, we don't have exit timestamps in Trade type
    // This would need to be calculated from entry and exit times
    // Return 0 for now
    return 0;
  });
  
  const avgHoldTimeMs = holdTimes.length > 0
    ? holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length
    : 0;
  
  const averageHoldTime = Duration.fromMilliseconds(avgHoldTimeMs);
  
  // Find top performing market (by token ID)
  const marketPnL = new Map<string, number>();
  
  for (const trade of dayTrades) {
    const currentPnL = marketPnL.get(trade.tokenId) ?? 0;
    marketPnL.set(trade.tokenId, currentPnL + (trade.pnl ?? 0));
  }
  
  let topPerformingMarket: { market: string; pnl: number } | null = null;
  let maxPnL = -Infinity;
  
  for (const [tokenId, pnl] of marketPnL.entries()) {
    if (pnl > maxPnL) {
      maxPnL = pnl;
      topPerformingMarket = {
        market: tokenId,
        pnl,
      };
    }
  }
  
  return {
    date,
    totalPnL,
    totalPnLPercent,
    currentBalance,
    brierScore,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    topPerformingMarket,
    averageEV,
    averageHoldTime,
  };
}

/**
 * Filter trades for a specific date
 * 
 * @param trades - All trades
 * @param date - Date to filter for (YYYY-MM-DD format)
 * @returns Trades for the specified date
 */
export function filterTradesForDate(trades: Trade[], date: string): Trade[] {
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);
  
  return trades.filter(trade => {
    const tradeTime = trade.timestamp.utc.getTime();
    return tradeTime >= startOfDay.getTime() && tradeTime <= endOfDay.getTime();
  });
}

/**
 * Get date string for today in YYYY-MM-DD format
 * 
 * @returns Today's date string
 */
export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0] ?? '';
}

/**
 * Schedule daily summary notification
 * 
 * This function should be called to set up a timer that triggers
 * the daily summary at 23:59 UTC.
 * 
 * @param callback - Function to call when it's time to send summary
 * @returns Timer ID that can be used to cancel the schedule
 */
export function scheduleDailySummary(callback: () => void): NodeJS.Timeout {
  const now = new Date();
  
  // Calculate time until 23:59 UTC today
  const target = new Date(now);
  target.setUTCHours(23, 59, 0, 0);
  
  // If we've already passed 23:59 today, schedule for tomorrow
  if (now.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  
  const msUntilTarget = target.getTime() - now.getTime();
  
  // Schedule the callback
  return setTimeout(() => {
    callback();
    
    // Reschedule for next day (24 hours from now)
    scheduleDailySummary(callback);
  }, msUntilTarget);
}
