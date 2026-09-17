import React from 'react';
import { useFilters } from '../context/FilterContext';
import { useNavigate } from 'react-router-dom';
import { RestaurantCard } from './RestaurantCard';

export const RecommendedRestaurants: React.FC = () => {
    const { allRestaurants, isLoading } = useFilters();
    const navigate = useNavigate();

    if (isLoading) return null;

    return (
        <div className="px-4 md:px-12 py-8 md:py-12 bg-white">
            <h2 className="text-2xl font-inter font-bold text-gray-900 tracking-tight mb-8">Recommended</h2>

            <div className="flex overflow-x-auto overflow-y-hidden gap-6 md:gap-8 pb-8 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {allRestaurants.slice(2, 8).map((restaurant) => (
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
