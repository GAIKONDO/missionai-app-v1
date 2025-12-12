'use client';

import { ResponsiveSunburst } from '@nivo/sunburst';

export interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
  color?: string;
}

interface BusinessSunburstProps {
  data: SunburstNode;
  title?: string;
  height?: number;
}

export default function BusinessSunburst({
  data,
  title,
  height = 600,
}: BusinessSunburstProps) {
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
      <ResponsiveSunburst
        data={data}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        id="name"
        value="value"
        cornerRadius={2}
        borderWidth={2}
        borderColor="#fff"
        colors={{ scheme: 'nivo' }}
        childColor={{
          from: 'color',
          modifiers: [['brighter', 0.1]],
        }}
        enableArcLabels={true}
        arcLabel={(d) => {
          // セグメントが十分大きい場合のみラベルを表示
          if (d.depth > 0 && d.value && d.value > 0) {
            return d.id as string;
          }
          return '';
        }}
        arcLabelsRadiusOffset={0.5}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor="#333"
        tooltip={({ id, value, depth }) => (
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
              {id}
            </div>
            {value !== undefined && (
              <div>
                規模: {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
            )}
            <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
              階層: {depth}
            </div>
          </div>
        )}
        theme={{
          labels: {
            text: {
              fontSize: 11,
              fontWeight: 500,
            },
          },
        }}
      />
    </div>
  );
}

