import React, { useState } from 'react';
import {
    SlidersHorizontal,
    ChevronDown,
    Store,
    Footprints,
    Leaf,
    Sparkles,
    Flame
} from 'lucide-react';
import { FilterModal } from './FilterModal';
import { useFilters } from '../context/FilterContext';

export const FilterChips: React.FC = () => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const {
        isVegOnly, setIsVegOnly,
        isOpenNow, setIsOpenNow,
        maxPrepTime,
        fulfillmentType, setFulfillmentType,
        sortBy, setSortBy,
        isNewlyAdded, setIsNewlyAdded,
        minRating,
        isPopular, setIsPopular,
        isVeganFriendly, setIsVeganFriendly,
        isJainOptions, setIsJainOptions
    } = useFilters();

    const activeFiltersCount = [
        isVegOnly,
        isVeganFriendly,
        isJainOptions,
        isOpenNow,
        maxPrepTime !== null,
        fulfillmentType !== 'Both',
        sortBy !== 'Distance: Low to High',
        isNewlyAdded,
        minRating > 0,
        isPopular
    ].filter(Boolean).length;

    const inactiveClass = "bg-white border-gray-200 text-gray-700 hover:bg-gray-50";

    return (
        <>
            <div className="w-full flex items-center gap-3 md:gap-4 px-4 md:px-12 pb-6 md:pb-8 border-b border-gray-100 font-sans overflow-x-auto overflow-y-hidden no-scrollbar">

                {/* Filter Icon button */}
                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="bg-brand-primary text-white p-2.5 md:p-3 rounded-xl shadow hover:bg-orange-700 transition-colors flex-shrink-0 relative"
                >
                    <SlidersHorizontal className="w-4 h-4 md:w-5 md:h-5" />
                    {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-white text-brand-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-brand-primary shadow-sm">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>

                {/* Sort By Dropdown */}
                <div className="relative flex-shrink-0">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none border border-gray-300 text-gray-700 pl-3 pr-8 py-1.5 md:pl-4 md:pr-10 md:py-2 rounded-full font-medium text-xs md:text-sm bg-white hover:bg-gray-50 transition-colors cursor-pointer outline-none"
                    >
                        <option value="Distance: Low to High">Sort By: Distance: Low to High</option>
                        <option value="Rating: High to Low">Sort By: Rating: High to Low</option>
                    </select>
                    <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-500 absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Quick actions chips */}
                <div className="flex gap-2 md:gap-3 flex-shrink-0 pr-4">
                    <button
                        onClick={() => setIsVegOnly(!isVegOnly)}
                        className={`border px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${isVegOnly ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-100' : inactiveClass
                            }`}
                    >
                        <Leaf className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isVegOnly ? 'text-white' : 'text-brand-primary'}`} />
                        Pure Veg
                    </button>

                    <button
                        onClick={() => setIsNewlyAdded(!isNewlyAdded)}
                        className={`border px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${isNewlyAdded ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-100' : inactiveClass
                            }`}
                    >
                        <Sparkles className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isNewlyAdded ? 'text-white' : 'text-brand-primary'}`} />
                        Newly Added
                    </button>



                    <button
                        onClick={() => setIsVeganFriendly(!isVeganFriendly)}
                        className={`border px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${isVeganFriendly ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-100' : inactiveClass
                            }`}
                    >
                        <Leaf className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isVeganFriendly ? 'text-white' : 'text-brand-primary'}`} />
                        Vegan
                    </button>

                    <button
                        onClick={() => setIsJainOptions(!isJainOptions)}
                        className={`border px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${isJainOptions ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-100' : inactiveClass
                            }`}
                    >
                        <Sparkles className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isJainOptions ? 'text-white' : 'text-brand-primary'}`} />
                        Jain
                    </button>

                    <button
                        onClick={() => setIsPopular(!isPopular)}
                        className={`border px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${isPopular ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-100' : inactiveClass
                            }`}
                    >
                        <Flame className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isPopular ? 'text-white' : 'text-brand-primary'}`} />
                        Popular
                    </button>

                    <button
                        onClick={() => setIsOpenNow(!isOpenNow)}
                        className={`border px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${isOpenNow ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-100' : inactiveClass
                            }`}
                    >
                        <Store className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isOpenNow ? 'text-white' : 'text-brand-primary'}`} />
                        Open Now
                    </button>

                    <button
                        onClick={() => setFulfillmentType(fulfillmentType === 'Pickup' ? 'Both' : 'Pickup')}
                        className={`border px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${fulfillmentType === 'Pickup' ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-100' : inactiveClass
                            }`}
                    >
                        <Footprints className={`w-3.5 h-3.5 md:w-4 md:h-4 ${fulfillmentType === 'Pickup' ? 'text-white' : 'text-brand-primary'}`} />
                        Pickup
                    </button>
                </div>
            </div>

            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
            />
        </>
    );
};
