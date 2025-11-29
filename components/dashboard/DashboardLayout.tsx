import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, Gavel, 
  BarChart3, Users, Settings, LogOut, Bell, Search,
  Menu, X, Sparkles, LayoutTemplate, MessageSquare, ChevronRight, Share2, Shield, Activity,
  ChevronLeft, ArrowLeft, Trophy, Plus, ChevronDown, Folder, CalendarClock, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Program, Category, db } from '../../services/demoDb';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: string;
  activeEvent: Program | null;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  onSwitchEvent: () => void;
}

interface SidebarItemProps {
  id: string;
  label: string;
  icon: any;
  currentView: string;
  collapsed: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ id, label, icon: Icon, currentView, collapsed, onClick, children }) => (
  <div className="mb-1">
    <button
      onClick={onClick}
      className={`group w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        currentView === id 
          ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
      }`}
      title={collapsed ? label : undefined}
    >
      <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
        <Icon className={`w-5 h-5 transition-colors ${currentView === id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        {!collapsed && <span>{label}</span>}
      </div>
      {!collapsed && currentView === id && !children && (
        <motion.div layoutId="active-nav" className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
      )}
    </button>
    {!collapsed && children}
  </div>
);

interface CategoryTreeItemProps {
  category: Category;
  allCategories: Category[];
  depth?: number;
  onAddSub: (parentId: string) => void;
  activeId: string;
  onSelect: (id: string) => void;
}

// Recursive Tree Component
const CategoryTreeItem: React.FC<CategoryTreeItemProps> = ({ 
  category, 
  allCategories, 
  depth = 0, 
  onAddSub, 
  activeId, 
  onSelect 
}) => {
  const children = allCategories.filter(c => c.parentId === category.id);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="relative">
      {depth > 0 && (
         <div className="absolute left-[-12px] top-0 bottom-0 w-px bg-slate-200"></div>
      )}
      <div className={`flex items-center justify-between py-1.5 pr-2 pl-2 rounded-lg group hover:bg-slate-50 transition-colors ${activeId === category.id ? 'bg-indigo-50/50 text-indigo-700' : 'text-slate-600'}`}>
         <div 
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" 
            style={{ paddingLeft: `${depth * 4}px` }}
            onClick={() => onSelect('awards')}
         >
            {children.length > 0 ? (
               <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-0.5 hover:bg-slate-200 rounded">
                  {expanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
               </button>
            ) : (
               <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
               </div>
            )}
            <span className="text-xs font-medium truncate">{category.title}</span>
         </div>
         <button 
            onClick={(e) => { e.stopPropagation(); onAddSub(category.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-100 hover:text-indigo-600 rounded transition-all"
            title="Add Subcategory"
         >
            <Plus className="w-3 h-3" />
         </button>
      </div>
      
      {expanded && children.length > 0 && (
         <div className="ml-4">
            {children.map(child => (
               <CategoryTreeItem 
                  key={child.id} 
                  category={child} 
                  allCategories={allCategories} 
                  depth={depth + 1} 
                  onAddSub={onAddSub}
                  activeId={activeId}
                  onSelect={onSelect}
               />
            ))}
         </div>
      )}
    </div>
  );
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  currentView, 
  activeEvent,
  onChangeView,
  onLogout,
  onSwitchEvent
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  
  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [parentForModal, setParentForModal] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (activeEvent) {
      setCategories(db.getCategories(activeEvent.id));
    }
  }, [activeEvent, isCategoryModalOpen]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !newCategoryName) return;
    
    db.addCategory({
      title: newCategoryName,
      programId: activeEvent.id,
      parentId: parentForModal
    });
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
  };

  const openCategoryModal = (parentId: string | null = null) => {
    setParentForModal(parentId);
    setNewCategoryName('');
    setIsCategoryModalOpen(true);
  };

  const leftNavItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'schedule', label: 'Schedule', icon: CalendarClock }, 
    { id: 'submission-setup', label: 'Submission Process', icon: Settings2 }, 
    { id: 'submissions', label: 'Submissions', icon: FileText },
    { id: 'judging', label: 'Judging', icon: Gavel },
    { id: 'awards', label: 'Awards', icon: Trophy },
    { id: 'templates', label: 'Form Builder', icon: LayoutTemplate },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  const rightNavItems = [
    { id: 'reach', label: 'Reach', icon: Share2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'CRM', icon: Users },
    { id: 'teams', label: 'Teams & Roles', icon: Shield },
    { id: 'logs', label: 'Audit Logs', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const rootCategories = categories.filter(c => c.parentId === null);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 overflow-hidden">
      
      {/* LEFT SIDEBAR - Desktop */}
      <aside 
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${
          isLeftCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header / Logo / Event Switcher */}
        <div className={`h-auto min-h-[5rem] flex flex-col border-b border-slate-50 transition-all ${isLeftCollapsed ? 'items-center py-4' : 'p-4'}`}>
          {/* Back to Hub Button */}
          {!isLeftCollapsed && (
             <button 
                onClick={onSwitchEvent}
                className="flex items-center text-xs font-bold text-slate-400 hover:text-indigo-600 mb-4 transition-colors group"
             >
                <ArrowLeft className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Hub
             </button>
          )}
          {isLeftCollapsed && (
             <button onClick={onSwitchEvent} className="mb-4 text-slate-400 hover:text-indigo-600"><ArrowLeft className="w-4 h-4" /></button>
          )}

          {/* Active Event Display */}
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
             </div>
             {!isLeftCollapsed && (
               <div className="overflow-hidden">
                 <div className="font-display tracking-tight text-sm font-bold text-slate-900 truncate leading-tight">
                   {activeEvent?.title || 'Active Event'}
                 </div>
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{activeEvent?.type || 'Event'}</div>
               </div>
             )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide">
          {!isLeftCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3 font-display">Event Operations</div>}
          
          {leftNavItems.map((item) => (
            <SidebarItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              currentView={currentView}
              collapsed={isLeftCollapsed}
              onClick={() => onChangeView(item.id)}
            >
              {/* Render Tree for Awards */}
              {item.id === 'awards' && !isLeftCollapsed && (
                 <div className="ml-2 mt-1 mb-2 pl-2 border-l border-slate-100">
                    {rootCategories.map(cat => (
                       <CategoryTreeItem 
                          key={cat.id} 
                          category={cat} 
                          allCategories={categories} 
                          onAddSub={openCategoryModal}
                          activeId={currentView === 'awards' ? '' : ''}
                          onSelect={onChangeView}
                       />
                    ))}
                    <button 
                       onClick={(e) => { e.stopPropagation(); openCategoryModal(null); }}
                       className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 font-semibold mt-2 px-2 py-1 rounded hover:bg-indigo-50 w-full text-left transition-colors"
                    >
                       <Plus className="w-3 h-3" /> Add Award
                    </button>
                 </div>
              )}
            </SidebarItem>
          ))}
        </div>

        {/* User Profile (Left Bottom) */}
        <div className="p-3 border-t border-slate-100">
           <div className={`bg-slate-50/80 rounded-xl p-2 border border-slate-100 transition-all ${isLeftCollapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
              <img 
                 src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" 
                 alt="User" 
                 className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover shrink-0"
              />
              {!isLeftCollapsed && (
                <div className="flex-1 min-w-0 overflow-hidden">
                   <div className="text-sm font-bold text-slate-900 truncate font-display">Sarah Jenkins</div>
                   <div className="text-xs text-slate-500 truncate">Admin Workspace</div>
                </div>
              )}
           </div>
           
           <button 
             onClick={onLogout}
             className={`w-full flex items-center mt-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors group ${
               isLeftCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
             }`}
             title="Sign Out"
           >
             <LogOut className="w-5 h-5 group-hover:text-red-500 transition-colors" />
             {!isLeftCollapsed && <span>Sign Out</span>}
           </button>
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
          className="absolute -right-3 top-24 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-400 hover:text-indigo-600 z-50"
        >
          {isLeftCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>


      {/* MAIN CONTENT AREA */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-h-screen relative
          ${isLeftCollapsed ? 'lg:pl-20' : 'lg:pl-64'} 
          ${isRightCollapsed ? 'lg:pr-20' : 'lg:pr-64'}
        `}
      >
        {/* Top Header Mobile/Desktop Mix */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Menu />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm">
               <span className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={onSwitchEvent}>Event Hub</span>
               <ChevronRight className="w-4 h-4 text-slate-300" />
               <span className="text-slate-600 font-medium">{activeEvent?.title}</span>
               <ChevronRight className="w-4 h-4 text-slate-300" />
               <span className="font-semibold text-slate-900 capitalize bg-slate-100 px-2 py-1 rounded-md text-xs">{currentView}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden sm:flex relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search workspace..." 
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48 lg:w-64 transition-all hover:bg-white hover:border-slate-300"
              />
            </div>
            
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white ring-1 ring-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </main>
      </div>


      {/* RIGHT SIDEBAR - Desktop */}
      <aside 
        className={`hidden lg:flex flex-col fixed inset-y-0 right-0 z-40 bg-white border-l border-slate-200 transition-all duration-300 ease-in-out ${
          isRightCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsRightCollapsed(!isRightCollapsed)}
          className="absolute -left-3 top-24 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-400 hover:text-indigo-600 z-50"
        >
          {isRightCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {/* Right Sidebar Header */}
        <div className={`h-20 flex items-center border-b border-slate-50 transition-all ${isRightCollapsed ? 'justify-center' : 'px-6'}`}>
           {isRightCollapsed ? (
             <Shield className="w-5 h-5 text-slate-400" />
           ) : (
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Workspace Tools</span>
           )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3">
          {rightNavItems.map((item) => (
            <SidebarItem 
              key={item.id} 
              id={item.id} 
              label={item.label} 
              icon={item.icon} 
              collapsed={isRightCollapsed} 
              currentView={currentView}
              onClick={() => onChangeView(item.id)}
            />
          ))}
        </div>

        {/* Promo / Bottom Action */}
        {!isRightCollapsed && (
          <div className="p-4 border-t border-slate-100">
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white text-center">
                <p className="text-xs font-bold opacity-80 mb-1">PRO PLAN</p>
                <p className="text-sm font-bold mb-3">8 Days Left</p>
                <button className="w-full py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors">
                   Upgrade Now
                </button>
             </div>
          </div>
        )}
        {isRightCollapsed && (
           <div className="p-3 border-t border-slate-100 flex justify-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
           </div>
        )}
      </aside>


      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col lg:hidden shadow-2xl overflow-y-auto"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-xl text-slate-900 font-display">AwardX</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg text-slate-500"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="flex-1 py-6 px-4 space-y-6">
                <button 
                   onClick={() => { onSwitchEvent(); setIsMobileMenuOpen(false); }}
                   className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 font-medium text-sm border border-slate-100"
                >
                   <ArrowLeft className="w-4 h-4" /> Back to Event Hub
                </button>

                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Operations</div>
                  <div className="space-y-1">
                    {leftNavItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onChangeView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          currentView === item.id 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Management</div>
                  <div className="space-y-1">
                    {rightNavItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onChangeView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          currentView === item.id 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100">
                <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 font-medium">
                  <LogOut className="w-5 h-5" /> Exit Demo
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={parentForModal ? "Add Subcategory" : "Create New Award"}>
         <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {parentForModal ? "Subcategory Name" : "Award Name"}
               </label>
               <div className="relative">
                  <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                     required
                     className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                     placeholder={parentForModal ? "e.g. Best UI" : "e.g. Design Awards"}
                     value={newCategoryName}
                     onChange={(e) => setNewCategoryName(e.target.value)}
                  />
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
               <Button type="button" variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
               <Button type="submit">Create</Button>
            </div>
         </form>
      </Modal>
    </div>
  );
};