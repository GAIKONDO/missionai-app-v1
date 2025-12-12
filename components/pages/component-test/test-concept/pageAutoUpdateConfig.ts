/**
 * ページコンポーネントの自動更新設定
 * 各ページの自動更新ルールを定義します
 */

export interface PageAutoUpdateConfig {
  serviceId: string;
  conceptId: string;
  subMenuId?: string; // undefinedの場合はすべてのサブメニューに適用
  pageId: string;
  title?: string; // 更新時にタイトルも更新する場合
  content: string; // HTML形式のコンテンツ
  shouldUpdate?: (currentContent: string) => boolean; // 更新が必要かどうかを判定する関数（デフォルト: 常に更新）
}

// 「はじめに」のコンテンツ
const introductionContent = `<div style="margin-bottom: 40px">
  <div class="key-message-container" style="margin-bottom: 48px">
    <h2 class="key-message-title" style="margin: 0 0 16px 0; line-height: 1.4">
      なぜ出産・育児世代は同じ課題や悩みを経験しなければならないのか?
    </h2>
    <p class="key-message-subtitle">
      ノウハウが共有化されず、出産・育児世代の負担になっている
    </p>
  </div>

  <!-- 3つの問題カード -->
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 48px">
    <!-- 精神的な不安 -->
    <div class="anxiety-card" style="background: #FEF2F2; border-radius: 12px; padding: 24px; position: relative">
      <div style="position: absolute; top: 12px; right: 12px; background: #FCA5A5; color: #991B1B; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600">
        精神的な不安
      </div>
      <div style="width: 64px; height: 64px; background: #FEE2E2; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px">
        <div style="font-size: 32px; color: #F87171; font-weight: 700">$</div>
      </div>
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1F2937; line-height: 1.4">
        情報不足による精神的な不安
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #4B5563; line-height: 1.8; font-size: 14px">
        <li>そもそも選択肢があることを知らない</li>
        <li>出産・育児への不安や孤立感が生まれる</li>
      </ul>
    </div>

    <!-- 経済的な不安 -->
    <div class="anxiety-card" style="background: #FFFBEB; border-radius: 12px; padding: 24px; position: relative">
      <div style="position: absolute; top: 12px; right: 12px; background: #FCD34D; color: #92400E; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600">
        経済的な不安
      </div>
      <div style="width: 64px; height: 64px; background: #FEF3C7; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px">
        <div style="font-size: 32px; color: #F59E0B; font-weight: 700">$</div>
      </div>
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1F2937; line-height: 1.4">
        費用の見通しが立たない不安
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #4B5563; line-height: 1.8; font-size: 14px">
        <li>子育てにかかる費用がわからない</li>
        <li>支援制度を活用できず経済的な不安が続く</li>
      </ul>
    </div>

    <!-- 見通しの不安 -->
    <div class="anxiety-card" style="background: #F9FAFB; border-radius: 12px; padding: 24px; position: relative">
      <div style="position: absolute; top: 12px; right: 12px; background: #D1D5DB; color: #374151; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600">
        見通しの不安
      </div>
      <div style="width: 64px; height: 64px; background: #F3F4F6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px">
        <div style="font-size: 32px; color: #9CA3AF; font-weight: 700">⏰</div>
      </div>
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1F2937; line-height: 1.4">
        いつ何をすればいいかわからない不安
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #4B5563; line-height: 1.8; font-size: 14px">
        <li>計画が立てられず準備ができない</li>
        <li>申請タイミングを見逃す不安が続く</li>
      </ul>
    </div>
  </div>

  <!-- 解決策セクション -->
  <div style="background: #F9FAFB; border-radius: 12px; padding: 32px">
    <div style="display: flex; align-items: center; margin-bottom: 32px">
      <div style="width: 48px; height: 48px; background: #1F2937; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0">
        <div style="color: white; font-size: 24px; font-weight: 700">✓</div>
      </div>
      <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #1F2937; line-height: 1.4">
        パーソナルな情報分析とワンストップサービスにより、一人ひとりに最適な支援を提供
      </h2>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px">
      <div class="solution-card">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1F2937">
          情報の一元管理
        </h3>
        <p style="margin: 0; color: #4B5563; line-height: 1.6; font-size: 14px">
          分散した支援制度を一箇所に集約
        </p>
      </div>
      <div class="solution-card">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1F2937">
          パーソナル分析
        </h3>
        <p style="margin: 0; color: #4B5563; line-height: 1.6; font-size: 14px">
          個人の状況に合わせた最適な支援を提案
        </p>
      </div>
      <div class="solution-card">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1F2937">
          ワンストップサービス
        </h3>
        <p style="margin: 0; color: #4B5563; line-height: 1.6; font-size: 14px">
          申請から利用まで一貫してサポート
        </p>
      </div>
    </div>
  </div>
</div>`;

