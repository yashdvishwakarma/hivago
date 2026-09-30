import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Search, Navigation2, Plus, Home, Briefcase, MapPin, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { useUserLocation } from '../context/LocationContext';
import { AddAddressOverlay } from './AddAddressOverlay';
import { isTokenValid } from '../../data/api';
import { getCurrentPositionWithFallback } from '../../utils/geolocation';
import { LocationSettingsGuideModal } from './LocationSettingsGuideModal';

interface LocationSelectorOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LocationSelectorOverlay: React.FC<LocationSelectorOverlayProps> = ({ isOpen, onClose }) => {
    const { addresses, selectedLocation, isLoadingAddresses, selectLocation } = useUserLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
    const [initialLocation, setInitialLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    // Prevent body scroll when overlay is open
    useEffect(() => {
        if (!isOpen) return;
        (window as any).__activeModalsCount = ((window as any).__activeModalsCount || 0) + 1;
        document.body.style.overflow = 'hidden';
        return () => {
            (window as any).__activeModalsCount = Math.max(0, ((window as any).__activeModalsCount || 0) - 1);
            if (((window as any).__activeModalsCount) === 0) {
                document.body.style.overflow = 'unset';
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredAddresses = addresses.filter(addr => 
        addr.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        addr.addressLine.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUseCurrentLocation = () => {
        setIsDetectingLocation(true);
        setLocationError(null);
        getCurrentPositionWithFallback(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                if (isTokenValid()) {
                    setInitialLocation({ lat, lng });
                    setIsAddAddressOpen(true);
                } else {
                    selectLocation({
                        id: 'current-location',
                        label: 'Current Location',
                        addressLine: 'Using your GPS location',
                        landmark: null,
                        isDefault: false,
                        latitude: lat,
                        longitude: lng
                    });
                    onClose();
                }
                setIsDetectingLocation(false);
            },
            (err, friendlyMessage) => {
                console.error("GPS Error:", err);
                setLocationError(friendlyMessage);
                setIsDetectingLocation(false);
            }
        );
    };

    const handleOpenAddAddress = () => {
        setInitialLocation(undefined);
        setIsAddAddressOpen(true);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col font-sans animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center px-4 py-4 md:px-6">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <h2 className="ml-2 text-lg font-medium text-gray-700">Select your location</h2>
            </div>

            {/* Search Bar */}
            {addresses.length > 3 && (
                <div className="px-4 mb-6 md:px-6">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search from saved addresses"
                            className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 grid grid-cols-2 gap-4 mb-6 md:px-6">
                <button 
                    onClick={handleUseCurrentLocation}
                    disabled={isDetectingLocation}
                    className={`flex flex-col items-start gap-2 p-4 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 transition-colors shadow-sm group ${isDetectingLocation ? 'opacity-70 cursor-wait' : ''}`}
                >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                        {isDetectingLocation ? (
                            <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
                        ) : (
                            <Navigation2 className="w-5 h-5 text-brand-primary" />
                        )}
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">Use Current</p>
                        <p className="text-sm font-semibold text-gray-800">Location</p>
                    </div>
                </button>

                <button 
                    onClick={handleOpenAddAddress}
                    className="flex flex-col items-start gap-2 p-4 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 transition-colors shadow-sm group"
                >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                        <Plus className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">Add New</p>
                        <p className="text-sm font-semibold text-gray-800">Address</p>
                    </div>
                </button>
            </div>

            {locationError && (
                <div className="px-4 md:px-6 mb-6 flex flex-col gap-2">
                    <div className="p-3 bg-red-50 text-brand-primary text-sm font-semibold rounded-xl border border-red-100">
                        {locationError}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsGuideOpen(true)}
                        className="text-xs font-bold text-brand-primary hover:underline text-left self-start mt-0.5 ml-1"
                    >
                        Location blocked? See how to enable
                    </button>
                </div>
            )}

            {/* Saved Addresses List */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6">
                <div className="bg-white border border-gray-50 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
                    {isLoadingAddresses ? (
                        <div className="p-10 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                            <p className="text-gray-400 text-sm font-medium">Fetching your addresses...</p>
                        </div>
                    ) : filteredAddresses.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-gray-400 text-sm font-medium">No saved addresses found</p>
                        </div>
                    ) : (
                        filteredAddresses.map((addr, index) => (
                            <div key={addr.id} onClick={() => { selectLocation(addr); onClose(); }}>
                                <div className="flex items-start gap-4 p-5 hover:bg-gray-50 transition-colors cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-brand-primary shrink-0">
                                        {addr.label?.toLowerCase() === 'home' ? <Home className="w-5 h-5" /> : 
                                         addr.label?.toLowerCase() === 'work' ? <Briefcase className="w-5 h-5" /> : 
                                         <MapPin className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-gray-900 line-clamp-1">
                                                {addr.addressLine}
                                            </h4>
                                            {selectedLocation?.id === addr.id && (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">{addr.label || 'Other'}</p>
                                    </div>
                                    {selectedLocation?.id === addr.id && (
                                        <div className="self-center">
                                            <Check className="w-5 h-5 text-emerald-500" />
                                        </div>
                                    )}
                                </div>
                                {index < filteredAddresses.length - 1 && (
                                    <div className="mx-5 border-b border-gray-100" />
                                )}
                            </div>
                        ))
                    )}
                    
                    {/* View All Button */}
                    <button className="w-full flex items-center justify-center gap-2 py-5 text-brand-primary font-bold hover:bg-gray-50 transition-colors border-t border-gray-50">
                        View All
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <AddAddressOverlay 
                isOpen={isAddAddressOpen} 
                onClose={() => setIsAddAddressOpen(false)} 
                initialStep={initialLocation ? 'details' : 'search'}
                initialLocation={initialLocation}
            />

            <LocationSettingsGuideModal 
                isOpen={isGuideOpen} 
                onClose={() => setIsGuideOpen(false)} 
            />
        </div>,
        document.body
    );
};
