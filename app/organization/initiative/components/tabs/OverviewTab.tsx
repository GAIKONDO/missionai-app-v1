'use client';

import AssigneeSelectionSection from '../sections/AssigneeSelectionSection';
import DescriptionSection from '../sections/DescriptionSection';
import ObjectiveSection from '../sections/ObjectiveSection';

interface OverviewTabProps {
  organizationId: string;
  localAssignee: string[];
  setLocalAssignee: (assignees: string[]) => void;
  assigneeInputRef: React.RefObject<HTMLInputElement>;
  assigneeDropdownRef: React.RefObject<HTMLDivElement>;
  assigneeSearchQuery: string;
  setAssigneeSearchQuery: (query: string) => void;
  isAssigneeDropdownOpen: boolean;
  setIsAssigneeDropdownOpen: (open: boolean) => void;
  orgMembers: Array<{ id: string; name: string; position?: string }>;
  allOrgMembers: Array<{ id: string; name: string; position?: string; organizationId?: string }>;
  manualAssigneeInput: string;
  setManualAssigneeInput: (input: string) => void;
  localDescription: string;
  setLocalDescription: (description: string) => void;
  descriptionTextareaId: string;
  isEditingDescription: boolean;
  setIsEditingDescription: (editing: boolean) => void;
  setAIGenerationTarget: (target: 'description' | 'objective' | null) => void;
  setAIGenerationInput: (input: string) => void;
  setSelectedTopicIdsForAI: (ids: string[]) => void;
  setAiSummaryFormat: (format: 'auto' | 'bullet' | 'paragraph' | 'custom') => void;
  setAiSummaryLength: (length: number) => void;
  setAiCustomPrompt: (prompt: string) => void;
  setIsAIGenerationModalOpen: (open: boolean) => void;
  isAIGenerationModalOpen: boolean;
  aiGeneratedTarget: 'description' | 'objective' | null;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  setAiGeneratedContent: (content: string | null) => void;
  setAiGeneratedTarget: (target: 'description' | 'objective' | null) => void;
  setOriginalContent: (content: string | null) => void;
  localObjective: string;
  setLocalObjective: (objective: string) => void;
  objectiveTextareaId: string;
  isEditingObjective: boolean;
  setIsEditingObjective: (editing: boolean) => void;
}

export default function OverviewTab({
  organizationId,
  localAssignee,
  setLocalAssignee,
  assigneeInputRef,
  assigneeDropdownRef,
  assigneeSearchQuery,
  setAssigneeSearchQuery,
  isAssigneeDropdownOpen,
  setIsAssigneeDropdownOpen,
  orgMembers,
  allOrgMembers,
  manualAssigneeInput,
  setManualAssigneeInput,
  localDescription,
  setLocalDescription,
  descriptionTextareaId,
  isEditingDescription,
  setIsEditingDescription,
  setAIGenerationTarget,
  setAIGenerationInput,
  setSelectedTopicIdsForAI,
  setAiSummaryFormat,
  setAiSummaryLength,
  setAiCustomPrompt,
  setIsAIGenerationModalOpen,
  isAIGenerationModalOpen,
  aiGeneratedTarget,
  aiGeneratedContent,
  originalContent,
  setAiGeneratedContent,
  setAiGeneratedTarget,
  setOriginalContent,
  localObjective,
  setLocalObjective,
  objectiveTextareaId,
  isEditingObjective,
  setIsEditingObjective,
}: OverviewTabProps) {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
        </div>
      </div>
      
      <AssigneeSelectionSection
        localAssignee={localAssignee}
        setLocalAssignee={setLocalAssignee}
        assigneeInputRef={assigneeInputRef}
        assigneeDropdownRef={assigneeDropdownRef}
        assigneeSearchQuery={assigneeSearchQuery}
        setAssigneeSearchQuery={setAssigneeSearchQuery}
        isAssigneeDropdownOpen={isAssigneeDropdownOpen}
        setIsAssigneeDropdownOpen={setIsAssigneeDropdownOpen}
        orgMembers={orgMembers}
        allOrgMembers={allOrgMembers}
        manualAssigneeInput={manualAssigneeInput}
        setManualAssigneeInput={setManualAssigneeInput}
        organizationId={organizationId}
      />
      
      <DescriptionSection
        localDescription={localDescription}
        setLocalDescription={setLocalDescription}
        descriptionTextareaId={descriptionTextareaId}
        isEditingDescription={isEditingDescription}
        setIsEditingDescription={setIsEditingDescription}
        setAIGenerationTarget={setAIGenerationTarget}
        setAIGenerationInput={setAIGenerationInput}
        setSelectedTopicIdsForAI={setSelectedTopicIdsForAI}
        setAiSummaryFormat={setAiSummaryFormat}
        setAiSummaryLength={setAiSummaryLength}
        setAiCustomPrompt={setAiCustomPrompt}
        setIsAIGenerationModalOpen={setIsAIGenerationModalOpen}
        isAIGenerationModalOpen={isAIGenerationModalOpen}
        aiGeneratedTarget={aiGeneratedTarget}
        aiGeneratedContent={aiGeneratedContent}
        originalContent={originalContent}
        setAiGeneratedContent={setAiGeneratedContent}
        setAiGeneratedTarget={setAiGeneratedTarget}
        setOriginalContent={setOriginalContent}
      />
      
      <ObjectiveSection
        localObjective={localObjective}
        setLocalObjective={setLocalObjective}
        objectiveTextareaId={objectiveTextareaId}
        isEditingObjective={isEditingObjective}
        setIsEditingObjective={setIsEditingObjective}
        setAIGenerationTarget={setAIGenerationTarget}
        setAIGenerationInput={setAIGenerationInput}
        setSelectedTopicIdsForAI={setSelectedTopicIdsForAI}
        setAiSummaryFormat={setAiSummaryFormat}
        setAiSummaryLength={setAiSummaryLength}
        setAiCustomPrompt={setAiCustomPrompt}
        setIsAIGenerationModalOpen={setIsAIGenerationModalOpen}
        isAIGenerationModalOpen={isAIGenerationModalOpen}
        aiGeneratedTarget={aiGeneratedTarget}
        aiGeneratedContent={aiGeneratedContent}
        originalContent={originalContent}
        setAiGeneratedContent={setAiGeneratedContent}
        setAiGeneratedTarget={setAiGeneratedTarget}
        setOriginalContent={setOriginalContent}
      />
    </div>
  );
}

