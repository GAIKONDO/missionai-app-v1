'use client';

import { useMemo } from 'react';
import { ResponsiveRadialBar } from '@nivo/radial-bar';

export interface RadialBarData {
  id: string;
  data: Array<{
    x: string; // 期間（例: "2020", "Q1"など）
    y: number; // 値
  }>;
  color?: string;
}

interface BusinessRadialBarProps {
  data: RadialBarData[];
  title?: string;
  height?: number;
  maxValue?: number;
}

export default function BusinessRadialBar({
  data,
  title,
  height = 600,
  maxValue,
}: BusinessRadialBarProps) {
  // 最大値を計算（指定されていない場合）
  const calculatedMaxValue = useMemo(() => {
    if (maxValue) return maxValue;
    const allValues = data.flatMap(d => d.data.map(item => item.y));
    return Math.max(...allValues) * 1.1; // 10%のマージンを追加
  }, [data, maxValue]);

  return (
    <div style={{ width: '100%', height: `${height}px`, padding: '20px' }}>
      {title && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '20px',
            color: '#333',
          }}
        >
          {title}
        </div>
      )}
      <ResponsiveRadialBar
        data={data}
        endAngle={360}
        innerRadius={0.3}
        padding={0.1}
        cornerRadius={2}
        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
        maxValue={calculatedMaxValue}
        colors={{ scheme: 'nivo' }}
        enableRadialGrid={true}
        enableCircularGrid={true}
        radialAxisStart={{ tickSize: 5, tickPadding: 5, tickRotation: 0 }}
        circularAxisOuter={{ tickSize: 5, tickPadding: 12, tickRotation: 0 }}
        labelsSkipAngle={10}
        labelsRadiusOffset={0.6}
        labelsTextColor="#333"
        animate={true}
        motionConfig="gentle"
        transitionMode="startAngle"
        tooltip={({ data: tooltipData, value }: any) => {
          if (!tooltipData || value === undefined) return null;
          return (
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {tooltipData.x || 'N/A'}
              </div>
              <div>{typeof value === 'number' ? value.toLocaleString() : value}</div>
            </div>
          );
        }}
        theme={{
          axis: {
            domain: {
              line: {
                stroke: '#333',
                strokeWidth: 1,
              },
            },
            ticks: {
              line: {
                stroke: '#333',
                strokeWidth: 1,
              },
              text: {
                fill: '#333',
                fontSize: 11,
              },
            },
          },
          grid: {
            line: {
              stroke: '#e0e0e0',
              strokeWidth: 1,
              strokeDasharray: '2,2',
            },
          },
        }}
      />
    </div>
  );
}

