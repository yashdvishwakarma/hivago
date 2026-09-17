import React, { createContext, useContext, useState, useMemo } from 'react';
import { useRestaurants } from '../../hooks/useRestaurants';
import { RestaurantFilters, RestaurantListItem, RestaurantSort } from '../../types/api';
import { useUserLocation } from './LocationContext';
import { getFallbackImage } from '../../utils/imageUtils';
import { formatDistance, haversineKm } from '../../utils/distanceUtils';

// Standardized frontend interface to keep existing components working
export interface FoodItem {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    description: string;
    isVeg: boolean;
    category: string;
    restaurantId?: string;
    restaurantName?: string;
}

export interface Restaurant {
    id: string;
    name: string;
    cuisines: string[];
    rating?: number | null;
    userRatingCount?: number | null;
    deliveryTime: string;
    distance: string;
    costForTwo: string;
    imageUrl: string;
    promoted?: boolean;
    discount?: string;
    isVeg: boolean;
    isPureVeg?: boolean;
    isVeganFriendly?: boolean;
    hasJainOptions?: boolean;
    categories: string[];
    acceptsPickup: boolean;
    isAcceptingOrders: boolean;
    menu: any[]; // Menu details are fetched separately on detail page now
    addressLine?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    pincode?: string;
    city?: string;
    area?: string;
    phone?: string;
    phoneNumber?: string;
    closingTime?: string;
    openingTime?: string;
    ratingSource?: string;
    ratingCountText?: string;
}

interface FilterContextType {
    // UI State
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeCategory: string;
    setActiveCategory: (category: string) => void;
    isVegOnly: boolean;
    setIsVegOnly: (value: boolean) => void;
    sortBy: string;
    setSortBy: (sort: string) => void;
    
    // Additional filters from documentation
    isVeganFriendly: boolean;
    setIsVeganFriendly: (value: boolean) => void;
    isJainOptions: boolean;
    setIsJainOptions: (value: boolean) => void;
    isOpenNow: boolean;
    setIsOpenNow: (value: boolean) => void;
    maxPrepTime: number | null;
    setMaxPrepTime: (time: number | null) => void;
    priceRange: [number, number] | null;
    setPriceRange: (range: [number, number] | null) => void;
    fulfillmentType: 'Delivery' | 'Pickup' | 'Both';
    setFulfillmentType: (type: 'Delivery' | 'Pickup' | 'Both') => void;
    isNewlyAdded: boolean;
    setIsNewlyAdded: (value: boolean) => void;
    minRating: number;
    setMinRating: (value: number) => void;
    isPopular: boolean;
    setIsPopular: (value: boolean) => void;

    // Results & Pagination
    filteredRestaurants: Restaurant[];
    allRestaurants: Restaurant[];
    totalCount: number;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    
    isLoading: boolean;
    error: any;
    refreshData: () => void;
    isLocationRequired: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { selectedLocation } = useUserLocation();
    
    // UI states
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [isVegOnly, setIsVegOnly] = useState(false);
    const [isVeganFriendly, setIsVeganFriendly] = useState(false);
    const [isJainOptions, setIsJainOptions] = useState(false);
    const [isOpenNow, setIsOpenNow] = useState(false);
    const [maxPrepTime, setMaxPrepTime] = useState<number | null>(null);
    const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
    const [fulfillmentType, setFulfillmentType] = useState<'Delivery' | 'Pickup' | 'Both'>('Both');
    const [sortBy, setSortBy] = useState('Distance: Low to High');
    const [isNewlyAdded, setIsNewlyAdded] = useState(false);
    const [minRating, setMinRating] = useState(0);
    const [isPopular, setIsPopular] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Map UI sorting to API sort values
    const mapSortValue = (_uiSort: string): RestaurantSort | undefined => {
        if (isNewlyAdded) return 'newest';
        return undefined;
    };

    // Construct filters object for the hook
    const filters: RestaurantFilters = useMemo(() => ({
        lat: selectedLocation?.latitude,
        lng: selectedLocation?.longitude,
        radiusKm: selectedLocation ? 5 : undefined,
        search: searchQuery || undefined,
        cuisines: activeCategory !== 'All' ? [activeCategory] : undefined,
        pureVeg: isVegOnly || undefined,
        veganFriendly: isVeganFriendly || undefined,
        jainOptions: isJainOptions || undefined,
        // Fallbacks for potential backend naming variations
        hasJainOptions: isJainOptions || undefined,
        isVeganFriendly: isVeganFriendly || undefined,
        isPureVeg: isVegOnly || undefined,
        openNow: isOpenNow || undefined,
        maxPrepTimeMins: maxPrepTime || undefined,
        minPrice: priceRange?.[0],
        maxPrice: priceRange?.[1],
        supportsPickup: fulfillmentType === 'Pickup' ? true : undefined,
        acceptsPickup: fulfillmentType === 'Pickup' ? true : undefined,
        isAcceptingOrders: true,
        sort: mapSortValue(sortBy),
        page: currentPage,
        pageSize: pageSize
    }), [
        selectedLocation, 
        searchQuery, 
        activeCategory, 
        isVegOnly, 
        isVeganFriendly, 
        isJainOptions, 
        isOpenNow, 
        maxPrepTime, 
        priceRange, 
        fulfillmentType, 
        sortBy, 
        currentPage, 
        pageSize
    ]);

