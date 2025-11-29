
import React, { useState, useEffect } from 'react';
import { db, Category, Program } from '../../services/demoDb';
import { Folder, ChevronRight, Plus, MoreHorizontal, FileText, Trash2, Edit2 } from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface CategoriesViewProps {
  activeEvent: Program | null;
}

interface CategoryCardProps {
  category: Category;
  allCategories: Category[];
  onAddSub: (id: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, allCategories, onAddSub }) => {
  const children = allCategories.filter(c => c.parentId === category.id);

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
       <div className="p-4 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Folder className="w-5 h-5" />
             </div>
             <div>
                <h4 className="font-bold text-slate-900">{category.title}</h4>
                <p className="text-xs text-slate-500">{children.length} Subcategories • {category.entriesCount} Entries</p>
             </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
             <MoreHorizontal className="w-5 h-5" />
          </button>
       </div>
       
       <div className="p-4 space-y-2">
          {children.length > 0 ? (
             children.map(child => (
                <div key={child.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-colors group">
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400"></div>
                      <span className="text-sm font-medium text-slate-700">{child.title}</span>
                   </div>
                   <div className="flex items-center gap-4 text-slate-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {child.entriesCount}</span>
                      <button className="hover:text-indigo-600"><Edit2 className="w-3 h-3" /></button>
                   </div>
                </div>
             ))
          ) : (
             <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-100 rounded-lg">
                No subcategories yet
             </div>
          )}
          
          <button 
             onClick={() => onAddSub(category.id)}
             className="w-full py-2 text-xs font-bold text-indigo-600 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 mt-2"
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

  useEffect(() => {
    if (activeEvent) {
       setCategories(db.getCategories(activeEvent.id));
    }
  }, [activeEvent, isModalOpen]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeEvent && newCategory.title) {
       db.addCategory({
          title: newCategory.title,
          programId: activeEvent.id,
          parentId: newCategory.parentId || null
       });
       setIsModalOpen(false);
       setNewCategory({ title: '', parentId: '' });
    }
  };

  const openModal = (parentId = '') => {
     setNewCategory({ title: '', parentId });
     setIsModalOpen(true);
  };

  const rootCategories = categories.filter(c => c.parentId === null);

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-bold text-slate-900">Awards & Categories</h1>
             <p className="text-slate-500">Structure your event into categories and subcategories.</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => openModal('')}>
             <Plus className="w-4 h-4" /> Add Main Category
          </Button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rootCategories.map(cat => (
             <CategoryCard 
                key={cat.id} 
                category={cat} 
                allCategories={categories}
                onAddSub={openModal} 
             />
          ))}
          
          <button 
             onClick={() => openModal('')}
             className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-8 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all min-h-[300px]"
          >
             <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6" />
             </div>
             <span className="font-bold">Create Category</span>
          </button>
       </div>

       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={newCategory.parentId ? "Add Subcategory" : "Create Category"}>
          <form onSubmit={handleCreate} className="space-y-4">
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                <input 
                   required
                   className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="e.g. Innovation in Design"
                   value={newCategory.title}
                   onChange={e => setNewCategory({...newCategory, title: e.target.value})}
                />
             </div>
             {newCategory.parentId && (
                <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500">
                   This will be added inside the selected parent category.
                </div>
             )}
             <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
             </div>
          </form>
       </Modal>
    </div>
  );
};
    