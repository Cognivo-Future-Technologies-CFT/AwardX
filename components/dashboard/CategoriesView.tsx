import React, { useState, useEffect } from 'react';
import { db, Category, Program } from '../../services/demoDb';
import { Folder, ChevronRight, Plus, MoreHorizontal, FileText, Trash2, Edit2, ChevronDown, List, Workflow } from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoriesWorkflow } from './CategoriesWorkflow';

interface CategoriesViewProps {
   activeEvent: Program | null;
}

interface CategoryItemProps {
   category: Category;
   allCategories: Category[];
   level: number;
   onAddSub: (id: string) => void;
   onDelete: (id: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, allCategories, level, onAddSub, onDelete }) => {
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

               <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-900 transition-colors">{category.title}</span>
            </div>

            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-xs text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {category.entriesCount}
               </span>
               <button
                  onClick={() => onAddSub(category.id)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Add Subcategory"
               >
                  <Plus className="w-3.5 h-3.5" />
               </button>
               <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
                  <Edit2 className="w-3.5 h-3.5" />
               </button>
               <button
                  onClick={() => {
                     if (window.confirm(`Are you sure you want to delete "${category.title}"? This will also delete all its subcategories.`)) {
                        onDelete(category.id);
                     }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete Category"
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
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, allCategories, onAddSub, onDelete }) => {
   const children = allCategories.filter(c => c.parentId === category.id);

   return (
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
         <div className="p-4 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center gap-3">
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
                  onClick={() => {
                     if (window.confirm(`Are you sure you want to delete "${category.title}"? This will also delete all its subcategories.`)) {
                        onDelete(category.id);
                     }
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Category"
               >
                  <Trash2 className="w-5 h-5" />
               </button>
               <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <MoreHorizontal className="w-5 h-5" />
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
                     />
                  ))}
               </div>
            ) : (
               <div className="text-center py-6 text-xs text-slate-400 border-2 border-dashed border-slate-100 rounded-lg m-2">
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

export const CategoriesView: React.FC<CategoriesViewProps> = ({ activeEvent }) => {
   const [categories, setCategories] = useState<Category[]>([]);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [newCategory, setNewCategory] = useState({ title: '', parentId: '' });
   const [viewMode, setViewMode] = useState<'list' | 'workflow'>('list');

   const loadCategories = () => {
      if (activeEvent) {
         setCategories(db.getCategories(activeEvent.id));
      }
   };

   useEffect(() => {
      loadCategories();
   }, [activeEvent]);

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (activeEvent && newCategory.title) {
         await db.addCategory({
            title: newCategory.title,
            programId: activeEvent.id,
            parentId: newCategory.parentId || null
         });
         loadCategories(); // Reload to reflect changes
         setIsModalOpen(false);
         setNewCategory({ title: '', parentId: '' });
      }
   };

   const openModal = (parentId = '') => {
      setNewCategory({ title: '', parentId });
      setIsModalOpen(true);
   };

   const handleDelete = (categoryId: string) => {
      db.deleteCategory(categoryId);
      loadCategories(); // Reload to reflect changes
   };

   const rootCategories = categories.filter(c => c.parentId === null);
   const parentCategory = categories.find(c => c.id === newCategory.parentId);

   return (
      <div className={`flex flex-col ${viewMode === 'workflow' ? 'h-[calc(100vh-6rem)] -m-4 lg:-m-8' : 'h-full space-y-8 pb-12'}`}>
         {/* Header & Controls */}
         <div className={`flex justify-between items-center shrink-0 ${viewMode === 'workflow' ? 'p-4 lg:p-8 bg-white border-b border-slate-200 z-10' : ''}`}>
            <div>
               <h1 className="text-2xl font-bold text-slate-900">Awards & Categories</h1>
               <p className="text-slate-500">Structure your event into categories and subcategories.</p>
            </div>

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
                     title="Workflow View"
                  >
                     <Workflow className="w-4 h-4" />
                  </button>
               </div>

               <Button className="flex items-center gap-2" onClick={() => openModal('')}>
                  <Plus className="w-4 h-4" /> Add Root Category
               </Button>
            </div>
         </div>

         {/* View Content */}
         <AnimatePresence mode="wait">
            <motion.div
               key={viewMode}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.2 }}
               className={`flex-1 min-h-0 ${viewMode === 'workflow' ? 'relative' : ''}`}
            >
               {viewMode === 'list' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                     {rootCategories.map(cat => (
                        <CategoryCard
                           key={cat.id}
                           category={cat}
                           allCategories={categories}
                           onAddSub={openModal}
                           onDelete={handleDelete}
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
               )}

               {viewMode === 'workflow' && (
                  <CategoriesWorkflow categories={categories} onAddSub={openModal} programId={activeEvent?.id} />
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
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Category</Button>
               </div>
            </form>
         </Modal>
      </div>
   );
};
