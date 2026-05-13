import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Edit2, Trash2, Image as ImageIcon, Search, Folder as FolderIcon, Sparkles, Filter, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import Modal from '../../components/Modal';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    gstPercent: '0',
    cookingTime: '15',
    isAvailable: true
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        categoryId: formData.categoryId,
        imageUrl: formData.imageUrl,
        gstPercent: Number(formData.gstPercent),
        cookingTime: Number(formData.cookingTime || 15),
        isAvailable: formData.isAvailable,
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        toast.success('Product refined successfully', {
          style: { borderRadius: '1rem', background: '#333', color: '#fff' }
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp()
        });
        toast.success('New product launched!', {
          style: { borderRadius: '1rem', background: '#333', color: '#fff' }
        });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Sync failed. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this item from the collection?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Product archived');
      } catch (error) {
        toast.error('Delete operation failed');
      }
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl || '',
      gstPercent: product.gstPercent || '0',
      cookingTime: product.cookingTime || '15',
      isAvailable: product.isAvailable
    });
    setIsModalOpen(true);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName,
        createdAt: serverTimestamp()
      });
      setNewCategoryName('');
      toast.success('Category established');
    } catch (error) {
      toast.error('Category creation failed');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (products.some(p => p.categoryId === id)) {
      return toast.error('Dependencies detected: Remove products first');
    }
    try {
      await deleteDoc(doc(db, 'categories', id));
      toast.success('Category removed');
    } catch (error) {
      toast.error('Operation restricted');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      imageUrl: '',
      gstPercent: '0',
      cookingTime: '15',
      isAvailable: true
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory Control</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">Inventory</h1>
          <p className="text-gray-500 mt-2 font-medium">Curate and manage your restaurant's culinary offerings.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-2 px-6 py-4 rounded-2xl shadow-sm">
            <FolderIcon size={20} className="text-gray-400" />
            Manage Categories
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 px-6 py-4 rounded-2xl shadow-lg shadow-indigo-200">
            <Plus size={20} />
            Launch New Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
            <Search size={22} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Search items by name or flavor profile..."
            className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100/50 rounded-3xl focus:ring-4 focus:ring-indigo-100 outline-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all focus:shadow-[0_20px_40px_rgb(0,0,0,0.08)] placeholder:text-gray-400 placeholder:font-medium text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-5 bg-white border border-gray-100/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-gray-400 hover:text-indigo-600 transition-all active:scale-95">
          <Filter size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-80 bg-gray-100 rounded-[2.5rem] animate-shimmer" />
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-32 text-center space-y-4 glass rounded-[3rem] border-dashed border-2 border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <Package size={40} />
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No culinary items found in the repository</p>
            <Button variant="secondary" onClick={() => setSearchTerm('')}>Clear Search</Button>
          </div>
        ) : (
          filteredProducts.map((product, index) => (
            <Card 
              key={product.id} 
              className="overflow-hidden group border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] transition-all duration-700 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-8 fill-mode-both" 
              padding="p-0"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="aspect-video bg-gray-50 relative overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200 bg-linear-to-br from-gray-50 to-gray-100">
                    <ImageIcon size={56} strokeWidth={1} />
                  </div>
                )}
                
                <div className="absolute top-4 right-4 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <button 
                    onClick={() => openEditModal(product)}
                    className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl text-gray-900 hover:bg-indigo-600 hover:text-white transition-all active:scale-90"
                  >
                    <Edit2 size={18} strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl text-gray-900 hover:bg-red-600 hover:text-white transition-all active:scale-90"
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                  </button>
                </div>

                <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 ${
                  product.isAvailable ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-white ${product.isAvailable ? 'animate-pulse' : ''}`} />
                  {product.isAvailable ? 'In Service' : 'Out of Stock'}
                </div>
              </div>

              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-xl text-gray-900 group-hover:text-indigo-600 transition-colors tracking-tight leading-none mb-1">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {categories.find(c => c.id === product.categoryId)?.name || 'Uncategorized'}
                      </span>
                      {product.isVegetarian && (
                        <div className="w-3 h-3 border border-green-600 flex items-center justify-center p-0.5">
                          <div className="w-full h-full bg-green-600 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-indigo-600 tracking-tighter leading-none">₹{product.price}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Unit Price</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 font-medium leading-relaxed">{product.description}</p>
                
                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Time</span>
                      <span className="text-xs font-black text-gray-900">{product.cookingTime}m</span>
                    </div>
                    <div className="w-[1px] h-6 bg-gray-100" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Tax Rate</span>
                      <span className="text-xs font-black text-gray-900">{product.gstPercent}%</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-indigo-600 transition-colors">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Refine Product' : 'Launch New Product'}
        footer={
          <div className="flex gap-4 w-full">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-2 py-4 rounded-2xl shadow-lg shadow-indigo-200">
              {loading ? 'Processing...' : editingProduct ? 'Sync Changes' : 'Confirm Launch'}
            </Button>
          </div>
        }
      >
        <form className="space-y-6 py-2">
          <Input 
            label="Product Title" 
            name="name" 
            value={formData.name} 
            onChange={handleInputChange} 
            placeholder="e.g. Artisanal Truffle Pasta"
            className="font-bold"
          />
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Flavor Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange}
              className="px-5 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none h-32 transition-all resize-none text-sm font-medium"
              placeholder="Describe the textures, aromas, and ingredients..."
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Input 
              label="Price (₹)" 
              name="price" 
              type="number" 
              value={formData.price} 
              onChange={handleInputChange}
              placeholder="0.00"
            />
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Culinary Category</label>
              <select 
                name="categoryId" 
                value={formData.categoryId} 
                onChange={handleInputChange}
                className="px-5 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none bg-[image:none] transition-all text-sm font-black appearance-none"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Input 
              label="Preparation Time (min)" 
              name="cookingTime" 
              type="number" 
              value={formData.cookingTime} 
              onChange={handleInputChange} 
              placeholder="15"
            />
            <Input 
              label="GST Taxation (%)" 
              name="gstPercent" 
              type="number" 
              value={formData.gstPercent} 
              onChange={handleInputChange} 
              placeholder="5"
            />
          </div>
          <Input 
            label="High-Res Image URL" 
            name="imageUrl" 
            value={formData.imageUrl} 
            onChange={handleInputChange} 
            placeholder="https://images.unsplash.com/your-dish-url"
          />
          <div className="flex items-center gap-4 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${formData.isAvailable ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {formData.isAvailable ? <CheckCircle size={24} /> : <XCircle size={24} />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Active Availability</p>
              <p className="text-[10px] text-gray-500 font-medium">Enable this to allow guests to order this item immediately.</p>
            </div>
            <div className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-gray-200">
              <input 
                type="checkbox" 
                id="isAvailable" 
                name="isAvailable" 
                checked={formData.isAvailable} 
                onChange={handleInputChange}
                className="sr-only"
              />
              <label 
                htmlFor="isAvailable"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${formData.isAvailable ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Categories Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Category Architecture"
      >
        <div className="space-y-8 py-2">
          <form onSubmit={handleAddCategory} className="flex gap-4">
            <Input 
              placeholder="e.g. Signature Mains" 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="px-8 rounded-2xl shadow-lg shadow-indigo-100">Establish</Button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Existing Categories</span>
              <div className="h-[1px] flex-1 ml-4 bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {categories.map((cat, index) => (
                <div 
                  key={cat.id} 
                  className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[1.5rem] hover:shadow-xl hover:shadow-gray-100 transition-all duration-300 animate-in fade-in slide-in-from-right-4 fill-mode-both"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    <span className="font-black text-gray-900 tracking-tight uppercase text-xs">{cat.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-10 glass rounded-[2rem] border-dashed border-2 border-gray-100">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No categories established yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
