import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    SlidersHorizontal,
    ChevronDown,
    Store,
    Footprints,
    Leaf,
    Sparkles,
    Flame,
    Check
} from 'lucide-react';
import { FilterModal } from './FilterModal';
import { useFilters } from '../context/FilterContext';

export const FilterChips: React.FC = () => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const portalDropdownRef = useRef<HTMLDivElement>(null);

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

    const updateCoords = () => {
        if (sortDropdownRef.current) {
            const rect = sortDropdownRef.current.getBoundingClientRect();
            setDropdownCoords({
                top: rect.bottom + 6,
                left: Math.max(12, Math.min(rect.left, window.innerWidth - 240))
            });
        }
    };

    const handleToggleDropdown = () => {
        if (!isSortDropdownOpen) {
            updateCoords();
        }
        setIsSortDropdownOpen(!isSortDropdownOpen);
    };

    // Close dropdown on click outside or scroll/resize
    useEffect(() => {
        if (!isSortDropdownOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const isClickInTrigger = sortDropdownRef.current?.contains(e.target as Node);
            const isClickInPortal = portalDropdownRef.current?.contains(e.target as Node);
            if (!isClickInTrigger && !isClickInPortal) {
                setIsSortDropdownOpen(false);
            }
        };
        const handleScrollOrResize = (e: Event) => {
            if (portalDropdownRef.current?.contains(e.target as Node)) {
                return;
            }
            setIsSortDropdownOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isSortDropdownOpen]);

    const sortOptions = [
        { label: 'Distance: Low to High', value: 'Distance: Low to High' },
        { label: 'Relevance', value: 'Relevance' },
        { label: 'Rating: High to Low', value: 'Rating: High to Low' },
    ];

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

                {/* Custom Sort By Dropdown */}
                <div className="relative flex-shrink-0" ref={sortDropdownRef}>
                    <button
                        type="button"
                        onClick={handleToggleDropdown}
                        className="border border-gray-200 text-gray-800 pl-3.5 pr-3 py-1.5 md:pl-4 md:pr-3.5 md:py-2 rounded-xl sm:rounded-full font-bold text-xs md:text-sm bg-white hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <span className="whitespace-nowrap">Sort By: {sortBy}</span>
                        <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 transition-transform duration-200 shrink-0 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
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

            {/* Floating Portal Dropdown */}
            {isSortDropdownOpen && dropdownCoords && createPortal(
                <div
                    ref={portalDropdownRef}
                    className="fixed bg-white rounded-2xl border border-gray-100 shadow-2xl py-1.5 z-[99999] animate-in fade-in zoom-in-95 duration-150 min-w-[220px]"
                    style={{
                        top: `${dropdownCoords.top}px`,
                        left: `${dropdownCoords.left}px`,
                    }}
                >
                    {sortOptions.map(option => {
                        const isSelected = sortBy === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    setSortBy(option.value);
                                    setIsSortDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs md:text-sm transition-colors ${
                                    isSelected ? 'bg-emerald-50/70 text-emerald-950 font-bold' : 'text-gray-700 hover:bg-gray-50 font-medium'
                                }`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
};
