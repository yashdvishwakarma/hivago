import React, { useEffect } from 'react';
import { getFallbackImage } from '../../utils/imageUtils';
import { formatPrice } from '../../utils/formatUtils';
import { createPortal } from 'react-dom';
import { X, Star, Plus, Minus } from 'lucide-react';
import { MenuItem } from './MenuItemCard';
import { useCart } from '../context/CartContext';
import { AddOnsOverlay } from './AddOnsOverlay';

interface ItemDetailOverlayProps {
    item: MenuItem | null;
    onClose: () => void;
}

export const ItemDetailOverlay: React.FC<ItemDetailOverlayProps> = ({ item, onClose }) => {
    const { cartItems, addToCart, removeFromCart } = useCart();
    const [showCustomize, setShowCustomize] = React.useState(false);

    // Auto-focus management and body scroll locking
    useEffect(() => {
        if (!item) return;
        (window as any).__activeModalsCount = ((window as any).__activeModalsCount || 0) + 1;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('hide-floating-cart');
        return () => {
            (window as any).__activeModalsCount = Math.max(0, ((window as any).__activeModalsCount || 0) - 1);
            if (((window as any).__activeModalsCount) === 0) {
                document.body.style.overflow = 'unset';
            }
            document.body.classList.remove('hide-floating-cart');
        };
    }, [item]);

    if (!item) return null;

    const cartItemsOfThisType = cartItems.filter(i => (i.menuItemId || i.id) === item.id);
    const quantity = cartItemsOfThisType.reduce((acc, i) => acc + i.quantity, 0);

    const handleInitialAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowCustomize(true);
    };

    const handleConfirmAdd = (itemToAdd: MenuItem, finalPrice: number, instructions: string, selectedAddons?: { id: string, name: string, price: number }[]) => {
        // Generate a unique ID if there are instructions to separate customized items in cart
        const cartItemId = instructions 
            ? `${itemToAdd.id}-${btoa(instructions).substring(0, 8)}` 
            : itemToAdd.id;

        addToCart({
            id: cartItemId,
            menuItemId: itemToAdd.id,
            name: itemToAdd.name, // Keep the original name clean, we'll display customizations in the subtitle
            price: finalPrice,
            isVeg: itemToAdd.isVeg,
            customizations: instructions || undefined,
            selectedAddons: selectedAddons
        });
        
        setShowCustomize(false);
        onClose();
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (cartItemsOfThisType.length > 0) {
            // Remove the last added variation
            removeFromCart(cartItemsOfThisType[cartItemsOfThisType.length - 1].id);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={handleBackdropClick}
        >
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header Image Area */}
                <div className="relative h-64 sm:h-72 w-full bg-gray-100 shrink-0">
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('unsplash')) {
                                target.src = getFallbackImage(item.name);
                            }
                        }}
                    />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-800" />
                    </button>

                    {/* Bestseller Badge (if applicable) */}
                    {item.bestseller && (
                        <div className="absolute bottom-4 right-4 bg-[#4CAF50] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg">
                            <Star className="w-3.5 h-3.5 fill-white" />
                            <span>Best Seller</span>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="p-6 flex flex-col flex-1 overflow-y-auto no-scrollbar">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-4 h-4 rounded-sm border-2 ${item.isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center bg-white p-0.5 shrink-0`}>
                                    <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${item.isVeg ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                                {item.name}
                            </h2>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-xl font-bold text-gray-900 block whitespace-nowrap">
                                ₹{formatPrice(item.price)}
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        {item.description || "A delicious freshly prepared item bursting with flavor and perfect for any meal."}
                    </p>
                </div>

                {/* Bottom Action Bar */}
                <div className="bg-white p-4 sm:p-6 border-t border-gray-100 flex items-center justify-between shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-10">
                    <div>
                        {quantity > 0 && <span className="text-sm font-bold text-gray-500">Item in Cart</span>}
                    </div>
                    <div className="flex items-center">
                        {quantity === 0 ? (
                            <button
                                onClick={handleInitialAdd}
                                className="px-8 py-3 rounded-xl bg-brand-primary text-white font-bold text-base shadow-lg hover:shadow-xl hover:bg-brand-secondary active:scale-95 transition-all"
                            >
                                ADD TO CART
                            </button>
                        ) : (
                            <div className="flex items-center bg-red-50 rounded-xl overflow-hidden border border-brand-primary/20 shadow-sm h-12">
                                <button
                                    onClick={handleRemove}
                                    className="w-12 h-full flex items-center justify-center text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                >
                                    <Minus className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                                <span className="w-10 text-center text-lg font-bold text-gray-900">{quantity}</span>
                                <button
                                    onClick={handleInitialAdd}
                                    className="w-12 h-full flex items-center justify-center text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                >
                                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showCustomize && (
                <AddOnsOverlay
                    originalItem={item}
                    onClose={() => setShowCustomize(false)}
                    onConfirmAdd={handleConfirmAdd}
                />
            )}
        </div>,
        document.body
    );
};
