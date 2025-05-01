import  { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, addDoc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Product, Category } from '../../models/Product';
import { Calendar, Clock, DollarSign, Image, Save, Tag, Plus, Minus, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toDate, fromDate } from '../../utils/firestoreConverters';

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentUser, userData } = useAuth();
  const isEditing = !!id;
  
  // Get current date and a week from now as defaults
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Format dates for input default values
  const formatDateForInput = (date: Date): string => {
    try {
      return date.toISOString().substring(0, 16);
    } catch (error) {
      console.error("Invalid date:", date, error);
      return new Date().toISOString().substring(0, 16);
    }
  };

  const [product, setProduct] = useState<Partial<Product>>({
    title: '',
    description: '',
    imageUrl: '',
    category: '',
    startingBid: 0,
    currentBid: 0,
    startingDate: today,
    endsAt: nextWeek,
    isFixedPrice: false,
    scales: []
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [useImageUrl, setUseImageUrl] = useState<boolean>(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  
  // Premium product images from Unsplash
  const sampleImages = [
    "https://images.unsplash.com/photo-1495704907664-81f74a7efd9b?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw1fHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1522255272218-7ac5249be344?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwyfHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1541239370886-851049f91487?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwzfHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1500627964684-141351970a7f?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw0fHxwcmVtaXVtJTIwd2F0Y2glMjBhdWN0aW9uJTIwbHV4dXJ5fGVufDB8fHx8MTc0NjA5NzI0Nnww&ixlib=rb-4.0.3"
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData: Category[] = [];
        querySnapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as Category);
        });
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };

    fetchCategories();

    if (isEditing) {
      const fetchProduct = async () => {
        try {
          const productDoc = await getDoc(doc(db, 'products', id!));
          if (productDoc.exists()) {
            const data = productDoc.data();
            
            // Safely convert dates
            let startingDate = new Date();
            let endsAt = new Date();
            try {
              startingDate = toDate(data.startingDate) || new Date();
              endsAt = toDate(data.endsAt) || new Date();
            } catch (error) {
              console.error('Error converting dates:', error);
              // Use default dates if conversion fails
              startingDate = new Date();
              endsAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
            }
            
            setProduct({
              ...data,
              startingDate,
              endsAt,
              scales: data.scales || []
            });
            
            if (data.imageUrl) {
              setImagePreview(data.imageUrl);
              setImageUrlInput(data.imageUrl);
              setUseImageUrl(true);
            }
          } else {
            toast.error('Product not found');
            navigate('/admin/products');
          }
        } catch (error) {
          console.error('Error fetching product:', error);
          toast.error('Failed to load product');
        } finally {
          setLoading(false);
        }
      };

      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [id, isEditing, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setProduct({ ...product, [name]: parseFloat(value) });
    } else if (type === 'checkbox') {
      setProduct({ ...product, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setProduct({ ...product, [name]: value });
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value) {
      try {
        const newDate = new Date(value);
        // Validate that the date is valid
        if (!isNaN(newDate.getTime())) {
          setProduct({ ...product, [name]: newDate });
        }
      } catch (error) {
        console.error(`Error parsing date from ${value}:`, error);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUseImageUrl(false);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrlInput(e.target.value);
  };

  const applyImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImagePreview(imageUrlInput);
      setProduct({ ...product, imageUrl: imageUrlInput });
      setImageFile(null);
      setUseImageUrl(true);
      toast.success('Image URL applied');
    } else {
      toast.error('Please enter a valid image URL');
    }
  };

  const useSelectedSampleImage = (url: string) => {
    setImageUrlInput(url);
    setImagePreview(url);
    setProduct({ ...product, imageUrl: url });
    setImageFile(null);
    setUseImageUrl(true);
  };

  const handleScaleChange = (index: number, value: string) => {
    const scales = [...(product.scales || [])];
    scales[index] = parseFloat(value);
    setProduct({ ...product, scales });
  };

  const addScale = () => {
    const scales = [...(product.scales || []), 0];
    setProduct({ ...product, scales });
  };

  const removeScale = (index: number) => {
    const scales = [...(product.scales || [])];
    scales.splice(index, 1);
    setProduct({ ...product, scales });
  };

  const addNewCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        name: newCategory.trim(),
        createdAt: serverTimestamp()
      });
      
      const newCat = { id: docRef.id, name: newCategory.trim() };
      setCategories([...categories, newCat]);
      setProduct({ ...product, category: newCategory.trim() });
      setNewCategory('');
      setShowNewCategory(false);
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('Unauthorized action');
      return;
    }
    
    if (!product.title || !product.description || !product.category) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (!product.startingBid || product.startingBid <= 0) {
      toast.error('Starting bid must be greater than 0');
      return;
    }
    
    if (product.isFixedPrice && (!product.scales || product.scales.length === 0)) {
      toast.error('Please add at least one scale for fixed price products');
      return;
    }
    
    setSaving(true);
    
    try {
      let imageUrl = product.imageUrl;
      
      // If using image URL directly
      if (useImageUrl && imageUrlInput) {
        imageUrl = imageUrlInput;
      }
      // Get a placeholder image if no image is set
      else if (!imageUrl && !imageFile) {
        // Select a random premium image from our collection
        const randomIndex = Math.floor(Math.random() * sampleImages.length);
        imageUrl = sampleImages[randomIndex];
      }
      // Upload image if a new one is selected
      else if (imageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // Validate dates to ensure they're valid Date objects
      let validStartingDate = new Date();
      let validEndsAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
      
      if (product.startingDate instanceof Date && !isNaN(product.startingDate.getTime())) {
        validStartingDate = product.startingDate;
      }
      
      if (product.endsAt instanceof Date && !isNaN(product.endsAt.getTime())) {
        validEndsAt = product.endsAt;
      }
      
      // Convert dates to a Firestore-compatible format
      const startingDateTimestamp = fromDate(validStartingDate);
      const endsAtTimestamp = fromDate(validEndsAt);
      const createdAtTimestamp = isEditing ? product.createdAt : fromDate(new Date());
      
      const productData = {
        ...product,
        imageUrl,
        currentBid: isEditing ? product.currentBid : product.startingBid,
        startingDate: startingDateTimestamp,
        endsAt: endsAtTimestamp,
        createdBy: currentUser.uid,
        createdAt: createdAtTimestamp,
        bids: product.bids || []
      };
      
      if (isEditing) {
        await updateDoc(doc(db, 'products', id!), productData);
        toast.success('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Product added successfully');
      }
      
      navigate('/admin/products');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Get formatted dates for inputs
  const startDateForInput = formatDateForInput(
    product.startingDate instanceof Date && !isNaN(product.startingDate.getTime())
      ? product.startingDate
      : today
  );
    
  const endDateForInput = formatDateForInput(
    product.endsAt instanceof Date && !isNaN(product.endsAt.getTime())
      ? product.endsAt
      : nextWeek
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/admin/products')}
            className="mr-4 text-gray-600 hover:text-primary-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Product Title*
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={product.title}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={product.description}
                  onChange={handleChange}
                  className="input min-h-[120px]"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category*
                </label>
                {showNewCategory ? (
                  <div className="flex">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="input rounded-r-none"
                      placeholder="Enter new category"
                    />
                    <button
                      type="button"
                      onClick={addNewCategory}
                      className="btn btn-primary rounded-l-none px-3"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex">
                    <select
                      id="category"
                      name="category"
                      value={product.category}
                      onChange={handleChange}
                      className="input rounded-r-none"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(true)}
                      className="btn btn-primary rounded-l-none px-3"
                      title="Add new category"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                    Product Image
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview('');
                        setImageFile(null);
                        setImageUrlInput('');
                        setProduct({ ...product, imageUrl: '' });
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove image
                    </button>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center space-x-4 mb-2">
                    <button
                      type="button"
                      onClick={() => setUseImageUrl(false)}
                      className={`text-sm ${!useImageUrl ? 'font-semibold text-primary-600 border-b-2 border-primary-600' : 'text-gray-600'}`}
                    >
                      Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseImageUrl(true)}
                      className={`text-sm ${useImageUrl ? 'font-semibold text-primary-600 border-b-2 border-primary-600' : 'text-gray-600'}`}
                    >
                      Use Image URL
                    </button>
                  </div>
                
                  {useImageUrl ? (
                    <div>
                      <div className="flex">
                        <div className="relative flex-grow">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LinkIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={imageUrlInput}
                            onChange={handleImageUrlChange}
                            className="input pl-10 rounded-r-none"
                            placeholder="Enter image URL..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={applyImageUrl}
                          className="btn btn-primary rounded-l-none"
                        >
                          Apply
                        </button>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Sample Premium Images:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {sampleImages.map((url, index) => (
                            <div 
                              key={index} 
                              className={`cursor-pointer border-2 rounded-md overflow-hidden ${imageUrlInput === url ? 'border-primary-500' : 'border-gray-200'}`}
                              onClick={() => useSelectedSampleImage(url)}
                            >
                              <img src={url} alt={`Sample ${index + 1}`} className="h-20 w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {imagePreview ? (
                        <div className="mt-2 relative">
                          <img
                            src={imagePreview}
                            alt="Product preview"
                            className="w-full h-48 object-cover rounded-md"
                          />
                        </div>
                      ) : (
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-1 text-center">
                            <Image className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="image"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                              >
                                <span>Upload an image</span>
                                <input
                                  id="image"
                                  name="image"
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={handleImageChange}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center">
                <input
                  id="isFixedPrice"
                  name="isFixedPrice"
                  type="checkbox"
                  checked={product.isFixedPrice}
                  onChange={(e) => handleChange(e as any)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isFixedPrice" className="ml-2 block text-sm text-gray-900">
                  This is a fixed price product (with scales)
                </label>
              </div>
              
              <div>
                <label htmlFor="startingBid" className="block text-sm font-medium text-gray-700 mb-1">
                  {product.isFixedPrice ? "Base Price*" : "Starting Bid*"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="startingBid"
                    name="startingBid"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={product.startingBid}
                    onChange={handleChange}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
              
              {product.isFixedPrice && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Price Scales
                    </label>
                    <button
                      type="button"
                      onClick={addScale}
                      className="text-xs text-primary-600 hover:text-primary-800 flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add scale
                    </button>
                  </div>
                  
                  {(product.scales || []).length > 0 ? (
                    <div className="space-y-2">
                      {(product.scales || []).map((scale, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={scale}
                              onChange={(e) => handleScaleChange(index, e.target.value)}
                              className="input pl-10"
                              placeholder={`Scale ${index + 1}`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeScale(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No scales added yet</p>
                  )}
                </div>
              )}
              
              <div>
                <label htmlFor="startingDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="startingDate"
                    name="startingDate"
                    type="datetime-local"
                    value={startDateForInput}
                    onChange={handleDateChange}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="endsAt" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="endsAt"
                    name="endsAt"
                    type="datetime-local"
                    value={endDateForInput}
                    onChange={handleDateChange}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="btn btn-outline mr-4"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center"
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
 