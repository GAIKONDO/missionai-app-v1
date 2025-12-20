// 共通スタイル定数
export const styles = {
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '16px',
    color: 'var(--color-text)',
  },
  subsectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--color-text)',
    display: 'flex' as const,
    alignItems: 'center' as const,
  },
  infoBox: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: 'var(--color-background)',
    borderRadius: '8px',
    border: '1px solid var(--color-border-color)',
  },
  infoBoxTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--color-text)',
  },
  infoBoxText: {
    marginBottom: '12px',
    fontSize: '14px',
    lineHeight: '1.8',
  },
  infoBoxList: {
    marginLeft: '20px',
    lineHeight: '1.8',
    fontSize: '14px',
  },
  subsectionContent: {
    paddingLeft: '24px',
    borderLeft: '2px solid #e0e0e0',
  },
  subsectionList: {
    marginLeft: '20px',
    marginBottom: '12px',
  },
  colorDot: (color: string) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    backgroundColor: color,
    borderRadius: '50%',
    marginRight: '8px',
  }),
};
