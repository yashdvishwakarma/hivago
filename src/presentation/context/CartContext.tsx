import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from './ToastContext';
import DIContainer from '../../di/container';
import { CartItem } from '../../core/entities/CartItem';
import { syncCart, isTokenValid, getCart, clearServerCart, clearAuthSession, DeliveryQuoteResponse } from '../../data/api';

export interface ServerCartItem {
    id?: string;
    menuItemId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    specialInstructions?: string;
    options?: Array<{ name?: string; value?: string }> | string;
}


interface CartContextType {
    cartItems: CartItem[];
    restaurantId?: string;
    restaurantName?: string;
    addToCart: (item: Omit<CartItem, 'quantity'>, rId?: string, rName?: string, silent?: boolean) => void;
    removeFromCart: (itemId: string, silent?: boolean) => void;
    clearCart: (silent?: boolean) => void;
    refreshCartFromServer: () => Promise<void>;
    cartTotal: number;
    refreshLoginStatus: () => void;
    deliveryQuote: DeliveryQuoteResponse | null;
    setDeliveryQuote: (quote: DeliveryQuoteResponse | null) => void;
    deliveryStatus: 'success' | 'error' | 'warning' | null;
    setDeliveryStatus: (status: 'success' | 'error' | 'warning' | null) => void;
    deliveryError: string | null;
    setDeliveryError: (error: string | null) => void;
    isCheckingDelivery: boolean;
    setIsCheckingDelivery: (isChecking: boolean) => void;
    reorder: (items: CartItem[], restaurantId: string, restaurantName: string) => Promise<void>;
    isLoggedIn: boolean;
    fulfillmentType: 'Delivery' | 'Pickup';
    setFulfillmentType: (type: 'Delivery' | 'Pickup') => void;
    includeCutlery: boolean;
    setIncludeCutlery: (include: boolean) => void;
    updateItemAddon: (itemId: string, addonId: string, action: 'add' | 'remove') => void;
    isCartLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast } = useToast();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [restaurantId, setRestaurantId] = useState<string | undefined>(undefined);
    const [restaurantName, setRestaurantName] = useState<string | undefined>(undefined);
    const [isLoggedIn, setIsLoggedIn] = useState(isTokenValid());
    const [isCartLoading, setIsCartLoading] = useState(true);
    const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuoteResponse | null>(() => {
        const saved = sessionStorage.getItem('checkout_delivery_quote');
        return saved ? JSON.parse(saved) : null;
    });
    const [deliveryStatus, setDeliveryStatus] = useState<'success' | 'error' | 'warning' | null>(() => {
        const saved = sessionStorage.getItem('checkout_delivery_status');
        return (saved === 'success' || saved === 'error' || saved === 'warning') ? saved : null;
    });
    const [deliveryError, setDeliveryError] = useState<string | null>(() => {
        return sessionStorage.getItem('checkout_delivery_error');
    });
    const [isCheckingDelivery, setIsCheckingDelivery] = useState<boolean>(false);
    const [fulfillmentType, setFulfillmentTypeState] = useState<'Delivery' | 'Pickup'>(() => {
        const saved = sessionStorage.getItem('checkout_fulfillment_type');
        return (saved === 'Delivery' || saved === 'Pickup') ? saved : 'Delivery';
    });

    const setFulfillmentType = (type: 'Delivery' | 'Pickup') => {
        setFulfillmentTypeState(type);
        sessionStorage.setItem('checkout_fulfillment_type', type);
    };
    const [includeCutlery, setIncludeCutlery] = useState<boolean>(() => {
        return sessionStorage.getItem('checkout_include_cutlery') === 'true';
    });

    useEffect(() => {
        if (deliveryQuote) {
            sessionStorage.setItem('checkout_delivery_quote', JSON.stringify(deliveryQuote));
        } else {
            sessionStorage.removeItem('checkout_delivery_quote');
        }
    }, [deliveryQuote]);

    useEffect(() => {
        if (deliveryStatus) {
            sessionStorage.setItem('checkout_delivery_status', deliveryStatus);
        } else {
            sessionStorage.removeItem('checkout_delivery_status');
        }
    }, [deliveryStatus]);

    useEffect(() => {
        if (deliveryError) {
            sessionStorage.setItem('checkout_delivery_error', deliveryError);
        } else {
            sessionStorage.removeItem('checkout_delivery_error');
        }
    }, [deliveryError]);

    useEffect(() => {
        sessionStorage.setItem('checkout_include_cutlery', includeCutlery.toString());
    }, [includeCutlery]);

    const hasSyncedAfterLogin = useRef(false);
    const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup sync debounce timer on unmount
    useEffect(() => {
        return () => {
            if (syncDebounceRef.current) {
                clearTimeout(syncDebounceRef.current);
            }
        };
    }, []);

    // Conflict State
    const [conflictInfo, setConflictInfo] = useState<{ name: string, id: string, type: 'reconcile' | 'add' } | null>(null);
    const [pendingItem, setPendingItem] = useState<{ item: Omit<CartItem, 'quantity'>, rId: string, rName: string } | null>(null);

    // RECONCILE CARTS (STRICT FRONTEND MERGE)
    const reconcileCarts = useCallback(async (localCart: { restaurantId?: string; restaurantName?: string; items?: CartItem[] }) => {
        if (!isLoggedIn || hasSyncedAfterLogin.current) return;

        try {
            // 1. Fetch current server state
            const remoteCart = await getCart();
            const hasLocalItems = (localCart?.items?.length ?? 0) > 0;
            const hasRemoteItems = (remoteCart?.items?.length ?? 0) > 0;

            // Handle Restaurant Conflict
            if (hasLocalItems && hasRemoteItems && localCart.restaurantId !== remoteCart.restaurantId) {
                setConflictInfo({
                    name: remoteCart.restaurantName || "another restaurant",
                    id: remoteCart.restaurantId,
                    type: 'reconcile'
                });
                return;
            }

            // ❗ Immediately clear localStorage cart — once we're logged in, server is source of truth.
            // This prevents reload from re-reading stale guest items and merging them again.
            DIContainer.getClearCartUseCase().execute();

            let finalItems: CartItem[] = [];
            let finalRestaurantId = localCart.restaurantId || remoteCart?.restaurantId;
            let finalRestaurantName = localCart.restaurantName || remoteCart?.restaurantName;

            if (hasLocalItems && hasRemoteItems) {
                finalItems = performFrontendMerge(localCart.items!, remoteCart.items);
            } else if (hasLocalItems) {
                finalItems = localCart.items!;
            } else if (hasRemoteItems) {
                finalItems = convertServerItems(remoteCart.items);
                finalRestaurantId = remoteCart.restaurantId;
                finalRestaurantName = remoteCart.restaurantName;
            }

            // 2. Update UI state and save merged cart to localStorage
            updateStateWithFinalCart(finalItems, finalRestaurantId!, finalRestaurantName!);

            // 3. Push merged result to server only if local items were involved
            if (hasLocalItems && finalItems.length > 0) {
                const itemsPayload: { menuItemId: string; name: string; unitPrice: number; quantity: number; options?: string; specialInstructions?: string; }[] =
                    finalItems.map(item => {
                        const p: { menuItemId: string; name: string; unitPrice: number; quantity: number; options?: string; specialInstructions?: string; } = {
                            menuItemId: item.menuItemId || item.id,
                            name: item.name,
                            unitPrice: item.price,
                            quantity: item.quantity,
                        };
                        if (item.description && item.description !== "") p.options = item.description;
                        if (item.customizations && item.customizations !== "") p.specialInstructions = item.customizations;
                        return p;
                    });

                await syncCart({
                    restaurantId: finalRestaurantId!,
                    restaurantName: finalRestaurantName || 'Restaurant',
                    items: itemsPayload
                }, true);
            }

        } catch (e) {
            console.error('Cart reconciliation failed:', e);
        } finally {
            hasSyncedAfterLogin.current = true;
        }
    }, [isLoggedIn]);

    const convertServerItems = (remoteItems: ServerCartItem[]): CartItem[] => {
        return remoteItems.map((rItem: ServerCartItem) => {
            const selectedAddons = Array.isArray(rItem.options)
                ? rItem.options.map((o: any) => ({
                    id: o.value || "",
                    name: o.value || "",
                    price: 0,
                    groupName: o.name || ""
                }))
                : [];

            return {
                id: rItem.id || (rItem.specialInstructions ? `${rItem.menuItemId}-${btoa(rItem.specialInstructions).substring(0, 8)}` : rItem.menuItemId),
                menuItemId: rItem.menuItemId,
                name: rItem.name,
                price: rItem.unitPrice,
                quantity: rItem.quantity,
                isVeg: true,
                isAddon: false,
                customizations: rItem.specialInstructions || undefined,
                selectedAddons: selectedAddons,
                description: Array.isArray(rItem.options)
                    ? rItem.options.map((o: any) => `${o.name}: ${o.value}`).join(", ")
                    : (typeof rItem.options === 'string' ? rItem.options : "")
            };
        });
    };

    const updateStateWithFinalCart = (items: CartItem[], rId: string, rName: string) => {
        setCartItems(items);
        setRestaurantId(rId);
        setRestaurantName(rName);

        // Always save to localStorage to ensure state is preserved on reload
        DIContainer.getCartRepository().saveCart({
            restaurantId: rId,
            restaurantName: rName,
            items: items
        });
    };

    const performFrontendMerge = (local: CartItem[], remote: ServerCartItem[]): CartItem[] => {
        const mergedMap = new Map<string, CartItem>();

        // 1. Process remote items first (trusting server pricing)
        const remoteItems = convertServerItems(remote);
        remoteItems.forEach(item => {
            const key = `${item.menuItemId}-${item.customizations || ''}`;
            mergedMap.set(key, { ...item });
        });

        // 2. Merge local items safely without multiplying quantities
        local.forEach(lItem => {
            const key = `${lItem.menuItemId}-${lItem.customizations || ''}`;
            if (mergedMap.has(key)) {
                // Take the higher quantity between local guest cart and remote server cart
                // to prevent exponential quantity doubling (e.g. 9 -> 18 -> 36) during sync loops
                const existing = mergedMap.get(key)!;
                existing.quantity = Math.max(existing.quantity, lItem.quantity);
            } else {
                // New item
                mergedMap.set(key, { ...lItem });
            }
        });

        return Array.from(mergedMap.values());
    };

    //  INIT CART
    useEffect(() => {
        const init = async () => {
            setIsCartLoading(true);
            try {
                // 1. Immediately hydrate from localStorage first (for both guests and logged-in users)
                // This ensures items are instantly displayed and preserved on reload/initial load.
                const localCartData = DIContainer.getGetCartUseCase().execute();
                const initialItems = localCartData.items || [];
                const initialRestaurantId = localCartData.restaurantId;
                const initialRestaurantName = localCartData.restaurantName;
                
                setCartItems(initialItems);
                setRestaurantId(initialRestaurantId);
                setRestaurantName(initialRestaurantName);

                // If we are on the payment success page, do NOT sync/reconcile the cart with the server.
                // It will be cleared momentarily by the success page itself.
                if (window.location.pathname.includes('/payment-success')) {
                    return;
                }

                if (isLoggedIn) {
                    const alreadySynced = sessionStorage.getItem('cart_reconciled') === 'true';

                    if (alreadySynced) {
                        // Reload: skip reconcile, load from server to check for updates
                        try {
                            const remoteCart = await getCart();
                            if (remoteCart && remoteCart.items && remoteCart.items.length > 0) {
                                const items = convertServerItems(remoteCart.items);
                                updateStateWithFinalCart(items, remoteCart.restaurantId, remoteCart.restaurantName);
                            } else if (initialItems.length > 0) {
                                // If server cart is empty but local has items, re-sync them to server
                                const itemsPayload = initialItems.map(i => ({
                                    menuItemId: i.menuItemId || i.id,
                                    name: i.name,
                                    unitPrice: i.price,
                                    quantity: i.quantity,
                                    options: i.selectedAddons && i.selectedAddons.length > 0
                                        ? i.selectedAddons.map(addon => `${addon.groupName || 'Addon'}:${addon.name}`).join(",")
                                        : (i.description || ""),
                                    specialInstructions: i.customizations
                                }));
                                await syncCart({
                                    restaurantId: initialRestaurantId!,
                                    restaurantName: initialRestaurantName || 'Restaurant',
                                    items: itemsPayload
                                }, true);
                            }
                        } catch (e) {
                            console.error('Failed to load cart on reload:', e);
                        }
                    } else {
                        // First login: run full reconcile (merge guest + server)
                        await reconcileCarts(localCartData);
                        sessionStorage.setItem('cart_reconciled', 'true');
                    }
                } else {
                    hasSyncedAfterLogin.current = false;
                }
            } finally {
                setIsCartLoading(false);
            }
        };

        init();
    }, [isLoggedIn, reconcileCarts]);

    // Shared debounced push — batches rapid +/- taps into a single API call
    const debouncedPushToServer = useCallback((cartData: { restaurantId: string; restaurantName: string; items: CartItem[] }) => {
        if (!isLoggedIn) return;
        if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = setTimeout(async () => {
            try {
                const itemsPayload: { menuItemId: string; name: string; unitPrice: number; quantity: number; options?: string; specialInstructions?: string; }[] = cartData.items.map(i => {
                    const payload: { menuItemId: string; name: string; unitPrice: number; quantity: number; options?: string; specialInstructions?: string; } = {
                        menuItemId: i.menuItemId || i.id,
                        name: i.name,
                        unitPrice: i.price,
                        quantity: i.quantity,
                    };
                    if (i.selectedAddons && i.selectedAddons.length > 0) {
                        payload.options = i.selectedAddons.map(addon => `${addon.groupName || 'Addon'}:${addon.name}`).join(",");
                    } else if (i.description && i.description !== "") {
                        payload.options = i.description;
                    }
                    if (i.customizations && i.customizations !== "") payload.specialInstructions = i.customizations;
                    return payload;
                });

                // Step 1: Clear the server cart so same-restaurant merge doesn't double quantities
                await clearServerCart();

                // Step 2: POST the full current cart as a fresh state
                await syncCart({
                    restaurantId: cartData.restaurantId,
                    restaurantName: cartData.restaurantName || 'Restaurant',
                    items: itemsPayload
                }, true);
            } catch (err) {
                console.error("Failed to push cart to server:", err);
            }
        }, 800);
    }, [isLoggedIn]);

    // 🚀 ADD TO CART
    const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, rId?: string, rName?: string, silent: boolean = false) => {
        let isExisting = false;
        let conflictDetected = false;
        setCartItems(existingItems => {
            const currentRestaurantId = existingItems.length > 0 ? restaurantId : undefined;

            if (currentRestaurantId && rId && currentRestaurantId !== rId) {
                conflictDetected = true;
                setConflictInfo({ id: rId, name: rName || 'Restaurant', type: 'add' });
                setPendingItem({ item, rId, rName: rName || 'Restaurant' });
                return existingItems;
            }

            const key = `${item.menuItemId || item.id}-${item.customizations || ''}`;
            const existingIndex = existingItems.findIndex(
                i => `${i.menuItemId || i.id}-${i.customizations || ''}` === key
            );

            isExisting = existingIndex >= 0;
            let updatedItems: CartItem[];
            if (isExisting) {
                updatedItems = existingItems.map((i, idx) =>
                    idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
                );
            } else {
                updatedItems = [...existingItems, { ...item, quantity: 1 } as CartItem];
            }

            // Always sync updatedItems with localStorage first
            DIContainer.getCartRepository().saveCart({
                restaurantId: rId || currentRestaurantId!,
                restaurantName: rName || restaurantName || 'Restaurant',
                items: updatedItems
            });

            if (isLoggedIn) {
                debouncedPushToServer({
                    restaurantId: rId || currentRestaurantId!,
                    restaurantName: rName || restaurantName || 'Restaurant',
                    items: updatedItems
                });
            } else {
                // Execute guest usecase but we already saved cart
                DIContainer.getAddToCartUseCase().execute(item, rId || currentRestaurantId!, rName || restaurantName!);
            }

            setRestaurantId(rId || currentRestaurantId);
            setRestaurantName(rName || restaurantName);
            sessionStorage.removeItem('last_placed_order_id');
            localStorage.removeItem('last_placed_order_id');
            return updatedItems;
        });

        if (!silent && !conflictDetected) {
            if (isExisting) {
                showToast(`Updated ${item.name} quantity`, "success");
            } else {
                showToast(`Added ${item.name} to cart`, "success");
            }
        }
    }, [restaurantId, restaurantName, isLoggedIn, debouncedPushToServer, showToast]);

    // 🚀 REORDER
    const reorder = useCallback(async (items: CartItem[], rId: string, rName: string) => {
        sessionStorage.removeItem('last_placed_order_id');
        localStorage.removeItem('last_placed_order_id');
        // 1. Update UI state immediately
        setCartItems(items);
        setRestaurantId(rId);
        setRestaurantName(rName);

        // 2. Clear local storage for guests, or push to server for logged-in users
        if (isLoggedIn) {
            // For reorder, we push immediately instead of debouncing to ensure it's ready for checkout
            try {
                const itemsPayload = items.map(i => {
                    const p: any = {
                        menuItemId: i.menuItemId || i.id,
                        name: i.name,
                        unitPrice: i.price,
                        quantity: i.quantity
                    };
                    if (i.selectedAddons && i.selectedAddons.length > 0) {
                        p.options = i.selectedAddons.map(addon => `${addon.groupName || 'Addon'}:${addon.name}`).join(",");
                    } else if (i.description && i.description !== "") {
                        p.options = i.description;
                    }
                    if (i.customizations && i.customizations !== "") {
                        p.specialInstructions = i.customizations;
                    }
                    return p;
                });

                await clearServerCart();
                await syncCart({
                    restaurantId: rId,
                    restaurantName: rName,
                    items: itemsPayload
                }, true);
            } catch (err) {
                console.error("Reorder sync failed:", err);
                showToast("Failed to reorder items", "error");
                return;
            }
        }
        
        // Always save to localStorage cache for reload resilience
        DIContainer.getCartRepository().saveCart({
            restaurantId: rId,
            restaurantName: rName,
            items: items
        });
        showToast(`Reordered items from ${rName}`, "success");
    }, [isLoggedIn, showToast]);

    //  REMOVE
    const removeFromCart = useCallback((itemId: string, silent: boolean = false) => {
        if (isLoggedIn) {
            setCartItems(prev => {
                const updatedItems = prev
                    .map(i => i.id === itemId || i.menuItemId === itemId
                        ? { ...i, quantity: i.quantity - 1 }
                        : i
                    )
                    .filter(i => i.quantity > 0);

                const currentRestaurantId = updatedItems.length > 0 ? restaurantId : undefined;
                const currentRestaurantName = updatedItems.length > 0 ? restaurantName : undefined;

                setRestaurantId(currentRestaurantId);
                setRestaurantName(currentRestaurantName);

                // Always sync with localStorage
                if (updatedItems.length === 0) {
                    DIContainer.getClearCartUseCase().execute();
                } else {
                    DIContainer.getCartRepository().saveCart({
                        restaurantId: currentRestaurantId!,
                        restaurantName: currentRestaurantName || 'Restaurant',
                        items: updatedItems
                    });
                }

                if (updatedItems.length === 0) {
                    // Last item removed — cancel debounce and delete cart from server
                    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
                    clearServerCart().catch(err => console.error("Failed to clear server cart:", err));
                } else if (currentRestaurantId) {
                    debouncedPushToServer({
                        restaurantId: currentRestaurantId,
                        restaurantName: currentRestaurantName || 'Restaurant',
                        items: updatedItems
                    });
                }
                return updatedItems;
            });
            
            if (!silent) {
                showToast("Removed from cart", "success");
            }
        } else {
            // Guest: use DI use case which writes to localStorage
            const updatedCartData = DIContainer.getRemoveFromCartUseCase().execute(itemId);
            setCartItems([...updatedCartData.items]);
            setRestaurantId(updatedCartData.restaurantId);
            setRestaurantName(updatedCartData.restaurantName);
            if (!silent) {
                showToast("Removed from cart", "success");
            }
        }
    }, [isLoggedIn, restaurantId, restaurantName, debouncedPushToServer, showToast]);
    
    // 🚀 UPDATE ADDON
    const updateItemAddon = useCallback((itemId: string, addonId: string, action: 'add' | 'remove') => {
        setCartItems(prev => {
            const updatedItems = prev.map(item => {
                if (item.id !== itemId) return item;

                if (!item.selectedAddons) return item;

                let newAddons = [...item.selectedAddons];
                let priceAdjustment = 0;

                if (action === 'remove') {
                    const addonToRemove = newAddons.find(a => a.id === addonId);
                    if (addonToRemove) {
                        priceAdjustment = -addonToRemove.price;
                        newAddons = newAddons.filter(a => a.id !== addonId);
                    }
                } else {
                    // Logic to add back an addon could be here if we keep a master list, 
                    // but for now we only support removal in cart as requested.
                }

                // Update customizations string too for backend compatibility
                const newCustomizations = newAddons.map(a => a.name).join(", ");
                const finalCustomizations = item.customizations?.includes('|') 
                    ? `${newCustomizations} | ${item.customizations.split('|')[1].trim()}`
                    : `Selected: ${newCustomizations}`;

                return {
                    ...item,
                    price: item.price + priceAdjustment,
                    selectedAddons: newAddons,
                    customizations: newAddons.length > 0 ? finalCustomizations : (item.customizations?.split('|')[1]?.trim() || undefined)
                };
            });

            // Sync with server/localStorage
            if (isLoggedIn && restaurantId) {
                debouncedPushToServer({
                    restaurantId,
                    restaurantName: restaurantName || 'Restaurant',
                    items: updatedItems
                });
            } else {
                DIContainer.getCartRepository().saveCart({
                    restaurantId,
                    restaurantName,
                    items: updatedItems
                });
            }

            return updatedItems;
        });
    }, [isLoggedIn, restaurantId, restaurantName, debouncedPushToServer]);

    // 🚀 CLEAR
    const clearCart = useCallback((silent: boolean = false) => {
        DIContainer.getClearCartUseCase().execute();
        setCartItems([]);
        setRestaurantId(undefined);
        setRestaurantName(undefined);
        
        // Reset checkout states
        setDeliveryQuote(null);
        setDeliveryStatus(null);
        setDeliveryError(null);
        setFulfillmentTypeState('Delivery');
        setIncludeCutlery(false);

        // Remove all checkout session keys
        const checkoutKeys = [
            'checkout_fulfillment_type',
            'checkout_include_cutlery',
            'checkout_delivery_quote',
            'checkout_delivery_status',
            'checkout_delivery_error',
            'checkout_instructions',
            'checkout_delivery_option',
            'checkout_tip_amount',
            'checkout_agreed_to_terms',
            'checkout_details_flow_open',
            'checkout_step',
            'checkout_address_line',
            'checkout_landmark',
            'checkout_label',
            'checkout_map_coords'
        ];
        checkoutKeys.forEach(key => sessionStorage.removeItem(key));
        
        if (isLoggedIn) {
            clearServerCart().catch(err => console.error("Failed to clear server cart:", err));
        }
        if (!silent) {
            showToast("Cart cleared", "success");
        }
    }, [isLoggedIn, showToast]);

    const forceReplaceCart = async () => {
        if (!conflictInfo) return;
        const localCartData = DIContainer.getGetCartUseCase().execute();

        try {
            const syncResponse = await syncCart({
                restaurantId: localCartData.restaurantId!,
                restaurantName: localCartData.restaurantName || 'Restaurant',
                items: localCartData.items.map(item => ({
                    menuItemId: item.menuItemId || item.id,
                    name: item.name,
                    unitPrice: item.price,
                    quantity: item.quantity,
                    options: item.description || "",
                    specialInstructions: item.customizations || ""
                }))
            }, true); // FORCE REPLACE

            if (syncResponse && syncResponse.items) {
                const mergedItems = convertServerItems(syncResponse.items);
                updateStateWithFinalCart(mergedItems, syncResponse.restaurantId, syncResponse.restaurantName);
            }
        } catch (e) {
            console.error("Force replace failed:", e);
        } finally {
            setConflictInfo(null);
        }
    };

    const handleStartFresh = async () => {
        if (!conflictInfo) return;

        if (conflictInfo.type === 'reconcile') {
            await forceReplaceCart();
        } else {
            // Add conflict: start fresh with pending item
            if (pendingItem) {
                try {
                    if (isLoggedIn) {
                        await clearServerCart();
                    }
                } catch (e) {
                    console.error("Failed to clear server cart:", e);
                }

                DIContainer.getClearCartUseCase().execute();

                const newItem: CartItem = { ...pendingItem.item, quantity: 1 } as CartItem;
                setCartItems([newItem]);
                setRestaurantId(pendingItem.rId);
                setRestaurantName(pendingItem.rName);

                if (isLoggedIn) {
                    debouncedPushToServer({
                        restaurantId: pendingItem.rId,
                        restaurantName: pendingItem.rName,
                        items: [newItem]
                    });
                } else {
                    DIContainer.getAddToCartUseCase().execute(pendingItem.item, pendingItem.rId, pendingItem.rName);
                }

                showToast(`Added ${pendingItem.item.name} to fresh cart`, "success");
            }
            setConflictInfo(null);
            setPendingItem(null);
        }
    };

    const refreshCartFromServer = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const remoteCart = await getCart();
            if (remoteCart && remoteCart.items) {
                const convertedItems = convertServerItems(remoteCart.items);
                updateStateWithFinalCart(convertedItems, remoteCart.restaurantId, remoteCart.restaurantName);
            } else {
                updateStateWithFinalCart([], "", "");
                DIContainer.getClearCartUseCase().execute();
            }
        } catch (e) {
            console.error("Failed to refresh cart from server:", e);
        }
    }, [isLoggedIn]);

    const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const refreshLoginStatus = () => {
        setIsLoggedIn(isTokenValid());
        hasSyncedAfterLogin.current = false; // 🔥 reset for next login
    };

    const handleLogout = useCallback(() => {
        clearAuthSession();
        localStorage.removeItem('customer_id');
        localStorage.removeItem('customer_phone');
        localStorage.removeItem('customer_name');
        localStorage.removeItem('hivago_cart_v2');

        // ❗ Clear cart from localStorage so stale local items don't
        // get merged into the server cart on the NEXT login
        DIContainer.getClearCartUseCase().execute();
        setCartItems([]);
        setRestaurantId(undefined);
        setRestaurantName(undefined);

        // Reset checkout states
        setDeliveryQuote(null);
        setDeliveryStatus(null);
        setDeliveryError(null);
        setFulfillmentTypeState('Delivery');
        setIncludeCutlery(false);

        // Remove all checkout session keys
        const checkoutKeys = [
            'checkout_fulfillment_type',
            'checkout_include_cutlery',
            'checkout_delivery_quote',
            'checkout_delivery_status',
            'checkout_delivery_error',
            'checkout_instructions',
            'checkout_delivery_option',
            'checkout_tip_amount',
            'checkout_agreed_to_terms',
            'checkout_details_flow_open',
            'checkout_step',
            'checkout_address_line',
            'checkout_landmark',
            'checkout_label',
            'checkout_map_coords'
        ];
        checkoutKeys.forEach(key => sessionStorage.removeItem(key));

        // Clear the reconcile flag so next login runs fresh reconcile
        sessionStorage.removeItem('cart_reconciled');
        hasSyncedAfterLogin.current = false;

        setIsLoggedIn(false);
    }, []);

    // 🚀 LISTEN TO SILENT REFRESH LOGOUTS
    useEffect(() => {
        const handleAuthLogout = () => {
            handleLogout();
        };
        window.addEventListener('auth-logout', handleAuthLogout);
        return () => {
            window.removeEventListener('auth-logout', handleAuthLogout);
        };
    }, [handleLogout]);

    const contextValue = useMemo(() => ({
        cartItems,
        restaurantId,
        restaurantName,
        addToCart,
        removeFromCart,
        clearCart,
        refreshCartFromServer,
        cartTotal,
        refreshLoginStatus,
        deliveryQuote,
        setDeliveryQuote,
        deliveryStatus,
        setDeliveryStatus,
        deliveryError,
        setDeliveryError,
        isCheckingDelivery,
        setIsCheckingDelivery,
        reorder,
        isLoggedIn,
        fulfillmentType,
        setFulfillmentType,
        includeCutlery,
        setIncludeCutlery,
        updateItemAddon,
        isCartLoading
    }), [
        cartItems,
        restaurantId,
        restaurantName,
        addToCart,
        removeFromCart,
        clearCart,
        refreshCartFromServer,
        cartTotal,
        deliveryQuote,
        deliveryStatus,
        deliveryError,
        isCheckingDelivery,
        reorder,
        isLoggedIn,
        fulfillmentType,
        setFulfillmentType,
        includeCutlery,
        setIncludeCutlery,
        updateItemAddon,
        isCartLoading
    ]);

    return (
        <CartContext.Provider value={contextValue}>
            {children}

            {conflictInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3">Restaurant Conflict</h3>
                            <p className="text-gray-500 leading-relaxed font-medium">
                                {conflictInfo.type === 'reconcile' ? (
                                    <>
                                        Your existing remote cart has items from <span className="text-gray-900 font-bold">"{conflictInfo.name}"</span>.
                                        Would you like to clear it and start fresh with your guest items?
                                    </>
                                ) : (
                                    <>
                                        Your existing cart has items from <span className="text-gray-900 font-bold">"{restaurantName || 'another restaurant'}"</span>.
                                        Would you like to clear it and start fresh with items from <span className="text-brand-primary font-bold">"{conflictInfo.name}"</span>?
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="flex border-t border-gray-100">
                            <button
                                onClick={() => {
                                    if (conflictInfo.type === 'reconcile') {
                                        getCart().then(remoteCart => {
                                            if (remoteCart && remoteCart.items) {
                                                const convertedItems = convertServerItems(remoteCart.items);
                                                updateStateWithFinalCart(convertedItems, remoteCart.restaurantId, remoteCart.restaurantName);
                                            }
                                        });
                                    }
                                    setConflictInfo(null);
                                    setPendingItem(null);
                                }}
                                className="flex-1 px-6 py-5 text-gray-500 font-bold hover:bg-gray-50 transition-colors border-r border-gray-100"
                            >
                                Keep Existing
                            </button>
                            <button
                                onClick={handleStartFresh}
                                className="flex-1 px-6 py-5 text-brand-primary font-extrabold hover:bg-red-50 transition-colors"
                            >
                                Start Fresh
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};