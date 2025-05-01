import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Filter, 
  BarChart as BarChartLucide, 
  DollarSign, 
  Tag, 
  Clock 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toDate } from '../../utils/firestoreConverters';

export default function Statistics() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all'); // all, month, week
  
  // Stats data
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [bidsOverTime, setBidsOverTime] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!userData?.isAdmin) return;
      
      setLoading(true);
      
      try {
        // Define time filters based on selected range
        let startTime;
        const now = new Date();
        
        if (timeRange === 'week') {
          startTime = new Date(now);
          startTime.setDate(now.getDate() - 7);
        } else if (timeRange === 'month') {
          startTime = new Date(now);
          startTime.setMonth(now.getMonth() - 1);
        } else {
          startTime = new Date(2020, 0, 1); // Default to a long time ago for "all"
        }
        
        // Fetch all products
        const productsQuery = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc')
        );
        
        const productsSnapshot = await getDocs(productsQuery);
        
        // Process data for charts
        const categoryMap = new Map();
        const revenueByMonth = new Map();
        const bidsCountByDay = new Map();
        const products = [];
        
        productsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Use safe timestamp conversion
          const createdAt = toDate(data.createdAt) || new Date();
          const endsAt = toDate(data.endsAt) || new Date();
          
          // Skip if outside time range
          if (createdAt < startTime) return;
          
          // For category data
          const category = data.category || 'Uncategorized';
          if (categoryMap.has(category)) {
            categoryMap.set(category, categoryMap.get(category) + 1);
          } else {
            categoryMap.set(category, 1);
          }
          
          // For revenue data (only count ended auctions)
          if (endsAt && endsAt <= now) {
            const month = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`;
            const revenue = data.currentBid || 0;
            
            if (revenueByMonth.has(month)) {
              revenueByMonth.set(month, revenueByMonth.get(month) + revenue);
            } else {
              revenueByMonth.set(month, revenue);
            }
          }
          
          // For bids over time - safely handle bids array and timestamps
          const bids = data.bids || [];
          if (Array.isArray(bids)) {
            bids.forEach((bid) => {
              if (!bid) return;
              
              // Use safe timestamp conversion
              let bidDate;
              try {
                bidDate = toDate(bid.timestamp);
              } catch (error) {
                console.error('Error converting bid timestamp:', error);
                return;
              }
              
              if (!bidDate) return;
              
              // Skip if outside time range
              if (bidDate < startTime) return;
              
              const day = bidDate.toISOString().split('T')[0];
              
              if (bidsCountByDay.has(day)) {
                bidsCountByDay.set(day, bidsCountByDay.get(day) + 1);
              } else {
                bidsCountByDay.set(day, 1);
              }
            });
          }
          
          // For top products
          products.push({
            id: doc.id,
            title: data.title || 'Unnamed Product',
            bidsCount: (data.bids && Array.isArray(data.bids)) ? data.bids.length : 0,
            currentBid: data.currentBid || 0,
            category: category,
            endsAt: endsAt
          });
        });
        
        // Transform data for charts
        
        // Category data
        const categoryChartData = Array.from(categoryMap.entries()).map(([name, value]) => ({
          name,
          value
        }));
        setCategoryData(categoryChartData);
        
        // Revenue data
        const revenueChartData = Array.from(revenueByMonth.entries())
          .map(([month, amount]) => ({
            month,
            amount
          }))
          .sort((a, b) => a.month.localeCompare(b.month));
        setRevenueData(revenueChartData);
        
        // Bids over time
        const bidsChartData = Array.from(bidsCountByDay.entries())
          .map(([date, count]) => ({
            date,
            count
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setBidsOverTime(bidsChartData);
        
        // Top products
        const sortedProducts = [...products]
          .sort((a, b) => b.currentBid - a.currentBid)
          .slice(0, 5);
        setTopProducts(sortedProducts);
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [userData, timeRange]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Ensure user is admin
  if (!userData?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You do not have permission to access the statistics page.</p>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    );
  }

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const formatDate = (date: any) => {
    if (!date || !(date instanceof Date)) {
      return 'N/A';
    }
    try {
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">Statistics & Analytics</h1>
        
        <div className="mt-4 sm:mt-0 relative w-full sm:w-48">
          <select
            className="input pl-10 appearance-none w-full"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="month">Last Month</option>
            <option value="week">Last Week</option>
          </select>
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <DollarSign className="h-5 w-5 text-primary-600 mr-2" />
            Revenue by Month
          </h2>
          <div className="h-64">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Bar dataKey="amount" fill="#3b82f6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No revenue data available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Categories Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Tag className="h-5 w-5 text-primary-600 mr-2" />
            Products by Category
          </h2>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No category data available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Bids Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <BarChartLucide className="h-5 w-5 text-primary-600 mr-2" />
            Bids Over Time
          </h2>
          <div className="h-64">
            {bidsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bidsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" name="Bids" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No bid data available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Products by Bid Value</h2>
          <div className="h-64 overflow-y-auto">
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div className="ml-4">
                        <Link 
                          to={`/product/${product.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {product.title}
                        </Link>
                        <div className="text-xs text-gray-500 mt-1">
                          {product.category} • {product.bidsCount} bids
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-primary-600">
                        ${product.currentBid.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-end mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>
                          {product.endsAt && product.endsAt <= new Date() ? 'Ended' : 'Ends'} {formatDate(product.endsAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No product data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
 