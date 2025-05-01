export  interface Product {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  currentBid: number;
  startingBid: number;
  startingDate: Date;
  endsAt: Date;
  bids?: Bid[];
  isFixedPrice: boolean;
  scales?: number[];
  createdAt?: Date;
  createdBy?: string;
  winnerDeclared?: boolean;
  winnerId?: string;
}

export interface Bid {
  userId: string;
  userName: string;
  amount: number;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
}

export interface Category {
  id?: string;
  name: string;
  createdAt?: Date;
}
 