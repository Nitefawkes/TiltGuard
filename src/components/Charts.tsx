// Chart components for TiltGuard analytics

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { colors } from './UI';
import { TimeSeriesData, SportDistribution, DayOfWeekPattern } from '../services/analytics';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: colors.surface,
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  style: {
    borderRadius: 12,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.primary,
  },
};

interface ProfitLossChartProps {
  data: TimeSeriesData;
  title?: string;
}

export function ProfitLossChart({ data, title = 'Net P/L Over Time' }: ProfitLossChartProps) {
  if (!data.labels || data.labels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Not enough data for chart</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={{
          labels: data.labels,
          datasets: data.datasets,
        }}
        width={screenWidth - 64}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero
      />
    </View>
  );
}

interface SportPieChartProps {
  data: SportDistribution[];
  title?: string;
}

export function SportPieChart({ data, title = 'Sport Distribution' }: SportPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sport data available</Text>
      </View>
    );
  }

  const pieData = data.map((item) => ({
    name: item.sport,
    population: item.count,
    color: item.color,
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  }));

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <PieChart
        data={pieData}
        width={screenWidth - 64}
        height={220}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[10, 0]}
        absolute={false}
        style={styles.chart}
      />
    </View>
  );
}

interface DayOfWeekChartProps {
  data: DayOfWeekPattern[];
  title?: string;
}

export function DayOfWeekChart({ data, title = 'Betting by Day of Week' }: DayOfWeekChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No day-of-week data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map((d) => d.day),
    datasets: [
      {
        data: data.map((d) => d.betCount),
      },
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <BarChart
        data={chartData}
        width={screenWidth - 64}
        height={220}
        yAxisLabel=""
        yAxisSuffix=" bets"
        chartConfig={chartConfig}
        style={styles.chart}
        fromZero
        showBarTops={false}
        withInnerLines={true}
      />
    </View>
  );
}

interface WinRateChartProps {
  data: DayOfWeekPattern[];
  title?: string;
}

export function WinRateChart({ data, title = 'Win Rate by Day' }: WinRateChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No win rate data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map((d) => d.day),
    datasets: [
      {
        data: data.map((d) => d.winRate),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
      },
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 64}
        height={220}
        yAxisSuffix="%"
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginVertical: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
