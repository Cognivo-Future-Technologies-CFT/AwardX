import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { db } from '../../services/database';
import { Category, Program } from '../../services/models';
import { Folder, ChevronRight, Plus, FileText, Trash2, ChevronDown, List, Workflow, LayoutGrid } from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { useConfirm } from '../ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoriesWorkflow } from './CategoriesWorkflow';
import { CategoriesTiles } from './CategoriesTiles';
import type { AwardsViewMode } from '../../lib/awardsViewMode';
import { getRootCategories } from '../../lib/categoryHierarchy';

export type { AwardsViewMode as CategoriesViewMode };

interface CategoriesViewProps {
   activeEvent: Program | null;
   viewMode?: AwardsViewMode;
   onViewModeChange?: (mode: AwardsViewMode) => void;
}

interface CategoryItemProps {
   category: Category;
   allCategories: Category[];
   level: number;
   onAddSub: (id: string) => void;
   onDelete: (id: string) => void;
   selectedIds: string[];
   onToggleSelect: (id: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, allCategories, level, onAddSub, onDelete, selectedIds, onToggleSelect }) => {
   const [isExpanded, setIsExpanded] = useState(true);
   const children = allCategories.filter(c => c.parentId === category.id);
   const hasChildren = children.length > 0;

   return (
      <div className="select-none">
         <div
            className={`flex items-center justify-between p-3 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all group`}
            style={{ marginLeft: `${level * 1.5}rem` }}
         >
            <div className="flex items-center gap-2 flex-1">
               {hasChildren ? (
                  <button
                     onClick={() => setIsExpanded(!isExpanded)}
                     className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                  >
                     {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
               ) : (
                  <div className="w-6 h-6 flex items-center justify-center">
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
                  </div>
               )}

               <input
                  type="checkbox"
                  checked={selectedIds.includes(category.id)}
                  onChange={() => onToggleSelect(category.id)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
               />

               <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-900 transition-colors">{category.title}</span>
            </div>

            <div className="flex items-center gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
               <span className="text-xs text-slate-500 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {category.entriesCount}
               </span>
               <button
                  type="button"
                  onClick={() => onAddSub(category.id)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  title="Add subcategory"
                  aria-label={`Add subcategory under ${category.title}`}
               >
                  <Plus className="w-3.5 h-3.5" />
               </button>
               <button
                  type="button"
                  onClick={() => onDelete(category.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
                  title="Delete category"
                  aria-label={`Delete ${category.title}`}
               >
                  <Trash2 className="w-3.5 h-3.5" />
               </button>
            </div>
         </div>

         <AnimatePresence>
            {isExpanded && hasChildren && (
               <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
               >
                  {children.map(child => (
                     <CategoryItem
                        key={child.id}
                        category={child}
                        allCategories={allCategories}
                        level={level + 1}
                        onAddSub={onAddSub}
                        onDelete={onDelete}
                        selectedIds={selectedIds}
                        onToggleSelect={onToggleSelect}
                     />
                  ))}
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
};

interface CategoryCardProps {
   category: Category;
   allCategories: Category[];
   onAddSub: (id: string) => void;
   onDelete: (id: string) => void;
   selectedIds: string[];
   onToggleSelect: (id: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, allCategories, onAddSub, onDelete, selectedIds, onToggleSelect }) => {
   const children = allCategories.filter(c => c.parentId === category.id);

   return (
      <div
         className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all"
         data-demo-target={category.id === 'cat-1' ? 'awards-category-card-1' : undefined}
      >
         <div className="p-4 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center gap-3">
               <input
                  type="checkbox"
                  checked={selectedIds.includes(category.id)}
                  onChange={() => onToggleSelect(category.id)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
               />
               <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                  <Folder className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="font-bold text-slate-900">{category.title}</h4>
                  <p className="text-xs text-slate-500">{children.length} Subcategories</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button
                  type="button"
                  onClick={() => onDelete(category.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
                  title="Delete category"
                  aria-label={`Delete ${category.title}`}
               >
                  <Trash2 className="w-5 h-5" />
               </button>
            </div>
         </div>

         <div className="p-2">
            {children.length > 0 ? (
               <div className="space-y-1">
                  {children.map(child => (
                     <CategoryItem
                        key={child.id}
                        category={child}
                        allCategories={allCategories}
                        level={0}
                        onAddSub={onAddSub}
                        onDelete={onDelete}
                        selectedIds={selectedIds}
                        onToggleSelect={onToggleSelect}
                     />
                  ))}
               </div>
            ) : (
               <div className="text-center py-6 text-xs text-slate-500 border-2 border-dashed border-slate-100 rounded-lg m-2">
                  No subcategories yet
               </div>
            )}

            <button
               onClick={() => onAddSub(category.id)}
               className="w-full py-2 text-xs font-bold text-indigo-600 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 mt-4"
            >
               <Plus className="w-3 h-3" /> Add Subcategory
            </button>
         </div>
      </div>
   );
};

export const CategoriesView: React.FC<CategoriesViewProps> = ({
   activeEvent,
   viewMode: viewModeProp,
   onViewModeChange,
}) => {
   const { confirm, ConfirmDialogNode } = useConfirm();
   const [categories, setCategories] = useState<Category[]>([]);
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [newCategory, setNewCategory] = useState({ title: '', parentId: '' });
   const [isCreating, setIsCreating] = useState(false);
   const [internalViewMode, setInternalViewMode] = useState<AwardsViewMode>('workflow');
   const viewMode = viewModeProp ?? internalViewMode;
   const setViewMode = onViewModeChange ?? setInternalViewMode;

   const loadCategories = async () => {
      if (!activeEvent) return;
      const data = await db.getCategories(activeEvent.id);
      setCategories(data);
   };

   useEffect(() => {
      loadCategories();
   }, [activeEvent]);

   const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

   useEffect(() => {
      setPortalTarget(document.getElementById('dashboard-header-actions'));
   }, []);

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeEvent || !newCategory.title.trim()) return;

      const titleTrimmed = newCategory.title.trim();
      const parentIdNormalized = newCategory.parentId || null;

      // Duplicate validation on the frontend
      const isDuplicate = categories.some(
         c =>
            c.parentId === parentIdNormalized &&
            c.title.trim().toLowerCase() === titleTrimmed.toLowerCase()
      );
      if (isDuplicate) {
         toast.error('A category with this name already exists at this level.');
         return;
      }

      setIsCreating(true);
      try {
         await db.addCategory({
            title: titleTrimmed,
            programId: activeEvent.id,
            parentId: parentIdNormalized,
         });
         await loadCategories();
         setIsModalOpen(false);
         setNewCategory({ title: '', parentId: '' });
         toast.success('Category created');
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Failed to create category';
         toast.error(message);
      } finally {
         setIsCreating(false);
      }
   };

   const openModal = (parentId = '') => {
      setNewCategory({ title: '', parentId });
      setIsModalOpen(true);
   };

   const handleDelete = async (categoryId: string) => {
      const category = categories.find(c => c.id === categoryId);
      const ok = await confirm({
        title: `Delete "${category?.title || 'category'}"?`,
        description: 'This will also delete all its subcategories. This cannot be undone.',
        confirmLabel: 'Delete category',
      });
      if (!ok || !activeEvent) return;
      try {
         await db.deleteCategory(categoryId, activeEvent.id);
         await loadCategories();
         toast.success(`"${category?.title}" deleted`);
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Failed to delete category';
         toast.error(message);
      }
   };

const getDescendantIds = (categoryId: string): string[] => {
   const children = categories.filter(c => c.parentId === categoryId);

   return children.flatMap(child => [
      child.id,
      ...getDescendantIds(child.id),
   ]);
};

const handleToggleSelect = (categoryId: string) => {
   const descendants = getDescendantIds(categoryId);
   const idsToToggle = [categoryId, ...descendants];

   setSelectedIds(prev => {
      const isSelected = prev.includes(categoryId);

      if (isSelected) {
         return prev.filter(id => !idsToToggle.includes(id));
      }

      return [...new Set([...prev, ...idsToToggle])];
   });
};

   const allSelected = categories.length > 0 && selectedIds.length === categories.length;
   const handleToggleSelectAll = () => {
      if (allSelected) {
         setSelectedIds([]);
      } else {
         setSelectedIds(categories.map(c => c.id));
      }
   };

   const handleDeleteSelected = async () => {
      const ok = await confirm({
         title: `Delete ${selectedIds.length} selected categor${selectedIds.length === 1 ? 'y' : 'ies'}?`,
         description: 'This will also delete all their subcategories. This cannot be undone.',
         confirmLabel: 'Delete selected',
      });
      if (!ok || !activeEvent) return;

      try {
         if (selectedIds.length === categories.length) {
            await db.deleteAllCategories(activeEvent.id);
         } else {
            await Promise.all(selectedIds.map(id => db.deleteCategory(id, activeEvent.id)));
         }
         await loadCategories();
         setSelectedIds([]);
         toast.success('Selected categories deleted');
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Failed to delete categories';
         toast.error(message);
      }
   };

   const rootCategories = getRootCategories(categories);
   const parentCategory = categories.find(c => c.id === newCategory.parentId);

   const isCanvasView = viewMode === 'workflow' || viewMode === 'tiles';

   return (
      <div
         className={
            viewMode === 'list'
               ? 'p-4 lg:p-8 max-w-7xl mx-auto min-h-full'
               : 'flex flex-col min-h-[calc(100vh-7rem)] h-[calc(100vh-7rem)] overflow-hidden'
         }
      >
         {ConfirmDialogNode}
         {/* Portal Controls to Header */}
         {portalTarget && createPortal(
            <div className="flex items-center gap-3">
               {/* View Switcher */}
               <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
                  <button
                     onClick={() => setViewMode('list')}
                     className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                     title="List View"
                  >
                     <List className="w-4 h-4" />
                  </button>
                  <button
                     onClick={() => setViewMode('workflow')}
                     className={`p-2 rounded-md transition-all ${viewMode === 'workflow' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                     title="2D diagram — pan, zoom, and connect categories"
                  >
                     <Workflow className="w-4 h-4" />
                  </button>
                  <button
                     onClick={() => setViewMode('tiles')}
                     className={`p-2 rounded-md transition-all ${viewMode === 'tiles' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                     title="Tile grid — all categories at a glance"
                  >
                     <LayoutGrid className="w-4 h-4" />
                  </button>
               </div>

               {categories.length > 0 && (
                  <Button
                     variant="outline"
                     className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                     onClick={handleToggleSelectAll}
                  >
                     {allSelected ? 'Deselect All' : 'Select All'}
                  </Button>
               )}

               {selectedIds.length > 0 && (
                  <Button
                     variant="outline"
                     className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
                     onClick={handleDeleteSelected}
                  >
                     <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
                  </Button>
               )}

<div className="absolute bottom-6 right-6">
  <Button
    size="lg"
    className="shadow-lg rounded-full"
    onClick={() => openModal('')}
  >
    <Plus className="w-4 h-4 mr-2" />
    Add Root Category
  </Button>
</div>
            </div>,
            portalTarget
         )}

         {/* View Content */}
         <AnimatePresence mode="wait">
            <motion.div
               key={viewMode}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.2 }}
               className={`flex-1 min-h-0 ${isCanvasView ? 'h-full' : ''}`}
            >
               {isCanvasView && (
                  <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
                     <h1 className="text-lg font-bold text-slate-900">Awards & Categories</h1>
                     <p className="text-sm text-slate-500">
                        {viewMode === 'workflow'
                           ? 'Drag nodes to arrange your award tree. Scroll to zoom, drag the canvas to pan.'
                           : 'Browse every category and subcategory in a flat grid.'}
                     </p>
                  </div>
               )}

               {viewMode === 'list' && (
                  <div className="space-y-8 pb-12" data-demo-target="awards-list-view">
                     <div>
                        <h1 className="text-2xl font-bold text-slate-900">Awards & Categories</h1>
                        <p className="text-slate-500">Structure your event into categories and subcategories.</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                        {rootCategories.map(cat => (
                           <CategoryCard
                              key={cat.id}
                              category={cat}
                              allCategories={categories}
                              onAddSub={openModal}
                              onDelete={handleDelete}
                              selectedIds={selectedIds}
                              onToggleSelect={handleToggleSelect}
                           />
                        ))}

                        <button
                           onClick={() => openModal('')}
                           className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-8 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all min-h-[300px] group"
                        >
                           <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
                              <Plus className="w-6 h-6" />
                           </div>
                           <span className="font-bold">Create Category</span>
                        </button>
                     </div>
                  </div>
               )}

{viewMode === 'workflow' && (
  <div className="flex-1 min-h-0 h-full w-full overflow-hidden">
    {categories.length === 0 ? (
      <div className="h-full flex flex-col items-center justify-center">
        <Folder className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">
          No Categories Yet
        </h3>
        <p className="text-slate-500 mb-6">
          Create your first root category to start building the award structure.
        </p>
        <Button onClick={() => openModal('')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Root Category
        </Button>
      </div>
    ) : (
      <CategoriesWorkflow
        categories={categories}
        onAddSub={openModal}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        programId={activeEvent?.id}
      />
    )}
  </div>
)}

               {viewMode === 'tiles' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
                     <CategoriesTiles categories={categories} onAddSub={openModal} onDelete={handleDelete} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} />
                  </div>
               )}
            </motion.div>
         </AnimatePresence>

         <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Category">
            <form onSubmit={handleCreate} className="space-y-6">
               {parentCategory ? (
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                     <div className="p-2 bg-indigo-100 text-indigo-700 rounded-md">
                        <Folder className="w-4 h-4" />
                     </div>
                     <div>
                        <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Adding to</p>
                        <p className="text-sm font-bold text-indigo-700">{parentCategory.title}</p>
                     </div>
                  </div>
               ) : (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                     <div className="p-2 bg-white border border-slate-200 text-slate-500 rounded-md">
                        <Folder className="w-4 h-4" />
                     </div>
                     <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Adding as</p>
                        <p className="text-sm font-bold text-slate-900">Main Category</p>
                     </div>
                  </div>
               )}

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category Title</label>
                  <input
                     autoFocus
                     required
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                     placeholder="e.g. Best Visual Design"
                     value={newCategory.title}
                     onChange={e => setNewCategory({ ...newCategory, title: e.target.value })}
                  />
               </div>

               <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating}>Cancel</Button>
                  <Button type="submit" disabled={isCreating}>
                     {isCreating ? 'Creating...' : 'Create Category'}
                  </Button>
               </div>
            </form>
         </Modal>
      </div>
   );
};
