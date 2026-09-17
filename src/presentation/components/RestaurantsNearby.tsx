import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { useUserLocation } from '../context/LocationContext';
import { useNavigate } from 'react-router-dom';
import { haversineKm } from '../../utils/distanceUtils';
import { RestaurantCard } from './RestaurantCard';

export const RestaurantsNearby: React.FC = () => {
    const { allRestaurants, isLoading } = useFilters();
    const { selectedLocation } = useUserLocation();
    const navigate = useNavigate();

    // Compute distance for each restaurant, then sort nearest first
    const sortedRestaurants = useMemo(() => {
        const uLat = selectedLocation?.latitude;
        const uLng = selectedLocation?.longitude;

        return [...allRestaurants]
            .map(r => {
                let distKm: number | null = null;
                if (uLat != null && uLng != null && r.latitude != null && r.longitude != null) {
                    distKm = haversineKm(uLat, uLng, r.latitude, r.longitude);
                }
                return { restaurant: r, distKm };
            })
            .sort((a, b) => {
                if (a.distKm != null && b.distKm != null) return a.distKm - b.distKm;
                if (a.distKm != null) return -1;
                if (a.distKm != null) return 1;
                return 0;
            });
    }, [allRestaurants, selectedLocation]);

    if (isLoading) return null;

    if (sortedRestaurants.length === 0) return null;

    return (
        <div className="px-4 md:px-12 py-8 md:py-12 bg-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-inter font-bold text-gray-900 tracking-tight">Restaurants Nearby</h2>
                </div>
                <button className="text-gray-900 hover:text-emerald-600 transition-colors p-2 bg-gray-50 rounded-full">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex overflow-x-auto overflow-y-hidden gap-6 md:gap-8 pb-8 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {sortedRestaurants.slice(0, 6).map(({ restaurant }) => (
                    <div
                        key={restaurant.id}
                        className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start"
                    >
                        <RestaurantCard
                            restaurant={restaurant}
                            onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

