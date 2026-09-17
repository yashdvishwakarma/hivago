import React, { useState } from 'react';
import { getFallbackImage } from '../../utils/imageUtils';
import { formatPrice } from '../../utils/formatUtils';
import { Plus, Minus, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { AddOnsOverlay } from './AddOnsOverlay';

export interface MenuItem {
    id: string;
    name: string;
    price: string | number;
    isVeg: boolean;
    bestseller: boolean;
    description: string;
    imageUrl: string;
    options?: any[];
    optionGroups?: any[];
    category?: string;
}

interface MenuItemCardProps {
    item: MenuItem;
    restaurantId?: string;
    restaurantName?: string;
    onClick?: () => void;
    isHighlighted?: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, restaurantId, restaurantName, onClick, isHighlighted }) => {
    const { cartItems, addToCart, removeFromCart } = useCart();
    const [showCustomize, setShowCustomize] = useState(false);

    const cartItemsOfThisType = cartItems.filter(i => (i.menuItemId || i.id) === item.id);
    const quantity = cartItemsOfThisType.reduce((acc, i) => acc + i.quantity, 0);



    const handleInitialAdd = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setShowCustomize(true);
    };

    const handleConfirmAdd = (itemToAdd: MenuItem, mainItemPrice: number, instructions: string, selectedAddons: { id: string, name: string, price: number, groupId?: string, groupName?: string }[]) => {
        // Add the main item
        const cartItemId = instructions 
            ? `${itemToAdd.id}-${btoa(instructions).substring(0, 8)}` 
            : itemToAdd.id;

        addToCart({
            id: cartItemId,
            menuItemId: itemToAdd.id,
            name: itemToAdd.name,
            price: mainItemPrice,
            isVeg: itemToAdd.isVeg,
            customizations: instructions || undefined,
            selectedAddons: selectedAddons
        }, restaurantId, restaurantName);

        console.log("Instructions for", itemToAdd.name, ":", instructions);
        setShowCustomize(false);
    };

    const handleRemove = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (cartItemsOfThisType.length > 0) {
            // Remove the last added variation
            removeFromCart(cartItemsOfThisType[cartItemsOfThisType.length - 1].id);
        }
    };

    return (
        <div
            id={`item-${item.id}`}
            onClick={onClick}
            className={`bg-white rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-700 group flex flex-col h-full border ${onClick ? 'cursor-pointer' : ''} ${isHighlighted ? 'border-brand-primary ring-2 ring-brand-primary/20 scale-[1.02] bg-red-50/10' : 'border-gray-100'}`}
        >
            {/* Image Section */}
            <div className="relative aspect-[4/3] overflow-hidden">
                <img
                    src={item.imageUrl || getFallbackImage(item.name)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Prevent infinite loop if fallback also fails
                        if (!target.src.includes('fallback')) {
                            target.src = getFallbackImage(item.name);
                        }
                    }}
                />

                {/* Bestseller Badge */}
                <div className="absolute bottom-3 right-3 flex flex-col gap-2 items-end">
                    {item.bestseller && (
                        <div className="bg-[#4CAF50] text-white px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-white" />
                            <span>Best Seller</span>
                        </div>
                    )}
                </div>

                {/* Dietary Indicator (Top left of content usually, but here as badge) */}
                <div className="absolute top-3 left-3">
                    <div className={`w-4 h-4 rounded-sm border-2 ${item.isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center bg-white p-0.5`}>
                        <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-1">
                <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-base leading-snug mb-1">
                        {item.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium line-clamp-2 leading-relaxed">
                        {item.description}
                    </p>
                </div>

                <div className="flex items-center justify-between mt-4 gap-2">
                    <span className="font-extrabold text-gray-900 text-sm sm:text-base whitespace-nowrap">
                        ₹{formatPrice(item.price)}
                    </span>

                    <div className="flex items-center">
                        {quantity === 0 ? (
                            <button
                                onClick={handleInitialAdd}
                                className="px-4 sm:px-6 py-1.5 rounded-lg border border-gray-200 text-brand-primary font-bold text-sm hover:bg-red-50 transition-colors shadow-sm flex items-center gap-2 min-w-[70px] justify-center"
                            >
                                ADD
                            </button>
                        ) : (
                            <div className="flex items-center bg-red-50 rounded-lg overflow-hidden border border-brand-primary/20">
                                <button
                                    onClick={handleRemove}
                                    className="w-8 h-8 flex items-center justify-center text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                >
                                    <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                                </button>
                                <span className="w-6 text-center text-sm font-bold text-gray-900">{quantity}</span>
                                <button
                                    onClick={handleInitialAdd}
                                    className="w-8 h-8 flex items-center justify-center text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" strokeWidth={3} />
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
        </div>
    );
};
