'use client';

import { useState } from 'react';
import { findOutdatedEntityEmbeddings } from '@/lib/entityEmbeddings';
import { findOutdatedRelationEmbeddings } from '@/lib/relationEmbeddings';

interface UseVersionCheckReturn {
  showVersionCheck: boolean;
  setShowVersionCheck: (show: boolean) => void;
  outdatedEntities: Array<{ entityId: string; currentVersion: string; expectedVersion: string; model: string }>;
  setOutdatedEntities: React.Dispatch<React.SetStateAction<Array<{ entityId: string; currentVersion: string; expectedVersion: string; model: string }>>>;
  outdatedRelations: Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }>;
  setOutdatedRelations: React.Dispatch<React.SetStateAction<Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }>>>;
  isCheckingVersion: boolean;
  setIsCheckingVersion: (checking: boolean) => void;
  handleCheckVersion: () => Promise<void>;
}

export function useVersionCheck(): UseVersionCheckReturn {
  const [showVersionCheck, setShowVersionCheck] = useState(false);
  const [outdatedEntities, setOutdatedEntities] = useState<Array<{ entityId: string; currentVersion: string; expectedVersion: string; model: string }>>([]);
  const [outdatedRelations, setOutdatedRelations] = useState<Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }>>([]);
  const [isCheckingVersion, setIsCheckingVersion] = useState(false);

  const handleCheckVersion = async () => {
    setIsCheckingVersion(true);
    try {
      const [entityOutdated, relationOutdated] = await Promise.all([
        findOutdatedEntityEmbeddings(),
        findOutdatedRelationEmbeddings(),
      ]);
      setOutdatedEntities(entityOutdated);
      setOutdatedRelations(relationOutdated);
      setShowVersionCheck(true);
    } catch (error) {
      console.error('バージョンチェックエラー:', error);
      alert('バージョンチェックに失敗しました');
    } finally {
      setIsCheckingVersion(false);
    }
  };

  return {
    showVersionCheck,
    setShowVersionCheck,
    outdatedEntities,
    setOutdatedEntities,
    outdatedRelations,
    setOutdatedRelations,
    isCheckingVersion,
    setIsCheckingVersion,
    handleCheckVersion,
  };
}
