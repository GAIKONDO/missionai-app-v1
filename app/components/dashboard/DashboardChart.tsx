'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Theme } from '@/lib/orgApi';

const DynamicVegaChart = dynamic(() => import('@/components/VegaChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      グラフを読み込み中...
    </div>
  ),
});

interface ChartDataItem {
  theme: string;
  themeId: string;
  organization: string;
  organizationId: string;
  count: number;
}

interface DashboardChartProps {
  chartData: ChartDataItem[];
  filteredThemes: Theme[];
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  selectedLevel: number | null;
  viewMode: 'all' | 'organization' | 'company' | 'person';
  onChartSignal: (signalName: string, value: any) => void;
}

export function DashboardChart({
  chartData,
  filteredThemes,
  selectedTypeFilter,
  selectedLevel,
  viewMode,
  onChartSignal,
}: DashboardChartProps) {
  // Vega-Liteのグラフ仕様を生成（メモ化でパフォーマンス向上）
  const chartSpec = useMemo(() => {
    if (chartData.length === 0) return null;

    // 組織ごとの色を自動生成（Vega-Liteのカテゴリカラースキームを使用）
    const organizations = Array.from(new Set(chartData.map(d => d.organization)));
    const maxColors = 20; // Vega-Liteのcategory20スキームは20色

    // レスポンシブ対応: 画面幅に応じて高さを調整
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'テーマごとの施策件数を組織別に積み上げて表示',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: chartData,
      },
      layer: [
        // 1. 積み上げ棒グラフ
        {
          mark: {
            type: 'bar',
            tooltip: true,
            cursor: 'pointer',
            cornerRadiusTopLeft: 4,
            cornerRadiusTopRight: 4,
            stroke: '#FFFFFF',
            strokeWidth: 1,
          },
          encoding: {
            x: {
              field: 'theme',
              type: 'ordinal',
              title: 'テーマ',
              scale: {
                // テーマは0件でも表示するため、すべてのテーマをdomainに含める
                domain: filteredThemes.map(t => t.title),
              },
              axis: {
                labelAngle: isMobile ? -90 : -45,
                labelLimit: isMobile ? 50 : 120,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#4B5563',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 12,
                domain: true,
                domainColor: '#E5E7EB',
                domainWidth: 1,
                tickSize: 0,
              },
            },
            y: {
              field: 'count',
              type: 'quantitative',
              title: '施策件数',
              axis: {
                grid: false,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#6B7280',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 12,
                domain: true,
                domainColor: '#E5E7EB',
                domainWidth: 1,
                tickSize: 0,
              },
              stack: 'zero', // 積み上げグラフ
            },
            color: {
              field: 'organization',
              type: 'nominal',
              title: viewMode === 'organization' ? '組織' : '事業会社',
              scale: {
                scheme: organizations.length <= maxColors ? 'category20' : 'category20b',
              },
              legend: {
                orient: isMobile ? 'bottom' : 'right',
                columns: isMobile ? 2 : 1,
                symbolLimit: organizations.length > 20 ? 50 : undefined,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#4B5563',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 8,
                symbolType: 'circle',
                symbolSize: 80,
                padding: 8,
                offset: isMobile ? 0 : 20,
              },
            },
            tooltip: [
              { field: 'theme', type: 'nominal', title: 'テーマ' },
              { field: 'organization', type: 'nominal', title: '組織' },
              { field: 'count', type: 'quantitative', title: '件数', format: 'd' },
            ],
          },
        },
        // 2. テーマごとの合計値を表示するテキストレイヤー
        {
          mark: {
            type: 'text',
            align: 'center',
            baseline: 'bottom',
            dy: -8,
            fontSize: isMobile ? 12 : 14,
            fontWeight: '600',
            fill: '#1A1A1A',
            font: 'var(--font-inter), var(--font-noto), sans-serif',
          },
          encoding: {
            x: {
              field: 'theme',
              type: 'ordinal',
            },
            y: {
              aggregate: 'sum',
              field: 'count',
              type: 'quantitative',
            },
            text: {
              aggregate: 'sum',
              field: 'count',
              type: 'quantitative',
              format: 'd',
            },
            tooltip: [
              { field: 'theme', type: 'nominal', title: 'テーマ' },
              {
                aggregate: 'sum',
                field: 'count',
                type: 'quantitative',
                title: '合計件数',
                format: 'd',
              },
            ],
          },
        },
      ],
      config: {
        view: {
          stroke: 'transparent',
        },
        background: 'transparent',
        axis: {
          labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
          titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
        },
        style: {
          'bar': {
            stroke: '#FFFFFF',
            strokeWidth: 1,
          },
        },
      },
    };
  }, [chartData, viewMode, filteredThemes]);

  if (!chartSpec || chartData.length === 0) {
    return null;
  }

  const levelLabel = selectedTypeFilter === 'company' 
    ? '事業会社別' 
    : selectedTypeFilter === 'person' 
    ? '個人別' 
    : `階層レベル${selectedLevel}`;

  return (
    <div style={{
      marginBottom: '32px',
      width: '100%',
      overflowX: 'auto',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        padding: '24px',
        overflow: 'hidden',
      }}>
        <div style={{
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #F3F4F6',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1A1A1A',
            margin: 0,
            fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
          }}>
            テーマ別施策件数
          </h3>
          <p style={{
            fontSize: '13px',
            color: '#6B7280',
            margin: '4px 0 0 0',
            fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
          }}>
            {levelLabel}
          </p>
        </div>
        <DynamicVegaChart
          spec={chartSpec}
          language="vega-lite"
          onSignal={onChartSignal}
          chartData={chartData}
          noBorder={true}
        />
      </div>
    </div>
  );
}

