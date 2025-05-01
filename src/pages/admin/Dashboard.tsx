import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Users, DollarSign, Tag, BarChart, Award, FileText, Settings, Plus } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminDashboard() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeAuctions: 0,
    endedAuctions: 0,
    totalBids: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!userData || !userData.isAdmin) return;
      
      setLoading(true);
      
      try {
        // Get product stats
        const productsQuery = query(collection(db, 'products'));
        const productsSnapshot = await getDocs(productsQuery);
        
        const now = Timestamp.now();
        let activeCount = 0;
        let endedCount = 0;
        let totalBids = 0;
        let totalRevenue = 0;
        
        productsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          if (data.endsAt && data.endsAt > now) {
            activeCount++;
          } else {
            endedCount++;
            
            // For ended auctions, add the highest bid to revenue
            if (data.currentBid) {
              totalRevenue += data.currentBid;
            }
          }
          
          // Count bids
          if (data.bids && Array.isArray(data.bids)) {
            totalBids += data.bids.length;
          }
        });
        
        // Get users count
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        // Get recent products
        const recentProductsQuery = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const recentProductsSnapshot = await getDocs(recentProductsQuery);
        const recentProductsData: any[] = [];
        
        recentProductsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          recentProductsData.push({
            id: doc.id,
            title: data.title,
            currentBid: data.currentBid,
            imageUrl: data.imageUrl,
            endsAt: data.endsAt?.toDate(),
            bidsCount: data.bids?.length || 0,
            isActive: data.endsAt > now
          });
        });
        
        setStats({
          totalProducts: productsSnapshot.size,
          activeAuctions: activeCount,
          endedAuctions: endedCount,
          totalBids,
          totalUsers: usersSnapshot.size,
          totalRevenue
        });
        
        setRecentProducts(recentProductsData);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [userData]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Ensure user is admin
  if (!userData?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You do not have permission to access the admin dashboard.</p>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="bg-primary-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-semibold">{stats.totalProducts}</p>
              <div className="mt-1 flex items-center">
                <span className="text-xs text-gray-500">
                  {stats.activeAuctions} active, {stats.endedAuctions} ended
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="bg-green-100 p-3 rounded-full">
              <Tag className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Bids</p>
              <p className="text-2xl font-semibold">{stats.totalBids}</p>
              <div className="mt-1 flex items-center">
                <span className="text-xs text-gray-500">
                  {(stats.totalBids / Math.max(stats.totalProducts, 1)).toFixed(1)} bids per product
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold">{stats.totalUsers}</p>
              <div className="mt-1 flex items-center">
                <span className="text-xs text-gray-500">
                  {(stats.totalBids / Math.max(stats.totalUsers, 1)).toFixed(1)} bids per user
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="bg-secondary-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-secondary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold">${stats.totalRevenue.toLocaleString()}</p>
              <div className="mt-1 flex items-center">
                <span className="text-xs text-gray-500">
                  From {stats.endedAuctions} completed auctions
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium">Recent Products</h2>
            <Link to="/admin/products" className="text-sm text-primary-600 hover:text-primary-800">
              View All
            </Link>
          </div>
          
          {recentProducts.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {recentProducts.map((product) => (
                <div key={product.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <img 
                      src={product.imageUrl || 'https://via.placeholder.com/40'} 
                      alt={product.title}
                      className="h-12 w-12 rounded-lg object-cover" 
                    />
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">{product.title}</h3>
                      <div className="flex items-center mt-1">
                        <Tag className="h-3.5 w-3.5 text-gray-500 mr-1" />
                        <span className="text-xs text-gray-500">{product.bidsCount} bids</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className={`text-xs ${product.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {product.isActive ? 'Active' : 'Ended'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${product.currentBid?.toLocaleString() || '0'}</p>
                    <Link 
                      to={`/product/${product.id}`} 
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No products found</p>
              <Link to="/admin/products/new" className="mt-4 btn btn-primary inline-block">
                Add First Product
              </Link>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium">Admin Actions</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <Link 
              to="/admin/products" 
              className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              <div className="bg-purple-100 p-2 rounded-full">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <span className="font-medium">Product Management</span>
                <p className="text-xs text-gray-500 mt-0.5">Add, edit or remove auction products</p>
              </div>
            </Link>
            
            <Link 
              to="/admin/bids" 
              className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              <div className="bg-primary-100 p-2 rounded-full">
                <FileText className="h-5 w-5 text-primary-600" />
              </div>
              <div className="ml-3">
                <span className="font-medium">Bid Management</span>
                <p className="text-xs text-gray-500 mt-0.5">Manage all bids on your products</p>
              </div>
            </Link>
            
            <Link 
              to="/admin/declarations" 
              className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              <div className="bg-green-100 p-2 rounded-full">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <span className="font-medium">Declaration Management</span>
                <p className="text-xs text-gray-500 mt-0.5">Declare winners for ended auctions</p>
              </div>
            </Link>
            
            <Link 
              to="/admin/statistics" 
              className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              <div className="bg-blue-100 p-2 rounded-full">
                <BarChart className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <span className="font-medium">Statistics</span>
                <p className="text-xs text-gray-500 mt-0.5">View detailed reports and analytics</p>
              </div>
            </Link>
            
            <Link 
              to="/admin/settings" 
              className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              <div className="bg-gray-200 p-2 rounded-full">
                <Settings className="h-5 w-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <span className="font-medium">Admin Settings</span>
                <p className="text-xs text-gray-500 mt-0.5">Configure admin access and preferences</p>
              </div>
            </Link>
            
            <Link 
              to="/admin/products/new" 
              className="btn btn-primary w-full flex items-center justify-center mt-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
 