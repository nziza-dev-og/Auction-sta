import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import {
  Package, Users, DollarSign, Tag,
  BarChart, Award, FileText, Settings, Plus
} from 'lucide-react';
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
        const productsQuery = query(collection(db, 'products'));
        const productsSnapshot = await getDocs(productsQuery);

        const now = Timestamp.now();
        let activeCount = 0;
        let endedCount = 0;
        let totalBids = 0;
        let totalRevenue = 0;

        productsSnapshot.forEach((doc) => {
          const data = doc.data();
          const endsAt = data.endsAt instanceof Timestamp ? data.endsAt : null;

          if (endsAt && endsAt > now) {
            activeCount++;
          } else {
            endedCount++;
            if (data.currentBid) {
              totalRevenue += data.currentBid;
            }
          }

          if (Array.isArray(data.bids)) {
            totalBids += data.bids.length;
          }
        });

        const usersSnapshot = await getDocs(query(collection(db, 'users')));

        const recentProductsSnapshot = await getDocs(
          query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(5))
        );

        const recentProductsData: any[] = [];
        recentProductsSnapshot.forEach((doc) => {
          const data = doc.data();
          const endsAt = data.endsAt instanceof Timestamp ? data.endsAt : null;
          const isActive = endsAt ? endsAt > now : false;

          recentProductsData.push({
            id: doc.id,
            title: data.title,
            currentBid: data.currentBid,
            imageUrl: data.imageUrl,
            endsAt: endsAt ? endsAt.toDate() : null,
            bidsCount: Array.isArray(data.bids) ? data.bids.length : 0,
            isActive
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

  if (loading) return <LoadingSpinner />;
  if (!userData?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You do not have permission to access the admin dashboard.</p>
        <Link to="/" className="btn btn-primary">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Products */}
        <StatCard
          icon={<Package className="h-6 w-6 text-primary-600" />}
          title="Total Products"
          value={stats.totalProducts}
          subtitle={`${stats.activeAuctions} active, ${stats.endedAuctions} ended`}
        />
        {/* Total Bids */}
        <StatCard
          icon={<Tag className="h-6 w-6 text-green-600" />}
          title="Total Bids"
          value={stats.totalBids}
          subtitle={`${(stats.totalBids / Math.max(stats.totalProducts, 1)).toFixed(1)} bids per product`}
        />
        {/* Total Users */}
        <StatCard
          icon={<Users className="h-6 w-6 text-blue-600" />}
          title="Total Users"
          value={stats.totalUsers}
          subtitle={`${(stats.totalBids / Math.max(stats.totalUsers, 1)).toFixed(1)} bids per user`}
        />
        {/* Total Revenue */}
        <StatCard
          icon={<DollarSign className="h-6 w-6 text-secondary-600" />}
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          subtitle={`From ${stats.endedAuctions} completed auctions`}
        />
      </div>

      {/* Recent Products */}
      <RecentProducts products={recentProducts} />

      {/* Admin Actions */}
      <AdminActions />
    </div>
  );
}

// === Reusable Components ===

function StatCard({ icon, title, value, subtitle }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start">
        <div className="bg-gray-100 p-3 rounded-full">{icon}</div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function RecentProducts({ products }: { products: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-2 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium">Recent Products</h2>
          <Link to="/admin/products" className="text-sm text-primary-600 hover:text-primary-800">View All</Link>
        </div>
        {products.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {products.map(product => (
              <div key={product.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <img src={product.imageUrl || 'https://via.placeholder.com/40'} alt={product.title} className="h-12 w-12 rounded-lg object-cover" />
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">{product.title}</h3>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Tag className="h-3.5 w-3.5 mr-1" />
                      {product.bidsCount} bids
                      <span className="mx-2 text-gray-300">•</span>
                      <span className={product.isActive ? 'text-green-600' : 'text-red-600'}>
                        {product.isActive ? 'Active' : 'Ended'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">${product.currentBid?.toLocaleString() || '0'}</p>
                  <Link to={`/product/${product.id}`} className="text-xs text-primary-600 hover:text-primary-800">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">No products found</p>
            <Link to="/admin/products/new" className="mt-4 btn btn-primary inline-block">Add First Product</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminActions() {
  const actions = [
    { to: "/admin/products", icon: <Package className="h-5 w-5 text-purple-600" />, title: "Product Management", desc: "Add, edit or remove auction products" },
    { to: "/admin/bids", icon: <FileText className="h-5 w-5 text-primary-600" />, title: "Bid Management", desc: "Manage all bids on your products" },
    { to: "/admin/declarations", icon: <Award className="h-5 w-5 text-green-600" />, title: "Declaration Management", desc: "Declare winners for ended auctions" },
    { to: "/admin/statistics", icon: <BarChart className="h-5 w-5 text-blue-600" />, title: "Statistics", desc: "View detailed reports and analytics" },
    { to: "/admin/settings", icon: <Settings className="h-5 w-5 text-gray-600" />, title: "Admin Settings", desc: "Configure admin access and preferences" }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-medium border-b pb-2">Admin Actions</h2>
      {actions.map((a, i) => (
        <Link key={i} to={a.to} className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100">
          <div className="p-2 rounded-full bg-gray-100">{a.icon}</div>
          <div className="ml-3">
            <span className="font-medium">{a.title}</span>
            <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
          </div>
        </Link>
      ))}
      <Link to="/admin/products/new" className="btn btn-primary w-full flex items-center justify-center mt-6">
        <Plus className="h-4 w-4 mr-2" />
        Add New Product
      </Link>
    </div>
  );
}
