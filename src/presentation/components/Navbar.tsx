import React, { useState } from 'react';
import { MapPin, ChevronDown, User, ShoppingCart, Menu, X, Users, Home, Briefcase, Download } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import homeIcon from "../../assets/icons/home_icon.png";
import searchIcon from "../../assets/icons/search_icon.png";
import profileIcon from "../../assets/icons/profile_icon.png";
import ordersIcon from "../../assets/icons/orders_icon.png";
import navLogo from "../../assets/footer/footer_logo.svg";
import { LocationSelectorOverlay } from './LocationSelectorOverlay';
import hivagoLogo from "../../assets/footer/footer_logo.svg";
import { useUserLocation } from '../context/LocationContext';
import { isTokenValid } from '../../data/api';
import { usePWAInstall } from '../context/PWAInstallContext';

export const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems } = useCart();
    const { selectedLocation } = useUserLocation();
    const { isInstallable, isInstalled, installApp } = usePWAInstall();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
    const location = useLocation();
    const isRestaurantPage = location.pathname.startsWith('/restaurant/');
    const isCheckoutPage = location.pathname === '/checkout';

    // Close menu when route changes
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    if (isCheckoutPage) {
        return null;
    }

    return (
        <header className={`sticky top-0 z-50 bg-white shadow-sm ${isRestaurantPage ? 'hidden md:block' : ''}`}>
            <nav className="flex items-center justify-between px-4 md:px-30 bg-[#B02421] font-sans relative">
                {/* Logo and Mobile Menu */}
                <div className="flex items-center gap-3 md:gap-4 ">
                    <Link to="/" className="flex items-center justify-center ">
                        <img src={navLogo} alt="Logo" className="h-16 w-16 md:h-15 md:w-20 object-contain" />
                    </Link>
                </div>

                {/* Location - Hidden on small mobile */}
                <div
                    onClick={() => {
                        if (isTokenValid()) {
                            setIsLocationSelectorOpen(true);
                        } else {
                            navigate('/signin');
                        }
                    }}
                    className="hidden sm:flex items-center gap-2 cursor-pointer hover:bg-white/10 px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors overflow-hidden whitespace-nowrap"
                >
                    <MapPin className="text-white/70 w-5 h-5 flex-shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] md:text-xs text-white/60 font-medium tracking-wide">Deliver to</span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs md:text-sm font-semibold text-white truncate max-w-[120px] md:max-w-[200px]">
                                {selectedLocation ? selectedLocation.label : 'Select Location'}
                            </span>
                            <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-white/80 flex-shrink-0" />
                        </div>
                    </div>
                </div>

                {/* Links */}
                <div className="hidden lg:flex items-center gap-8 font-semibold text-base">
                    <Link to="/" className={`transition-colors ${location.pathname === '/' ? 'text-white' : 'text-white/60 hover:text-white'}`}>Home</Link>
                    <Link to="/restaurants" className={`transition-colors ${location.pathname === '/restaurants' ? 'text-white' : 'text-white/60 hover:text-white'}`}>Restaurants</Link>
                    <Link to="/about" className={`transition-colors ${location.pathname === '/about' ? 'text-white' : 'text-white/60 hover:text-white'}`}>About</Link>
                    <Link to="/orders" className={`transition-colors ${location.pathname === '/orders' ? 'text-white' : 'text-white/60 hover:text-white'}`}>Orders</Link>
                </div>

                {/* Icons */}
                <div className="flex items-center gap-4 md:gap-6">
                    <Link to="/profile" className={`transition-colors hidden sm:block ${location.pathname === '/profile' ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                        <User className="w-5 h-5 md:w-6 md:h-6" />
                    </Link>
                    <Link to="/checkout" className={`relative transition-colors rounded-full focus:outline-none ${location.pathname === '/checkout' ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                        <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                        {cartItems.length > 0 && (
                            <span className="absolute -top-1.5 -right-2 bg-white text-brand-primary text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full">
                                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                            </span>
                        )}
                    </Link>

                    {/* Mobile Menu Button - Now on the right */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden text-white hover:text-white/80 transition-colors focus:outline-none"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </nav>

            {/* Mobile Location Bar - Design from Image */}
            <div
                onClick={() => {
                    if (isTokenValid()) {
                        setIsLocationSelectorOpen(true);
                    } else {
                        navigate('/signin');
                    }
                }}
                className="sm:hidden flex items-center gap-3 px-4 py-[9px] border-b border-gray-200 bg-white cursor-pointer"
            >
                {selectedLocation?.label?.toLowerCase().includes('home') ? (
                    <Home className="text-brand-primary w-5 h-5 shrink-0" />
                ) : selectedLocation?.label?.toLowerCase().includes('work') ? (
                    <Briefcase className="text-brand-primary w-5 h-5 shrink-0" />
                ) : (
                    <MapPin className="text-brand-primary w-5 h-5 shrink-0" />
                )}
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-medium tracking-wide">Your Location</span>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-gray-900">
                            {selectedLocation ? selectedLocation.label : 'Select Location'}
                        </span>
                        <ChevronDown className="w-3 h-3 text-gray-600" />
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            >
                <div
                    className={`fixed top-0 right-0 bottom-0 w-[280px] bg-white shadow-2xl transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className='flex items-center justify-between w-full h-30 bg-gradient-to-b from-[#D03727] to-[#AD2523] '>
                        <div className="flex flex-col gap-2 p-6">
                            <span className="text-l ml-1 text-white">Welcome to</span>
                            <img src={hivagoLogo} alt="" className="w-30" />
                        </div>
                        <div className="flex items-center justify-between mb-8">
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 mr-5 text-white hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    <div className="p-3 flex flex-col h-full overflow-y-auto">

                        {/* Mobile Location Details */}
                        {/* <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
                            <MapPin className="text-brand-primary w-5 h-5 mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium mb-1">Delivering to</p>
                                <p className="text-sm font-bold text-gray-900">Koramangala, Bangalore</p>
                            </div>
                        </div> */}

                        <div className="flex flex-col gap-2 flex-1 font-inter font-weight-500 text-sm">
                            <Link to="/" className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${location.pathname === '/' ? 'text-brand-primary bg-brand-light' : 'text-gray-800 hover:bg-gray-50'}`}>
                                <img src={homeIcon} alt="home icon" className='w-5 h-5 p-0' />
                                Home
                            </Link>
                            <Link to="/about" className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${location.pathname === '/about' ? 'text-brand-primary bg-brand-light' : 'text-gray-800 hover:bg-gray-50'}`}>
                                <Users className={`w-5 h-5 ${location.pathname === '/about' ? 'text-brand-primary' : 'text-gray-500'}`} />
                                About Us
                            </Link>
                            <Link to="/restaurants" className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${location.pathname === '/restaurants' ? 'text-brand-primary bg-brand-light' : 'text-gray-800 hover:bg-gray-50'}`}>
                                <img src={searchIcon} alt="search icon" className='w-5 h-5 p-0' />
                                Search Restaurants
                            </Link>
                            <Link to="/orders" className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${location.pathname === '/orders' ? 'text-brand-primary bg-brand-light' : 'text-gray-800 hover:bg-gray-50'}`}>
                                <img src={ordersIcon} alt="orders icon" className='w-5 h-5 p-0' />
                                My Orders
                            </Link>
                            <Link to="/profile" className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${location.pathname === '/profile' ? 'text-brand-primary bg-brand-light' : 'text-gray-800 hover:bg-gray-50'}`}>
                                <img src={profileIcon} alt="profile icon" className='w-5 h-5 p-0' />
                                Profile <span className="text-[10px] bg-brand-primary text-white px-2 py-0.5 rounded-full ml-auto">New</span>
                            </Link>
                            {isInstallable && !isInstalled && (
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        installApp();
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-xl transition-colors text-brand-primary hover:bg-brand-light w-full text-left font-bold"
                                >
                                    <Download className="w-5 h-5 text-brand-primary" />
                                    Install Hivago App
                                </button>
                            )}
                            {/* Login Option */}
                            {!isTokenValid() && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                    <Link to="/signin" className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white px-4 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors">
                                        <User className="w-4 h-4" />
                                        Log In / Register
                                    </Link>
                                </div>
                            )}
                            <div className='flex p-3 border-t-2 border-gray-100 mt-3 pt-6'>
                                <a
                                    href="https://wa.me/919082220155?text=Need%20HELP!"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col group"
                                >
                                    <span className='text-xs text-gray-700 font-medium group-hover:text-brand-primary transition-colors'>Need help? </span>
                                    <span className='text-[10px] text-gray-500 font-bold group-hover:text-brand-primary transition-colors'>WhatsApp: +91 9082220155</span>
                                </a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <LocationSelectorOverlay
                isOpen={isLocationSelectorOpen}
                onClose={() => setIsLocationSelectorOpen(false)}
            />
        </header>
    );
};
