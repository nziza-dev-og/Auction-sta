import  { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProductCard from '../components/ProductCard';
import { Search, Filter } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface Product {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  currentBid: number;
  endsAt: Date;
  category: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  // Featured premium product images from Unsplash
  const featuredImages = [
    "https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhdWN0aW9uJTIwaXRlbXMlMjBwcmVtaXVtfGVufDB8fHx8MTc0NjA5OTkwOHww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1522255272218-7ac5249be344?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBhdWN0aW9uJTIwaXRlbXMlMjBwcmVtaXVtfGVufDB8fHx8MTc0NjA5OTkwOHww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1541239370886-851049f91487?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBhdWN0aW9uJTIwaXRlbXMlMjBwcmVtaXVtfGVufDB8fHx8MTc0NjA5OTkwOHww&ixlib=rb-4.0.3",
    "https://images.unsplash.com/photo-1500627964684-141351970a7f?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBhdWN0aW9uJTIwaXRlbXMlMjBwcmVtaXVtfGVufDB8fHx8MTc0NjA5OTkwOHww&ixlib=rb-4.0.3"
  ];
  
  // Select a random featured image for the hero
  const featuredImage = featuredImages[Math.floor(Math.random() * featuredImages.length)];

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Simplified query to avoid complex index requirements
        // Instead of using where conditions, we'll filter in-memory
        const q = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          limit(50) // Limit to reasonable number to avoid performance issues
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedProducts: Product[] = [];
        const categorySet = new Set<string>();
        const now = new Date();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamp to Date safely
          let startingDate, endsAt;
          try {
            startingDate = data.startingDate?.toDate ? data.startingDate.toDate() : null;
            endsAt = data.endsAt?.toDate ? data.endsAt.toDate() : null;
          } catch (error) {
            console.error('Error converting timestamps:', error);
            return; // Skip this product if timestamp conversion fails
          }
          
          // Only include products that are currently active
          if (startingDate && endsAt && startingDate <= now && endsAt > now) {
            // Add category to set
            if (data.category) {
              categorySet.add(data.category);
            }
            
            // Use one of our premium images if the product has no image
            const randomIndex = Math.floor(Math.random() * featuredImages.length);
            
            fetchedProducts.push({
              id: doc.id,
              title: data.title || 'Unlisted Item',
              description: data.description || 'No description available',
              imageUrl: data.imageUrl || featuredImages[randomIndex],
              currentBid: data.currentBid || data.startingBid || 0,
              endsAt: endsAt,
              category: data.category || 'Uncategorized'
            });
          }
        });
        
        setProducts(fetchedProducts);
        setCategories(Array.from(categorySet));
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    // Skip products with undefined values to prevent errors
    if (!product.title || !product.description || !product.category) return false;
    
    const matchesSearch = 
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12">
        <div className="bg-gradient-to-r from-primary-700 to-primary-900 rounded-xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <img 
              src={featuredImage}
              alt="Premium Auction Item" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row">
            <div className="md:w-3/5 mb-8 md:mb-0 md:pr-10">
              <h1 className="text-4xl font-bold mb-4">Premium Online Auctions</h1>
              <p className="text-xl mb-6">
                Discover exclusive items and place your bids in a secure environment.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#featured" className="btn bg-white text-primary-700 hover:bg-gray-100">
                  Explore Auctions
                </a>
                <a href="#categories" className="btn border border-white text-white hover:bg-white hover:text-primary-700">
                  View Categories
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="featured" className="mb-12">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Active Auctions</h2>
          
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search auctions..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            
            <div className="relative">
              <select
                className="input pl-10 appearance-none"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">No products found matching your criteria.</p>
          </div>
        )}
      </section>

      <section id="categories" className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">Why Choose BidMaster?</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="bg-primary-100 text-primary-700 p-1 rounded mr-3 mt-0.5">✓</span>
                <span>Secure bidding platform with user verification</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary-100 text-primary-700 p-1 rounded mr-3 mt-0.5">✓</span>
                <span>Real-time bid updates and notifications</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary-100 text-primary-700 p-1 rounded mr-3 mt-0.5">✓</span>
                <span>Transparent auction process with detailed history</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary-100 text-primary-700 p-1 rounded mr-3 mt-0.5">✓</span>
                <span>Exclusive items not available anywhere else</span>
              </li>
            </ul>
          </div>
          
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">How It Works</h3>
            <ol className="space-y-4">
              <li className="flex">
                <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3">1</span>
                <span>Create an account or log in to your existing one</span>
              </li>
              <li className="flex">
                <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3">2</span>
                <span>Browse active auctions and find items you love</span>
              </li>
              <li className="flex">
                <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3">3</span>
                <span>Place your bid higher than the current highest bid</span>
              </li>
              <li className="flex">
                <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3">4</span>
                <span>Win the auction and get notified about next steps</span>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
 