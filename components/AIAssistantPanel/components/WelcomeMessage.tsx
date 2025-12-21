export function WelcomeMessage() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.5)',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '12px' }}>AIアシスタントに質問や指示を送信できます。</p>
          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
            各コンテナに対してCLIデコーディングしているスライドをVibeコーディングできるようにします。
          </p>
        </div>
      </div>
    </div>
  );
}

