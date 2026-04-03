
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Edit2, GripVertical, Save, X,
    Layout, Type, AlignLeft, Image as ImageIcon,
    CheckCircle2, Box, Layers, MousePointer2, Settings2
} from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { useConfirm } from '../ConfirmDialog';

interface GridItem {
    id: string;
    title: string;
    description: string;
    iconName: string;
    color: string;
}

const ICONS: Record<string, any> = {
    'Box': Box,
    'Layers': Layers,
    'Layout': Layout,
    'Type': Type,
    'AlignLeft': AlignLeft,
    'ImageIcon': ImageIcon,
    'CheckCircle': CheckCircle2,
    'MousePointer': MousePointer2,
    'Settings': Settings2
};

const COLORS = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-blue-500',
    'bg-purple-500', 'bg-rose-500', 'bg-amber-500',
    'bg-slate-700', 'bg-cyan-500', 'bg-pink-500'
];

export const CustomGridView: React.FC = () => {
    const { confirm, ConfirmDialogNode } = useConfirm();
    const [items, setItems] = useState<GridItem[]>([
        { id: '1', title: 'Example Unit', description: 'This is a sample grid item you can edit.', iconName: 'Box', color: 'bg-indigo-500' }
    ]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<GridItem | null>(null);
    const [formData, setFormData] = useState<Partial<GridItem>>({
        title: '',
        description: '',
        iconName: 'Box',
        color: 'bg-indigo-500'
    });

    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({ title: '', description: '', iconName: 'Box', color: 'bg-indigo-500' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: GridItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.title) return;

        if (editingItem) {
            setItems(items.map(i => i.id === editingItem.id ? { ...i, ...formData } as GridItem : i));
        } else {
            const newItem: GridItem = {
                id: Math.random().toString(36).substr(2, 9),
                title: formData.title || '',
                description: formData.description || '',
                iconName: formData.iconName || 'Box',
                color: formData.color || 'bg-indigo-500'
            };
            setItems([...items, newItem]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: 'Delete this unit?', description: 'This action cannot be undone.', confirmLabel: 'Delete' });
        if (ok) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            {ConfirmDialogNode}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Custom Grid Builder</h1>
                    <p className="text-slate-500">Design and organize your unique operational units.</p>
                </div>
                <Button onClick={handleOpenAdd} className="flex items-center gap-2 px-6 py-2.5 rounded-xl">
                    <Plus className="w-5 h-5" /> Add New Unit
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode='popLayout'>
                    {items.map((item) => {
                        const Icon = ICONS[item.iconName] || Box;
                        return (
                            <motion.div
                                layout
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="group relative bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-14 h-14 rounded-2xl ${item.color} shadow-lg shadow-black/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-500`}>
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenEdit(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-2">
                                    {item.description}
                                </p>

                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Unit</span>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform cursor-pointer">
                                        Configure <GripVertical className="w-3 h-3" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {items.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
                        <Layout className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No custom units yet.</p>
                        <p className="text-sm">Click "Add New Unit" to get started.</p>
                    </div>
                )}
            </div>

            {/* Item Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Edit Unit' : 'Create New Unit'}
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Unit Title</label>
                        <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Strategic Planning"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                        <textarea
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Explain the purpose of this unit..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3 text-center">Customize Appearance</label>

                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 justify-center pb-2">
                                {Object.keys(ICONS).map(name => {
                                    const Icon = ICONS[name];
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => setFormData({ ...formData, iconName: name })}
                                            className={`p-3 rounded-xl border transition-all ${formData.iconName === name ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex flex-wrap gap-3 justify-center pt-2">
                                {COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setFormData({ ...formData, color })}
                                        className={`w-8 h-8 rounded-full transition-all outline-offset-2 ${color} ${formData.color === color ? 'ring-2 ring-slate-400 ring-offset-2 scale-110' : 'hover:scale-110'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                        <Button variant="ghost" className="flex-1 py-3" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button className="flex-1 py-3" onClick={handleSave}>
                            {editingItem ? 'Save Changes' : 'Create Unit'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