// 「1. 出産支援パーソナルアプリケーションとは」のコンテンツ
const maternitySupportIntroContent = `<div style="margin-bottom: 40px">
  <!-- キーメッセージ - 最大化 -->
  <div class="key-message-container">
    <h2 class="key-message-title">
      必要な支援を見逃さない、<wbr />安心の出産・育児を。
    </h2>
    <p class="key-message-subtitle">
      妊娠・出産・育児を、もっとスマートに、もっと確実に。
    </p>
  </div>
  <div style="margin-bottom: 24px">
    <p style="margin-bottom: 16px; padding-left: 11px; color: var(--color-text); line-height: 1.8; font-size: 14px">
      妊娠・出産・育児に関する各種支援制度の情報を一元管理し、ユーザーが適切な支援を受けられるようサポートするWebアプリケーションです。ユーザーフレンドリーな設計により、直感的で使いやすいインターフェースを提供します。
    </p>
    <div style="margin-bottom: 16px; padding-left: 11px; display: flex; gap: 24px; align-items: flex-start">
      <div style="flex-shrink: 0">
        <img
          src="/Gemini_Generated_Image_uj5ghguj5ghguj5g.png"
          alt="出産支援パーソナルアプリケーション"
          style="width: 400px; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div style="flex: 1; min-width: 0">
        <div style="margin-bottom: 20px">
          <h5 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--color-text); border-left: 3px solid var(--color-primary); padding-left: 8px">
            個人への貢献
          </h5>
          <p style="margin-bottom: 0; padding-left: 11px; font-size: 14px; line-height: 1.8; color: var(--color-text)">
            支援制度の情報を一元管理し、必要な支援を見逃すことなく受けられるようサポートします。パーソナル分析や収支概算により、経済的な不安を軽減し、安心して出産・育児を迎えられます。
          </p>
        </div>
        <div style="margin-bottom: 20px">
          <h5 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--color-text); border-left: 3px solid var(--color-primary); padding-left: 8px">
            企業への貢献
          </h5>
          <p style="margin-bottom: 0; padding-left: 11px; font-size: 14px; line-height: 1.8; color: var(--color-text)">
            従業員の満足度向上と離職率の低下に貢献します。くるみん認定や健康経営優良法人認定の取得支援を通じて、企業の社会的評価向上をサポートします。
          </p>
        </div>
        <div style="margin-bottom: 0">
          <h5 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--color-text); border-left: 3px solid var(--color-primary); padding-left: 8px">
            社会への貢献
          </h5>
          <p style="margin-bottom: 0; padding-left: 11px; font-size: 14px; line-height: 1.8; color: var(--color-text)">
            すべての妊婦・育児家庭が、必要な支援制度を見逃すことなく、安心して出産・育児を迎えられる社会の実現に貢献します。様々なパートナーと連携し、ワンストップで必要なサービスの利用を実現します。
          </p>
        </div>
      </div>
    </div>
  </div>
</div>`;

// 「2. アプリケーションの目的」のコンテンツ
const applicationPurposeContent = `<div style="margin-bottom: 40px">
  <!-- メイン見出し -->
  <div style="margin-bottom: 24px; text-align: center">
    <h2 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700; color: #1F2937; line-height: 1.4; letter-spacing: -0.5px">
      多くの人が困っていること
    </h2>
    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #6B7280; letter-spacing: 0.3px; line-height: 1.6">
      情報の分散、手続きの複雑さ、費用の不明確さなど、出産・育児を迎える多くの人が直面する共通の課題
    </p>
  </div>

  <!-- 8つの課題（2行×4列のグリッド） -->
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 24px; padding-left: 11px">
    <!-- 1. 情報が分散 -->
    <div class="challenge-item" style="text-align: center">
      <div class="challenge-icon-container" style="width: 80px; height: 80px; border-radius: 50%; background-color: #5A6578; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: var(--color-text)">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px">情報が分散</div>
        <div style="font-size: 12px; color: var(--color-text-light)">受けられる制度が分からない</div>
      </div>
    </div>

    <!-- 2. 制度の把握が困難 -->
    <div class="challenge-item" style="text-align: center">
      <div class="challenge-icon-container" style="width: 80px; height: 80px; border-radius: 50%; background-color: #5A6578; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: var(--color-text)">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px">制度の把握が困難</div>
        <div style="font-size: 12px; color: var(--color-text-light)">企業・自治体の制度を把握しきれない</div>
      </div>
    </div>

    <!-- 3. 手続きが複雑 -->
    <div class="challenge-item" style="text-align: center">
      <div class="challenge-icon-container" style="width: 80px; height: 80px; border-radius: 50%; background-color: #5A6578; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: var(--color-text)">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px">手続きが複雑</div>
        <div style="font-size: 12px; color: var(--color-text-light)">いつ何をすればよいか分からない</div>
      </div>
    </div>

    <!-- 4. 必要な書類が不明 -->
    <div class="challenge-item" style="text-align: center">
      <div class="challenge-icon-container" style="width: 80px; height: 80px; border-radius: 50%; background-color: #5A6578; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: var(--color-text)">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px">必要な書類が不明</div>
        <div style="font-size: 12px; color: var(--color-text-light)">申請に必要な書類や手続きが分からない</div>
      </div>
    </div>

    <!-- 5. 期限を逃す -->
    <div class="challenge-item" style="text-align: center">
      <div class="challenge-icon-container" style="width: 80px; height: 80px; border-radius: 50%; background-color: #5A6578; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: var(--color-text)">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px">期限を逃す</div>
        <div style="font-size: 12px; color: var(--color-text-light)">支援を受けられない</div>
      </div>
    </div>

    <!-- 6. 費用が不明 -->
    <div class="challenge-item" style="text-align: center">
      <div class="challenge-icon-container" style="width: 80px; height: 80px; border-radius: 50%; background-color: #5A6578; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: var(--color-text)">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px">費用が不明</div>
        <div style="font-size: 12px; color: var(--color-text-light)">経済的な不安がある</div>
      </div>
    </div>

    <!-- 7. 相談場所がない -->
    <div class="challenge-item" style="text-align: center">
      <div class="challenge-icon-container" style="width: 80px; height: 80px; border-radius: 50%; background-color: #5A6578; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: var(--color-text)">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px">相談場所がない</div>
        <div style="font-size: 12px; color: var(--color-text-light)">疑問や不安をすぐに解決できない</div>
      </div>
    </div>

    <!-- 8. 情報共有が困難 -->
    <div class="challenge-item" style="text-align: center">
      <div class="challenge-icon-container" style="width: 80px; height: 80px; border-radius: 50%; background-color: #5A6578; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: var(--color-text)">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px">情報共有が困難</div>
        <div style="font-size: 12px; color: var(--color-text-light)">家族と協力して育児を進められない</div>
      </div>
    </div>
  </div>

  <!-- なぜこれまで実現できなかったのか -->
  <div style="margin-bottom: 32px">
    <div style="margin-bottom: 32px; text-align: center">
      <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; color: var(--color-text); line-height: 1.3; letter-spacing: -0.5px">
        なぜこれまで実現できなかったのか
      </h2>
      <p style="margin: 0; font-size: 18px; font-weight: 500; color: var(--color-text); letter-spacing: 0.3px; line-height: 1.6">
        従来のアプリケーションやサービスでは、以下の理由から、これらの課題を解決することが困難でした。
      </p>
    </div>
    <!-- 5つの理由のボックス（横一列に配置） -->
    <div style="display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; justify-content: space-between">
      <!-- 1. 情報の分散と見づらさ -->
      <div class="reason-card" style="flex: 1 1 calc(20% - 13px); min-width: 180px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
          情報の分散と見づらさ
        </h3>
        <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
          支援制度は様々な主体が提供しており、それぞれのWebサイトが独立しているため、情報を探すだけでも一苦労である。
        </p>
      </div>

      <!-- 2. パーソナライズ化のコスト -->
      <div class="reason-card" style="flex: 1 1 calc(20% - 13px); min-width: 180px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
          パーソナライズ化のコスト
        </h3>
        <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
          各ユーザーの状況に応じた情報提供には、大量のデータ管理と複雑なロジックが必要で、費用対効果が取れなかった。
        </p>
      </div>

      <!-- 3. 24時間365日のサポート -->
      <div class="reason-card" style="flex: 1 1 calc(20% - 13px); min-width: 180px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
          24時間365日のサポート
        </h3>
        <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
          育児の疑問や不安は時間を選ばず発生するが、人的リソースによる24時間対応はコストが高すぎる。
        </p>
      </div>

      <!-- 4. 複雑な申請フローの可視化 -->
      <div class="reason-card" style="flex: 1 1 calc(20% - 13px); min-width: 180px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
          複雑な申請フローの可視化
        </h3>
        <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
          制度ごとに異なる申請フローを可視化するには、専門知識とデザイン力の両立が必要で、スケーラブルな仕組みがなかった。
        </p>
      </div>

      <!-- 5. 多様なパートナーとの連携 -->
      <div class="reason-card" style="flex: 1 1 calc(20% - 13px); min-width: 180px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
          多様なパートナーとの連携
        </h3>
        <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
          様々なサービスと連携し、ワンストップで提供するには、個別の連携開発が必要で、拡張性に限界があった。
        </p>
      </div>
    </div>
  </div>
</div>`;

