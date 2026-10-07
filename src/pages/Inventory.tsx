import React, { useEffect, useState } from 'react';
import {
  Package, Plus, Search, AlertTriangle, ArrowUpDown,
  Filter, Trash2, Edit, X, RefreshCw
} from 'lucide-react';
import { InventoryCategory, InventoryItem } from '../lib/types';
import {
  getInventoryItems,
  saveInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
} from '../lib/clinicStorage';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES: InventoryCategory[] = [
  'Dental Materials',
  'Pharmaceuticals',
  'Disposables & Surgical',
  'Instruments & Tools',
  'Office & General',
];

const emptyItemForm: {
  name: string;
  category: InventoryCategory;
  sku: string;
  batch_number: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  cost_price: number;
  sale_price: string;
  expiry_date: string;
  supplier: string;
  location: string;
  notes: string;
} = {
  name: '',
  category: 'Dental Materials',
  sku: '',
  batch_number: '',
  quantity: 0,
  unit: 'pcs',
  min_stock_level: 0,
  cost_price: 0,
  sale_price: '',
  expiry_date: '',
  supplier: '',
  location: '',
  notes: '',
};

export default function Inventory() {
  const { activeClinic } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ ...emptyItemForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Quick Stock Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');

  useEffect(() => {
    loadItems();
  }, [activeClinic?.id]);

  async function loadItems() {
    setLoading(true);
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';
    const data = await getInventoryItems(clinicId);
    setItems(data);
    setLoading(false);
  }

  const filteredItems = items.filter((item) => {
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      (item.supplier || '').toLowerCase().includes(search.toLowerCase());

    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const isLow = Number(item.quantity) <= Number(item.min_stock_level);
    const matchLow = !lowStockOnly || isLow;

    return matchSearch && matchCategory && matchLow;
  });

  // Calculate statistics
  const totalValuation = items.reduce((acc, i) => acc + Number(i.quantity) * Number(i.cost_price), 0);
  const lowStockCount = items.filter((i) => Number(i.quantity) <= Number(i.min_stock_level)).length;
  const outOfStockCount = items.filter((i) => Number(i.quantity) <= 0).length;

  function openAddModal() {
    setEditingItem(null);
    setForm({
      ...emptyItemForm,
      sku: '',
    });
    setError('');
    setShowModal(true);
  }

  function openEditModal(item: InventoryItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      sku: item.sku,
      batch_number: item.batch_number || '',
      quantity: item.quantity,
      unit: item.unit,
      min_stock_level: item.min_stock_level,
      cost_price: item.cost_price,
      sale_price: item.sale_price !== null && item.sale_price !== undefined ? String(item.sale_price) : '',
      expiry_date: item.expiry_date || '',
      supplier: item.supplier || '',
      location: item.location || '',
      notes: item.notes || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Item name is required');
      return;
    }

    setSaving(true);
    setError('');
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    try {
      await saveInventoryItem({
        id: editingItem?.id,
        clinic_id: clinicId,
        name: form.name.trim(),
        category: form.category,
        sku: form.sku.trim(),
        batch_number: form.batch_number.trim() || null,
        quantity: Number(form.quantity),
        unit: form.unit.trim() || 'pcs',
        min_stock_level: Number(form.min_stock_level),
        cost_price: Number(form.cost_price),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        expiry_date: form.expiry_date || null,
        supplier: form.supplier.trim() || null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      }, clinicId);

      await loadItems();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';
    await deleteInventoryItem(id, clinicId);
    await loadItems();
  }

  async function handleConfirmAdjust() {
    if (!adjustItem) return;
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';
    const delta = adjustType === 'add' ? adjustQty : -adjustQty;
    await adjustInventoryStock(adjustItem.id, delta, clinicId);
    setAdjustItem(null);
    await loadItems();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900 flex items-center gap-2.5">
            <Package className="text-emerald-700" size={26} />
            Clinic Inventory & Supplies
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Track dental materials, medications, surgical disposables, and clinic stock levels
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 shadow-xs"
          style={{ background: '#3c5e27' }}
        >
          <Plus size={16} /> Add Inventory Item
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Across {CATEGORIES.length} categories</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Package size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Low Stock Warnings</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
            <p className="text-xs text-amber-700 font-medium mt-0.5">Below reorder threshold</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{outOfStockCount}</p>
            <p className="text-xs text-rose-700 font-medium mt-0.5">Needs immediate order</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Stock Valuation</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">Rs. {totalValuation.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total purchase value</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <ArrowUpDown size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by name, SKU, or supplier..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories & Filter buttons */}
        <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
            <Filter size={13} className="text-gray-500 ml-1.5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-700 border-0 focus:ring-0 py-1 pr-6"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              lowStockOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle size={13} className={lowStockOnly ? 'text-amber-700' : 'text-gray-400'} />
            Low Stock Alert ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Item & Code</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4">Batch / Expiry</th>
                <th className="py-3.5 px-4">Cost / Price</th>
                <th className="py-3.5 px-4">Supplier / Location</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Loading inventory data...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = Number(item.quantity) <= Number(item.min_stock_level);
                  const isOut = Number(item.quantity) <= 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          SKU: {item.sku}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            {item.quantity} {item.unit}
                          </span>
                          {isOut ? (
                            <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                              Out
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              Low
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-gray-400">Min level: {item.min_stock_level}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-800 font-medium">
                          {item.batch_number ? `Batch: ${item.batch_number}` : '—'}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {item.expiry_date ? `Exp: ${item.expiry_date}` : 'No expiry'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">
                          Rs. {Number(item.cost_price).toLocaleString()}
                        </div>
                        {item.sale_price && (
                          <div className="text-[11px] text-emerald-700">
                            Sell: Rs. {Number(item.sale_price).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-800 font-medium">{item.supplier || '—'}</div>
                        <div className="text-[11px] text-gray-400">{item.location || 'Clinic shelf'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustQty(1);
                              setAdjustType('add');
                            }}
                            title="Restock or Consume"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Item"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            title="Delete Item"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-base text-gray-900">
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    placeholder="e.g. Composite Resin Syringe (A2)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as InventoryCategory })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    placeholder="e.g. DM-COMP-01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Unit</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    placeholder="pcs, boxes, ampoules, packs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Min Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_stock_level}
                    onChange={(e) => setForm({ ...form, min_stock_level: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Cost Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Sale / Billing Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    placeholder="Optional selling price"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Supplier</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    placeholder="Cabinet A, Shelf 2"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 resize-none"
                    placeholder="Special storage directions, batch comments..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Adjust Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setAdjustItem(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h4 className="font-semibold text-sm text-gray-900">
              Adjust Stock: {adjustItem.name}
            </h4>
            <p className="text-xs text-gray-500">
              Current Quantity: <span className="font-bold text-gray-900">{adjustItem.quantity} {adjustItem.unit}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  adjustType === 'add'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                + Restock (Add)
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('subtract')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  adjustType === 'subtract'
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                - Consume (Deduct)
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Quantity to {adjustType === 'add' ? 'Add' : 'Deduct'}
              </label>
              <input
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
