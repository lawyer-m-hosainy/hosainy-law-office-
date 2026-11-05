import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Briefcase,
  Users,
  Gavel,
  Coins,
  Shield,
  CheckSquare,
  FileText,
  Calendar,
  ChevronLeft,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import {
  SearchResultItem,
  SearchResultEntityType,
  UniversalSearchResults,
} from '../../../shared/types';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCase: (caseId: number, targetTab?: string) => void;
  onNavigateToTab: (tab: any) => void;
}

const entityTypeTabs: { id: string; label: string; type?: SearchResultEntityType }[] = [
  { id: 'all', label: 'كافة النتائج' },
  { id: 'case', label: 'القضايا', type: 'case' },
  { id: 'client', label: 'الموكلين', type: 'client' },
  { id: 'hearing', label: 'الجلسات', type: 'hearing' },
  { id: 'finance', label: 'المالية', type: 'finance' },
  { id: 'execution', label: 'التنفيذات', type: 'execution' },
  { id: 'task', label: 'المهام', type: 'task' },
  { id: 'document', label: 'المستندات', type: 'document' },
];

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateToCase,
  onNavigateToTab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  // Handle Search Execution
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res: UniversalSearchResults = await window.electronAPI.universalSearch(trimmed);
        setSearchResults(res.items || []);
      } catch (err) {
        console.error('Universal search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Handle Keyboard shortcuts (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter items by selected entity tab
  const filteredItems = searchResults.filter((item) => {
    if (selectedEntity === 'all') return true;
    return item.entityType === selectedEntity;
  });

  const getEntityIcon = (type: SearchResultEntityType) => {
    switch (type) {
      case 'case':
        return <Briefcase className="w-4 h-4 text-amber-600" />;
      case 'client':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'hearing':
        return <Gavel className="w-4 h-4 text-indigo-600" />;
      case 'finance':
        return <Coins className="w-4 h-4 text-emerald-600" />;
      case 'execution':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-red-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-sky-600" />;
      default:
        return <FolderOpen className="w-4 h-4 text-slate-600" />;
    }
  };

  const getEntityBadgeStyle = (type: SearchResultEntityType) => {
    switch (type) {
      case 'case':
        return 'bg-amber-100 text-amber-800';
      case 'client':
        return 'bg-blue-100 text-blue-800';
      case 'hearing':
        return 'bg-indigo-100 text-indigo-800';
      case 'finance':
        return 'bg-emerald-100 text-emerald-800';
      case 'execution':
        return 'bg-purple-100 text-purple-800';
      case 'task':
        return 'bg-red-100 text-red-800';
      case 'document':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getEntityLabel = (type: SearchResultEntityType) => {
    switch (type) {
      case 'case': return 'قضية';
      case 'client': return 'موكل';
      case 'hearing': return 'جلسة';
      case 'finance': return 'مالية';
      case 'execution': return 'تنفيذ';
      case 'task': return 'مهمة';
      case 'document': return 'مستند';
      default: return 'عنصر';
    }
  };

  const handleSelectItem = (item: SearchResultItem) => {
    onClose();

    if (item.entityType === 'case') {
      onNavigateToCase(item.caseId || item.id, 'overview');
    } else if (item.entityType === 'hearing') {
      if (item.caseId) {
        onNavigateToCase(item.caseId, 'hearings');
      } else {
        onNavigateToTab('hearings');
      }
    } else if (item.entityType === 'finance') {
      if (item.caseId) {
        onNavigateToCase(item.caseId, 'finance');
      } else {
        onNavigateToTab('finance');
      }
    } else if (item.entityType === 'document') {
      if (item.caseId) {
        onNavigateToCase(item.caseId, 'documents');
      }
    } else if (item.entityType === 'execution') {
      if (item.caseId) {
        onNavigateToCase(item.caseId, 'executions');
      } else {
        onNavigateToTab('executions');
      }
    } else if (item.entityType === 'task') {
      if (item.caseId) {
        onNavigateToCase(item.caseId, 'tasks');
      } else {
        onNavigateToTab('tasks');
      }
    } else if (item.entityType === 'client') {
      onNavigateToTab('clients');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16 sm:pt-20 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="البحث الشامل: اكتب اسم موكل، خصم، رقم قضية، محكمة، جلسة، مستند، مهمة، إيصال..."
            className="flex-1 bg-transparent border-none text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:outline-none" data-testid="search.main.set-query-2"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1" data-testid="search.main.set-query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-mono font-bold">
            ESC للإغلاق
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1" data-testid="search.main.on-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entity Tabs Filter */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-white overflow-x-auto select-none">
          {entityTypeTabs.map((tab) => {
            const count =
              tab.id === 'all'
                ? searchResults.length
                : searchResults.filter((i) => i.entityType === tab.type).length;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedEntity(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedEntity === tab.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`} data-testid="search.main.set-selected-entity"
              >
                <span>{tab.label}</span>
                {searchResults.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedEntity === tab.id
                        ? 'bg-amber-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {query.trim().length < 2 ? (
            <div className="py-12 text-center space-y-3">
              <Search className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <div className="text-sm font-bold text-slate-700">البحث الشامل عبر كافة السجلات والكيانات</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                يدعم تطبيع الحروف العربية التلقائي (الهمزات، الهاء والتاء المربوطة، الياء والألف المقصورة، وبدون تشكيل)
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-bold text-slate-600">
                {loading ? 'جاري البحث في قاعدة البيانات...' : 'لم يتم العثور على أي نتائج مطابقة'}
              </p>
              <p className="text-xs text-slate-400">
                جرب البحث بكلمة أخرى أو برقم القضية أو اسم المحكمة
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={`${item.entityType}-${item.id}`}
                onClick={() => handleSelectItem(item)}
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 cursor-pointer transition-all shadow-xs flex items-center justify-between gap-3" data-testid="search.main.handle-select-item"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                    {getEntityIcon(item.entityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getEntityBadgeStyle(item.entityType)}`}>
                        {getEntityLabel(item.entityType)}
                      </span>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {item.badge}
                        </span>
                      )}
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-900 truncate">
                        {item.title}
                      </h4>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-slate-600 truncate">{item.subtitle}</p>
                    )}
                    {item.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {item.date && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.date}</span>
                    </div>
                  )}
                  <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-amber-200 text-slate-500 group-hover:text-amber-800 flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            {searchResults.length > 0
              ? `تم العثور على ${searchResults.length} نتيجة`
              : 'اضغط على أي نتيجة لفتح الملف أو القضية مباشرة'}
          </span>
          <span className="font-semibold text-slate-600">أوفلاين 100% بدون إنترنت</span>
        </div>
      </div>
    </div>
  );
};