// 自動更新設定の配列
export const pageAutoUpdateConfigs: PageAutoUpdateConfig[] = [
  // own-service/maternity-support-componentized/overview/page-1764467460467
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467460467',
    title: 'はじめに',
    content: introductionContent,
    shouldUpdate: (currentContent: string) => {
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('なぜ出産・育児世代は同じ課題や悩みを経験しなければならないのか') ||
             !currentContent.includes('anxiety-card') ||
             !currentContent.includes('solution-card');
    },
  },
  // own-service/maternity-support-componentized/overview/page-1764467493014
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467493014',
    title: '1. 出産支援パーソナルアプリケーションとは',
    content: maternitySupportIntroContent,
    shouldUpdate: (currentContent: string) => {
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('必要な支援を見逃さない、');
    },
  },
  // own-service/maternity-support-componentized/overview/page-1764467507026
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467507026',
    title: '2. アプリケーションの目的',
    content: applicationPurposeContent,
    shouldUpdate: (currentContent: string) => {
      // クラスが含まれていない場合は更新
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('多くの人が困っていること') ||
             !currentContent.includes('challenge-item') ||
             !currentContent.includes('reason-card');
    },
  },
  // own-service/maternity-support-componentized/overview/page-1764467516534
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467516534',
    title: '3. AIネイティブ設計',
    content: `<div style="margin-bottom: 40px">
  <!-- メイン見出し -->
  <div style="margin-bottom: 32px; text-align: center">
    <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; color: var(--color-text); line-height: 1.3; letter-spacing: -0.5px">
      なぜAIネイティブ設計だと可能なのか
    </h2>
    <p style="margin: 0; font-size: 18px; font-weight: 500; color: var(--color-text); letter-spacing: 0.3px; line-height: 1.6">
      AIネイティブ設計により、自動化・パーソナライズ化・継続的改善を低コストで実現
    </p>
  </div>
  
  <p style="margin-bottom: 24px; padding-left: 11px; color: var(--color-text); line-height: 1.8; font-size: 14px">
    AIネイティブ設計により、以下のことが可能になります。
  </p>

  <!-- Mermaid図 -->
  <div class="mermaid-diagram-container" style="margin-bottom: 32px; padding-left: 11px">
    <div 
      class="mermaid" 
      data-mermaid-diagram="ai-native"
      style="width: 100%; max-width: 100%; overflow-x: auto; background-color: #fff; border-radius: 8px; padding: 20px; border: 1px solid var(--color-border-color)"
    >
graph TB
    Center["<span style='font-size: 24px; font-weight: bold; color: #ffffff;'>AIネイティブ設計</span>"]
    
    A1["<span style='font-size: 14px; font-weight: bold;'>自動情報収集・更新</span><br/><span style='font-size: 12px;'>常に最新の情報を提供</span>"]
    A2["<span style='font-size: 14px; font-weight: bold;'>パーソナライズ化</span><br/><span style='font-size: 12px;'>個別最適化を低コストで実現</span>"]
    A3["<span style='font-size: 14px; font-weight: bold;'>24時間365日サポート</span><br/><span style='font-size: 12px;'>専門知識に基づく即座の対応</span>"]
    A4["<span style='font-size: 14px; font-weight: bold;'>自動可視化</span><br/><span style='font-size: 12px;'>複雑なフローを分かりやすく</span>"]
    A5["<span style='font-size: 14px; font-weight: bold;'>パートナー連携</span><br/><span style='font-size: 12px;'>ワンストップでサービス提供</span>"]
    A6["<span style='font-size: 14px; font-weight: bold;'>継続的改善</span><br/><span style='font-size: 12px;'>ユーザーデータから自動改善</span>"]
    A7["<span style='font-size: 14px; font-weight: bold;'>ユーザーフレンドリーな<br/>UI設計</span><br/><span style='font-size: 12px;'>直感的で使いやすい<br/>インターフェース</span>"]
    
    Center --> A1
    Center --> A2
    Center --> A3
    Center --> A4
    Center --> A5
    Center --> A6
    Center --> A7
    
    style Center fill:#667eea,stroke:#4c51bf,stroke-width:1px,color:#ffffff,font-size:24px
    style A1 fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,font-size:14px
    style A2 fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,font-size:14px
    style A3 fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,font-size:14px
    style A4 fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,font-size:14px
    style A5 fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,font-size:14px
    style A6 fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,font-size:14px
    style A7 fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,font-size:14px
    </div>
  </div>

  <!-- 7つのカード（上段） -->
  <div style="display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; justify-content: space-between; padding-left: 11px">
    <!-- 1. 自動情報収集・更新 -->
    <div class="ai-native-card" style="flex: 1 1 calc(14.28% - 14px); min-width: 140px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
        AIによる自動情報収集・更新
      </h3>
      <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
        AIエージェントが分散した情報源から自動的に情報を収集・更新し、常に最新の情報を提供できる。手動での情報管理が不要となる。
      </p>
    </div>

    <!-- 2. パーソナライズ化の低コスト実現 -->
    <div class="ai-native-card" style="flex: 1 1 calc(14.28% - 14px); min-width: 140px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
        パーソナライズ化の低コスト実現
      </h3>
      <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
        AIがユーザーの状況を理解し、必要な情報を自動的に抽出・提示することで、従来は困難だった個別最適化が低コストで実現できる。
      </p>
    </div>

    <!-- 3. 24時間365日のAIアシスタント -->
    <div class="ai-native-card" style="flex: 1 1 calc(14.28% - 14px); min-width: 140px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
        24時間365日のAIアシスタント
      </h3>
      <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
        LLMを活用したAIアシスタントにより、専門知識に基づいた相談対応を24時間365日、低コストで提供できる。
      </p>
    </div>

    <!-- 4. 複雑なフローの自動可視化 -->
    <div class="ai-native-card" style="flex: 1 1 calc(14.28% - 14px); min-width: 140px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
        複雑なフローの自動可視化
      </h3>
      <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
        AIが制度の仕組みを理解し、Mermaid図などの可視化を自動生成することで、専門知識がなくても分かりやすい説明を提供できる。
      </p>
    </div>

    <!-- 5. パートナー連携の自動化 -->
    <div class="ai-native-card" style="flex: 1 1 calc(14.28% - 14px); min-width: 140px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
        パートナー連携の自動化
      </h3>
      <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
        AIエージェントが各パートナーのAPIと連携し、ユーザーのニーズに応じて適切なサービスを自動的に提案・接続できる。
      </p>
    </div>

    <!-- 6. 継続的な改善 -->
    <div class="ai-native-card" style="flex: 1 1 calc(14.28% - 14px); min-width: 140px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
        継続的な改善
      </h3>
      <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
        ユーザーの行動データをAIが分析し、サービスを継続的に改善する好循環を実現できる。
      </p>
    </div>

    <!-- 7. ユーザーフレンドリーなUI設計 -->
    <div class="ai-native-card" style="flex: 1 1 calc(14.28% - 14px); min-width: 140px; padding: 20px; background-color: var(--color-background); border-radius: 8px; border: 1px solid var(--color-border); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05)">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); line-height: 1.4">
        ユーザーフレンドリーなUI設計
      </h3>
      <p style="font-size: 13px; line-height: 1.6; color: var(--color-text); margin: 0">
        技術の複雑さを隠し、直感的で使いやすいインターフェースを提供することで、誰でも簡単にサービスを利用できる。
      </p>
    </div>
  </div>
</div>`,
    shouldUpdate: (currentContent: string) => {
      // Mermaid図が含まれていない場合は強制的に更新
      if (!currentContent.includes('mermaid-diagram-container') || 
          !currentContent.includes('data-mermaid-diagram')) {
        return true;
      }
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('なぜAIネイティブ設計だと可能なのか') ||
             !currentContent.includes('ai-native-card');
    },
  },
  // own-service/maternity-support-componentized/overview/page-1764467525003
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467525003',
    title: '4. 対象ユーザー',
    content: `<div style="margin-bottom: 40px">
      <div style="margin-bottom: 32px; text-align: center">
        <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; color: var(--color-text); line-height: 1.3; letter-spacing: -0.5px">
          個人・企業・自治体を対象とした包括的なサービス
        </h2>
        <p style="margin: 0; font-size: 18px; font-weight: 500; color: var(--color-text); letter-spacing: 0.3px; line-height: 1.6">
          妊娠・出産・育児を迎える個人から、従業員支援を行う企業、住民サービスを提供する自治体まで
        </p>
      </div>
      <!-- アイコン表示 -->
      <div style="display: flex; justify-content: center; gap: 48px; margin-bottom: 24px; padding-left: 11px; flex-wrap: wrap">
        <div style="text-align: center">
          <div style="width: 100px; height: 100px; border-radius: 50%; background-color: #e0e7ff; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; border: 3px solid #6366f1">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: var(--color-text)">個人</div>
        </div>
        <div style="text-align: center">
          <div style="width: 100px; height: 100px; border-radius: 50%; background-color: #e0e7ff; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; border: 3px solid #6366f1">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
            </svg>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: var(--color-text)">企業</div>
        </div>
        <div style="text-align: center">
          <div style="width: 100px; height: 100px; border-radius: 50%; background-color: #e0e7ff; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; border: 3px solid #6366f1">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: var(--color-text)">自治体</div>
        </div>
      </div>
      <!-- 表 -->
      <div style="padding-left: 11px">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid var(--color-border-color); border-radius: 8px; overflow: hidden">
          <thead>
            <tr style="background-color: var(--color-background)">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--color-border-color); font-size: 14px; font-weight: 600; color: var(--color-text)">対象ユーザー</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--color-border-color); font-size: 14px; font-weight: 600; color: var(--color-text)">主なニーズ</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--color-border-color); font-size: 14px; font-weight: 600; color: var(--color-text)">
                <div style="display: flex; align-items: center; gap: 8px">
                  <span>ターゲット人口・数</span>
                  <span style="font-size: 11px; font-weight: 400; color: var(--color-text-light)">
                    （数値：目標獲得率：目標獲得数）
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; width: 35%">
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc; font-size: 13px; color: var(--color-text-light)">
                  <li style="margin-bottom: 4px">妊活中の方</li>
                  <li style="margin-bottom: 4px">妊娠中の方</li>
                  <li style="margin-bottom: 4px">育児中の方（0-6歳児の親）</li>
                  <li style="margin-bottom: 4px">出産・育児に関する支援制度を探している方</li>
                  <li style="margin-bottom: 4px">育児と仕事の両立に悩んでいる方</li>
                  <li style="margin-bottom: 4px">育児に関する不安や疑問がある方</li>
                </ul>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; width: 40%">
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc; font-size: 13px">
                  <li style="margin-bottom: 4px">支援制度の情報を一元管理したい</li>
                  <li style="margin-bottom: 4px">申請手続きを簡単にしたい</li>
                  <li style="margin-bottom: 4px">申請期限を逃したくない</li>
                  <li style="margin-bottom: 4px">育児に関する相談をしたい</li>
                  <li style="margin-bottom: 4px">健診記録を管理したい</li>
                  <li style="margin-bottom: 4px">家族と情報を共有したい</li>
                </ul>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; width: 25%">
                <div style="font-size: 13px">
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">妊婦：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text-light)">約58万人</span>
                      <span style="font-size: 12px; color: var(--color-text-light)">30%：約17万人</span>
                    </div>
                  </div>
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">0-1歳の親：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text-light)">約70万組</span>
                      <span style="font-size: 12px; color: var(--color-text-light)">20%：約14万組</span>
                    </div>
                  </div>
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">1-2歳の親：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text-light)">約78万組</span>
                      <span style="font-size: 12px; color: var(--color-text-light)">10%：約8万組</span>
                    </div>
                  </div>
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">2-3歳の親：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text-light)">約78万組</span>
                      <span style="font-size: 12px; color: var(--color-text-light)">5%：約4万組</span>
                    </div>
                  </div>
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">3-6歳の親：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text-light)">約232万組</span>
                      <span style="font-size: 12px; color: var(--color-text-light)">1%：約2万組</span>
                    </div>
                  </div>
                  <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--color-border-color); display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">合計：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text); font-size: 14px">約516万人</span>
                      <span style="font-size: 12px; color: var(--color-text); font-weight: 600">約45万人</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top">
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc; font-size: 13px; color: var(--color-text-light)">
                  <li style="margin-bottom: 4px">従業員の福利厚生を充実させたい企業</li>
                  <li style="margin-bottom: 4px">子育て支援に取り組む企業</li>
                  <li style="margin-bottom: 4px">働き方改革を推進する企業</li>
                  <li style="margin-bottom: 4px">健康経営に取り組む企業</li>
                </ul>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top">
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc; font-size: 13px">
                  <li style="margin-bottom: 4px">従業員の育児と仕事の両立を支援したい</li>
                  <li style="margin-bottom: 4px">従業員の満足度を向上させたい</li>
                  <li style="margin-bottom: 4px">離職率を低下させたい</li>
                  <li style="margin-bottom: 4px">企業の子育て支援施策を可視化したい</li>
                </ul>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top">
                <div style="font-size: 13px">
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">上場企業：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text-light)">約3,800社</span>
                      <span style="font-size: 12px; color: var(--color-text-light)">5%：約190社</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">中小企業：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text-light)">約358万社</span>
                      <span style="font-size: 12px; color: var(--color-text-light)">1%：約3.6万社</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; font-size: 14px; color: var(--color-text); vertical-align: top">
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc; font-size: 13px; color: var(--color-text-light)">
                  <li style="margin-bottom: 4px">住民向けサービスを提供したい自治体</li>
                  <li style="margin-bottom: 4px">子育て支援施策を充実させたい自治体</li>
                  <li style="margin-bottom: 4px">デジタル化を推進する自治体</li>
                </ul>
              </td>
              <td style="padding: 12px; font-size: 14px; color: var(--color-text); vertical-align: top">
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc; font-size: 13px">
                  <li style="margin-bottom: 4px">住民の子育て支援を強化したい</li>
                  <li style="margin-bottom: 4px">自治体独自の支援制度を周知したい</li>
                  <li style="margin-bottom: 4px">住民サービスの質を向上させたい</li>
                  <li style="margin-bottom: 4px">行政のデジタル化を推進したい</li>
                </ul>
              </td>
              <td style="padding: 12px; font-size: 14px; color: var(--color-text); vertical-align: top">
                <div style="font-size: 13px">
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">日本の自治体数：</span>
                    <div style="display: flex; gap: 8px; align-items: center">
                      <span style="color: var(--color-text-light)">約1,700</span>
                      <span style="font-size: 12px; color: var(--color-text-light)">5%：約85</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 16px; padding-left: 11px">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--color-text)">
            エビデンス（ターゲット人口試算に使用）
          </div>
          <div style="font-size: 13px">
            <a 
              href="https://www.mhlw.go.jp/toukei/saikin/hw/jinkou/geppo/nengai24/dl/gaikyouR6.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              style="color: var(--color-primary); text-decoration: underline"
            >
              厚生労働省「人口動態統計（確定数）の概況」（令和6年）
            </a>
          </div>
        </div>
      </div>
    </div>`,
    shouldUpdate: (currentContent: string) => {
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('個人・企業・自治体を対象とした包括的なサービス') ||
             !currentContent.includes('対象ユーザー');
    },
  },
  // own-service/maternity-support-componentized/overview/page-1764467533028
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467533028',
    title: '5. 主要な提供機能',
    content: `<div style="margin-bottom: 40px">
      <div style="margin-bottom: 32px; text-align: center">
        <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; color: var(--color-text); line-height: 1.3; letter-spacing: -0.5px">
          出産・育児を支える包括的な機能群
        </h2>
        <p style="margin: 0; font-size: 18px; font-weight: 500; color: var(--color-text); letter-spacing: 0.3px; line-height: 1.6">
          支援制度の検索から申請手続き、家族との情報共有まで、必要な機能をワンストップで提供
        </p>
      </div>
      <div style="padding-left: 11px">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid var(--color-border-color); border-radius: 8px; overflow: hidden">
          <thead>
            <tr style="background-color: var(--color-background)">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--color-border-color); font-size: 14px; font-weight: 600; color: var(--color-text); width: 30%">機能名</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--color-border-color); font-size: 14px; font-weight: 600; color: var(--color-text)">説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">1. 支援制度の検索・閲覧</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">国、都道府県、市区町村、企業などの支援制度を一元管理し、効率的に検索・閲覧できる</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">2. 支援制度の詳細情報表示</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">各支援制度の詳細情報（申請方法、必要書類、支給金額など）を分かりやすく表示</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">3. Mermaid図による可視化</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">制度の仕組みや申請フロー、関係組織などを視覚的に分かりやすく表示</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">4. アクション管理</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">申請予定の制度を管理し、申請期限を可視化。リマインダー機能で期限を逃さないようサポート</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">5. 統計情報の表示</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">カテゴリ別の支援制度の件数や支給金額の合計を表示し、全体像を把握できる</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">6. 収支概算</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">子育てにかかる収支の概算を表示し、経済的な見通しを立てやすくする</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">7. AIアシスタント機能</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">24時間365日いつでも育児に関する相談やアドバイスを受けられる伴走型育児支援</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">8. 電子母子手帳機能</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">妊婦健診の記録を電子化し、いつでも確認できる。データの共有も容易</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">9. 家族・パートナーとの情報共有</td>
              <td style="padding: 12px; border-bottom: 1px solid var(--color-border-color); font-size: 13px; color: var(--color-text); vertical-align: top">アカウント共有機能により、家族やパートナーと情報を共有し、申請手続きや記録を共同で管理</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-size: 14px; color: var(--color-text); vertical-align: top; font-weight: 600">10. パートナー連携</td>
              <td style="padding: 12px; font-size: 13px; color: var(--color-text); vertical-align: top">教育サービス、保険、医療・ヘルスケア、ECサイトなど、様々なパートナーと連携し、ワンストップで必要なサービスを利用できる</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`,
    shouldUpdate: (currentContent: string) => {
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('出産・育児を支える包括的な機能群') ||
             !currentContent.includes('主要な提供機能');
    },
  },
  // own-service/maternity-support-componentized/overview/page-1764467542500
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467542500',
    title: '6. ビジネスモデル',
    content: `<div style="margin-bottom: 40px">
      <div style="margin-bottom: 32px; text-align: center">
        <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; color: var(--color-text); line-height: 1.3; letter-spacing: -0.5px">
          多様な収益源で持続可能な成長を実現
        </h2>
        <p style="margin: 0; font-size: 18px; font-weight: 500; color: var(--color-text); letter-spacing: 0.3px; line-height: 1.6">
          個人ユーザーへの直接提供、企業・自治体へのB2B提供、パートナー企業との連携により、多角的な収益構造を構築
        </p>
      </div>
      <div style="margin-bottom: 16px; padding-left: 11px">
        <p style="font-size: 14px; line-height: 1.8; margin-bottom: 16px; color: var(--color-text)">
          出産支援パーソナルアプリケーションは、個人ユーザーへの直接提供、企業・自治体へのB2B提供、パートナー企業からの広告費・紹介手数料、認定取得支援サービスなど、多様な収益源を持つビジネスモデルを採用しています。一般利用者には無料プランとプレミアムプランを提供し、企業や自治体には従業員・住民向けの福利厚生サービスとして提供することで、持続可能な成長を実現します。
        </p>
        <!-- Mermaid図 -->
        <div class="mermaid-diagram-container" style="margin-bottom: 32px; padding-left: 0">
          <div 
            class="mermaid" 
            data-mermaid-diagram="business-model"
            style="width: 100%; max-width: 100%; overflow-x: auto; background-color: #fff; border-radius: 8px; padding: 20px; border: 1px solid var(--color-border-color)"
          >
graph LR
direction LR
classDef partnerClass fill:#FFB6C1,stroke:#FF69B4,stroke-width:2px,color:#000
classDef companyClass fill:#6495ED,stroke:#4169E1,stroke-width:3px,color:#fff
classDef userClass fill:#90EE90,stroke:#32CD32,stroke-width:2px,color:#000
classDef clientClass fill:#FFA500,stroke:#FF8C00,stroke-width:2px,color:#000
classDef paymentClass fill:#90EE90,stroke:#32CD32,stroke-width:3px,color:#000

P1["パートナー企業<br/>広告費・紹介手数料"]
P2["パートナー企業<br/>代行手数料・リファラル手数料"]
P3["パートナー企業<br/>マッチング手数料"]
C["株式会社AIアシスタント<br/>出産支援パーソナルアプリ提供"]
E["企業<br/>従業員向け福利厚生<br/>企業契約"]
G["自治体<br/>住民向けサービス<br/>自治体契約"]
A["認定取得支援<br/>くるみん認定取得支援<br/>健康経営優良法人認定取得<br/>企業向け"]

subgraph EndUsers1["エンドユーザー"]
  U1["一般利用者<br/>プレミアムプラン<br/>月額/年額"]
  U2["一般利用者<br/>無料プラン"]
end

subgraph EndUsers2["エンドユーザー"]
  E2["企業の従業員"]
  G2["自治体の住民"]
end

P1 ==>|💰 広告費・紹介手数料| C
P2 ==>|💰 代行手数料・リファラル手数料| C
P3 ==>|💰 マッチング手数料| C
C -->|直接提供| U1
C -->|直接提供| U2
C -->|B2B提供| E
C -->|B2B提供| G
C -->|認定取得支援サービス提供| A

U1 ==>|💰 月額/年額| C
E ==>|💰 企業契約| C
E -->|提供| E2
G ==>|💰 自治体契約| C
G -->|提供| G2
A ==>|💰 認定取得支援手数料| C
A -->|認定取得支援サービス提供| E

class P1,P2,P3 partnerClass
class C companyClass
class U1 paymentClass
class E paymentClass
class G paymentClass
class A paymentClass
class U2,E2,G2 userClass
          </div>
        </div>
      </div>
    </div>`,
    shouldUpdate: (currentContent: string) => {
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('多様な収益源で持続可能な成長を実現') ||
             !currentContent.includes('ビジネスモデル') ||
             !currentContent.includes('mermaid-diagram-container') ||
             !currentContent.includes('data-mermaid-diagram="business-model"');
    },
  },
  // own-service/maternity-support-componentized/overview/page-1764467551396
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467551396',
    title: '7. 法改正に対応',
    content: `<div style="margin-bottom: 40px">
      <div style="margin-bottom: 32px; text-align: center">
        <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; color: var(--color-text); line-height: 1.3; letter-spacing: -0.5px">
          法改正に完全対応した<br />申請サポートを実現
        </h2>
        <p style="margin: 0; font-size: 18px; font-weight: 500; color: var(--color-text); letter-spacing: 0.3px; line-height: 1.6">
          2025年4月施行の次世代育成支援対策推進法の改正に対応し、企業の法遵守と認定取得をサポート
        </p>
      </div>
      <div style="padding-left: 11px; line-height: 1.8; color: var(--color-text)">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px">
          <!-- POINT 4 -->
          <div style="padding: 20px; background-color: #f0f8ff; border-radius: 8px; border: 1px solid #4a90e2">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: #ffd700; color: #333; font-size: 14px; font-weight: 700; flex-shrink: 0">
                POINT
              </div>
              <span style="font-size: 24px; font-weight: 700; color: #1e3a8a">
                4
              </span>
              <span style="font-size: 12px; font-weight: 500; color: #666; margin-left: auto; padding: 4px 12px; border: 1px solid #333; border-radius: 4px; white-space: nowrap">
                2025年4月1日施行
              </span>
            </div>
            <h5 style="font-size: 16px; font-weight: 600; color: #1e3a8a; margin-bottom: 12px; line-height: 1.4">
              育児休業等の取得状況の公表義務が300人超の企業に拡大
            </h5>
            <div style="margin-top: 16px; padding: 12px; background-color: #fff; border-radius: 4px; border-left: 3px solid #4a90e2">
              <p style="font-size: 13px; line-height: 1.7; color: #333; margin-bottom: 8px">
                <strong>対象企業：</strong>
                従業員数1,000人超に加え、<strong>300人超1,000人以下の企業</strong>にも、育児休業等の取得状況を公表することが義務付けられました。
              </p>
              <p style="font-size: 13px; line-height: 1.7; color: #333; margin-bottom: 8px">
                <strong>公表内容：</strong>
                公表を行う日の属する事業年度の直前の事業年度（公表前事業年度）における男性の「育児休業等の取得割合」または「育児休業等と育児目的休暇の取得割合」のいずれかの割合です。
              </p>
              <div style="margin-top: 12px; padding: 8px; background-color: #f5f5f5; border-radius: 4px; font-size: 12px">
                <strong>※「育児休業等」とは：</strong>
                <ul style="margin: 8px 0 0 20px; padding: 0; list-style: disc">
                  <li>育児休業（産後パパ育休を含む）</li>
                  <li>法第23条第2項又は第24条第1項の規定に基づく措置として育児休業に関する制度に準ずる措置を講じた場合は、その措置に基づく休業</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- POINT 5 -->
          <div style="padding: 20px; background-color: #f0f8ff; border-radius: 8px; border: 1px solid #4a90e2">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: #ffd700; color: #333; font-size: 14px; font-weight: 700; flex-shrink: 0">
                POINT
              </div>
              <span style="font-size: 24px; font-weight: 700; color: #1e3a8a">
                5
              </span>
              <span style="font-size: 12px; font-weight: 500; color: #666; margin-left: auto; padding: 4px 12px; border: 1px solid #333; border-radius: 4px; white-space: nowrap">
                2025年4月1日施行
              </span>
            </div>
            <h5 style="font-size: 16px; font-weight: 600; color: #1e3a8a; margin-bottom: 12px; line-height: 1.4">
              行動計画策定・変更時の育児休業等取得状況や労働時間の状況の把握・数値目標設定の義務付け
            </h5>
            <div style="margin-top: 16px; padding: 12px; background-color: #fff; border-radius: 4px; border-left: 3px solid #4a90e2">
              <p style="font-size: 13px; line-height: 1.7; color: #333; margin-bottom: 12px">
                <strong>対象企業：</strong>
                従業員数<strong>100人超の企業</strong>は、2025年（令和7年）4月1日以降に行動計画を策定又は変更する場合に、次のことが義務付けられました。
                <br />
                <span style="font-size: 12px; color: #666">
                  （従業員数100人以下の企業は、努力義務）
                </span>
              </p>
              <div style="margin-top: 12px; padding: 12px; background-color: #e3f2fd; border-radius: 4px">
                <p style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #333">
                  義務付けられた内容：
                </p>
                <ul style="margin: 0; padding-left: 20px; list-style: disc; font-size: 13px; line-height: 1.7">
                  <li style="margin-bottom: 6px">
                    計画策定又は変更時の育児休業等取得状況や労働時間の状況の把握等（PDCAサイクルの実施）
                  </li>
                  <li>
                    育児休業等取得状況や労働時間の状況に関する数値目標の設定
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <p style="margin-bottom: 16px; font-size: 14px">
          これらの法改正に対応した申請サポートを可能にしています。
        </p>
      </div>
    </div>`,
    shouldUpdate: (currentContent: string) => {
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('法改正に完全対応した') ||
             !currentContent.includes('法改正に対応') ||
             !currentContent.includes('POINT');
    },
  },
  // own-service/maternity-support-componentized/overview/page-1764467559376
  {
    serviceId: 'own-service',
    conceptId: 'maternity-support-componentized',
    subMenuId: 'overview',
    pageId: 'page-1764467559376',
    title: '8. 提供価値',
    content: `<div style="margin-bottom: 40px">
      <div style="margin-bottom: 32px; text-align: center">
        <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; color: var(--color-text); line-height: 1.3; letter-spacing: -0.5px">
          個人・企業・社会に価値を提供
        </h2>
        <p style="margin: 0; font-size: 18px; font-weight: 500; color: var(--color-text); letter-spacing: 0.3px; line-height: 1.6">
          一人ひとりの安心から、企業の成長、社会全体の持続可能性まで、多層的な価値を創造
        </p>
      </div>
      <div style="display: flex; gap: 24px; align-items: flex-start; padding-left: 11px">
        <div style="flex-shrink: 0">
          <img
            src="/Gemini_Generated_Image_l3zgsvl3zgsvl3zg.png"
            alt="提供価値"
            style="width: 400px; max-width: 100%; height: 400px; object-fit: cover; clip-path: circle(50%); border-radius: 50%; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div style="flex: 1; min-width: 0">
          <div style="margin-bottom: 16px">
            <h5 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; margin-top: 16px; border-left: 3px solid var(--color-primary); padding-left: 8px">個人への貢献</h5>
            <ul style="margin-bottom: 12px; padding-left: 32px; list-style-type: disc">
              <li style="margin-bottom: 8px">支援制度の情報を一元管理し、申請手続きを分かりやすく、適切なタイミングで申請できる</li>
              <li style="margin-bottom: 8px">育児に関する不安を解消し、経済的な見通しを立てやすくすることで、安心して出産・育児に臨める</li>
              <li style="margin-bottom: 8px">家族との情報共有機能により、パートナーと協力して育児を進められる環境を整える</li>
            </ul>
          </div>
          <div style="margin-bottom: 16px">
            <h5 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; margin-top: 16px; border-left: 3px solid var(--color-primary); padding-left: 8px">企業への貢献</h5>
            <ul style="margin-bottom: 12px; padding-left: 32px; list-style-type: disc">
              <li style="margin-bottom: 8px">従業員の育児と仕事の両立を支援し、満足度向上と離職率低下に貢献</li>
              <li style="margin-bottom: 8px">くるみん認定や健康経営優良法人認定の取得支援により、企業の社会的評価を向上</li>
              <li style="margin-bottom: 8px">従業員の生産性向上により、企業の魅力向上と業績向上に寄与</li>
            </ul>
          </div>
          <div style="margin-bottom: 16px">
            <h5 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; margin-top: 16px; border-left: 3px solid var(--color-primary); padding-left: 8px">社会への貢献</h5>
            <ul style="margin-bottom: 12px; padding-left: 32px; list-style-type: disc">
              <li style="margin-bottom: 8px">住民の子育て支援を強化し、自治体独自の支援制度を効率的に周知することで、住民満足度を向上</li>
              <li style="margin-bottom: 8px">行政のデジタル化を推進し、住民サービスの一元化により、行政の効率化とサービスの質向上を実現</li>
              <li style="margin-bottom: 8px">子育て支援施策の効果を可視化し、政策の改善に活用できる環境を構築</li>
            </ul>
          </div>
        </div>
      </div>
    </div>`,
    shouldUpdate: (currentContent: string) => {
      return currentContent.trim() === '' || 
             currentContent.includes('コンテンツを入力してください') ||
             !currentContent.includes('個人・企業・社会に価値を提供') ||
             !currentContent.includes('提供価値') ||
             !currentContent.includes('個人への貢献') ||
             !currentContent.includes('企業への貢献') ||
             !currentContent.includes('社会への貢献');
    },
  },
];

