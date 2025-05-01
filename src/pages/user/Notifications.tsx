import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, doc, updateDoc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, CheckCircle, Trash, Award, Edit, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { toDate, formatDateTime } from '../../utils/firestoreConverters';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'bid_won' | 'outbid' | 'profile_update' | 'system';
  read: boolean;
  createdAt: Date;
  productId?: string;
}

export default function Notifications() {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userData) return;
      
      setLoading(true);
      
      try {
        // Directly check if userData has notifications collection
        // If no notifications subcollection yet, we'll create an empty array
        const userNotifications = [];
        
        try {
          const notificationsQuery = query(
            collection(db, 'users', userData.uid, 'notifications'),
            orderBy('createdAt', 'desc')
          );
          
          const notificationsSnapshot = await getDocs(notificationsQuery);
          
          notificationsSnapshot.forEach((doc) => {
            const data = doc.data();
            
            try {
              userNotifications.push({
                id: doc.id,
                title: data.title || 'Notification',
                message: data.message || '',
                type: data.type || 'system',
                read: data.read || false,
                createdAt: toDate(data.createdAt) || new Date(),
                productId: data.productId
              });
            } catch (error) {
              console.error('Error processing notification:', error);
            }
          });
        } catch (error) {
          console.error('Error fetching notifications subcollection:', error);
        }
        
        // Handle notifications array in user document if available
        if (userData.notifications && Array.isArray(userData.notifications)) {
          userData.notifications.forEach((notif, index) => {
            if (!notif) return;
            
            try {
              userNotifications.push({
                id: `inline-${index}`,
                title: notif.title || 'Notification',
                message: notif.message || '',
                type: notif.type || 'system',
                read: notif.read || false,
                createdAt: toDate(notif.createdAt) || new Date(),
                productId: notif.productId
              });
            } catch (error) {
              console.error('Error processing inline notification:', error);
            }
          });
        }
        
        // Sort by date
        userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setNotifications(userNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userData]);

  const markAsRead = async (notificationId: string) => {
    if (!userData) return;
    
    try {
      // Check if it's a notification from subcollection (has proper id)
      if (!notificationId.startsWith('inline-')) {
        const notificationRef = doc(db, 'users', userData.uid, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
      } else {
        // Handle inline notification in user document
        const index = parseInt(notificationId.replace('inline-', ''));
        if (userData.notifications && userData.notifications[index]) {
          const updatedNotifications = [...userData.notifications];
          updatedNotifications[index] = {
            ...updatedNotifications[index],
            read: true
          };
          
          await updateDoc(doc(db, 'users', userData.uid), {
            notifications: updatedNotifications
          });
        }
      }
      
      // Update local state
      setNotifications(
        notifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      
      toast.success('Marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!userData) return;
    
    try {
      if (!notificationId.startsWith('inline-')) {
        const notificationRef = doc(db, 'users', userData.uid, 'notifications', notificationId);
        await deleteDoc(notificationRef);
      } else {
        // Handle inline notification in user document
        const index = parseInt(notificationId.replace('inline-', ''));
        if (userData.notifications && userData.notifications[index]) {
          const updatedNotifications = [...userData.notifications];
          updatedNotifications.splice(index, 1);
          
          await updateDoc(doc(db, 'users', userData.uid), {
            notifications: updatedNotifications
          });
        }
      }
      
      // Update local state
      setNotifications(
        notifications.filter((notification) => notification.id !== notificationId)
      );
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const markAllAsRead = async () => {
    if (!userData || notifications.every((n) => n.read)) return;
    
    try {
      const batch = writeBatch(db);
      let inlineNotificationsUpdated = false;
      
      // Handle subcollection notifications
      const unreadNotifications = notifications.filter(n => !n.read && !n.id.startsWith('inline-'));
      
      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(db, 'users', userData.uid, 'notifications', notification.id);
        batch.update(notificationRef, { read: true });
      });
      
      // Handle inline notifications
      if (userData.notifications && Array.isArray(userData.notifications)) {
        const updatedInlineNotifications = userData.notifications.map(notif => {
          if (notif && !notif.read) {
            inlineNotificationsUpdated = true;
            return { ...notif, read: true };
          }
          return notif;
        });
        
        if (inlineNotificationsUpdated) {
          batch.update(doc(db, 'users', userData.uid), {
            notifications: updatedInlineNotifications
          });
        }
      }
      
      await batch.commit();
      
      // Update local state
      setNotifications(
        notifications.map((notification) => ({ ...notification, read: true }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const deleteAllRead = async () => {
    if (!userData) return;
    
    const readNotifications = notifications.filter((n) => n.read);
    
    if (readNotifications.length === 0) {
      toast.error('No read notifications to delete');
      return;
    }
    
    try {
      const batch = writeBatch(db);
      let inlineNotificationsUpdated = false;
      let updatedInlineNotifications = [];
      
      // Handle subcollection notifications
      readNotifications
        .filter(n => !n.id.startsWith('inline-'))
        .forEach((notification) => {
          const notificationRef = doc(db, 'users', userData.uid, 'notifications', notification.id);
          batch.delete(notificationRef);
        });
      
      // Handle inline notifications
      if (userData.notifications && Array.isArray(userData.notifications)) {
        updatedInlineNotifications = userData.notifications.filter(notif => {
          if (notif && notif.read) {
            inlineNotificationsUpdated = true;
            return false; // Remove read notifications
          }
          return true; // Keep unread notifications
        });
        
        if (inlineNotificationsUpdated) {
          batch.update(doc(db, 'users', userData.uid), {
            notifications: updatedInlineNotifications
          });
        }
      }
      
      await batch.commit();
      
      // Update local state
      setNotifications(notifications.filter((notification) => !notification.read));
      
      toast.success('All read notifications deleted');
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bid_won':
        return <Award className="h-5 w-5 text-green-500" />;
      case 'outbid':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'profile_update':
        return <Edit className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          
          <button
            onClick={markAllAsRead}
            className="btn btn-outline flex items-center"
            disabled={!notifications.some((n) => !n.read)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Read
          </button>
          
          <button
            onClick={deleteAllRead}
            className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50 flex items-center"
            disabled={!notifications.some((n) => n.read)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Read
          </button>
        </div>
      </div>
      
      {filteredNotifications.length > 0 ? (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                notification.read ? 'border-gray-300' : 'border-primary-500'
              }`}
            >
              <div className="flex items-start">
                <div className="mr-3">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  
                  <p className={`mt-1 text-sm ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                    {notification.message}
                  </p>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      {notification.productId && (
                        <Link 
                          to={`/product/${notification.productId}`}
                          className="text-sm text-primary-600 hover:text-primary-800"
                        >
                          View Item
                        </Link>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs flex items-center text-green-600 hover:text-green-800"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark as Read
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs flex items-center text-red-600 hover:text-red-800"
                      >
                        <Trash className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
          <p className="text-gray-500 mt-1 max-w-md mx-auto">
            {notifications.length > 0 
              ? "No notifications match your current filter." 
              : "You don't have any notifications yet."}
          </p>
        </div>
      )}
    </div>
  );
}
 