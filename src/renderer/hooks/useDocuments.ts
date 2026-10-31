import { useState, useCallback, useEffect } from 'react';
import { CaseDocument, UpdateDocumentInput } from '../../shared/types';

export function useDocuments(caseId: number | null) {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [trashDocuments, setTrashDocuments] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!caseId) {
      setDocuments([]);
      setTrashDocuments([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [activeDocs, trashDocs] = await Promise.all([
        window.electronAPI.getCaseDocuments(caseId, false),
        window.electronAPI.getCaseDocuments(caseId, true),
      ]);

      setDocuments(activeDocs || []);
      setTrashDocuments(trashDocs || []);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل مستندات القضية');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Pick and attach files
  const attachFiles = async (category: string = 'أخرى', description: string = '') => {
    if (!caseId) return { success: false, count: 0 };

    try {
      setLoading(true);
      const selectedPaths = await window.electronAPI.selectFilesToAttach();
      if (!selectedPaths || selectedPaths.length === 0) {
        setLoading(false);
        return { success: false, count: 0 };
      }

      let attachedCount = 0;
      for (const filePath of selectedPaths) {
        await window.electronAPI.attachDocument({
          case_id: caseId,
          title: '', // will fallback to filename
          category,
          sourceFilePath: filePath,
          description,
        });
        attachedCount++;
      }

      await loadDocuments();
      return { success: true, count: attachedCount };
    } catch (err: any) {
      setError(err?.message || 'فشل إرفاق الملفات');
      return { success: false, count: 0, error: err?.message };
    } finally {
      setLoading(false);
    }
  };

  // Open Document with Default App
  const openDocument = async (id: number) => {
    try {
      const res = await window.electronAPI.openDocument(id);
      if (!res.success) {
        alert(res.error || 'تعذر فتح المستند');
      }
      return res;
    } catch (err: any) {
      alert(`خطأ: ${err?.message}`);
      return { success: false, error: err?.message };
    }
  };

  // Show Document in Windows Explorer
  const showInFolder = async (id: number) => {
    try {
      const res = await window.electronAPI.showDocumentInFolder(id);
      if (!res.success) {
        alert(res.error || 'تعذر فتح المجلد');
      }
      return res;
    } catch (err: any) {
      alert(`خطأ: ${err?.message}`);
      return { success: false, error: err?.message };
    }
  };

  // Update Metadata
  const updateDocument = async (id: number, updates: UpdateDocumentInput) => {
    try {
      await window.electronAPI.updateDocument(id, updates);
      await loadDocuments();
      return true;
    } catch (err: any) {
      alert(`خطأ أثناء التعديل: ${err?.message}`);
      return false;
    }
  };

  // Move to Trash
  const moveToTrash = async (id: number) => {
    try {
      await window.electronAPI.deleteDocument(id, false);
      await loadDocuments();
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err?.message}`);
      return false;
    }
  };

  // Restore from Trash
  const restoreDocument = async (id: number) => {
    try {
      await window.electronAPI.restoreDocument(id);
      await loadDocuments();
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err?.message}`);
      return false;
    }
  };

  // Permanent Delete
  const deletePermanent = async (id: number) => {
    try {
      await window.electronAPI.deleteDocument(id, true);
      await loadDocuments();
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err?.message}`);
      return false;
    }
  };

  return {
    documents,
    trashDocuments,
    loading,
    error,
    loadDocuments,
    attachFiles,
    openDocument,
    showInFolder,
    updateDocument,
    moveToTrash,
    restoreDocument,
    deletePermanent,
  };
}
