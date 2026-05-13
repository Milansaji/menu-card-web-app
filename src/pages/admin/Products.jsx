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
import { Plus, Edit2, Trash2, Image as ImageIcon, Search, Folder as FolderIcon } from 'lucide-react';
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
        toast.success('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp()
        });
        toast.success('Product added successfully');
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Error saving product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Product deleted');
      } catch (error) {
        toast.error('Error deleting product');
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
      toast.success('Category added');
    } catch (error) {
      toast.error('Error adding category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (products.some(p => p.categoryId === id)) {
      return toast.error('Cannot delete category with products');
    }
    try {
      await deleteDoc(doc(db, 'categories', id));
      toast.success('Category deleted');
    } catch (error) {
      toast.error('Error deleting category');
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">Manage your menu items and availability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-2">
            <FolderIcon size={20} />
            Categories
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2">
            <Plus size={20} />
            Add New Product
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 italic">
            No products found. Click "Add New Product" to get started.
          </div>
        ) : (
          filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden group" padding="p-0">
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon size={48} />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <button 
                    onClick={() => openEditModal(product)}
                    className="p-2 bg-white rounded-full shadow-lg text-gray-600 hover:text-indigo-600"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-2 bg-white rounded-full shadow-lg text-gray-600 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  product.isAvailable ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {product.isAvailable ? 'Available' : 'Out of Stock'}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                  <span className="text-indigo-600 font-bold">₹{product.price}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 bg-gray-100 rounded-full font-medium text-gray-600">
                    {categories.find(c => c.id === product.categoryId)?.name || 'Uncategorized'}
                  </span>
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
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4">
          <Input 
            label="Product Name" 
            name="name" 
            value={formData.name} 
            onChange={handleInputChange} 
            placeholder="e.g. Butter Chicken"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
              placeholder="Tell us about the dish..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Price (₹)" 
              name="price" 
              type="number" 
              value={formData.price} 
              onChange={handleInputChange}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select 
                name="categoryId" 
                value={formData.categoryId} 
                onChange={handleInputChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Input 
            label="Cooking Time (mins)" 
            name="cookingTime" 
            type="number" 
            value={formData.cookingTime} 
            onChange={handleInputChange} 
            placeholder="15"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Product Image URL" 
              name="imageUrl" 
              value={formData.imageUrl} 
              onChange={handleInputChange} 
              placeholder="https://images.unsplash.com/..."
            />
            <Input 
              label="GST %" 
              name="gstPercent" 
              type="number" 
              value={formData.gstPercent} 
              onChange={handleInputChange} 
              placeholder="5"
            />
          </div>
          <div className="flex items-center gap-2 py-2">
            <input 
              type="checkbox" 
              id="isAvailable" 
              name="isAvailable" 
              checked={formData.isAvailable} 
              onChange={handleInputChange}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="isAvailable" className="text-sm font-medium text-gray-700">Available for Order</label>
          </div>
        </form>
      </Modal>

      {/* Categories Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Manage Categories"
      >
        <div className="space-y-6">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <Input 
              placeholder="New Category Name" 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Add</Button>
          </form>

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="font-medium text-gray-700">{cat.name}</span>
                <button 
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-gray-500 italic text-sm">No categories yet.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
