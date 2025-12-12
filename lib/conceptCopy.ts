/**
 * 構想のコピー機能
 * 既存の構想を完全にコピーして新しい構想として作成
 */

import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  setDoc,
  serverTimestamp,
  getFirestore
} from './localFirebase';
import { auth } from './localFirebase';
import { ConceptData } from '@/components/ConceptForm';
import { PageMetadata } from '@/types/pageMetadata';
import { getPageStructure } from './pageStructure';
import { savePageStructureAsync } from './pageStructure';
import { savePageEmbeddingAsync } from './pageEmbeddings';

/**
 * 構想をコピーして新しい構想として作成
 * 
 * 重要: 元の構想の形式を維持します
 * - 固定ページ形式の構想を複製する場合 → 新しい構想も固定ページ形式
 * - コンポーネント形式の構想を複製する場合 → 新しい構想もコンポーネント形式
 */
export async function copyConcept(
  sourceConceptId: string,
  sourceServiceId: string,
  newConceptName?: string
): Promise<{ newConceptId: string; newConceptDocId: string }> {
  const db = getFirestore();
  if (!db || !auth?.currentUser) {
    throw new Error('Firestoreまたは認証が初期化されていません');
  }

  try {
    console.log('🚀🚀🚀 ========== 構想のコピーを開始 ========== 🚀🚀🚀');
    console.log('🚀🚀🚀 copyConcept呼び出し 🚀🚀🚀', { sourceConceptId, sourceServiceId, userId: auth.currentUser.uid });

    // 1. 元の構想データを取得
    // まず、conceptIdで検索を試みる
    let conceptsQuery = query(
      collection(null, 'concepts'),
      where('userId', '==', auth.currentUser.uid),
      where('serviceId', '==', sourceServiceId),
      where('conceptId', '==', sourceConceptId)
    );
    
    let conceptsSnapshot = await getDocs(conceptsQuery);
    console.log('📋 最初の検索結果:', {
      sourceConceptId,
      found: !conceptsSnapshot.empty,
      docsCount: conceptsSnapshot.size,
      docs: conceptsSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        conceptId: doc.data().conceptId,
        name: doc.data().name,
        hasFixedPageContainersBySubMenu: !!doc.data().fixedPageContainersBySubMenu,
      })),
    });
    
    // sourceConceptDataを先に宣言（179行目で使用されるため）
    let sourceConceptData: any = null;
    
    // 見つからない場合、文字列IDでも検索を試みる（固定構想の場合）
    if (conceptsSnapshot.empty) {
      const { getStringIdFromTimestampId, getTimestampIdFromStringId } = await import('@/lib/conceptIdMapping');
      
      // タイムスタンプIDから文字列IDを取得
      const stringId = getStringIdFromTimestampId(sourceServiceId, sourceConceptId);
      if (stringId) {
        try {
          const stringIdQuery = query(
            collection(db, 'concepts'),
            where('userId', '==', auth.currentUser.uid),
            where('serviceId', '==', sourceServiceId),
            where('conceptId', '==', stringId)
          );
          const stringIdSnapshot = await getDocs(stringIdQuery);
          if (!stringIdSnapshot.empty) {
            conceptsSnapshot = stringIdSnapshot;
            console.log('📋 文字列IDで構想を発見:', stringId);
          }
        } catch (stringIdError) {
          console.warn('文字列IDでの検索も失敗:', stringIdError);
        }
      }
      
      // まだ見つからない場合、ドキュメントIDで検索を試みる
      if (conceptsSnapshot.empty) {
        try {
          const conceptDocRef = doc(null, 'concepts', sourceConceptId);
          const conceptDoc = await getDoc(conceptDocRef);
          if (conceptDoc.exists()) {
            const data = conceptDoc.data();
            console.log('📋 ドキュメントIDで検索した結果:', {
              sourceConceptId,
              exists: true,
              userId: data.userId,
              serviceId: data.serviceId,
              conceptId: data.conceptId,
              hasFixedPageContainersBySubMenu: !!data.fixedPageContainersBySubMenu,
              fixedPageContainersBySubMenuKeys: data.fixedPageContainersBySubMenu ? Object.keys(data.fixedPageContainersBySubMenu) : [],
            });
            // ユーザーIDとサービスIDが一致するか確認
            if (data.userId === auth.currentUser.uid && data.serviceId === sourceServiceId) {
              conceptsSnapshot = {
                empty: false,
                docs: [conceptDoc],
                size: 1,
                forEach: (callback: any) => callback(conceptDoc),
              } as any;
              console.log('✅ ドキュメントIDで構想を発見:', sourceConceptId);
            }
          } else {
            console.log('📋 ドキュメントIDで検索した結果: 存在しない', { sourceConceptId });
          }
        } catch (docError) {
          console.warn('❌ ドキュメントIDでの検索も失敗:', docError);
        }
      }
      
      // さらに、サービスIDとユーザーIDで全構想を取得して、デバッグ情報を出力
      if (conceptsSnapshot.empty) {
        try {
          console.log('📋 該当サービスIDのすべての構想を取得します:', { sourceServiceId });
          const allConceptsQuery = query(
            collection(db, 'concepts'),
            where('userId', '==', auth.currentUser.uid),
            where('serviceId', '==', sourceServiceId)
          );
          const allConceptsSnapshot = await getDocs(allConceptsQuery);
          const allConcepts = allConceptsSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            conceptId: doc.data().conceptId,
            name: doc.data().name,
            hasFixedPageContainersBySubMenu: !!doc.data().fixedPageContainersBySubMenu,
            fixedPageContainersBySubMenuKeys: doc.data().fixedPageContainersBySubMenu ? Object.keys(doc.data().fixedPageContainersBySubMenu) : [],
            fixedPageContainersBySubMenu: doc.data().fixedPageContainersBySubMenu,
          })).filter((c: any) => c.conceptId === sourceConceptId);
          console.log('📋 該当サービスIDのすべての構想:', {
            total: allConceptsSnapshot.size,
            concepts: allConcepts,
          });
          
          // 固定構想の編集済みコンテンツを探す
          // 同じ名前の構想で、fixedPageContainersBySubMenuが存在するものを探す
          const { getConceptInfoFromTimestampId, getConceptInfoFromStringId } = await import('@/lib/conceptIdMapping');
          const conceptInfo = getConceptInfoFromTimestampId(sourceServiceId, sourceConceptId) || getConceptInfoFromStringId(sourceServiceId, sourceConceptId);
          if (conceptInfo) {
            const conceptName = conceptInfo.name;
            console.log('📋 固定構想の編集済みコンテンツを探します:', { conceptName, sourceConceptId });
            
            // 同じ名前の構想で、fixedPageContainersBySubMenuが存在するものを探す
            const editedConcept = allConcepts.find((c: any) => 
              c.name === conceptName && 
              c.hasFixedPageContainersBySubMenu &&
              c.fixedPageContainersBySubMenuKeys && 
              c.fixedPageContainersBySubMenuKeys.length > 0
            );
            
            if (editedConcept) {
              console.log('✅ 固定構想の編集済みコンテンツを発見:', {
                conceptId: editedConcept.conceptId,
                name: editedConcept.name,
                fixedPageContainersBySubMenuKeys: editedConcept.fixedPageContainersBySubMenuKeys,
                fixedPageContainersBySubMenu: editedConcept.fixedPageContainersBySubMenu,
              });
              
              // Firestoreから詳細なデータを取得
              try {
                const editedConceptDocRef = doc(null, 'concepts', editedConcept.id);
                const editedConceptDoc = await getDoc(editedConceptDocRef);
                if (editedConceptDoc.exists()) {
                  const editedConceptData = editedConceptDoc.data();
                  if (editedConceptData.fixedPageContainersBySubMenu && 
                      typeof editedConceptData.fixedPageContainersBySubMenu === 'object') {
                    sourceConceptData.fixedPageContainersBySubMenu = editedConceptData.fixedPageContainersBySubMenu;
                    console.log('✅ 固定構想の編集済みコンテンツを取得:', {
                      conceptId: editedConcept.conceptId,
                      subMenuIds: Object.keys(editedConceptData.fixedPageContainersBySubMenu),
                      totalContainers: Object.values(editedConceptData.fixedPageContainersBySubMenu).reduce(
                        (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0
                      ),
                    });
                  }
                }
              } catch (error) {
                console.error('❌ 編集済みコンテンツの取得でエラー:', error);
              }
            } else {
              console.log('⚠️ 固定構想の編集済みコンテンツが見つかりませんでした:', { conceptName, allConcepts });
            }
          }
        } catch (allConceptsError) {
          console.warn('❌ 全構想の取得でエラー:', allConceptsError);
        }
      }
    }
    
    // Firestoreに存在しない場合、固定構想の定義からデータを取得
    
    if (conceptsSnapshot.empty) {
      // 固定構想の定義から情報を取得
      // タイムスタンプIDまたは文字列IDの両方に対応
      const { getConceptInfoFromTimestampId, getConceptInfoFromStringId } = await import('@/lib/conceptIdMapping');
      
      // まずタイムスタンプIDで検索を試みる
      let conceptInfo = getConceptInfoFromTimestampId(sourceServiceId, sourceConceptId);
      
      // 見つからない場合は文字列IDで検索を試みる
      if (!conceptInfo) {
        conceptInfo = getConceptInfoFromStringId(sourceServiceId, sourceConceptId);
      }
      
      if (conceptInfo) {
        // 固定構想の定義からデータを作成（固定ページ形式として）
        sourceConceptData = {
          name: conceptInfo.name,
          description: conceptInfo.description || '',
          conceptId: sourceConceptId,
          serviceId: sourceServiceId,
          userId: auth.currentUser.uid,
          // 固定ページ形式なので、pagesBySubMenuは設定しない
        };
        
        // 固定構想でも、ユーザーが編集した場合はFirestoreに保存されている可能性がある
        // そのため、conceptIdでFirestoreを検索して、fixedPageContainersBySubMenuがあれば取得する
        try {
          // タイムスタンプIDと文字列IDの両方で検索を試みる
          const searchIds = [sourceConceptId];
          if (conceptInfo.timestampId && conceptInfo.timestampId !== sourceConceptId) {
            searchIds.push(conceptInfo.timestampId);
          }
          if (conceptInfo.stringId && conceptInfo.stringId !== sourceConceptId) {
            searchIds.push(conceptInfo.stringId);
          }
          
          console.log('📋 固定構想のFirestore検索開始:', {
            sourceConceptId,
            searchIds,
            timestampId: conceptInfo.timestampId,
            stringId: conceptInfo.stringId,
          });
          
          // 各IDでFirestoreを検索
          for (const searchId of searchIds) {
            console.log('📋 検索中:', searchId);
            const fixedConceptQuery = query(
              collection(db, 'concepts'),
              where('userId', '==', auth.currentUser.uid),
              where('serviceId', '==', sourceServiceId),
              where('conceptId', '==', searchId)
            );
            const fixedConceptSnapshot = await getDocs(fixedConceptQuery);
            
            console.log('📋 検索結果:', {
              searchId,
              found: !fixedConceptSnapshot.empty,
              docsCount: fixedConceptSnapshot.size,
            });
            
            if (!fixedConceptSnapshot.empty) {
              const fixedConceptData = fixedConceptSnapshot.docs[0].data();
              console.log('📋 固定構想データ:', {
                conceptId: searchId,
                hasFixedPageContainersBySubMenu: !!fixedConceptData.fixedPageContainersBySubMenu,
                fixedPageContainersBySubMenuKeys: fixedConceptData.fixedPageContainersBySubMenu 
                  ? Object.keys(fixedConceptData.fixedPageContainersBySubMenu) 
                  : [],
                fixedPageContainersBySubMenu: fixedConceptData.fixedPageContainersBySubMenu,
              });
              
              // fixedPageContainersBySubMenuがあれば、それをsourceConceptDataに追加
              if (fixedConceptData.fixedPageContainersBySubMenu && 
                  typeof fixedConceptData.fixedPageContainersBySubMenu === 'object') {
                sourceConceptData.fixedPageContainersBySubMenu = fixedConceptData.fixedPageContainersBySubMenu;
                console.log('✅ 固定構想の編集済みコンテンツを取得:', {
                  conceptId: searchId,
                  subMenuIds: Object.keys(fixedConceptData.fixedPageContainersBySubMenu),
                  totalContainers: Object.values(fixedConceptData.fixedPageContainersBySubMenu).reduce(
                    (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0
                  ),
                });
              }
              // その他のフィールドも引き継ぐ
              if (fixedConceptData.keyVisualUrl) {
                sourceConceptData.keyVisualUrl = fixedConceptData.keyVisualUrl;
              }
              if (fixedConceptData.keyVisualHeight !== undefined) {
                sourceConceptData.keyVisualHeight = fixedConceptData.keyVisualHeight;
              }
              if (fixedConceptData.keyVisualScale !== undefined) {
                sourceConceptData.keyVisualScale = fixedConceptData.keyVisualScale;
              }
              if (fixedConceptData.keyVisualLogoUrl) {
                sourceConceptData.keyVisualLogoUrl = fixedConceptData.keyVisualLogoUrl;
              }
              if (fixedConceptData.keyVisualLogoSize !== undefined) {
                sourceConceptData.keyVisualLogoSize = fixedConceptData.keyVisualLogoSize;
              }
              if (fixedConceptData.keyVisualMetadata) {
                sourceConceptData.keyVisualMetadata = fixedConceptData.keyVisualMetadata;
              }
              if (fixedConceptData.titlePositionX !== undefined) {
                sourceConceptData.titlePositionX = fixedConceptData.titlePositionX;
              }
              if (fixedConceptData.titlePositionY !== undefined) {
                sourceConceptData.titlePositionY = fixedConceptData.titlePositionY;
              }
              if (fixedConceptData.titleFontSize !== undefined) {
                sourceConceptData.titleFontSize = fixedConceptData.titleFontSize;
              }
              if (fixedConceptData.titleBorderEnabled !== undefined) {
                sourceConceptData.titleBorderEnabled = fixedConceptData.titleBorderEnabled;
              }
              if (fixedConceptData.footerText) {
                sourceConceptData.footerText = fixedConceptData.footerText;
              }
              break; // 見つかったらループを抜ける
            }
          }
        } catch (fixedConceptError) {
          console.error('❌ 固定構想のFirestore検索でエラー:', fixedConceptError);
          // エラーが発生しても処理を続行
        }
        
        console.log('📋 固定構想の定義からデータを取得:', {
          sourceConceptId,
          conceptId: sourceConceptId,
          name: sourceConceptData.name,
          timestampId: conceptInfo.timestampId,
          stringId: conceptInfo.stringId,
          hasFixedPageContainersBySubMenu: !!sourceConceptData.fixedPageContainersBySubMenu,
          fixedPageContainersBySubMenuKeys: sourceConceptData.fixedPageContainersBySubMenu 
            ? Object.keys(sourceConceptData.fixedPageContainersBySubMenu) 
            : [],
        });
      } else {
        // デバッグ情報を追加
        console.error('構想が見つかりませんでした。検索条件:', {
          userId: auth.currentUser.uid,
          serviceId: sourceServiceId,
          conceptId: sourceConceptId,
        });
        
        // すべての構想を取得してデバッグ情報を出力
        const allConceptsQuery = query(
          collection(db, 'concepts'),
          where('userId', '==', auth.currentUser.uid),
          where('serviceId', '==', sourceServiceId)
        );
        const allConceptsSnapshot = await getDocs(allConceptsQuery);
        console.log('該当サービスIDのすべての構想:', 
          allConceptsSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            conceptId: doc.data().conceptId,
            name: doc.data().name,
          }))
        );
        
        throw new Error(`コピー元の構想が見つかりませんでした。conceptId: ${sourceConceptId}, serviceId: ${sourceServiceId}`);
      }
    } else {
      const sourceConceptDoc = conceptsSnapshot.docs[0];
      sourceConceptData = sourceConceptDoc.data();
      console.log('📋 Firestoreから直接取得した構想データ:', {
        conceptId: sourceConceptData.conceptId,
        hasFixedPageContainersBySubMenu: !!sourceConceptData.fixedPageContainersBySubMenu,
        fixedPageContainersBySubMenuKeys: sourceConceptData.fixedPageContainersBySubMenu ? Object.keys(sourceConceptData.fixedPageContainersBySubMenu) : [],
        allKeys: Object.keys(sourceConceptData),
      });
    }

    console.log('📋 元の構想データ:', {
      name: sourceConceptData.name,
      conceptId: sourceConceptData.conceptId,
      hasPagesBySubMenu: !!sourceConceptData.pagesBySubMenu,
      pagesBySubMenuKeys: sourceConceptData.pagesBySubMenu ? Object.keys(sourceConceptData.pagesBySubMenu) : [],
      pagesBySubMenu: sourceConceptData.pagesBySubMenu,
      hasFixedPageContainersBySubMenu: !!sourceConceptData.fixedPageContainersBySubMenu,
      fixedPageContainersBySubMenuKeys: sourceConceptData.fixedPageContainersBySubMenu ? Object.keys(sourceConceptData.fixedPageContainersBySubMenu) : [],
      fixedPageContainersBySubMenu: sourceConceptData.fixedPageContainersBySubMenu,
      fixedPageContainersBySubMenuDetails: sourceConceptData.fixedPageContainersBySubMenu ? 
        Object.entries(sourceConceptData.fixedPageContainersBySubMenu).map(([subMenuId, containers]: [string, any]) => ({
          subMenuId,
          containerCount: Array.isArray(containers) ? containers.length : 0,
          containers: Array.isArray(containers) ? containers.map((c: any) => ({ id: c.id, title: c.title, order: c.order })) : [],
        })) : [],
      allKeys: Object.keys(sourceConceptData),
    });

    // 2. 新しい構想IDを生成
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const newConceptId = `concept-${timestamp}${randomSuffix}`;

    // 3. 新しい構想名を設定（指定がない場合は「（コピー）」を追加）
    const newName = newConceptName || `${sourceConceptData.name}（コピー）`;

    // 4. ページIDのマッピングを作成（古いID -> 新しいID）
    const pageIdMapping: { [oldPageId: string]: string } = {};
    const pagesBySubMenu = sourceConceptData.pagesBySubMenu || {};
    const pageOrderBySubMenu = sourceConceptData.pageOrderBySubMenu || {};

    console.log('📋 ページデータ確認:', {
      pagesBySubMenuKeys: Object.keys(pagesBySubMenu),
      pagesBySubMenu,
      pageOrderBySubMenu,
    });

    // すべてのページの新しいIDを生成
    let pageIndex = 0;
    for (const [subMenuId, pages] of Object.entries(pagesBySubMenu)) {
      if (Array.isArray(pages)) {
        pages.forEach((page: PageMetadata, index: number) => {
          // 各ページごとに異なるタイムスタンプを使用
          const pageTimestamp = Date.now() + pageIndex;
          const randomSuffix = Math.random().toString(36).substr(2, 9);
          const newPageId = `page-${pageTimestamp}-${index}-${randomSuffix}`;
          pageIdMapping[page.id] = newPageId;
          pageIndex++;
        });
      }
    }

    console.log('📋 ページIDマッピング:', pageIdMapping);

    // 5. ページデータをコピー（新しいIDに置き換え）
    const newPagesBySubMenu: { [subMenuId: string]: Array<PageMetadata> } = {};
    const newPageOrderBySubMenu: { [subMenuId: string]: string[] } = {};

    for (const [subMenuId, pages] of Object.entries(pagesBySubMenu)) {
      if (Array.isArray(pages) && pages.length > 0) {
        const mappedPages = pages.map((page: PageMetadata) => {
          const newPageId = pageIdMapping[page.id];
          if (!newPageId) {
            console.warn(`⚠️ ページIDマッピングが見つかりません: ${page.id}`, {
              page,
              pageIdMapping,
              allPageIds: pages.map(p => p.id),
            });
            return null; // マッピングが見つからない場合はnullを返す
          }
          // ページデータを完全にコピー（すべてのフィールドを含む）
          const copiedPage: PageMetadata = {
            ...page,
            id: newPageId,
          };
          return copiedPage;
        }).filter((page): page is PageMetadata => page !== null); // nullを除外
        
        if (mappedPages.length > 0) {
          newPagesBySubMenu[subMenuId] = mappedPages;
          // ページ順序も新しいIDに置き換え
          const oldOrder = pageOrderBySubMenu[subMenuId] || [];
          // ページ順序が存在しない場合は、ページの順序に基づいて自動生成
          let newOrder: string[];
          if (oldOrder.length > 0) {
            // 既存の順序を使用（新しいIDに置き換え）
            newOrder = oldOrder.map((oldPageId: string) => {
              return pageIdMapping[oldPageId];
            }).filter((id: string | undefined): id is string => id !== undefined); // マッピングが存在するIDのみ
          } else {
            // 順序が存在しない場合は、ページのpageNumberに基づいて自動生成
            newOrder = mappedPages
              .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0))
              .map(page => page.id);
          }
          
          if (newOrder.length > 0) {
            newPageOrderBySubMenu[subMenuId] = newOrder;
          }
          
          console.log('📋 ページ順序設定:', {
            subMenuId,
            oldOrder,
            newOrder,
            mappedPagesCount: mappedPages.length,
          });
        }
      }
    }

    console.log('📋 新しいページデータ:', {
      newPagesBySubMenuKeys: Object.keys(newPagesBySubMenu),
      newPagesBySubMenu,
      newPageOrderBySubMenu,
      totalPages: Object.values(newPagesBySubMenu).flat().length,
    });

    // 6. 新しい構想データを作成
    // 重要: 元の構想の形式（固定ページ形式またはコンポーネント形式）を維持する
    // - コンポーネント形式（pagesBySubMenuが存在する）→ 新しい構想もコンポーネント形式
    // - 固定ページ形式（pagesBySubMenuが存在しない）→ 新しい構想も固定ページ形式
    const newConceptData: any = {
      name: newName,
      description: sourceConceptData.description || '',
      conceptId: newConceptId,
      serviceId: sourceServiceId,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // pagesBySubMenuが空でない場合のみ追加（コンポーネント形式の場合）
    // 固定ページ形式の場合は、pagesBySubMenuを設定しないことで固定ページ形式を維持
    if (Object.keys(newPagesBySubMenu).length > 0) {
      newConceptData.pagesBySubMenu = newPagesBySubMenu;
    }

    // pageOrderBySubMenuが空でない場合のみ追加（コンポーネント形式の場合）
    if (Object.keys(newPageOrderBySubMenu).length > 0) {
      newConceptData.pageOrderBySubMenu = newPageOrderBySubMenu;
    }

    // visibleSubMenuIdsを追加（undefinedの場合は追加しない）
    if (sourceConceptData.visibleSubMenuIds !== undefined && Array.isArray(sourceConceptData.visibleSubMenuIds) && sourceConceptData.visibleSubMenuIds.length > 0) {
      newConceptData.visibleSubMenuIds = sourceConceptData.visibleSubMenuIds;
    }

    // customSubMenuLabelsを追加（undefinedの場合は追加しない）
    if (sourceConceptData.customSubMenuLabels !== undefined && typeof sourceConceptData.customSubMenuLabels === 'object' && sourceConceptData.customSubMenuLabels !== null && Object.keys(sourceConceptData.customSubMenuLabels).length > 0) {
      newConceptData.customSubMenuLabels = sourceConceptData.customSubMenuLabels;
    }

    // fixedPageContainersBySubMenuをコピー（固定ページ形式のコンテンツ）
    console.log('📋 fixedPageContainersBySubMenuコピー前チェック:', {
      hasFixedPageContainersBySubMenu: !!sourceConceptData.fixedPageContainersBySubMenu,
      type: typeof sourceConceptData.fixedPageContainersBySubMenu,
      fixedPageContainersBySubMenu: sourceConceptData.fixedPageContainersBySubMenu,
    });
    
    if (sourceConceptData.fixedPageContainersBySubMenu && 
        typeof sourceConceptData.fixedPageContainersBySubMenu === 'object') {
      // コンテナのIDを新しいIDに置き換える
      const newFixedPageContainersBySubMenu: { [subMenuId: string]: Array<{ id: string; title: string; content: string; order: number }> } = {};
      
      // ベースタイムスタンプを取得（各コンテナごとに異なるタイムスタンプを生成するため）
      const baseTimestamp = Date.now();
      let containerIndex = 0;
      
      for (const [subMenuId, containers] of Object.entries(sourceConceptData.fixedPageContainersBySubMenu)) {
        if (Array.isArray(containers) && containers.length > 0) {
          newFixedPageContainersBySubMenu[subMenuId] = containers.map((container: any, index: number) => {
            // 各コンテナごとに異なるタイムスタンプとインデックスを使用
            const containerTimestamp = baseTimestamp + containerIndex;
            const randomSuffix = Math.random().toString(36).substr(2, 9);
            containerIndex++;
            return {
              ...container,
              id: `container-${containerTimestamp}-${index}-${randomSuffix}`,
            };
          });
        }
      }
      
      if (Object.keys(newFixedPageContainersBySubMenu).length > 0) {
        newConceptData.fixedPageContainersBySubMenu = newFixedPageContainersBySubMenu;
        console.log('✅ fixedPageContainersBySubMenuをコピー:', {
          subMenuIds: Object.keys(newFixedPageContainersBySubMenu),
          totalContainers: Object.values(newFixedPageContainersBySubMenu).reduce((sum, arr) => sum + arr.length, 0),
          newFixedPageContainersBySubMenu,
        });
      } else {
        console.log('⚠️ fixedPageContainersBySubMenuは空でした');
      }
    } else {
      console.log('⚠️ fixedPageContainersBySubMenuが存在しないか、オブジェクトではありません:', {
        hasFixedPageContainersBySubMenu: !!sourceConceptData.fixedPageContainersBySubMenu,
        type: typeof sourceConceptData.fixedPageContainersBySubMenu,
        sourceConceptDataKeys: Object.keys(sourceConceptData),
      });
    }

    // オプショナルなフィールドをコピー
    if (sourceConceptData.keyVisualUrl) {
      newConceptData.keyVisualUrl = sourceConceptData.keyVisualUrl;
    }
    if (sourceConceptData.keyVisualHeight !== undefined) {
      newConceptData.keyVisualHeight = sourceConceptData.keyVisualHeight;
    }
    if (sourceConceptData.keyVisualScale !== undefined) {
      newConceptData.keyVisualScale = sourceConceptData.keyVisualScale;
    }
    if (sourceConceptData.keyVisualLogoUrl) {
      newConceptData.keyVisualLogoUrl = sourceConceptData.keyVisualLogoUrl;
    }
    if (sourceConceptData.keyVisualLogoSize !== undefined) {
      newConceptData.keyVisualLogoSize = sourceConceptData.keyVisualLogoSize;
    }
    if (sourceConceptData.keyVisualMetadata) {
      newConceptData.keyVisualMetadata = sourceConceptData.keyVisualMetadata;
    }
    if (sourceConceptData.titlePositionX !== undefined) {
      newConceptData.titlePositionX = sourceConceptData.titlePositionX;
    }
    if (sourceConceptData.titlePositionY !== undefined) {
      newConceptData.titlePositionY = sourceConceptData.titlePositionY;
    }
    if (sourceConceptData.titleFontSize !== undefined) {
      newConceptData.titleFontSize = sourceConceptData.titleFontSize;
    }
    if (sourceConceptData.titleBorderEnabled !== undefined) {
      newConceptData.titleBorderEnabled = sourceConceptData.titleBorderEnabled;
    }
    if (sourceConceptData.footerText) {
      newConceptData.footerText = sourceConceptData.footerText;
    }

    // 7. 新しい構想をFirestoreに保存
    console.log('📋 保存する構想データ:', {
      name: newConceptData.name,
      conceptId: newConceptData.conceptId,
      hasPagesBySubMenu: !!newConceptData.pagesBySubMenu,
      pagesBySubMenuKeys: newConceptData.pagesBySubMenu ? Object.keys(newConceptData.pagesBySubMenu) : [],
      pagesBySubMenuSize: newConceptData.pagesBySubMenu ? Object.keys(newConceptData.pagesBySubMenu).length : 0,
      totalPages: newConceptData.pagesBySubMenu ? Object.values(newConceptData.pagesBySubMenu).flat().length : 0,
      hasFixedPageContainersBySubMenu: !!newConceptData.fixedPageContainersBySubMenu,
      fixedPageContainersBySubMenuKeys: newConceptData.fixedPageContainersBySubMenu ? Object.keys(newConceptData.fixedPageContainersBySubMenu) : [],
      fixedPageContainersBySubMenu: newConceptData.fixedPageContainersBySubMenu,
      fixedPageContainersBySubMenuDetails: newConceptData.fixedPageContainersBySubMenu ? 
        Object.entries(newConceptData.fixedPageContainersBySubMenu).map(([subMenuId, containers]: [string, any]) => ({
          subMenuId,
          containerCount: Array.isArray(containers) ? containers.length : 0,
          containers: Array.isArray(containers) ? containers.map((c: any) => ({ id: c.id, title: c.title, order: c.order })) : [],
        })) : [],
      allKeys: Object.keys(newConceptData),
    });
    
    const newConceptDocRef = await addDoc(collection(null, 'concepts'), newConceptData);
    console.log('✅ 新しい構想を作成しました:', { newConceptId, newConceptDocId: newConceptDocRef.id });

    // 8. すべてのページの構造データと埋め込みデータをコピー（非同期）
    const allPages = Object.values(newPagesBySubMenu).flat();
    const copyPromises = allPages.map(async (newPage: PageMetadata) => {
      const oldPageId = Object.keys(pageIdMapping).find(
        key => pageIdMapping[key] === newPage.id
      );
      
      if (!oldPageId) return;

      try {
        // ページ構造データを取得
        const oldStructure = await getPageStructure(oldPageId);
        
        if (oldStructure) {
          // 新しいページIDで構造データを保存（非同期）
          // ページ間の関連性は新しいページIDに更新する必要があるが、
          // 複雑になるため、ここでは基本的な構造のみコピー
          // 完全な関連性は後で再生成される
          savePageStructureAsync(
            newPage.id,
            newPage.content,
            newPage.title,
            allPages.map(p => ({
              id: p.id,
              pageNumber: p.pageNumber,
              subMenuId: Object.keys(newPagesBySubMenu).find(
                subMenuId => newPagesBySubMenu[subMenuId].some(p2 => p2.id === p.id)
              ),
            })),
            Object.keys(newPagesBySubMenu).find(
              subMenuId => newPagesBySubMenu[subMenuId].some(p => p.id === newPage.id)
            ),
            newPage.semanticCategory,
            newPage.keywords
          );
        }

        // ページ埋め込みデータをコピー（非同期）
        savePageEmbeddingAsync(
          newPage.id,
          newPage.title,
          newPage.content,
          undefined, // planId
          newConceptId, // conceptId
          {
            keywords: newPage.keywords,
            semanticCategory: newPage.semanticCategory,
            tags: newPage.tags,
            summary: newPage.summary,
          }
        );
      } catch (error) {
        console.warn(`ページ ${newPage.id} の構造データ/埋め込みデータのコピーでエラー:`, error);
        // エラーが発生しても処理を続行
      }
    });

    // 非同期で実行（完了を待たない）
    Promise.all(copyPromises).catch((error) => {
      console.warn('ページ構造データ/埋め込みデータのコピーでエラーが発生しました（無視されます）:', error);
    });

    console.log('✅ 構想のコピーが完了しました:', { newConceptId, newConceptDocId: newConceptDocRef.id });

    return {
      newConceptId,
      newConceptDocId: newConceptDocRef.id,
    };
  } catch (error) {
    console.error('❌ 構想のコピーエラー:', error);
    throw error;
  }
}

