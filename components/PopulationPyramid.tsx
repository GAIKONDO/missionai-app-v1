'use client';

import { ResponsiveBar } from '@nivo/bar';

export interface PopulationData {
  age: string; // 年代（例: "0-4", "5-9", ...）
  male: number; // 男性人口
  female: number; // 女性人口
}

interface PopulationPyramidProps {
  data: PopulationData[];
  title?: string;
  height?: number;
}

export default function PopulationPyramid({
  data,
  title,
  height = 600,
}: PopulationPyramidProps) {
  // NivoのBarコンポーネント用にデータを変換
  // 男性は負の値、女性は正の値にして左右に分ける
  const chartData = data.map((d) => ({
    age: d.age,
    male: -d.male, // 負の値で左側に表示
    female: d.female, // 正の値で右側に表示
  }));

  // 最大値を計算（軸の範囲を設定するため）
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.male, d.female))
  );

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
      <ResponsiveBar
        data={chartData}
        keys={['male', 'female']}
        indexBy="age"
        margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
        padding={0.3}
        layout="horizontal"
        valueScale={{ type: 'linear', min: -maxValue * 1.1, max: maxValue * 1.1 }}
        indexScale={{ type: 'band', round: true }}
        colors={({ id }) => {
          if (id === 'male') return '#4A90E2'; // 青（男性）
          return '#FF6B9D'; // ピンク（女性）
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: (value) => {
            // 絶対値で表示
            const absValue = Math.abs(value);
            if (absValue >= 1000000) {
              return `${(absValue / 1000000).toFixed(1)}M`;
            } else if (absValue >= 1000) {
              return `${(absValue / 1000).toFixed(0)}K`;
            }
            return absValue.toString();
          },
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor="#333"
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'top-right',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: -30,
            itemsSpacing: 20,
            itemWidth: 80,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: 12,
            effects: [
              {
                on: 'hover',
                style: {
                  itemOpacity: 1,
                },
              },
            ],
          },
        ]}
        tooltip={({ id, value, indexValue }) => {
          const absValue = Math.abs(value as number);
          const label = id === 'male' ? '男性' : '女性';
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
                {indexValue}歳
              </div>
              <div>
                {label}: {absValue.toLocaleString()}人
              </div>
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
        // 中央に縦線を追加（カスタムレイヤー）
        layers={[
          'grid',
          'axes',
          'bars',
          'markers',
          ({ innerHeight, innerWidth, margin }) => {
            // 中央線を描画
            return (
              <line
                key="center-line"
                x1={innerWidth / 2 + margin.left}
                y1={margin.top}
                x2={innerWidth / 2 + margin.left}
                y2={innerHeight + margin.top}
                stroke="#333"
                strokeWidth={2}
                strokeDasharray="4,4"
              />
            );
          },
          'legends',
        ]}
      />
    </div>
  );
}

