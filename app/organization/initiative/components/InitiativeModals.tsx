'use client';

import React from 'react';
import { getFocusInitiativeById, type FocusInitiative } from '@/lib/orgApi';
import CauseEffectDiagramUpdateModal from '@/components/CauseEffectDiagramUpdateModal';
import MonetizationDiagramUpdateModal from '@/components/MonetizationDiagramUpdateModal';
import RelationDiagramUpdateModal from '@/components/RelationDiagramUpdateModal';

interface InitiativeModalsProps {
  initiative: FocusInitiative | null;
  initiativeId: string;
  isUpdateModalOpen: boolean;
  setIsUpdateModalOpen: (open: boolean) => void;
  isMonetizationUpdateModalOpen: boolean;
  setIsMonetizationUpdateModalOpen: (open: boolean) => void;
  isRelationUpdateModalOpen: boolean;
  setIsRelationUpdateModalOpen: (open: boolean) => void;
  setInitiative: (initiative: FocusInitiative) => void;
  setLocalMethod: (method: string[]) => void;
  setLocalMeans: (means: string[]) => void;
  setLocalObjective: (objective: string) => void;
  setLocalMonetizationDiagram: (diagram: string) => void;
  setLocalRelationDiagram: (diagram: string) => void;
}

export default function InitiativeModals({
  initiative,
  initiativeId,
  isUpdateModalOpen,
  setIsUpdateModalOpen,
  isMonetizationUpdateModalOpen,
  setIsMonetizationUpdateModalOpen,
  isRelationUpdateModalOpen,
  setIsRelationUpdateModalOpen,
  setInitiative,
  setLocalMethod,
  setLocalMeans,
  setLocalObjective,
  setLocalMonetizationDiagram,
  setLocalRelationDiagram,
}: InitiativeModalsProps) {
  const handleReloadInitiative = async () => {
    try {
      const data = await getFocusInitiativeById(initiativeId);
      if (data) {
        setInitiative(data);
        return data;
      }
    } catch (err) {
      console.error('データの再読み込みに失敗しました:', err);
    }
    return null;
  };

  return (
    <>
      {/* 特性要因図更新モーダル */}
      {initiative && initiative.causeEffectDiagramId && (
        <CauseEffectDiagramUpdateModal
          isOpen={isUpdateModalOpen}
          causeEffectDiagramId={initiative.causeEffectDiagramId}
          initiative={initiative}
          onClose={() => setIsUpdateModalOpen(false)}
          onUpdated={async () => {
            setIsUpdateModalOpen(false);
            const data = await handleReloadInitiative();
            if (data) {
              setLocalMethod(data.method || []);
              setLocalMeans(data.means || []);
              setLocalObjective(data.objective || '');
            }
          }}
        />
      )}

      {/* マネタイズ図更新モーダル */}
      {initiative && (
        <MonetizationDiagramUpdateModal
          isOpen={isMonetizationUpdateModalOpen}
          monetizationDiagramId={initiative.monetizationDiagramId || ''}
          initiative={initiative}
          onClose={() => setIsMonetizationUpdateModalOpen(false)}
          onUpdated={async () => {
            setIsMonetizationUpdateModalOpen(false);
            const data = await handleReloadInitiative();
            if (data) {
              setLocalMonetizationDiagram(data.monetizationDiagram || '');
            }
          }}
        />
      )}

      {/* 相関図更新モーダル */}
      {initiative && (
        <RelationDiagramUpdateModal
          isOpen={isRelationUpdateModalOpen}
          relationDiagramId={initiative.relationDiagramId || ''}
          initiative={initiative}
          onClose={() => setIsRelationUpdateModalOpen(false)}
          onUpdated={async () => {
            setIsRelationUpdateModalOpen(false);
            const data = await handleReloadInitiative();
            if (data) {
              setLocalRelationDiagram(data.relationDiagram || '');
            }
          }}
        />
      )}
    </>
  );
}

