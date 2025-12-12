'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

// モーダルの状態をデバッグ用のuseEffectは後で追加
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { scaleOrdinal } from 'd3-scale';
import { callTauriCommand, onAuthStateChanged } from '@/lib/localFirebase';
import { findSimilarPagesHybrid } from '@/lib/pageEmbeddings';
import { PageMetadata } from '@/types/pageMetadata';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// DynamicPageを動的インポート（SSRを回避）
const DynamicPage = dynamic(
  () => import('@/components/pages/component-test/test-concept/DynamicPage'),
  { ssr: false }
);

interface GraphNode {
  id: string;
  label: string;
  type: 'page' | 'keyword';
  data: {
    pageId?: string;
    planId?: string;
    conceptId?: string;
    serviceId?: string;
    subMenuId?: string;
    pageTitle?: string;
    similarity?: number;
    isCompanyPlan?: boolean;
    keyword?: string;
  };
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  similarity: number;
}

interface KeywordPageRelationGraphProps {
  width?: number;
  height?: number;
  title?: string;
}

export default function KeywordPageRelationGraph({
  width = 1200,
  height = 600,
  title = 'キーワード検索：関連ページの関係性',
}: KeywordPageRelationGraphProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalPages, setModalPages] = useState<Array<{
    pageId: string;
    pageNumber: number;
    title: string;
    content: string;
    planId?: string;
    conceptId?: string;
    serviceId?: string;
    subMenuId?: string;
    isCompanyPlan?: boolean;
    similarity: number;
  }> | null>(null);
  const [isSinglePageModal, setIsSinglePageModal] = useState(false); // 単一ページモーダルかどうか
  const simulationRef = useRef<any>(null);
  const currentKeywordRef = useRef<string>('');
  const currentPagesRef = useRef<Array<{
    pageId: string;
    pageNumber: number;
    title: string;
    content: string;
    planId?: string;
    conceptId?: string;
    serviceId?: string;
    subMenuId?: string;
    isCompanyPlan?: boolean;
    similarity: number;
  }>>([]);
  const lastClickTimeRef = useRef<number>(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPageClickTimeRef = useRef<number>(0);
  const pageClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ノードの色設定
  const colorScale = useMemo(() => {
    return scaleOrdinal<string>()
      .domain(['keyword', 'page'])
      .range(['#4A90E2', '#9B59B6']); // キーワード: 青、ページ: 紫
  }, []);

  // ページ情報を取得（キャッシュ付き）
  const pageInfoCache = useRef<Map<string, {
    page: PageMetadata | null;
    planId?: string;
    conceptId?: string;
    serviceId?: string;
    subMenuId?: string;
    isCompanyPlan?: boolean;
  }>>(new Map());

  const getPageInfo = async (pageId: string): Promise<{
    page: PageMetadata | null;
    planId?: string;
    conceptId?: string;
    serviceId?: string;
    subMenuId?: string;
    isCompanyPlan?: boolean;
  }> => {
    // キャッシュをチェック
    if (pageInfoCache.current.has(pageId)) {
      return pageInfoCache.current.get(pageId)!;
    }

    try {
      const currentUser = await callTauriCommand('get_current_user', {});
      if (!currentUser) return { page: null };

      const userId = currentUser.uid;

      // 会社事業計画から検索
      const conditions = {
        field: 'userId',
        operator: '==',
        value: userId
      };
      const companyPlansResults = await callTauriCommand('query_get', {
        collectionName: 'companyBusinessPlan',
        conditions
      });

      for (const planItem of companyPlansResults || []) {
        const planData = planItem.data || planItem;
        const planDocId = planItem.id || planData.id;
        const pagesBySubMenu = planData.pagesBySubMenu || {};

        for (const [subMenuId, pages] of Object.entries(pagesBySubMenu)) {
          if (Array.isArray(pages)) {
            const page = pages.find((p: any) => p.id === pageId);
            if (page) {
              const result = {
                page: page as PageMetadata,
                planId: planDocId,
                subMenuId,
                isCompanyPlan: true,
              };
              pageInfoCache.current.set(pageId, result);
              return result;
            }
          }
        }
      }

      // 構想から検索
      const conceptsResults = await callTauriCommand('query_get', {
        collectionName: 'concepts',
        conditions
      });

      for (const conceptItem of conceptsResults || []) {
        const conceptData = conceptItem.data || conceptItem;
        const pagesBySubMenu = conceptData.pagesBySubMenu || {};
        const serviceId = conceptData.serviceId;

        for (const [subMenuId, pages] of Object.entries(pagesBySubMenu)) {
          if (Array.isArray(pages)) {
            const page = pages.find((p: any) => p.id === pageId);
            if (page) {
              const result = {
                page: page as PageMetadata,
                conceptId: conceptData.conceptId,
                serviceId,
                subMenuId,
                isCompanyPlan: false,
              };
              pageInfoCache.current.set(pageId, result);
              return result;
            }
          }
        }
      }
    } catch (error) {
      console.error('ページ情報取得エラー:', error);
    }

    const result = { page: null };
    pageInfoCache.current.set(pageId, result);
    return result;
  };

  // キーワード検索を実行
  const handleSearch = async () => {
    if (!keyword.trim()) {
      setError('キーワードを入力してください');
      return;
    }
    
    const currentUser = await callTauriCommand('get_current_user', {});
    if (!currentUser) {
      setError('ログインが必要です');
      return;
    }

    setSearching(true);
    setError(null);
    setNodes([]);
    setLinks([]);
    setModalPages(null); // モーダルを閉じる
    // キャッシュをクリア
    pageInfoCache.current.clear();

    try {
      // ハイブリッド検索を使用（精度向上）
      const similarPages = await findSimilarPagesHybrid(keyword, 20);

      if (similarPages.length === 0) {
        setError('関連するページが見つかりませんでした');
        setSearching(false);
        return;
      }

      // ページ情報を取得
      const pagesWithInfo = await Promise.all(
        similarPages.map(async (sp) => {
          const pageInfo = await getPageInfo(sp.pageId);
          return {
            ...sp,
            ...pageInfo,
            // scoreがある場合はscoreを、ない場合はsimilarityを使用（後方互換性）
            similarity: sp.score !== undefined ? sp.score : sp.similarity,
          };
        })
      );

      // キーワードノードを作成（中央に配置）
      const keywordNode: GraphNode = {
        id: 'keyword-node',
        label: keyword.trim(),
        type: 'keyword',
        data: {
          keyword: keyword.trim(),
        },
        fx: width / 2, // 中央に固定
        fy: height / 2, // 中央に固定
      };

      // ページノードを作成
      const pageNodes: GraphNode[] = pagesWithInfo
        .filter((p) => p.page)
        .map((p, index) => ({
          id: `page-${p.pageId}`,
          label: p.page?.title || `ページ ${index + 1}`,
          type: 'page' as const,
          data: {
            pageId: p.pageId,
            planId: p.planId,
            conceptId: p.conceptId,
            serviceId: p.serviceId,
            subMenuId: p.subMenuId,
            pageTitle: p.page?.title || '',
            similarity: p.similarity,
            isCompanyPlan: p.isCompanyPlan,
          },
        }));

      // キーワードノードとページノードを結合
      const newNodes: GraphNode[] = [keywordNode, ...pageNodes];

      // リンクを作成（キーワードノードから各ページノードへ）
      const newLinks: GraphLink[] = pageNodes.map((pageNode) => ({
        source: keywordNode.id,
        target: pageNode.id,
        similarity: pageNode.data.similarity || 0.5,
      }));

      // 追加のリンクを作成（関連ページIDと類似度を使用）
      for (let i = 0; i < pageNodes.length; i++) {
        const node1 = pageNodes[i];
        const page1 = pagesWithInfo.find((p) => p.pageId === node1.data.pageId)?.page;

        if (page1?.relatedPageIds) {
          for (const relatedPageId of page1.relatedPageIds) {
            const relatedNode = pageNodes.find(
              (n) => n.data.pageId === relatedPageId
            );
            if (relatedNode) {
              // 既存のリンクをチェック（重複を避ける）
              const linkExists = newLinks.some(
                (link) => {
                  const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                  const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                  return (sourceId === node1.id && targetId === relatedNode.id) ||
                         (sourceId === relatedNode.id && targetId === node1.id);
                }
              );
              if (!linkExists) {
                newLinks.push({
                  source: node1.id,
                  target: relatedNode.id,
                  similarity: 0.5, // デフォルトの類似度
                });
              }
            }
          }
        }

        // 類似度が高いページ同士にもリンクを作成（閾値: 0.7以上）
        for (let j = i + 1; j < pageNodes.length; j++) {
          const node2 = pageNodes[j];
          const similarity1 = node1.data.similarity || 0;
          const similarity2 = node2.data.similarity || 0;

          // 両方のノードが高い類似度を持つ場合、リンクを作成
          if (similarity1 > 0.7 && similarity2 > 0.7) {
            const linkExists = newLinks.some(
              (link) => {
                const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                return (sourceId === node1.id && targetId === node2.id) ||
                       (sourceId === node2.id && targetId === node1.id);
              }
            );
            if (!linkExists) {
              newLinks.push({
                source: node1.id,
                target: node2.id,
                similarity: (similarity1 + similarity2) / 2,
              });
            }
          }
        }
      }

      setNodes(newNodes);
      setLinks(newLinks);

      // モーダル用のページ情報を保存
      const modalPagesData = pagesWithInfo
        .filter((p) => p.page)
        .map((p) => ({
          pageId: p.pageId,
          pageNumber: p.page?.pageNumber || 1,
          title: p.page?.title || '',
          content: p.page?.content || '',
          planId: p.planId,
          conceptId: p.conceptId,
          serviceId: p.serviceId,
          subMenuId: p.subMenuId,
          isCompanyPlan: p.isCompanyPlan,
          similarity: p.similarity,
        }))
        .sort((a, b) => b.similarity - a.similarity); // 類似度順にソート
      
      console.log('検索完了: モーダル用データを保存', {
        keyword: keyword.trim(),
        pagesCount: modalPagesData.length,
        pages: modalPagesData.map(p => ({ id: p.pageId, title: p.title }))
      });
      
      // モーダル用の状態を保存（キーワードノードダブルクリック時に使用）
      // 検索キーワードをrefに保存
      currentKeywordRef.current = keyword.trim();
      currentPagesRef.current = modalPagesData;
    } catch (err: any) {
      console.error('検索エラー:', err);
      setError(err.message || '検索に失敗しました');
    } finally {
      setSearching(false);
    }
  };

  // モーダルの状態をデバッグ
  useEffect(() => {
    if (modalPages) {
      console.log('modalPages状態更新:', `${modalPages.length}件のページ`);
    }
  }, [modalPages]);

  // D3.jsでグラフを描画
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // シミュレーションを停止
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // リンクを描画
    const link = svg
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.similarity) * 2);

    // ノードを描画
    const node = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => d.type === 'keyword' ? 15 : 8) // キーワードノードは大きく
      .attr('fill', (d) => colorScale(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', (d) => d.type === 'keyword' ? 3 : 2)
      .style('cursor', (d) => d.type === 'keyword' ? 'pointer' : 'pointer')
      .on('click', (event, d) => {
        // キーワードノードのダブルクリック検出（タイマーベース）
        if (d.type === 'keyword') {
          event.preventDefault();
          event.stopPropagation();
          
          const now = Date.now();
          const timeSinceLastClick = now - lastClickTimeRef.current;
          
          console.log('キーワードノードクリック:', {
            timeSinceLastClick,
            pagesCount: currentPagesRef.current.length
          });
          
          // 既存のタイマーをクリア
          if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }
          
          // 300ms以内の2回目のクリックはダブルクリックとして扱う
          if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
            console.log('ダブルクリック検出！');
            lastClickTimeRef.current = 0; // リセット
            
            // モーダルを表示（全検索結果）
            const pagesToShow = [...currentPagesRef.current];
            console.log('モーダルに表示するページ:', pagesToShow.length, '件');
            if (pagesToShow.length > 0) {
              setModalPages(pagesToShow);
              setIsSinglePageModal(false); // 複数ページモーダル
              console.log('setModalPages呼び出し完了');
            } else {
              console.warn('ページデータがありません');
            }
            return;
          }
          
          // シングルクリックの場合はタイマーを設定
          lastClickTimeRef.current = now;
          clickTimerRef.current = setTimeout(() => {
            // シングルクリックの場合は何もしない
            console.log('シングルクリック（タイムアウト）');
            clickTimerRef.current = null;
            lastClickTimeRef.current = 0;
          }, 300);
          
          return;
        }
        
        // ページノードのダブルクリック検出（タイマーベース）
        if (d.type === 'page') {
          event.preventDefault();
          event.stopPropagation();
          
          const now = Date.now();
          const timeSinceLastClick = now - lastPageClickTimeRef.current;
          
          console.log('ページノードクリック:', {
            pageId: d.data.pageId,
            timeSinceLastClick
          });
          
          // 既存のタイマーをクリア
          if (pageClickTimerRef.current) {
            clearTimeout(pageClickTimerRef.current);
            pageClickTimerRef.current = null;
          }
          
          // 300ms以内の2回目のクリックはダブルクリックとして扱う
          if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
            console.log('ページノードダブルクリック検出！');
            lastPageClickTimeRef.current = 0; // リセット
            
            // クリックされたページの情報を取得
            const clickedPage = currentPagesRef.current.find(
              p => p.pageId === d.data.pageId
            );
            
            if (clickedPage) {
              // そのページ1件だけをモーダルで表示
              console.log('モーダルに表示するページ:', clickedPage.title);
              setModalPages([clickedPage]);
              setIsSinglePageModal(true); // 単一ページモーダル
            } else {
              // ページ情報が見つからない場合は、ノードデータから作成
              const nodeData = d.data;
              const fallbackPage = {
                pageId: nodeData.pageId || '',
                pageNumber: 1,
                title: nodeData.pageTitle || d.label,
                content: '',
                planId: nodeData.planId,
                conceptId: nodeData.conceptId,
                serviceId: nodeData.serviceId,
                subMenuId: nodeData.subMenuId,
                isCompanyPlan: nodeData.isCompanyPlan,
                similarity: nodeData.similarity || 0.5,
              };
              
              // ページ情報を非同期で取得
              getPageInfo(nodeData.pageId || '').then(pageInfo => {
                if (pageInfo.page) {
                  const fullPage = {
                    pageId: pageInfo.page.id,
                    pageNumber: pageInfo.page.pageNumber,
                    title: pageInfo.page.title,
                    content: pageInfo.page.content,
                    planId: pageInfo.planId,
                    conceptId: pageInfo.conceptId,
                    serviceId: pageInfo.serviceId,
                    subMenuId: pageInfo.subMenuId,
                    isCompanyPlan: pageInfo.isCompanyPlan,
                    similarity: nodeData.similarity || 0.5,
                  };
                  setModalPages([fullPage]);
                  setIsSinglePageModal(true); // 単一ページモーダル
                } else {
                  setModalPages([fallbackPage]);
                  setIsSinglePageModal(true); // 単一ページモーダル
                }
              });
            }
            return;
          }
          
          // シングルクリックの場合はタイマーを設定
          lastPageClickTimeRef.current = now;
          pageClickTimerRef.current = setTimeout(() => {
            // シングルクリックの場合は何もしない
            console.log('ページノードシングルクリック（タイムアウト）');
            pageClickTimerRef.current = null;
            lastPageClickTimeRef.current = 0;
          }, 300);
          
          return;
        }
      })
      .call(
        drag<any, GraphNode>()
          .on('start', (event, d) => {
            // キーワードノードはドラッグできない
            if (d.type === 'keyword') return;
            if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            // キーワードノードはドラッグできない
            if (d.type === 'keyword') return;
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            // キーワードノードはドラッグできない
            if (d.type === 'keyword') return;
            if (!event.active) simulationRef.current.alphaTarget(0);
            // キーワードノード以外は固定を解除
              d.fx = null;
              d.fy = null;
          })
      );

    // ラベルを描画
    const label = svg
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('font-size', '12px')
      .attr('dx', 12)
      .attr('dy', 4)
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // フォースシミュレーション
    const simulation = forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            // キーワードノードからのリンクは少し長めに
            const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
            const targetId = typeof d.target === 'string' ? d.target : d.target.id;
            if (sourceId === 'keyword-node' || targetId === 'keyword-node') {
              return 150; // キーワードノードからの距離
            }
            return 100 / (d.similarity + 0.1);
          })
      )
      .force('charge', forceManyBody().strength((d) => {
        // キーワードノードは反発力を強く
        const node = d as GraphNode;
        return node.type === 'keyword' ? -500 : -300;
      }))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide().radius((d) => {
        const node = d as GraphNode;
        return node.type === 'keyword' ? 20 : 12;
      }));

    simulationRef.current = simulation;

    // シミュレーションの更新
    simulation.on('tick', () => {
      // キーワードノードを常に中央に固定
      const keywordNode = nodes.find(n => n.type === 'keyword');
      if (keywordNode) {
        keywordNode.fx = width / 2;
        keywordNode.fy = height / 2;
      }

      link
        .attr('x1', (d) => {
          const source = typeof d.source === 'string' ? nodes.find((n) => n.id === d.source) : d.source;
          return source?.x || 0;
        })
        .attr('y1', (d) => {
          const source = typeof d.source === 'string' ? nodes.find((n) => n.id === d.source) : d.source;
          return source?.y || 0;
        })
        .attr('x2', (d) => {
          const target = typeof d.target === 'string' ? nodes.find((n) => n.id === d.target) : d.target;
          return target?.x || 0;
        })
        .attr('y2', (d) => {
          const target = typeof d.target === 'string' ? nodes.find((n) => n.id === d.target) : d.target;
          return target?.y || 0;
        });

      node.attr('cx', (d) => d.x || 0).attr('cy', (d) => d.y || 0);

      label.attr('x', (d) => d.x || 0).attr('y', (d) => d.y || 0);
    });

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [nodes, links, width, height, colorScale, router]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
          {title}
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !searching) {
                handleSearch();
              }
            }}
            placeholder="キーワードを入力..."
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              fontSize: '14px',
            }}
            disabled={searching}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !keyword.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: searching
                ? 'var(--color-text-light)'
                : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: searching ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {searching ? '検索中...' : '検索'}
          </button>
        </div>
        {error && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}
        {nodes.length > 0 && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--color-text-light)',
            }}
          >
            {nodes.filter(n => n.type === 'page').length}件のページが見つかりました
            {nodes.some(n => n.type === 'keyword') && (
              <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-text-light)' }}>
                （キーワードノードをダブルクリックでページ一覧を表示）
              </span>
            )}
          </div>
        )}
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid var(--color-border-color)', borderRadius: '4px' }}
      />

      {/* モーダル：キーワード検索結果のページ一覧 */}
      {modalPages && modalPages.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalPages(null);
              setIsSinglePageModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {isSinglePageModal ? (
                  modalPages[0]?.title || 'ページ詳細'
                ) : (
                  <>「{currentKeywordRef.current}」の検索結果 ({modalPages.length}件)</>
                )}
              </h3>
              <button
                onClick={() => {
                  setModalPages(null);
                  setIsSinglePageModal(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              {modalPages.map((page, index) => (
                <div key={page.pageId} style={{ marginBottom: index < modalPages.length - 1 ? '40px' : 0 }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                        {page.title}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        類似度: {(page.similarity * 100).toFixed(1)}%
                        {page.isCompanyPlan && page.planId && (
                          <span style={{ marginLeft: '12px' }}>
                            会社事業計画
                          </span>
                        )}
                        {page.serviceId && page.conceptId && (
                          <span style={{ marginLeft: '12px' }}>
                            構想: {page.serviceId} / {page.conceptId}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (page.isCompanyPlan && page.planId && page.subMenuId) {
                          router.push(
                            `/business-plan/company/${page.planId}/${page.subMenuId}`
                          );
                        } else if (
                          page.serviceId &&
                          page.conceptId &&
                          page.subMenuId
                        ) {
                          router.push(
                            `/business-plan/services/${page.serviceId}/${page.conceptId}/${page.subMenuId}`
                          );
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      ページを開く
                    </button>
                  </div>
                  <DynamicPage
                    pageId={page.pageId}
                    pageNumber={page.pageNumber}
                    title={page.title}
                    content={page.content}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

