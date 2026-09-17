import React from 'react';
import { getFallbackImage } from '../../utils/imageUtils';
import { Heart, Star, Clock } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useUserLocation } from '../context/LocationContext';
import { haversineKm, formatDistance } from '../../utils/distanceUtils';

export interface Restaurant {
    id: string;
    name: string;
    cuisines: string[];
    rating?: number | null;
    userRatingCount?: number | null;
    deliveryTime?: string;
    avgPrepTimeMins?: number;
    distance?: string;
    costForTwo?: string;
    imageUrl?: string;
    promoted?: boolean;
    discount?: string;
    acceptsPickup?: boolean;
    isAcceptingOrders?: boolean;
    latitude?: number;
    longitude?: number;
    isVeg?: boolean;
    isPureVeg?: boolean;
    isVeganFriendly?: boolean;
    hasJainOptions?: boolean;
    address?: string;
    addressLine?: string;
    area?: string;
    city?: string;
    openingTime?: string;
    closingTime?: string;
    phoneNumber?: string;
    phone?: string;
    ratingSource?: string;
    ratingCountText?: string;
}

interface RestaurantCardProps {
    restaurant: Restaurant;
    onClick?: () => void;
    showImage?: boolean;
    onDirectionClick?: (e: React.MouseEvent) => void;
    onCallClick?: (e: React.MouseEvent) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
    restaurant,
    onClick,
    showImage = true,
    onDirectionClick,
    onCallClick: _onCallClick
}) => {
    const { toggleFavorite, isFavorite } = useFavorites();
    const { selectedLocation } = useUserLocation();
    const isFav = isFavorite(restaurant.id);

    const displayDistance = (() => {
        const uLat = selectedLocation?.latitude;
        const uLng = selectedLocation?.longitude;
        if (uLat != null && uLng != null && restaurant.latitude != null && restaurant.longitude != null) {
            return formatDistance(haversineKm(uLat, uLng, restaurant.latitude, restaurant.longitude));
        }
        return restaurant.distance || "";
    })();

    const locationText = restaurant.address || restaurant.addressLine || restaurant.area || restaurant.city || "";
    const ratingVal = restaurant.rating != null ? restaurant.rating.toFixed(1) : null;

    const ratingCountText = (() => {
        if (restaurant.ratingCountText) return restaurant.ratingCountText;
        if (restaurant.userRatingCount != null && restaurant.userRatingCount > 0) {
            if (restaurant.userRatingCount >= 1000) {
                const k = (restaurant.userRatingCount / 1000).toFixed(restaurant.userRatingCount % 1000 === 0 ? 0 : 1);
                return `${k}K ratings`;
            }
            return `${restaurant.userRatingCount} ratings`;
        }
        return null;
    })();

    const cuisinesText = restaurant.cuisines && restaurant.cuisines.length > 0
        ? restaurant.cuisines.join(', ')
        : "";

    const costFormatted = (() => {
        if (!restaurant.costForTwo) return "";
        const cleaned = restaurant.costForTwo.replace(/Rs\.?/i, '').trim();
        if (!cleaned) return "";
        if (cleaned.startsWith('₹')) return cleaned;
        return `₹${cleaned}`;
    })();

    const ratingSource = restaurant.ratingSource || "Google";

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-[24px] p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer group flex flex-col justify-between h-full font-sans"
        >
            {/* Optional Image Container */}
            {showImage && restaurant.imageUrl && (
                <div className="relative w-full h-[180px] sm:h-48 bg-gray-100 rounded-2xl overflow-hidden mb-4 shrink-0">
                    <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('fallback')) {
                                target.src = getFallbackImage(restaurant.name, restaurant.cuisines?.[0] || 'Food', 'restaurant');
                            }
                        }}
                    />

                    {/* Overlay Badges */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                        <div className="flex flex-col gap-1.5">
                            {restaurant.promoted && (
                                <span className="bg-gray-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm w-max">
                                    Promoted
                                </span>
                            )}
                            {restaurant.discount && (
                                <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm w-max">
                                    {restaurant.discount}
                                </span>
                            )}
                            {restaurant.acceptsPickup && (
                                <span className="bg-white/95 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm w-max uppercase border border-red-100">
                                    Pickup Available
                                </span>
                            )}
                        </div>

                        {/* Favorite Button */}
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(restaurant as any); }}
                            className={`bg-white/90 backdrop-blur-xs rounded-full p-2 shadow-sm hover:scale-110 transition-all ${isFav ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                </div>
            )}

            {/* Restaurant Details */}
            <div className="flex flex-col gap-2 flex-1 justify-between">
                <div>
                    {/* Top Row: Name and Rating Badge Stack */}
                    <div className="flex justify-between items-start gap-3 mb-1">
                        <h3 className="-mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-tight group-hover:text-red-600 transition-colors">
                            {restaurant.name}
                            {/* Cuisine & Cost Line */}
                            {(cuisinesText || costFormatted) && (
                                <div className="text-sm sm:text-base font-normal text-gray-500 flex items-center flex-wrap gap-1 leading-snug">
                                    {cuisinesText && <span>{cuisinesText}</span>}
                                    {cuisinesText && costFormatted && <span className="text-gray-300 font-light mx-1">|</span>}
                                    {costFormatted && <span>{costFormatted} for two</span>}
                                </div>
                            )}
                        </h3>
                        

                        {ratingVal != null && (
                            <div className="flex flex-col items-center shrink-0">
                                {/* Dark Green Rating Pill */}
                                <div className="bg-[#046c38] text-white font-extrabold text-xs sm:text-sm px-2 py-0.5 rounded-lg flex items-center justify-center gap-0.5 shadow-xs">
                                    <span>{ratingVal}</span>
                                    <Star className="w-3 h-3 fill-white text-white shrink-0" />
                                </div>

                                {/* Rating Source Badge (e.g. Google) */}
                                <div className="bg-white border border-gray-200/90 rounded-full px-1.5 py-[1px] shadow-xs flex items-center justify-center gap-0.5 -mt-1 z-10">
                                    <svg className="w-2 h-2 shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    <span className="text-[8px] sm:text-[8px] font-semibold text-gray-700 leading-none">{ratingSource}</span>
                                </div>

                                {/* Ratings Count */}
                                {ratingCountText && (
                                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium underline decoration-dotted decoration-gray-300 underline-offset-1 mt-0.5 text-center hover:text-gray-600 transition-colors">
                                        {ratingCountText}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Location & Distance Line */}
                    {(displayDistance || locationText) && (
                        <p className="text-sm sm:text-[15px] font-medium text-gray-800 leading-snug line-clamp-2">
                            {displayDistance && <span>{displayDistance}</span>}
                            {displayDistance && locationText && <span className="text-gray-400 mx-1">·</span>}
                            {locationText && <span>{locationText}</span>}
                            <span className="inline-flex items-center ml-1 text-[#e05638] align-middle">
                                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                    <path d="M7 10l5 5 5-5z" />
                                </svg>
                            </span>
                        </p>
                    )}

                    
                </div>

                {/* Bottom Action Row */}
                <div className="flex items-center justify-between w-full ">
                    {/* Avg Prep Time Pill */}
                    <div
                        onClick={(e) => { e.stopPropagation(); }}
                        className="bg-[#f2f4f7] hover:bg-gray-200/80 transition-colors px-3.5 py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
                    >
                        <Clock className="w-4 h-4 text-[#046c38] shrink-0" />
                        <span className="text-gray-800 font-bold">{restaurant.deliveryTime || (restaurant.avgPrepTimeMins ? `${restaurant.avgPrepTimeMins} min` : "25-30 min")}</span>
                    </div>

                    {/* Direction Turn Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onDirectionClick) onDirectionClick(e);
                            else {
                                const lat = restaurant.latitude;
                                const lng = restaurant.longitude;
                                const query = lat != null && lng != null
                                    ? `${lat},${lng}`
                                    : encodeURIComponent(restaurant.addressLine || restaurant.name);
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
                            }
                        }}
                        title="Get Directions"
                        className="bg-[#f2f4f7] hover:bg-gray-200/80 transition-colors p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center cursor-pointer w-10 h-10 sm:w-11 sm:h-11 shrink-0"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <rect x="4" y="4" width="16" height="16" rx="4" transform="rotate(45 12 12)" fill="#33373B" />
                            <path d="M9.5 14.5V11.5C9.5 10.4 10.4 9.5 11.5 9.5H14.5M14.5 9.5L12.5 7.5M14.5 9.5L12.5 11.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {/* Phone Call Button */}
                    {/* <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (_onCallClick) {
                                _onCallClick(e);
                                return;
                            }
                            const num = restaurant.phone || restaurant.phoneNumber || "+919876543210";
                            window.location.href = `tel:${num}`;
                        }}
                        title={`Call ${restaurant.name}`}
                        className="bg-[#f2f4f7] hover:bg-gray-200/80 transition-colors p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center cursor-pointer w-10 h-10 sm:w-11 sm:h-11 shrink-0 active:scale-95"
                    >
                        <svg className="w-5 h-5 text-[#33373B]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                    </button> */}
                </div>
            </div>
        </div>
    );
};

