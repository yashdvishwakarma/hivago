import React, { useState, useEffect } from 'react';
import { getFallbackImage } from '../../utils/imageUtils';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Search, Mic, MapPin, Star } from 'lucide-react';
import { MenuPageSkeleton } from '../components/Skeletons';
import { MenuItemCard, MenuItem } from '../components/MenuItemCard';
import { ItemDetailOverlay } from '../components/ItemDetailOverlay';
// import { RestaurantReviewsSection } from '../components/RestaurantReviewsSection';
import { useRestaurantReviews } from '../../hooks/useRestaurantReviews';
import { useFilters, Restaurant } from '../context/FilterContext';
import { useCart } from '../context/CartContext';
import DIContainer from '../../di/container';
import deliveryBoy from '../../assets/delivery_pickup/delivery.svg';
import pickupBoy from '../../assets/delivery_pickup/pickup.svg';
import { useUserLocation } from '../context/LocationContext';
import { haversineKm, formatDistance } from '../../utils/distanceUtils';



export const RestaurantMenuPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightedId = searchParams.get('highlight');
    const { isLoading: filtersLoading } = useFilters();
    const { selectedLocation } = useUserLocation();

    const { data: reviewsData } = useRestaurantReviews(id);

    const { fulfillmentType, setFulfillmentType } = useCart();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [isLocalLoading, setIsLocalLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [menuSearchQuery, setMenuSearchQuery] = useState('');

    // Clear highlight param after 5 seconds
    useEffect(() => {
        if (highlightedId) {
            const timer = setTimeout(() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('highlight');
                setSearchParams(newParams, { replace: true });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [highlightedId, searchParams, setSearchParams]);
    useEffect(() => {
        const fetchRestaurant = async () => {
            if (!id) return;
            setIsLocalLoading(true);
            try {
                const useCase = DIContainer.getGetRestaurantUseCase();
                const data = await useCase.execute(id);
                setRestaurant(data);
            } catch (error) {
                console.error("Failed to fetch restaurant menu:", error);
            } finally {
                setIsLocalLoading(false);
            }
        };

        fetchRestaurant();
    }, [id]);

    // Force 'Delivery' if restaurant doesn't accept pickup
    useEffect(() => {
        if (restaurant && !restaurant.acceptsPickup && fulfillmentType === 'Pickup') {
            setFulfillmentType('Delivery');
        }
    }, [restaurant, fulfillmentType, setFulfillmentType]);

    useEffect(() => {
        if (restaurant && highlightedId) {
            // Give a small delay to ensure DOM is rendered
            setTimeout(() => {
                const element = document.getElementById(`item-${highlightedId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 800);
        }
    }, [restaurant, highlightedId]);

    const categories = React.useMemo(() => restaurant
        ? ['All', ...Array.from(new Set(restaurant.menu.map(item => item.category)))]
        : ['All'], [restaurant]);

    const filteredMenu = React.useMemo(() => {
        return restaurant?.menu.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
                                 (item.description || '').toLowerCase().includes(menuSearchQuery.toLowerCase());
            return matchesSearch;
        }) || [];
    }, [restaurant?.menu, menuSearchQuery]);

    const menuItems: MenuItem[] = React.useMemo(() => filteredMenu.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        isVeg: item.type === 'Veg',
        bestseller: false, // API doesn't return this yet
        description: item.description || '',
        imageUrl: (item.imageUrl && item.imageUrl !== 'null' && item.imageUrl !== 'undefined' && !item.imageUrl.includes('example.com')) 
            ? item.imageUrl 
            : getFallbackImage(item.name, item.category),
        options: (item as any).options,
        optionGroups: (item as any).optionGroups,
        category: item.category || 'General'
    })), [filteredMenu]);

    const menuByCategory = React.useMemo(() => {
        const groups: { [key: string]: MenuItem[] } = {};
        menuItems.forEach(item => {
            const cat = item.category || 'General';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(item);
        });
        return groups;
    }, [menuItems]);

    useEffect(() => {
        if (restaurant && categories.length > 0 && !categories.includes(activeTab)) {
            setActiveTab('All');
        }
    }, [categories, activeTab, restaurant]);

    const isScrollingRef = React.useRef(false);

    const scrollToCategory = (categoryName: string) => {
        if (categoryName === 'All') {
            isScrollingRef.current = true;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveTab('All');
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 800);
            return;
        }

        const isMobile = window.innerWidth < 768;
        const prefix = isMobile ? 'category-mobile-' : 'category-desktop-';
        const elementId = `${prefix}${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const element = document.getElementById(elementId);

        if (element) {
            isScrollingRef.current = true;
            setActiveTab(categoryName);

            // Desktop navbar is 60px, sticky category bar is 58px.
            // Mobile has no global navbar, sticky category bar is 52px.
            const navbarOffset = isMobile ? 0 : 60;
            const stickyBarOffset = isMobile ? 52 : 58;
            const extraSpacing = 16;
            const totalOffset = navbarOffset + stickyBarOffset + extraSpacing;

            const elementPosition = element.getBoundingClientRect().top + window.scrollY;

            window.scrollTo({
                top: elementPosition - totalOffset,
                behavior: 'smooth'
            });

            setTimeout(() => {
                isScrollingRef.current = false;
            }, 800);
        }
    };

    const scrollActiveTabIntoView = (categoryName: string) => {
        const isMobile = window.innerWidth < 768;
        const prefix = isMobile ? 'tab-mobile-' : 'tab-desktop-';
        const tabId = `${prefix}${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const tabElement = document.getElementById(tabId);

        if (tabElement) {
            const container = tabElement.parentElement;
            if (container) {
                const containerWidth = container.clientWidth;
                const tabWidth = tabElement.clientWidth;
                const tabLeft = tabElement.offsetLeft;

                // Center the active category tab horizontally in the header container
                const targetScrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);

                container.scrollTo({
                    left: targetScrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    };

    // Scroll active horizontal tab into view when activeTab changes
    useEffect(() => {
        if (activeTab) {
            scrollActiveTabIntoView(activeTab);
        }
    }, [activeTab]);

    // Scroll spy logic to select current category as we scroll
    useEffect(() => {
        if (menuSearchQuery) return;

        const isMobile = window.innerWidth < 768;
        const prefix = isMobile ? 'category-mobile-' : 'category-desktop-';

        const observerOptions = {
            root: null,
            // Trigger when the category section reaches the top/middle of the viewport
            rootMargin: isMobile ? '-100px 0px -60% 0px' : '-160px 0px -50% 0px',
            threshold: 0
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            if (isScrollingRef.current) return;

            // Find the entry that is currently visible in the active zone
            const visibleEntry = entries.find(entry => entry.isIntersecting);
            if (visibleEntry) {
                const catName = visibleEntry.target.getAttribute('data-category-name');
                if (catName) {
                    setActiveTab(catName);
                }
            }
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        const sections = document.querySelectorAll(`[id^="${prefix}"]`);
        sections.forEach(section => {
            if (section && section instanceof Element) observer.observe(section);
        });

        // Fallback to select 'All' tab when scrolled near the top
        const handleScroll = () => {
            if (isScrollingRef.current) return;
            if (window.scrollY < 150) {
                setActiveTab('All');
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            sections.forEach(section => observer.unobserve(section));
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
        };
    }, [menuByCategory, menuSearchQuery]);

    if (isLocalLoading || (filtersLoading && !restaurant)) {
        return <MenuPageSkeleton />;
    }

    if (!restaurant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans gap-6 text-center px-6">
                <div className="text-6xl">🥘</div>
                <h2 className="text-2xl font-bold text-gray-900">Restaurant Not Found</h2>
                <p className="text-gray-500 max-w-xs">We couldn't find the restaurant you're looking for. It might be closed or doesn't exist.</p>
                <button
                    onClick={() => navigate('/restaurants')}
                    className="bg-brand-primary text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                    Back to Restaurants
                </button>
            </div>
        );
    }

    const renderDietaryBadges = (rest: Restaurant) => {
        const isPureVeg = rest.isPureVeg ?? rest.isVeg;
        const isVegan = rest.isVeganFriendly || rest.cuisines?.some(c => c.toLowerCase().includes('vegan'));
        const hasJain = rest.hasJainOptions || rest.cuisines?.some(c => c.toLowerCase().includes('jain'));

        return (
            <div className="flex flex-wrap items-center gap-2 mt-2 mb-1">
                {isPureVeg ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        100% PURE VEG
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-200/80 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        VEG &amp; NON-VEG
                    </span>
                )}

                {isVegan && (
                    <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200/80 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs">
                        🌱 VEGAN OPTIONS
                    </span>
                )}

                {hasJain && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs">
                        🌾 JAIN OPTIONS
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] md:bg-[#F4F6F8] font-sans pb-20">
            {/* MOBILE VIEW (md:hidden) */}
            <div className="block md:hidden">
                {/* Hero Image Section */}
                <div className="relative w-full h-64">
                    <img 
                        src={restaurant.imageUrl} 
                        alt={restaurant.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('fallback')) {
                                target.src = getFallbackImage(restaurant.name, restaurant.cuisines[0], 'restaurant');
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
                    
                    {/* Floating Buttons */}
                    <div className="absolute top-6 pl-4 flex items-center gap-4 w-full pr-12 justify-between">
                        <button 
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-800" />
                        </button>
                        <button className="w-10 h-10 bg-white -mr-8 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all">
                            <span className="text-gray-400 text-xl">♡</span>
                        </button>
                    </div>
                </div>

                {/* Overlapping Info Card */}
                <div className="px-5 -mt-12 relative z-10">
                    <div className="bg-white rounded-[24px] p-6 shadow-xl border border-gray-50">
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight font-sans">
                            {restaurant.name}
                        </h1>
                        {renderDietaryBadges(restaurant)}

                        <div className="flex items-center gap-1.5 text-gray-600 mt-3.5">
                            <MapPin className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                            <span className="text-[11px] font-semibold text-gray-500 line-clamp-1">{restaurant.addressLine || 'Pune, India'}</span>
                        </div>

                        <div className="flex items-center justify-center gap-3 mt-4 text-[11px] font-bold text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-brand-primary" />
                                <span>{restaurant.deliveryTime}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1.5">
                                <span>{selectedLocation && restaurant?.latitude && restaurant?.longitude 
                                    ? formatDistance(haversineKm(selectedLocation.latitude, selectedLocation.longitude, restaurant.latitude, restaurant.longitude))
                                    : '-- km'}</span>
                            </div>
                            {/* Rating Badge (Mobile) */}
                            {reviewsData?.rating != null && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <div className="flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200/80">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        <span>{reviewsData.rating.toFixed(1)}</span>
                                        {reviewsData.userRatingCount != null && (
                                            <span className="text-amber-700 font-normal">({reviewsData.userRatingCount.toLocaleString()})</span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delivery/Pickup Toggle (Mobile) */}
                <div className="px-5 mt-6">
                    <div className="bg-white rounded-full border border-gray-100 shadow-sm p-1.5 flex items-center justify-between w-full mx-auto max-w-[320px]">
                        <div className="flex items-center gap-2 pl-2 md:pl-2 ">
                            <div className="flex -space-x-1 ">
                                <button 
                                    onClick={() => setFulfillmentType('Delivery')}
                                    className={`w-25 h-20 rounded-full flex items-center justify-center border-[3px] border-white transition-all shadow-md ${fulfillmentType === 'Delivery' ? 'bg-red-50 ring-2 ring-gray-100' : 'bg-gray-50 opacity-40'}`}
                                >
                                    <div className={`p-4 px-6 rounded-full ${fulfillmentType === 'Delivery' ? 'border border-[#B02421]' : ''}`}>
                                        <img src={deliveryBoy} alt="delivery" className="w-8 h-8" />
                                    </div>
                                </button>
                                {restaurant.acceptsPickup && (
                                    <button 
                                        onClick={() => setFulfillmentType('Pickup')}
                                        className={`w-25 h-20 rounded-full flex items-center justify-center border-[3px] border-white transition-all shadow-md ${fulfillmentType === 'Pickup' ? 'bg-red-50 ring-2 ring-gray-100' : 'bg-gray-50 opacity-40'}`}
                                    >
                                        <div className={`p-4 px-6 rounded-full ${fulfillmentType === 'Pickup' ? 'border border-[#B02421]' : ''}`}>
                                            <img src={pickupBoy} alt="pickup" className="w-8 h-8" />
                                        </div>
                                    </button>
                                )}
                            </div>
                            <div className="pl-2">
                                <p className="text-[#B02421] font-bold text-lg leading-tight capitalize">{fulfillmentType}</p>
                                <p className="text-gray-500 text-xs font-bold">
                                    {fulfillmentType === 'Delivery' ? restaurant.deliveryTime : '15 - 20 min'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar (Mobile) */}
                <div className="px-5 mt-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-red-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for dishes"
                            value={menuSearchQuery}
                            onChange={(e) => setMenuSearchQuery(e.target.value)}
                            className="block w-full pl-12 pr-12 py-4 bg-white border border-gray-100 shadow-sm rounded-2xl text-[13px] font-bold text-gray-900 placeholder-gray-400 focus:ring-0 transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <Mic className="h-5 w-5 text-brand-primary" />
                        </div>
                    </div>
                </div>

                {/* Category Tabs (Mobile) */}
                <div className="sticky top-0 z-30 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-gray-200/80 pt-3 shadow-sm mt-8">
                    <div className="flex items-center gap-8 px-5 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                id={`tab-mobile-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                onClick={() => scrollToCategory(cat)}
                                className={`text-[14px] whitespace-nowrap pb-3 transition-all relative ${activeTab === cat ? 'font-bold text-brand-primary' : 'font-medium text-gray-400 hover:text-gray-700'}`}
                            >
                                {cat}
                                {activeTab === cat && (
                                    <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-brand-primary rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Menu Grid (Mobile) */}
                <div className="px-5 mt-8">
                    {menuItems.length > 0 ? (
                        <div className="flex flex-col gap-8">
                            {Object.entries(menuByCategory).map(([categoryName, items]) => (
                                <div 
                                    key={categoryName} 
                                    id={`category-mobile-${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    data-category-name={categoryName}
                                    className="flex flex-col"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide whitespace-nowrap">
                                            {categoryName}
                                        </h3>
                                        <div className="flex-grow border-t border-gray-200/80" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {items.map(item => (
                                            <MenuItemCard 
                                                key={item.id} 
                                                item={item} 
                                                restaurantId={restaurant.id}
                                                restaurantName={restaurant.name}
                                                onClick={() => setSelectedItem(item)}
                                                isHighlighted={highlightedId === item.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-10 text-center border border-gray-50 flex flex-col items-center gap-3">
                            <div className="text-4xl">🍽️</div>
                            <p className="text-gray-900 font-bold">No dishes found</p>
                            <p className="text-gray-500 text-xs">Try searching for something else or clearing filters.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* DESKTOP VIEW (md:block) */}
            <div className="hidden md:block">
                {/* Top Search & Back Bar */}
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for dishes"
                            value={menuSearchQuery}
                            onChange={(e) => setMenuSearchQuery(e.target.value)}
                            className="block w-full pl-12 pr-12 py-3 bg-[#EEF2F6] border-none rounded-xl text-sm font-medium text-gray-900 placeholder-gray-500 focus:ring-0 transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <Mic className="h-5 w-5 text-brand-primary" />
                        </div>
                    </div>
                </div>

                {/* Restaurant Info Card (Desktop) */}
                <div className="max-w-7xl mx-auto px-4 mt-2">
                    <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100 flex gap-8 relative overflow-hidden">
                        {/* Left Section: Info */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-1">
                                    {restaurant.name}
                                </h1>
                                {renderDietaryBadges(restaurant)}
                                <div className="flex items-start gap-2 text-gray-500 text-sm mt-3 max-w-xl">
                                    <MapPin className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" />
                                    <span className="font-semibold text-gray-600 leading-relaxed">{restaurant.addressLine || 'Pune, India'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 mt-8">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Clock className="w-5 h-5" />
                                    <span className="text-base font-bold">{restaurant.deliveryTime}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <MapPin className="w-5 h-5" />
                                    <span className="text-base font-bold">
                                        {selectedLocation && restaurant?.latitude && restaurant?.longitude 
                                            ? formatDistance(haversineKm(selectedLocation.latitude, selectedLocation.longitude, restaurant.latitude, restaurant.longitude))
                                            : '-- km'}
                                    </span>
                                </div>
                                {reviewsData?.rating != null && (
                                    <div className="flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-200/80 px-3.5 py-1 rounded-full shadow-xs">
                                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        <span className="text-base font-bold">{reviewsData.rating.toFixed(1)}</span>
                                        {reviewsData.userRatingCount != null && (
                                            <span className="text-sm font-semibold text-amber-700">({reviewsData.userRatingCount.toLocaleString()})</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Middle Section: Delivery Status */}
                        <div className="flex flex-col items-center justify-center px-10">
                            <div className="bg-white rounded-full border border-gray-100 shadow-sm p-1.5 flex items-center gap-4">
                                <div className="flex">
                                    <button 
                                        onClick={() => setFulfillmentType('Delivery')}
                                        className={`w-20 h-15 rounded-full flex items-center justify-center border-2 border-white transition-all shadow-sm ${fulfillmentType === 'Delivery' ? 'bg-red-50 z-10 scale-110' : 'bg-gray-50 opacity-40 hover:opacity-100'}`}
                                    >
                                        <img src={deliveryBoy} alt="delivery" className="w-[60%] h-[60%]" />
                                    </button>
                                    {restaurant.acceptsPickup && (
                                        <button 
                                            onClick={() => setFulfillmentType('Pickup')}
                                            className={`w-20 h-15 rounded-full flex items-center justify-center border-2 border-white transition-all shadow-sm ${fulfillmentType === 'Pickup' ? 'bg-red-50 z-10 scale-110' : 'bg-gray-50 opacity-40 hover:opacity-100'}`}
                                        >
                                            <img src={pickupBoy} alt="pickup" className="w-[60%] h-[60%]" />
                                        </button>
                                    )}
                                </div>
                                <div className="pr-4">
                                    <p className="text-[#B02421] font-bold text-lg leading-none capitalize">{fulfillmentType}</p>
                                    <p className="text-gray-500 text-xs font-bold mt-0.5">
                                        {fulfillmentType === 'Delivery' ? restaurant.deliveryTime : '15 - 20 min'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-6">
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                    <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
                                        <Clock className="w-2.5 h-2.5 text-white" />
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Fast Delivery</span>
                                        <span className="text-[9px] font-bold opacity-80">{restaurant.deliveryTime}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                    <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Live Tracking</span>
                                        <span className="text-[9px] font-bold opacity-80">Real Time</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Section: Image */}
                        <div className="w-72 h-48 rounded-2xl overflow-hidden shadow-md">
                            <img
                                src={restaurant.imageUrl}
                                alt={restaurant.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes('fallback')) {
                                        target.src = getFallbackImage(restaurant.name, restaurant.cuisines[0], 'restaurant');
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Menu Sections Container (Desktop) */}
                <div className="max-w-7xl mx-auto px-4 mt-12">
                    {/* Sticky Categories Bar */}
                    <div className="sticky top-[60px] z-30 bg-[#F4F6F8]/95 backdrop-blur-md pt-4 pb-0 border-b border-gray-200/80 mb-10">
                        <div className="flex items-center gap-10 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    id={`tab-desktop-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    onClick={() => scrollToCategory(cat)}
                                    className={`text-base pb-3 transition-all relative whitespace-nowrap flex-shrink-0 ${activeTab === cat ? 'font-bold text-brand-primary' : 'font-medium text-gray-500 hover:text-gray-900 group'}`}
                                >
                                    {cat}
                                    {activeTab === cat && (
                                        <span className="absolute bottom-[-1px] left-0 right-0 h-[4px] bg-brand-primary rounded-t-full" />
                                    )}
                                    <span className="absolute bottom-[-1px] left-0 right-0 h-[4px] bg-gray-300 rounded-t-full scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {menuItems.length > 0 ? (
                        <div className="flex flex-col gap-14">
                            {Object.entries(menuByCategory).map(([categoryName, items]) => (
                                <div 
                                    key={categoryName} 
                                    id={`category-desktop-${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    data-category-name={categoryName}
                                    className="flex flex-col scroll-mt-28"
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider whitespace-nowrap">
                                            {categoryName}
                                        </h3>
                                        <div className="flex-grow border-t border-gray-200" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                        {items.map(item => (
                                            <MenuItemCard 
                                                key={item.id} 
                                                item={item} 
                                                restaurantId={restaurant.id}
                                                restaurantName={restaurant.name}
                                                onClick={() => setSelectedItem(item)}
                                                isHighlighted={highlightedId === item.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[32px] p-20 text-center border border-gray-100 flex flex-col items-center gap-4 shadow-sm">
                            <div className="text-6xl">🥘</div>
                            <h3 className="text-xl font-bold text-gray-900">No dishes found matching your search</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">We couldn't find any items in this category. Try adjusting your search or category selection.</p>
                            <button 
                                onClick={() => {setMenuSearchQuery(''); setActiveTab('All');}}
                                className="mt-2 text-brand-primary font-bold hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Customer Reviews Section */}
            {/* <RestaurantReviewsSection data={reviewsData} isLoading={reviewsLoading} /> */}

            {/* Overlay Component */}
            <ItemDetailOverlay 
                item={selectedItem} 
                onClose={() => setSelectedItem(null)} 
            />
        </div>
    );
};