    // Use the React Query hook
    const { data, isLoading, error, refetch } = useRestaurants(filters);

    // Normalize data to frontend interface
    const filteredRestaurants: Restaurant[] = useMemo(() => {
        if (!data?.items) return [];
        const list = data.items
            .filter((item: RestaurantListItem) => {
                if (!item.isAcceptingOrders) return false;
                
                // If user has a selected location, enforce 5km radius locally
                if (selectedLocation?.latitude != null && selectedLocation?.longitude != null) {
                    const dist = item.distanceKm != null 
                        ? item.distanceKm 
                        : haversineKm(selectedLocation.latitude, selectedLocation.longitude, item.latitude, item.longitude);
                    return dist <= 5;
                }
                
                return true;
            })
            .map((item: RestaurantListItem) => {
                const dist = (selectedLocation?.latitude != null && selectedLocation?.longitude != null)
                    ? (item.distanceKm != null 
                        ? item.distanceKm 
                        : haversineKm(selectedLocation.latitude, selectedLocation.longitude, item.latitude, item.longitude))
                    : item.distanceKm;

                const mappedRes: Restaurant = {
                    id: item.id,
                    name: item.name,
                    cuisines: item.cuisineTypes || [],
                    rating: item.rating ?? null,
                    userRatingCount: item.userRatingCount ?? null,
                    deliveryTime: item.avgPrepTimeMins ? `${item.avgPrepTimeMins}-${item.avgPrepTimeMins + 10} min` : '',
                    distance: dist != null ? formatDistance(dist) : '',
                    costForTwo: item.minOrderAmount ? `₹${item.minOrderAmount * 2}` : '',
                    imageUrl: (item.logoUrl && item.logoUrl !== 'null' && item.logoUrl !== 'undefined' && !item.logoUrl.includes('example.com'))
                        ? item.logoUrl
                        : getFallbackImage(item.name, item.cuisineTypes?.[0] || 'General', 'restaurant'),
                    promoted: false,
                    discount: undefined,
                    isVeg: item.isPureVeg,
                    isPureVeg: item.isPureVeg,
                    isVeganFriendly: item.isVeganFriendly,
                    hasJainOptions: item.hasJainOptions,
                    categories: item.cuisineTypes || [],
                    acceptsPickup: item.acceptsPickup,
                    isAcceptingOrders: item.isAcceptingOrders,
                    menu: [],
                    addressLine: item.addressLine,
                    address: item.addressLine,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    closingTime: item.closingTime,
                    openingTime: item.openingTime,
                    phone: (item as any).phoneNumber || (item as any).phone
                };
                return mappedRes;
            });

        if (sortBy === 'Rating: High to Low' || sortBy === 'Rating') {
            return list.sort((a, b) => {
                if (a.rating != null && b.rating != null) return b.rating - a.rating;
                if (a.rating != null) return -1;
                if (b.rating != null) return 1;
                return 0;
            });
        }

        // Default or 'Distance: Low to High': sort nearest first
        return list.sort((a, b) => {
            const uLat = selectedLocation?.latitude;
            const uLng = selectedLocation?.longitude;
            const distA = (uLat != null && uLng != null && a.latitude != null && a.longitude != null)
                ? haversineKm(uLat, uLng, a.latitude, a.longitude)
                : null;
            const distB = (uLat != null && uLng != null && b.latitude != null && b.longitude != null)
                ? haversineKm(uLat, uLng, b.latitude, b.longitude)
                : null;
            if (distA != null && distB != null) return distA - distB;
            if (distA != null) return -1;
            if (distB != null) return 1;
            return 0;
        });
    }, [data, selectedLocation, sortBy]);

    const totalCount = data?.totalCount || 0;

    const isLocationRequired = !selectedLocation?.latitude || !selectedLocation?.longitude;

    return (
        <FilterContext.Provider value={{
            searchQuery,
            setSearchQuery,
            activeCategory,
            setActiveCategory,
            isVegOnly,
            setIsVegOnly,
            isVeganFriendly,
            setIsVeganFriendly,
            isJainOptions,
            setIsJainOptions,
            isOpenNow,
            setIsOpenNow,
            maxPrepTime,
            setMaxPrepTime,
            priceRange,
            setPriceRange,
            fulfillmentType,
            setFulfillmentType,
            sortBy,
            setSortBy,
            isNewlyAdded,
            setIsNewlyAdded,
            minRating,
            setMinRating,
            isPopular,
            setIsPopular,
            filteredRestaurants,
            allRestaurants: filteredRestaurants,
            totalCount,
            currentPage,
            setCurrentPage,
            pageSize,
            setPageSize,
            isLoading,
            error,
            refreshData: refetch,
            isLocationRequired
        }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
};
