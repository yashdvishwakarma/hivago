import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, CheckCircle, ChefHat, Bike, ShoppingBag, Phone } from 'lucide-react';
import { OrderTrackingSkeleton } from '../components/Skeletons';
import { ApiOrder, getActiveOrders, getOrderById, getDeliveryQuote, fetchRestaurantById, fetchDeliveryCodes } from '../../data/api';

// Using the assets we moved/generated
import orderPlacedImg from '../../assets/checkout/order_placed.svg';
import preparingImg from '../../assets/checkout/preparing.png';
import deliveryImg from '../../assets/checkout/delivery.png';
import deliveredImg from '../../assets/checkout/delivered.png';
import { MobileMenu } from '../components/checkout/MobileMenu';
import { useNotifications } from '../context/NotificationContext';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../../utils/formatUtils';

export const OrderTrackingPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [order, setOrder] = useState<ApiOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState<'placed' | 'preparing' | 'ready' | 'delivery' | 'delivered' | 'cancelled' | 'rejected' | 'failed'>('placed');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { lastStatusUpdate } = useNotifications();
    const { reorder } = useCart();
    const [quoteEstimatedMinutes, setQuoteEstimatedMinutes] = useState<number | null>(null);
    const [useFallbackTime, setUseFallbackTime] = useState(false);
    const [restaurantData, setRestaurantData] = useState<any | null>(null);
    const [deliveryCodes, setDeliveryCodes] = useState<{ pickupCode: string | null, dropCode: string | null } | null>(null);
    const hasFetchedQuoteRef = React.useRef(false);

    function handleNeedHelp(orderNumber: string) {
        const number = (import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '919082220155').replace(/[^0-9]/g, '');
        const currentId = order?.id || orderId || orderNumber || 'N/A';
        const displayOrderNum = order?.orderNumber || orderNumber || currentId;
        const restName = order?.restaurantName || restaurantData?.name || (order as any)?.restaurant?.name || 'N/A';
        const restId = order?.restaurantId || restaurantData?.id || (order as any)?.restaurant?.id || 'N/A';

        const rawPaymentStatus = order?.paymentStatusDisplay || order?.paymentStatus;
        const isCash = order?.paymentId === 'CASH' || (order as any)?.paymentMethod === 'CASH';
        const payStatus = rawPaymentStatus
            ? rawPaymentStatus
            : isCash
                ? 'Cash on Delivery'
                : (order?.status ? `Order Status: ${order.status}` : 'N/A');

        const messageText = `Hi, I need help with my order #${displayOrderNum}\n\nOrder ID: ${currentId}\nRestaurant: ${restName}\nRestaurant ID: ${restId}\nPayment Status: ${payStatus}`;

        const message = encodeURIComponent(messageText);
        window.open(`https://api.whatsapp.com/send/?phone=${number}&text=${message}`, "_blank", "noopener,noreferrer");
    }


    // Handle browser back button on OrderTrackingPage to prevent returning to PayU/Payment pages
    useEffect(() => {
        window.history.pushState({ page: 'track-order' }, '', window.location.href);

        const handlePopState = () => {
            console.log("[Diagnostic] Back button intercepted on OrderTrackingPage!");
            window.history.pushState({ page: 'track-order' }, '', window.location.href);
            navigate('/', { replace: true });
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [navigate]);

    // Map the backend status precisely to the tracking UI pipeline
    useEffect(() => {
        if (order) {
            const apiStatus = (order.status || '').toUpperCase();
            const statusDisplay = (order.statusDisplay || '').toUpperCase();
            const isPickupOrder = order.fulfillmentType?.toLowerCase() === 'pickup';

            if (['DELIVERED', 'COMPLETED'].includes(apiStatus) || statusDisplay === 'DELIVERED') {
                setStatus('delivered');
            } else if (['ASSIGNED', 'PICKED_UP', 'PICKEDUP', 'DELIVERING', 'OUT_FOR_DELIVERY', 'OUT FOR DELIVERY'].includes(apiStatus) || statusDisplay === 'PICKED UP' || statusDisplay === 'OUT FOR DELIVERY') {
                if (isPickupOrder && (['PICKED_UP', 'PICKEDUP'].includes(apiStatus) || statusDisplay === 'PICKED UP')) {
                    setStatus('delivered'); // Picked up is the final stage for self-pickup
                } else {
                    setStatus('delivery');
                }
            } else if (['READY', 'READY_FOR_PICKUP', 'READY FOR PICKUP', 'READYFORPICKUP'].includes(apiStatus) || statusDisplay.includes('READY') || apiStatus.includes('READY')) {
                setStatus('ready');
            } else if (['PREPARING', 'CONFIRMED', 'ACCEPTED'].includes(apiStatus) || statusDisplay === 'PREPARING' || statusDisplay === 'CONFIRMED' || statusDisplay === 'ACCEPTED') {
                setStatus('preparing');
            } else if (['REJECTED', 'REFUNDING', 'REFUNDED'].includes(apiStatus) || statusDisplay === 'REJECTED' || statusDisplay === 'REFUND IN PROGRESS') {
                setStatus('rejected');
            } else if (apiStatus === 'CANCELLED' || statusDisplay === 'CANCELLED') {
                setStatus('cancelled');
            } else if (apiStatus === 'FAILED' || statusDisplay === 'FAILED') {
                setStatus('failed');
            } else {
                setStatus('placed'); // PENDING, PAID, CONFIRMED
            }
        }
    }, [order]);



    const fetchOrder = async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        try {
            if (orderId) {
                const o = await getOrderById(orderId);
                if (o) setOrder(o);
            } else {
                const active = await getActiveOrders();
                if (active && active.length > 0) setOrder(active[0]);
            }
        } finally {
            if (isInitial) {
                setIsLoading(false);
            }
        }
    };

    // Initial load
    useEffect(() => {
        fetchOrder(true);

        // Fallback timer if calculation takes too long
        const fallbackTimer = setTimeout(() => {
            setUseFallbackTime(true);
        }, 10000);

        // Polling remains as a background fallback
        const interval = setInterval(() => fetchOrder(false), 10000);
        return () => {
            clearInterval(interval);
            clearTimeout(fallbackTimer);
        };
    }, [orderId]);

    const handleReorder = async () => {
        if (!order || !order.items || order.items.length === 0) return;

        try {
            // Map order items to CartItems with robust property fallback
            const reorderItems = order.items.map(item => ({
                id: item.menuItemId || (item as any).id,
                menuItemId: item.menuItemId || (item as any).id,
                name: item.name || (item as any).itemName || "Item",
                price: item.unitPrice || (item as any).price || 0,
                quantity: item.quantity || 1,
                isVeg: true,
                description: item.options || (item as any).itemDescription || "",
                customizations: item.specialInstructions || ""
            }));

            await reorder(reorderItems, order.restaurantId, order.restaurantName);
            navigate('/checkout');
        } catch (error) {
            console.error("[OrderTracking] Reorder failed:", error);
            navigate('/checkout');
        }
    };

    // Fetch delivery quote if estimatedMinutes is missing
    useEffect(() => {
        if (order && !order.estimatedMinutes && ['placed', 'preparing', 'ready', 'delivery'].includes(status)) {
            if (hasFetchedQuoteRef.current) return;
            hasFetchedQuoteRef.current = true;

            const fetchQuote = async () => {
                try {
                    let restaurant = restaurantData;
                    if (!restaurant) {
                        restaurant = await fetchRestaurantById(order.restaurantId);
                        setRestaurantData(restaurant);
                    }

                    // Parse delivery coordinates
                    let dropLat = (order.deliveryInfo?.deliveryAddress as any)?.latitude;
                    let dropLng = (order.deliveryInfo?.deliveryAddress as any)?.longitude;

                    const isPickup = order.fulfillmentType?.toLowerCase() === 'pickup';
                    // Fallback to address search if lat/lng missing (only for Delivery)
                    if (!isPickup && (!dropLat || !dropLng)) {
                        console.log("[OrderTracking] Delivery coordinates missing, skipping quote fetch");
                        return;
                    }

                    if (restaurant && restaurant.latitude && restaurant.longitude) {
                        const quote = await getDeliveryQuote({
                            restaurantId: order.restaurantId,
                            pickupLatitude: restaurant.latitude,
                            pickupLongitude: restaurant.longitude,
                            dropLatitude: isPickup ? undefined : dropLat,
                            dropLongitude: isPickup ? undefined : dropLng,
                            fulfillmentType: isPickup ? 'Pickup' : 'Delivery',
                            orderAmount: order.totalAmount || order.pricing?.total || 0
                        });

                        if (quote && quote.estimatedMinutes) {
                            console.log("[OrderTracking] Received fresh quote estimation:", quote.estimatedMinutes);
                            setQuoteEstimatedMinutes(quote.estimatedMinutes);
                        }
                    }
                } catch (err) {
                    console.error("[OrderTracking] Failed to fetch delivery quote:", err);
                    // Reset on error so we can retry on subsequent polls
                    hasFetchedQuoteRef.current = false;
                }
            };
            fetchQuote();
        }
    }, [order, status]);

    // Handle real-time SignalR updates
    useEffect(() => {
        if (lastStatusUpdate && (lastStatusUpdate.orderId === orderId || (!orderId && order))) {
            console.log('[OrderTracking] Real-time update detected, refreshing...');
            fetchOrder(false);
        }
    }, [lastStatusUpdate]);

    // Pre-fetch restaurant details to display pickup address if needed
    useEffect(() => {
        if (order && !restaurantData) {
            fetchRestaurantById(order.restaurantId)
                .then(setRestaurantData)
                .catch(err => console.error("[OrderTracking] Failed to pre-fetch restaurant details:", err));
        }
    }, [order, restaurantData]);

    // Fetch delivery/pickup codes when order is active
    useEffect(() => {
        if (orderId) {
            const saved = localStorage.getItem(`delivery_codes_${orderId}`);
            if (saved) {
                try {
                    setDeliveryCodes(JSON.parse(saved));
                } catch (e) {
                    setDeliveryCodes(null);
                }
            } else {
                setDeliveryCodes(null);
            }
        } else {
            setDeliveryCodes(null);
        }
    }, [orderId]);

    useEffect(() => {
        const loadCodes = async () => {
            if (!order || !orderId) return;

            const isPickupOrder = order.fulfillmentType?.toLowerCase() === 'pickup';
            if (isPickupOrder) {
                setDeliveryCodes(null);
                return;
            }

            const rawStatus = (order.status || '').toUpperCase();
            const isClosed = ['DELIVERED', 'CANCELLED', 'REJECTED', 'FAILED', 'COMPLETED', 'PICKED_UP'].includes(rawStatus);

            if (!isClosed) {
                try {
                    const codes = await fetchDeliveryCodes(orderId);
                    if (codes && (codes.pickupCode || codes.dropCode)) {
                        setDeliveryCodes(codes);
                        localStorage.setItem(`delivery_codes_${orderId}`, JSON.stringify(codes));
                    }
                } catch (err) {
                    console.error("[OrderTracking] Failed to fetch delivery codes:", err);
                }
            } else {
                setDeliveryCodes(null);
                localStorage.removeItem(`delivery_codes_${orderId}`);
            }
        };

        loadCodes();
    }, [order, orderId]);

    const isPickup = order?.fulfillmentType?.toLowerCase() === 'pickup';
    const showCode = isPickup ? deliveryCodes?.pickupCode : deliveryCodes?.dropCode;
    const codeLabel = isPickup ? 'Your Pickup Code' : 'Your Delivery Code';
    const codeInstructions = isPickup
        ? 'Show this code to the restaurant staff to pick up your order.'
        : 'Read this out to your delivery partner when they arrive.';

    const riderInfo = (() => {
        if (!order) return null;
        const d = order.deliveryInfo;
        if (d?.riderName || d?.riderPhone || d?.riderId) {
            return {
                name: d.riderName || 'Delivery Partner',
                phone: d.riderPhone,
                id: d.riderId ? (String(d.riderId).length > 8 ? `ID #${String(d.riderId).slice(0, 8)}` : `ID ${d.riderId}`) : '',
                photo: d.riderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.riderName || 'Rider')}`
            };
        }
        if (order.rider) {
            const r = order.rider;
            return {
                name: r.name || 'Delivery Partner',
                phone: r.phone,
                id: r.id ? (String(r.id).length > 8 ? `ID #${String(r.id).slice(0, 8)}` : `ID ${r.id}`) : '',
                photo: r.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.name || 'Rider')}`
            };
        }
        return null;
    })();

    const stages = isPickup ? [
        {
            id: 'placed',
            label: 'Order Placed',
            subtext: (status === 'rejected' || status === 'cancelled')
                ? (order?.rejectionReason || order?.cancellationReason || 'Order unsuccessful')
                : (order?.status?.toUpperCase() === 'PAID')
                    ? 'Waiting for restaurant to accept'
                    : 'Your order has been placed successfully',
            icon: Clock,
            image: orderPlacedImg
        },
        {
            id: 'preparing',
            label: 'Preparing',
            subtext: 'Your food is being prepared',
            icon: ChefHat,
            image: preparingImg
        },
        {
            id: 'ready',
            label: 'Ready for Pickup',
            subtext: 'Your food is ready at the restaurant.',
            icon: ShoppingBag,
            image: preparingImg
        },
        {
            id: 'delivered',
            label: 'Picked Up',
            subtext: 'Your order has been picked up.',
            icon: CheckCircle,
            image: deliveredImg
        }
    ] : [
        {
            id: 'placed',
            label: 'Order Placed',
            subtext: (status === 'rejected' || status === 'cancelled')
                ? (order?.rejectionReason || order?.cancellationReason || 'Order unsuccessful')
                : (order?.status?.toUpperCase() === 'PAID')
                    ? 'Waiting for restaurant to accept'
                    : 'Your order has been placed successfully',
            icon: Clock,
            image: orderPlacedImg
        },
        {
            id: 'preparing',
            label: 'Preparing',
            subtext: 'Your food is being prepared',
            icon: ChefHat,
            image: preparingImg
        },
        {
            id: 'ready',
            label: 'Order Ready',
            subtext: 'Waiting for rider to pick up',
            icon: ShoppingBag,
            image: preparingImg
        },
        {
            id: 'delivery',
            label: 'Out for Delivery',
            subtext: 'Your food is on the way.',
            icon: Bike,
            image: deliveryImg
        },
        {
            id: 'delivered',
            label: 'Delivered',
            subtext: 'Your order has been delivered.',
            icon: CheckCircle,
            image: deliveredImg
        }
    ];

    const currentStageIndex = status === 'cancelled' || status === 'rejected' ? 0 : Math.max(0, stages.findIndex(s => s.id === status));

    // Robust parsing functions to handle varying backend serialization formats
    const getAddressDisplay = (o: any) => {
        if (!o) return '--';

        const cleanAddress = (addrStr: string) => {
            return addrStr.replace(/,?\s*000000\b/g, '').trim().replace(/,\s*$/, '');
        };

        // Match the real backend: o.deliveryInfo.deliveryAddress
        if (o.deliveryInfo?.deliveryAddress) {
            const addr = o.deliveryInfo.deliveryAddress;
            if (addr.formattedAddress) return cleanAddress(addr.formattedAddress);
            const street = addr.street || addr.addressLine || addr.address || '';
            const city = addr.city || '';
            if (street || city) return cleanAddress([street, city].filter(Boolean).join(', '));
        }

        // Legacy fallback check on root if structure reverts
        if (o.deliveryAddress) {
            if (typeof o.deliveryAddress === 'string') return cleanAddress(o.deliveryAddress);
            const street = o.deliveryAddress.street || o.deliveryAddress.addressLine || o.deliveryAddress.address || '';
            const city = o.deliveryAddress.city || '';
            if (street || city) return cleanAddress([street, city].filter(Boolean).join(', '));
        }

        return o.deliveryInfo?.deliveryAddress?.formattedAddress || 'Pune, India';
    };

    const getPickupAddressDisplay = (o: any) => {
        if (!o) return '--';
        if (o.deliveryInfo?.pickupAddress) return o.deliveryInfo.pickupAddress;
        if (restaurantData?.addressLine) return restaurantData.addressLine;
        if (restaurantData?.formattedAddress) return restaurantData.formattedAddress;
        return 'Pickup from restaurant';
    };

    const getEstimatedTime = (o: ApiOrder | null) => {
        if (!o) return 'Calculating...';

        // If already delivered, show "Delivered"
        if (status === 'delivered') return 'Delivered';
        if (status === 'rejected' || status === 'cancelled' || status === 'failed') return '--';

        // If self-pickup and ready for pickup
        if (isPickup && (status === 'ready' || status === 'delivery')) {
            return 'Ready to Collect';
        }

        // 1. Use the explicit display string if backend provided one
        if (o.estimatedTimeDisplay) return o.estimatedTimeDisplay;

        // 2. Use the minutes duration (favoring fresh quote if available)
        const mins = quoteEstimatedMinutes || o.estimatedMinutes;

        if (mins) {
            return `${mins} min`;
        }

        if (useFallbackTime) {
            return '30-40 min';
        }

        return 'Calculating...';
    };

    const getOrderTotal = (o: any) => {
        if (!o) return 0;

        const itemsTotal = Array.isArray(o.items) ? o.items.reduce((sum: number, item: any) => sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0) : 0;
        const backendTotal = o.pricing?.total || o.total || o.totalAmount;

        // If backend returns a drastically lower total (like 173 instead of 660+), the backend calculation is likely bugged
        // We calculate it manually to preserve UI consistency
        if (itemsTotal > 0 && backendTotal && Math.abs(backendTotal - itemsTotal) > 100) {
            const tax = o.pricing?.tax || 0;
            const fee = o.pricing?.serviceFee || 0;
            return itemsTotal + tax + fee;
        }

        if (backendTotal) return backendTotal;
        if (o.pricing?.subTotal) return o.pricing.subTotal;

        // Final fallback: Calculate from items
        if (itemsTotal > 0) return itemsTotal;

        return backendTotal || 0;
    };

    const reconcileBill = (o: any) => {
        if (!o) return null;

        const isPickup = o.fulfillmentType?.toLowerCase() === 'pickup';
        const itemsTotal = Array.isArray(o.items) ? o.items.reduce((sum: number, item: any) => sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0) : 0;
        const pricingSubTotal = o.pricing?.subTotal || itemsTotal;
        const pricingDeliveryFee = !isPickup ? (o.pricing?.deliveryFee || 0) : 0;
        const pricingDeliveryTip = !isPickup ? (o.pricing?.tip || 0) : 0;
        const pricingTax = o.pricing?.tax || 0;
        const pricingDiscount = o.pricing?.discount || 0;
        const pricingPackagingFee = o.pricing?.packagingFee || 0;
        const pricingServiceFee = o.pricing?.serviceFee || 0;
        const pricingTotal = getOrderTotal(o);

        // Smart reconciliation variables
        // If pricing.serviceFee is 0, this is a new order with the adjusted client payload
        const isNewPayload = pricingServiceFee === 0;

        let displayPlatformFee = 0;
        let displayFoodGst = 0;
        let displayPlatformGst = 0;
        let displayDeliveryGst = 0;

        if (isNewPayload) {
            // For new orders:
            // - platformFee is always flat 10 (which is automatically added by backend but sent as 0 in payload)
            // - pricingTax contains only the foodGst
            displayPlatformFee = 10;
            displayFoodGst = pricingTax; // foodGst
            displayPlatformGst = 1.80; // 18% of 10
            displayDeliveryGst = !isPickup && pricingDeliveryFee > 0 ? pricingDeliveryFee * 0.18 : 0;
        } else {
            // For old orders:
            // - platformFee is stored in pricingServiceFee
            // - pricingTax contains total tax, so we calculate foodGst (5%), platformGst (18%), deliveryGst (18%)
            displayPlatformFee = pricingServiceFee;
            displayFoodGst = pricingTax > 0 ? pricingSubTotal * 0.05 : 0;
            displayPlatformGst = pricingServiceFee > 0 ? pricingServiceFee * 0.18 : 0;
            displayDeliveryGst = !isPickup && pricingDeliveryFee > 0 ? pricingDeliveryFee * 0.18 : 0;
        }

        // Sum of all identified display components
        const identifiedSum = pricingSubTotal + pricingDeliveryFee + pricingDeliveryTip + pricingPackagingFee - pricingDiscount + displayPlatformFee + displayFoodGst + displayPlatformGst + displayDeliveryGst;

        // Any leftover remainder is displayed as taxes/charges adjustment
        const leftover = pricingTotal - identifiedSum;
        const displayLeftover = Math.abs(leftover) >= 1 ? leftover : 0;

        return {
            subTotal: pricingSubTotal,
            deliveryFee: pricingDeliveryFee,
            deliveryTip: pricingDeliveryTip,
            packagingFee: pricingPackagingFee,
            discount: pricingDiscount,
            platformFee: displayPlatformFee,
            foodGst: displayFoodGst,
            platformGst: displayPlatformGst,
            deliveryGst: displayDeliveryGst,
            remainder: displayLeftover,
            total: pricingTotal
        };
    };

    if (isLoading) {
        return <OrderTrackingSkeleton />;
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center font-sans pb-20">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-4 max-w-sm text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">No Active Order</h2>
                    <p className="text-gray-500 text-sm font-medium">We couldn't find an active order to track right now.</p>
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="mt-4 bg-brand-primary text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-brand-secondary active:scale-[0.98] transition-all"
                    >
                        Browse Restaurants
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'rejected' || status === 'cancelled' || status === 'failed') {
        const isCash = order?.paymentId === 'CASH';
        const isPaymentIncomplete = (() => {
            const apiPaymentStatus = ((order as any).paymentStatus || '').toUpperCase();
            const apiPaymentStatusDisplay = ((order as any).paymentStatusDisplay || '').toUpperCase();

            // If the payment is completed/paid, it is not incomplete!
            if (apiPaymentStatus === 'PAID' || apiPaymentStatusDisplay === 'PAID') {
                return false;
            }

            const reason = (order.cancellationReason || order.failureReason || order.cancellationNotes || '').toLowerCase();
            const apiStatus = (order.status || '').toUpperCase();
            const statusDisplay = ((order as any).statusDisplay || '').toUpperCase();

            return (
                reason.includes('payment') ||
                reason.includes('timeout') ||
                reason.includes('payu') ||
                apiStatus === 'FAILED' ||
                statusDisplay === 'FAILED'
            );
        })();

        return (
            <div className="min-h-[100dvh] bg-[#F8F9FA] font-sans pb-20">
                {/* Navbar */}
                <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/orders')} className="p-2 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center">
                            <ArrowLeft className="w-5 h-5 text-gray-800" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-900">Order Status</h1>
                    </div>
                </div>

                <div className="max-w-[850px] mx-auto px-4 pt-8 lg:pt-12">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

                        {/* Left Column: Status & Illustration */}
                        <div className="flex flex-col items-center lg:items-start lg:flex-1 lg:max-w-[340px] w-full text-center lg:text-left">
                            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-brand-light rounded-2xl flex items-center justify-center mb-5 border-4 border-white shadow-sm relative shrink-0">
                                <AlertCircle className="w-8 h-8 lg:w-10 lg:h-10 text-brand-primary" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 lg:w-7 lg:h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                                    <ShoppingBag className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-gray-400" />
                                </div>
                            </div>

                            <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                                {status === 'rejected' ? 'Order Rejected' : status === 'failed' ? 'Order Failed' : 'Order Cancelled'}
                            </h2>

                            <p className="text-gray-500 font-bold text-base lg:text-lg mb-6 leading-relaxed">
                                {(() => {
                                    const rawReason = order?.rejectionReason ||
                                        order?.cancellationReason ||
                                        order?.cancellationNotes ||
                                        order?.failureReason ||
                                        (order as any).failureNotes ||
                                        (order as any).deliveryInfo?.failureNotes ||
                                        (order as any).deliveryInfo?.failureReason;

                                    if (!rawReason) {
                                        if (status === 'rejected') return 'The restaurant is unable to fulfill your order right now.';
                                        if (status === 'failed') return 'Your order could not be completed.';
                                        return 'Your order was cancelled.';
                                    }

                                    if (typeof rawReason === 'string') {
                                        const lowerReason = rawReason.toLowerCase();
                                        if (rawReason.includes('NoRidersAvailable') || lowerReason.includes('no riders available') || lowerReason.includes('noridersavailable')) {
                                            return 'No riders available at the time';
                                        }
                                        return rawReason;
                                    }
                                    return String(rawReason);
                                })()}
                            </p>

                            {/* Actions - Desktop Only inside left col */}
                            <div className="hidden lg:flex flex-col gap-2.5 w-full max-w-[280px]">
                                <button
                                    onClick={handleReorder}
                                    className="w-full bg-brand-primary text-white font-bold text-[16px] py-4 rounded-xl shadow-lg shadow-red-100 hover:bg-brand-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                    Reorder Now
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full bg-white text-gray-500 font-bold text-[15px] py-4 rounded-xl border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all"
                                >
                                    Back to Home
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Cards */}
                        <div className="flex flex-col gap-5 lg:flex-1 w-full">
                            {/* Refund Info or Payment Incomplete Card - Only show for online payments */}
                            {!isCash && (
                                isPaymentIncomplete ? (
                                    <div className="w-full bg-white rounded-[24px] p-6 lg:p-8 shadow-[0_12px_30px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col gap-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                                        <div className="relative z-10 flex flex-col gap-5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Payment Amount</span>
                                                <span className="text-gray-500 font-extrabold text-2xl line-through">₹{getOrderTotal(order)}</span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Payment Status</span>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[11px] font-extrabold shadow-sm border border-amber-200">
                                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                    <span>INCOMPLETE</span>
                                                </div>
                                            </div>

                                            <hr className="border-gray-50" />

                                            <div className="flex items-start gap-3 bg-[#FFF9F6] p-4 rounded-xl border border-amber-100/50">
                                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[13px] text-gray-800 font-bold">No amount was charged</span>
                                                    <p className="text-[12px] text-gray-500 leading-relaxed font-medium">
                                                        As the payment was not successfully completed, no money was charged to your account. If any amount was temporarily debited, it will be automatically reversed by your bank within <span className="text-gray-900 font-bold">3-5 business days</span>.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full bg-white rounded-[24px] p-6 lg:p-8 shadow-[0_12px_30px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col gap-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                                        <div className="relative z-10 flex flex-col gap-5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 font-bold text-xs uppercase tracking-widest font-bold">Payment Amount</span>
                                                <span className="text-gray-950 font-extrabold text-2xl">₹{getOrderTotal(order)}</span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 font-bold text-xs uppercase tracking-widest font-bold">Payment Status</span>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E6F5EC] text-[#00A050] rounded-full text-[11px] font-extrabold shadow-sm border border-[#D1EEDB]">
                                                    <CheckCircle className="w-3.5 h-3.5 text-[#00A050]" />
                                                    <span>COMPLETED</span>
                                                </div>
                                            </div>

                                            <hr className="border-gray-50" />

                                            <div className="flex items-start gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-blue-50/50">
                                                <Clock className="w-5 h-5 text-[#8B96A5] shrink-0 mt-0.5" />
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[13px] text-gray-800 font-bold">Refund Initiated</span>
                                                    <p className="text-[12px] text-gray-500 leading-relaxed font-medium">
                                                        Since the order could not be completed, a full refund of <span className="text-gray-900 font-bold">₹{getOrderTotal(order)}</span> has been initiated. The refund will be credited back to your original payment source within <span className="text-gray-900 font-bold">7 business days</span>.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Order Summary (Minimized) */}
                            <div className="w-full bg-white rounded-[24px] p-6 lg:p-8 shadow-[0_12px_30px_rgba(0,0,0,0.02)] border border-gray-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
                                        <ShoppingBag className="w-4 h-4 text-brand-primary" />
                                        Order Details
                                    </h3>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase bg-gray-50 px-2.5 py-0.5 rounded-full">#{order.orderNumber.slice(-5)}</span>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {order?.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-[14px]">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-gray-800 font-bold">{item.name || (item as any).itemName}</span>
                                                <span className="text-gray-400 text-xs font-bold uppercase tracking-tighter">Qty: {item.quantity}</span>
                                            </div>
                                            <span className="text-gray-900 font-extrabold">₹{(item.unitPrice || 0) * (item.quantity || 1)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-6 border-t border-dashed border-gray-100 flex justify-between items-center">
                                    <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Total Paid</span>
                                    <span className="text-gray-900 font-black text-xl tracking-tight">₹{getOrderTotal(order)}</span>
                                </div>
                            </div>

                            {/* Actions - Mobile Only stacked */}
                            <div className="flex lg:hidden flex-col gap-3 w-full mt-2">
                                <button
                                    onClick={handleReorder}
                                    className="w-full bg-brand-primary text-white font-bold text-[16px] py-4 rounded-xl shadow-lg shadow-red-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                    Reorder Now
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full bg-white text-gray-500 font-bold text-[15px] py-4 rounded-xl border border-gray-100 active:scale-[0.98] transition-all"
                                >
                                    Back to Home
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans pb-24">
            {/* Navbar */}
            <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/orders')} className="p-2 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5 text-gray-800" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Track Order</h1>
                </div>
                {/* <button onClick={() => setIsMenuOpen(true)} className="p-2 text-gray-700">
                    <Menu className="w-6 h-6" />
                </button> */}
            </div>


            <div className="max-w-md lg:max-w-[1000px] mx-auto px-4 pt-6 flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 w-full items-start pb-10">

                    {/* --- Left Column --- */}
                    <div className="flex flex-col gap-6 w-full lg:flex-1 lg:max-w-[48%]">

                        {/* Desktop Aggregated Card */}
                        <div className="hidden lg:flex flex-col gap-0 bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8">
                            <div className="flex flex-col gap-8">

                                {/* Estimated Time */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-brand-light border border-[#FFE0DF] flex items-center justify-center rounded-2xl shrink-0">
                                            {isPickup ? (
                                                <ShoppingBag className="w-8 h-8 text-brand-primary" />
                                            ) : (
                                                <Bike className="w-8 h-8 text-brand-primary" />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-900 text-[18px] font-bold leading-none mb-2 tracking-tight">
                                                {isPickup ? 'Estimated Pickup Time' : 'Estimated Delivery Time'}
                                            </span>
                                            <span className="text-brand-primary font-bold text-[22px] uppercase">
                                                {status === 'delivered' ? (isPickup ? 'Picked Up' : 'Delivered') : getEstimatedTime(order)}
                                            </span>
                                            {/* {import.meta.env.DEV && (
                                                <span className="text-[10px] text-gray-400 font-mono mt-1">
                                                    [Debug] Codes: {JSON.stringify(deliveryCodes)}
                                                </span>
                                            )} */}
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-gray-50 border-t-2" />

                                {/* Delivery Address */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-gray-900 font-bold text-[18px] mb-2 tracking-tight">
                                                {isPickup ? 'Pickup Address' : 'Delivery Address'}
                                            </span>
                                            <span className="text-gray-400 text-[15px] font-medium w-[85%] text-pretty leading-relaxed">
                                                {isPickup ? getPickupAddressDisplay(order) : getAddressDisplay(order)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-[70px] h-[70px] rounded-full bg-[#E5F5EC] border-2 border-[#D1EEDB] flex items-center justify-center shrink-0 relative">
                                        <MapPin className="w-7 h-7 text-[#00A050]" />
                                        <div className="absolute top-[8px] right-[8px] w-3.5 h-3.5 rounded-full bg-[#00A050] animate-pulse border-2 border-white shadow-sm"></div>
                                    </div>
                                </div>

                                <hr className="border-gray-50 border-t-2" />

                                {/* Delivery Code Card */}
                                {showCode && (
                                    <>
                                        <div className="flex flex-col items-center py-6 bg-[#F8FAFC] rounded-[28px] border border-blue-50/50 shadow-inner">
                                            <span className="text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em] mb-5">{codeLabel}</span>
                                            <div className="flex gap-3 mb-5">
                                                {showCode.split('').map((digit, i) => (
                                                    <div key={i} className="w-12 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-3xl font-black text-[#111]">
                                                        {digit}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-gray-500 text-[13px] font-bold leading-relaxed text-center max-w-[240px]">
                                                {codeInstructions}
                                            </p>
                                        </div>
                                        <hr className="border-gray-50 border-t-2" />
                                    </>
                                )}

                                {/* Contact Partner */}
                                {!isPickup && riderInfo && (
                                    <div className="flex flex-col gap-4">
                                        <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">Contact Delivery Partner</h2>
                                        <div className="bg-[#FCFCFC] rounded-[24px] p-2.5 border border-gray-100 flex items-center justify-between shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center gap-4 pl-1.5">
                                                <div className="w-14 h-14 rounded-[18px] bg-gray-200 overflow-hidden shrink-0 border border-gray-100 shadow-inner">
                                                    <img src={riderInfo.photo} alt="Delivery Partner" />
                                                </div>
                                                <div className="flex flex-col justify-center gap-1">
                                                    <span className="text-[16px] font-bold text-gray-900 leading-none">{riderInfo.name}</span>
                                                    {riderInfo.id && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-400 text-[12px] font-bold tracking-wider">{riderInfo.id}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {riderInfo.phone ? (
                                                <a
                                                    href={`tel:${riderInfo.phone}`}
                                                    className="w-12 h-12 bg-white rounded-[18px] border border-gray-100 shadow-sm text-brand-primary flex items-center justify-center hover:bg-gray-50 active:scale-[0.95] transition-all mr-1"
                                                    title="Call delivery partner"
                                                >
                                                    <Phone className="w-5 h-5 fill-current" />
                                                </a>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="w-12 h-12 bg-gray-50 rounded-[18px] border border-gray-100 text-gray-300 flex items-center justify-center cursor-not-allowed opacity-50 mr-1"
                                                    title="Phone number unavailable"
                                                >
                                                    <Phone className="w-5 h-5 fill-current" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Order Details */}
                                <div className="flex flex-col gap-4 mt-2">
                                    <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">Order Details • {order?.restaurantName || ''}</h2>
                                    <div className="flex flex-col gap-4">
                                        {(order?.items || []).map((item, idx, arr) => (
                                            <div key={idx} className={`flex justify-between items-center text-[16px] ${idx !== arr.length - 1 ? 'pb-5 border-b border-gray-100' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3.5 h-3.5 rounded-full border-[3px] border-[#00A050] bg-white shadow-sm"></div>
                                                    <span className="text-gray-700 font-semibold tracking-tight">{item.name || (item as any).itemName || 'Item'} x {item.quantity || 1}</span>
                                                </div>
                                                <span className="text-gray-900 font-bold">₹{(item.unitPrice || 0) * (item.quantity || 1)}</span>
                                            </div>
                                        ))}
                                        {/* Dynamic Payment Breakdown */}
                                        {(() => {
                                            const bill = reconcileBill(order);
                                            if (!bill) return null;

                                            return (
                                                <div className="flex flex-col gap-2.5 pt-4 border-t border-gray-100 text-[14px]">
                                                    <div className="flex justify-between items-center text-gray-500 font-medium">
                                                        <span>Item Total</span>
                                                        <span>₹{formatPrice(bill.subTotal)}</span>
                                                    </div>

                                                    {!isPickup && bill.deliveryFee > 0 && (
                                                        <div className="flex justify-between items-center text-gray-500 font-medium">
                                                            <span>Delivery Fee</span>
                                                            <span>₹{formatPrice(bill.deliveryFee)}</span>
                                                        </div>
                                                    )}

                                                    {!isPickup && bill.deliveryTip > 0 && (
                                                        <div className="flex justify-between items-center text-gray-500 font-medium">
                                                            <span>Delivery Tip</span>
                                                            <span>₹{formatPrice(bill.deliveryTip)}</span>
                                                        </div>
                                                    )}

                                                    {bill.packagingFee > 0 && (
                                                        <div className="flex justify-between items-center text-gray-500 font-medium">
                                                            <span>Packaging Charges</span>
                                                            <span>₹{formatPrice(bill.packagingFee)}</span>
                                                        </div>
                                                    )}

                                                    {bill.platformFee > 0 && (
                                                        <div className="flex justify-between items-center text-gray-500 font-medium">
                                                            <span>Platform Charges</span>
                                                            <span>₹{formatPrice(bill.platformFee)}</span>
                                                        </div>
                                                    )}

                                                    {bill.foodGst > 0 && (
                                                        <div className="flex justify-between items-center text-gray-500 font-medium">
                                                            <span>GST on Food (5%)</span>
                                                            <span>₹{formatPrice(bill.foodGst)}</span>
                                                        </div>
                                                    )}

                                                    {!isPickup && bill.deliveryGst > 0 && (
                                                        <div className="flex justify-between items-center text-gray-500 font-medium">
                                                            <span>GST (18% on Delivery)</span>
                                                            <span>₹{formatPrice(bill.deliveryGst)}</span>
                                                        </div>
                                                    )}

                                                    {bill.platformGst > 0 && (
                                                        <div className="flex justify-between items-center text-gray-500 font-medium">
                                                            <span>GST (18% on Platform Fee)</span>
                                                            <span>₹{formatPrice(bill.platformGst)}</span>
                                                        </div>
                                                    )}

                                                    {bill.discount > 0 && (
                                                        <div className="flex justify-between items-center text-[#64C27B] font-medium">
                                                            <span>Discount Applied</span>
                                                            <span>-₹{formatPrice(bill.discount)}</span>
                                                        </div>
                                                    )}

                                                    {bill.remainder > 0 && (
                                                        <div className="flex justify-between items-center text-gray-500 font-medium">
                                                            <span>Taxes & Charges</span>
                                                            <span>₹{formatPrice(bill.remainder)}</span>
                                                        </div>
                                                    )}

                                                    <div className="border-t border-dashed border-gray-200 my-1.5"></div>

                                                    <div className="flex justify-between items-center text-gray-900 font-bold text-[18px]">
                                                        <span>Total Paid</span>
                                                        <span className="text-xl text-gray-900">₹{formatPrice(bill.total)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Only Cards section (Original UI mapping) */}
                        <div className="flex flex-col gap-6 lg:hidden w-full">
                            {/* Estimated Time Card */}
                            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-brand-light p-4 rounded-2xl">
                                        {isPickup ? (
                                            <ShoppingBag className="w-6 h-6 text-brand-primary" />
                                        ) : (
                                            <Bike className="w-6 h-6 text-brand-primary" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 text-[13px] font-medium leading-none mb-1.5">
                                            {isPickup ? 'Estimated Pickup Time' : 'Estimated Delivery Time'}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-brand-primary" />
                                            <span className="text-brand-primary font-bold text-[17px]">
                                                {status === 'delivered' ? (isPickup ? 'Picked Up' : 'Delivered') : getEstimatedTime(order)}
                                            </span>
                                        </div>
                                        {/* {import.meta.env.DEV && (
                                            <span className="text-[10px] text-gray-400 font-mono mt-1">
                                                [Debug] Codes: {JSON.stringify(deliveryCodes)}
                                            </span>
                                        )} */}
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Address Card */}
                            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-[#E6F5EC] p-4 rounded-2xl">
                                        <MapPin className="w-6 h-6 text-[#00A050]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-900 font-bold text-[15px] mb-0.5">
                                            {isPickup ? 'Pickup Address' : 'Delivery Address'}
                                        </span>
                                        <span className="text-gray-400 text-[13px] font-medium">
                                            {isPickup ? getPickupAddressDisplay(order) : getAddressDisplay(order)}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-[#00A050] animate-pulse"></div>
                                </div>
                            </div>
                        </div> {/* End Mobile Time/Address */}
                    </div> {/* End Left Column */}


                    {/* --- Right Column --- */}
                    <div className="flex flex-col gap-6 w-full lg:flex-1 lg:max-w-[52%] order-first lg:order-none">

                        <div className="bg-white lg:rounded-[32px] overflow-hidden lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:border border-gray-100 flex flex-col -mx-4 lg:mx-0 border-y lg:border-y-0">
                            {/* Dynamic Top Banner (Desktop Only) */}
                            <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-[#EGEEFC] bg-gradient-to-br from-[#EAE6FF] to-[#F1EFFF]">
                                <img src={stages[currentStageIndex].image} alt="Status" className="h-[140px] object-contain drop-shadow-xl translate-y-2 mix-blend-multiply" />
                            </div>
                            <div className="hidden lg:flex bg-[#E0D8FC] min-h-[64px] items-center justify-center border-t border-white/20 shadow-inner">
                                <h2 className="text-[#8B5CF6] font-bold text-[22px] tracking-wide">{stages[currentStageIndex].label}</h2>
                            </div>

                            {/* Order Stepper */}
                            <div className="p-6 lg:p-10 relative bg-white">
                                <h2 className="text-[22px] font-bold text-gray-900 mb-10 tracking-tight text-center">Order Status</h2>

                                <div className="relative flex flex-col gap-10">
                                    {/* Vertical Line */}
                                    <div className="absolute left-6 lg:left-[17px] top-6 lg:top-[17px] bottom-[30px] lg:bottom-[34px] w-0.5 bg-gray-100 -translate-x-[1px] z-0"></div>

                                    {/* Progress Fill */}
                                    <div
                                        className="absolute left-6 lg:left-[17px] top-6 lg:top-[17px] bottom-[30px] lg:bottom-[34px] w-0.5 bg-[#00A050] transition-all duration-1000 -translate-x-[1px] z-0"
                                        style={{
                                            transform: `scaleY(${currentStageIndex / (stages.length - 1)})`,
                                            transformOrigin: 'top'
                                        }}
                                    ></div>
                                    {stages.map((stage, idx) => {
                                        const isCompleted = idx < currentStageIndex;
                                        const isActive = idx === currentStageIndex;
                                        const Icon = stage.icon;

                                        return (
                                            <div key={stage.id} className="relative z-10 flex">
                                                <div className="flex items-center gap-6 lg:gap-8 bg-white py-1">
                                                    <div className={`w-12 h-12 lg:w-[36px] lg:h-[36px] rounded-full flex items-center justify-center border-[3px] lg:border-[3.5px] transition-all duration-500 shrink-0 ${isActive ? 'bg-[#E6F5EC] border-[#00A050] ring-4 ring-[#E6F5EC] shadow-sm' : isCompleted ? 'bg-[#00A050] border-[#00A050]' : 'bg-white border-gray-200'}`}>
                                                        <Icon className={`w-5 h-5 lg:w-4.5 lg:h-4.5 ${isActive ? 'text-[#00A050]' : isCompleted ? 'text-white' : 'text-gray-300'}`} />
                                                    </div>
                                                    <div className="flex flex-col pt-1 bg-white pr-4">
                                                        <span className={`text-[15px] lg:text-[18px] font-bold leading-none mb-1.5 transition-colors duration-500 tracking-tight ${isActive ? 'text-[#00A050]' : isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>
                                                            {stage.label}
                                                        </span>
                                                        {(isActive || isCompleted) ? (
                                                            <span className={`text-[13px] lg:text-[14px] font-medium animate-in fade-in duration-500 ${(isActive && window.innerWidth >= 1024) ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                {stage.subtext}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-[13px] lg:text-[14px] font-medium opacity-0 select-none">Placeholder</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Dynamic Illustration for Active Phase removed on mobile as per request */}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 lg:hidden w-full">
                        {/* Mobile Delivery Code Card */}
                        {showCode && (
                            <div className="bg-white rounded-[28px] p-8 shadow-sm border border-gray-50 flex flex-col items-center text-center gap-5">
                                <span className="text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em]">{codeLabel}</span>
                                <div className="flex gap-3">
                                    {showCode.split('').map((digit, i) => (
                                        <div key={i} className="w-12 h-16 bg-[#F8F9FA] rounded-2xl border border-gray-100 flex items-center justify-center text-3xl font-black text-gray-900 shadow-inner">
                                            {digit}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-gray-500 text-[13px] font-bold leading-relaxed max-w-[220px]">
                                    {codeInstructions}
                                </p>
                            </div>
                        )}

                        {/* Contact Partner Card */}
                        {!isPickup && riderInfo && (
                            <div className="flex flex-col gap-3">
                                <h2 className="text-sm font-bold text-gray-900 ml-1">Contact Delivery Partner</h2>
                                <div className="bg-white rounded-[24px] p-4 shadow-sm border border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden">
                                            <img src={riderInfo.photo} alt="Delivery Partner" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[15px] font-bold text-gray-900">{riderInfo.name}</span>
                                            {riderInfo.id && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-gray-400 text-[11px] font-medium">{riderInfo.id}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {riderInfo.phone ? (
                                        <a
                                            href={`tel:${riderInfo.phone}`}
                                            className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-brand-primary active:scale-[0.95] transition-all"
                                            title="Call delivery partner"
                                        >
                                            <Phone className="w-5 h-5 fill-current" />
                                        </a>
                                    ) : (
                                        <button
                                            disabled
                                            className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-300 flex items-center justify-center cursor-not-allowed opacity-50"
                                            title="Phone number unavailable"
                                        >
                                            <Phone className="w-5 h-5 fill-current" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Order Details Summary */}
                        <div className="flex flex-col gap-3">
                            <h2 className="text-sm font-bold text-gray-900 ml-1">Order Details • {order?.restaurantName || ''}</h2>
                            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 flex flex-col gap-4">
                                {(order?.items || []).map((item, idx, arr) => (
                                    <div key={idx} className={`flex justify-between items-center text-sm ${idx !== arr.length - 1 ? 'pb-2 border-b border-dashed border-gray-100' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[#00A050]"></div>
                                            <span className="text-gray-700 font-bold">{item.name || (item as any).itemName || 'Item'} x {item.quantity || 1}</span>
                                        </div>
                                        <span className="text-gray-700 font-bold">₹{(item.unitPrice || 0) * (item.quantity || 1)}</span>
                                    </div>
                                ))}
                                {/* Dynamic Payment Breakdown (Mobile) */}
                                {(() => {
                                    const bill = reconcileBill(order);
                                    if (!bill) return null;

                                    return (
                                        <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-gray-100 text-xs">
                                            <div className="flex justify-between items-center text-gray-500 font-medium">
                                                <span>Item Total</span>
                                                <span>₹{formatPrice(bill.subTotal)}</span>
                                            </div>

                                            {!isPickup && bill.deliveryFee > 0 && (
                                                <div className="flex justify-between items-center text-gray-500 font-medium">
                                                    <span>Delivery Fee</span>
                                                    <span>₹{formatPrice(bill.deliveryFee)}</span>
                                                </div>
                                            )}

                                            {!isPickup && bill.deliveryTip > 0 && (
                                                <div className="flex justify-between items-center text-gray-500 font-medium">
                                                    <span>Delivery Tip</span>
                                                    <span>₹{formatPrice(bill.deliveryTip)}</span>
                                                </div>
                                            )}

                                            {bill.packagingFee > 0 && (
                                                <div className="flex justify-between items-center text-gray-500 font-medium">
                                                    <span>Packaging Charges</span>
                                                    <span>₹{formatPrice(bill.packagingFee)}</span>
                                                </div>
                                            )}

                                            {bill.platformFee > 0 && (
                                                <div className="flex justify-between items-center text-gray-500 font-medium">
                                                    <span>Platform Charges</span>
                                                    <span>₹{formatPrice(bill.platformFee)}</span>
                                                </div>
                                            )}

                                            {bill.foodGst > 0 && (
                                                <div className="flex justify-between items-center text-gray-500 font-medium">
                                                    <span>GST on Food (5%)</span>
                                                    <span>₹{formatPrice(bill.foodGst)}</span>
                                                </div>
                                            )}

                                            {!isPickup && bill.deliveryGst > 0 && (
                                                <div className="flex justify-between items-center text-gray-500 font-medium">
                                                    <span>GST (18% on Delivery)</span>
                                                    <span>₹{formatPrice(bill.deliveryGst)}</span>
                                                </div>
                                            )}

                                            {bill.platformGst > 0 && (
                                                <div className="flex justify-between items-center text-gray-500 font-medium">
                                                    <span>GST (18% on Platform Fee)</span>
                                                    <span>₹{formatPrice(bill.platformGst)}</span>
                                                </div>
                                            )}

                                            {bill.discount > 0 && (
                                                <div className="flex justify-between items-center text-[#64C27B] font-medium">
                                                    <span>Discount Applied</span>
                                                    <span>-₹{formatPrice(bill.discount)}</span>
                                                </div>
                                            )}

                                            {bill.remainder > 0 && (
                                                <div className="flex justify-between items-center text-gray-500 font-medium">
                                                    <span>Taxes & Charges</span>
                                                    <span>₹{formatPrice(bill.remainder)}</span>
                                                </div>
                                            )}

                                            <div className="border-t border-dashed border-gray-100 my-1"></div>

                                            <div className="flex justify-between items-center text-gray-900 font-bold text-sm">
                                                <span>Total Paid</span>
                                                <span className="text-gray-900 font-bold text-base">₹{formatPrice(bill.total)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Need Help Button */}
                        <button
                            onClick={() => handleNeedHelp(order?.orderNumber || orderId || order?.id || '')}
                            className="w-full bg-[#F2F4F7] text-gray-700 font-bold text-[16px] py-[18px] rounded-xl active:scale-[0.98] transition-all mb-6 cursor-pointer"
                        >
                            Need Help?
                        </button>

                    </div>
                </div>
            </div>

            <MobileMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
            />
        </div>
    );
};
