import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import type { WeightEntry } from '@/types';

const HEIGHT = 180;
const AXIS_WIDTH = 44;
const TICK_LABEL_HEIGHT = 20;
const LINE_WIDTH = 2;
const DOT_SIZE = 8;
const SELECTED_DOT_SIZE = 12;
// Ring in the surface color that separates a dot from the line under it.
const RING = 2;
// Keeps the dots at the edges of the plot from being clipped.
const INSET = SELECTED_DOT_SIZE / 2 + RING;
// With more points than this the dots would merge into a thick band.
const MAX_DOTS = 40;
const TICK_STEPS = [0.5, 1, 2, 5, 10, 20, 50];
const MAX_TICK_INTERVALS = 3;

const dayNumber = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

/** Round gridline values that enclose every weight. */
function ticksFor(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = TICK_STEPS.find((s) => (max - min) / s <= MAX_TICK_INTERVALS) ?? 100;
  let low = Math.floor(min / step) * step;
  let high = Math.ceil(max / step) * step;
  if (low === high) {
    low -= step;
    high += step;
  }
  return Array.from({ length: Math.round((high - low) / step) + 1 }, (_, i) => low + i * step);
}

type Props = {
  /** Ordered by date, at least one. */
  entries: WeightEntry[];
  /** Day highlighted in the plot. */
  selected: string | null;
  onSelect: (date: string) => void;
};

/** Line chart of the weight over time. Touching or dragging over it selects the nearest day. */
export function WeightChart({ entries, selected, onSelect }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const ticks = ticksFor(entries.map((e) => e.kg));
  const low = ticks[0];
  const high = ticks[ticks.length - 1];
  const firstDay = dayNumber(entries[0].date);
  const days = dayNumber(entries[entries.length - 1].date) - firstDay;

  const yFor = (kg: number) => INSET + (1 - (kg - low) / (high - low)) * (HEIGHT - 2 * INSET);
  // Days without an entry still take their space, so the slope reflects the real pace.
  const points = entries.map((entry) => ({
    ...entry,
    x: days === 0 ? width / 2 : INSET + ((dayNumber(entry.date) - firstDay) / days) * (width - 2 * INSET),
    y: yFor(entry.kg),
  }));
  const selectedPoint = points.find((p) => p.date === selected);
  const showDots = points.length <= MAX_DOTS;

  const selectNearest = (event: GestureResponderEvent) => {
    const x = event.nativeEvent.locationX;
    let nearest = points[0];
    for (const point of points) {
      if (Math.abs(point.x - x) < Math.abs(nearest.x - x)) nearest = point;
    }
    if (nearest.date !== selected) onSelect(nearest.date);
  };

  const first = entries[0];
  const last = entries[entries.length - 1];

  return (
    <View
      accessible
      accessibilityLabel={`Gráfico de peso: ${formatNumber(first.kg)} kg em ${formatDateKey(first.date)}, ${formatNumber(last.kg)} kg em ${formatDateKey(last.date)}.`}>
      <View style={styles.row}>
        <View style={styles.axis}>
          {ticks.map((tick) => (
            <ThemedText
              key={tick}
              type="small"
              themeColor="textSecondary"
              style={[styles.tickLabel, { top: yFor(tick) - TICK_LABEL_HEIGHT / 2 }]}>
              {formatNumber(tick)}
            </ThemedText>
          ))}
        </View>

        <View style={styles.plot} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {ticks.map((tick) => (
            <View
              key={tick}
              style={[styles.gridline, { top: yFor(tick), backgroundColor: theme.border }]}
            />
          ))}

          {width > 0 && (
            <>
              {selectedPoint && (
                <View
                  style={[
                    styles.crosshair,
                    { left: selectedPoint.x, backgroundColor: theme.textSecondary },
                  ]}
                />
              )}

              {points.slice(1).map((point, i) => {
                const previous = points[i];
                const dx = point.x - previous.x;
                const dy = point.y - previous.y;
                const length = Math.hypot(dx, dy);
                // Views rotate around their center, so the segment is placed by its midpoint.
                return (
                  <View
                    key={point.date}
                    style={[
                      styles.segment,
                      {
                        width: length,
                        left: (previous.x + point.x) / 2 - length / 2,
                        top: (previous.y + point.y) / 2 - LINE_WIDTH / 2,
                        backgroundColor: theme.tint,
                        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                      },
                    ]}
                  />
                );
              })}

              {points.map((point) => {
                const isSelected = point === selectedPoint;
                if (!showDots && !isSelected) return null;
                const size = (isSelected ? SELECTED_DOT_SIZE : DOT_SIZE) + 2 * RING;
                return (
                  <View
                    key={point.date}
                    style={[
                      styles.dot,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        left: point.x - size / 2,
                        top: point.y - size / 2,
                        backgroundColor: theme.tint,
                        borderColor: theme.backgroundElement,
                      },
                    ]}
                  />
                );
              })}
            </>
          )}

          {/* Sits above the marks so touch positions are always relative to the plot. */}
          <View
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={() => true}
            onResponderGrant={selectNearest}
            onResponderMove={selectNearest}
          />
        </View>
      </View>

      <View style={styles.dates}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDateKey(first.date)}
        </ThemedText>
        {days > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateKey(last.date)}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  axis: {
    width: AXIS_WIDTH,
    height: HEIGHT,
  },
  tickLabel: {
    position: 'absolute',
    left: 0,
    right: Spacing.two,
    lineHeight: TICK_LABEL_HEIGHT,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  plot: {
    flex: 1,
    height: HEIGHT,
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  crosshair: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  segment: {
    position: 'absolute',
    height: LINE_WIDTH,
    borderRadius: LINE_WIDTH / 2,
  },
  dot: {
    position: 'absolute',
    borderWidth: RING,
  },
  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: AXIS_WIDTH,
    marginTop: Spacing.one,
  },
});
