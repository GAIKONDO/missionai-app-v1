/**
 * ブラウザのコンソールから実行するスクリプト
 * FY25部会の4月サマリ（ID: init_mj2e859f_wez5gdiis）の内容を削除
 * 
 * 使用方法:
 * 1. 議事録アーカイブページを開く
 * 2. ブラウザの開発者ツール（F12）を開く
 * 3. コンソールタブを開く
 * 4. 以下のコードをコピー＆ペーストして実行
 */

(async function() {
  try {
    const { getMeetingNoteById, saveMeetingNote } = await import('/lib/orgApi');
    const { callTauriCommand } = await import('/lib/localFirebase');
    
    console.log('🔍 FY25部会の議事録を検索中...');
    
    // 組織一覧を取得
    const orgsResult = await callTauriCommand('doc_list', {
      collectionName: 'organizations',
    });
    
    const orgs = Array.isArray(orgsResult) ? orgsResult : (orgsResult?.data || []);
    console.log(`📋 組織数: ${orgs.length}`);
    
    // FY25部会を探す
    const fy25Org = orgs.find((org) => 
      org.name?.includes('FY25') || 
      org.name?.includes('部会') ||
      org.id?.includes('fy25')
    );
    
    if (!fy25Org) {
      console.error('❌ FY25部会が見つかりませんでした');
      console.log('利用可能な組織:', orgs.map((org) => ({ id: org.id, name: org.name })));
      return;
    }
    
    console.log(`✅ FY25部会を発見: ${fy25Org.id} - ${fy25Org.name}`);
    
    // 議事録一覧を取得
    const notesResult = await callTauriCommand('doc_list', {
      collectionName: 'meetingNotes',
    });
    
    const notes = Array.isArray(notesResult) ? notesResult : (notesResult?.data || []);
    console.log(`📋 議事録数: ${notes.length}`);
    
    // FY25部会の議事録を探す
    const fy25Notes = notes.filter((note) => 
      note.organizationId === fy25Org.id
    );
    
    console.log(`📋 FY25部会の議事録数: ${fy25Notes.length}`);
    
    // 各議事録をチェックして、4月のサマリIDが一致するものを探す
    for (const note of fy25Notes) {
      try {
        const meetingNote = await getMeetingNoteById(note.id);
        if (!meetingNote || !meetingNote.content) {
          continue;
        }
        
        const parsed = JSON.parse(meetingNote.content);
        
        // 4月（april）のサマリをチェック
        const aprilData = parsed['april'];
        if (aprilData && typeof aprilData === 'object' && aprilData.summaryId === 'init_mj2e859f_wez5gdiis') {
          console.log(`✅ 該当議事録を発見: ${meetingNote.id} - ${meetingNote.title}`);
          console.log(`📝 現在のサマリ内容（最初の100文字）: ${aprilData.summary?.substring(0, 100)}...`);
          
          // サマリを空にする
          parsed['april'] = {
            ...aprilData,
            summary: '',
          };
          
          // 保存
          await saveMeetingNote({
            id: meetingNote.id,
            organizationId: meetingNote.organizationId,
            title: meetingNote.title,
            description: meetingNote.description,
            content: JSON.stringify(parsed),
          });
          
          console.log('✅ 4月サマリの内容を削除しました');
          alert('4月サマリの内容を削除しました');
          return;
        }
      } catch (error) {
        console.warn(`⚠️ 議事録 ${note.id} の処理中にエラー:`, error);
        continue;
      }
    }
    
    console.error('❌ 該当する議事録が見つかりませんでした');
    console.log('FY25部会の議事録ID一覧:', fy25Notes.map((n) => n.id));
    alert('該当する議事録が見つかりませんでした');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    alert('エラーが発生しました: ' + error.message);
  }
})();
