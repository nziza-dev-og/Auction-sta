import  { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

interface ProductCardProps {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  imageUrl: string;
  endsAt: Date;
}

export default function ProductCard({ id, title, description, currentBid, imageUrl, endsAt }: ProductCardProps) {
  const timeLeft = () => {
    const now = new Date();
    const diff = endsAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Auction ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    
    return `${minutes}m left`;
  };

  // Default luxury product image from Unsplash if none provided
  const defaultImage = "https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBhdWN0aW9uJTIwbHV4dXJ5JTIwaXRlbXN8ZW58MHx8fHwxNzQ2MDI2MTcxfDA&ixlib=rb-4.0.3";

  return (
    <div className="card card-hover">
      <Link to={`/product/${id}`}>
        <img 
          src={imageUrl || defaultImage} 
          alt={title} 
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = defaultImage;
          }}
        />
      </Link>
      <div className="p-4">
        <Link to={`/product/${id}`}>
          <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">{title}</h3>
        </Link>
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{description}</p>
        <div className="mt-2 flex justify-between items-center">
          <p className="font-semibold text-primary-700">${currentBid.toLocaleString()}</p>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>{timeLeft()}</span>
          </div>
        </div>
        <Link 
          to={`/product/${id}`} 
          className="mt-3 w-full btn btn-primary block text-center"
        >
          Place Bid
        </Link>
      </div>
    </div>
  );
}
 