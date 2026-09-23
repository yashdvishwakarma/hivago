export interface RestaurantListItem {
  id: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  isAcceptingOrders: boolean;
  acceptsPickup: boolean;
  avgPrepTimeMins: number;
  openingTime: string; // "HH:mm"
  closingTime: string;
  cuisineTypes: string[];
  isPureVeg: boolean;
  isVeganFriendly: boolean;
  hasJainOptions: boolean;
  minOrderAmount: number;
  logoUrl: string | null;
  distanceKm: number | null;
  rating?: number | null;
  userRatingCount?: number | null;
}

export interface PagedRestaurants {
  items: RestaurantListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export type RestaurantSort =
  | "distance"
  | "cost_asc"
  | "cost_desc"
  | "prep_time"
  | "newest"
  | "relevance";

export interface RestaurantFilters {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  search?: string;
  cuisines?: string[]; // joined to csv before send
  pureVeg?: boolean;
  isPureVeg?: boolean;
  veganFriendly?: boolean;
  isVeganFriendly?: boolean;
  jainOptions?: boolean;
  hasJainOptions?: boolean;
  openNow?: boolean;
  maxPrepTimeMins?: number;
  minPrice?: number;
  maxPrice?: number;
  supportsPickup?: boolean;
  acceptsPickup?: boolean;
  isAcceptingOrders?: boolean;
  sort?: RestaurantSort;
  page?: number;
  pageSize?: number;
}

export interface Review {
  authorName: string;
  authorPhotoUrl: string;
  rating: number; // 1-5
  text: string;
  relativeTimeDescription: string;
}

export interface RestaurantReviewsResponse {
  restaurantId: string;
  rating: number | null;
  userRatingCount: number | null;
  reviews: Review[];
}

