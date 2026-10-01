import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ShoppingBag, Loader2, ChevronRight } from 'lucide-react';
import { formatPrice } from '../../utils/formatUtils';
import { MenuItem } from './MenuItemCard';
import { fetchItemDetails, ApiItem } from '../../data/api';
import { FEATURE_FLAGS } from '../../config/featureFlags';


interface AddOnsOverlayProps {
    originalItem: MenuItem | null;
    onClose: () => void;
    onConfirmAdd: (item: MenuItem, mainItemPrice: number, instructions: string, selectedAddons: {id: string, name: string, price: number}[]) => void;
}

export const AddOnsOverlay: React.FC<AddOnsOverlayProps> = ({ originalItem, onClose, onConfirmAdd }) => {
    const [apiItem, setApiItem] = useState<ApiItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [unavailabilityAction, setUnavailabilityAction] = useState('Remove it from my order');
    const [isUnavailabilityMenuOpen, setIsUnavailabilityMenuOpen] = useState(false);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        const loadItemDetails = async () => {
            if (!originalItem) return;
            setIsLoading(true);
            try {
                const details = await fetchItemDetails(originalItem.id);
                setApiItem(details);
            } catch (error) {
                console.error("Failed to fetch item details", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (originalItem) {
            loadItemDetails();
        }
    }, [originalItem?.id]);

    // Preselect defaults
    useEffect(() => {
        if (apiItem) {
            const initialSelected = new Set<string>();
            
            if (FEATURE_FLAGS.PRESELECT_DEFAULTS) {
                // Helper to check if an option is default
                const isDefaultOption = (opt: any) => {
                    if (opt.isDefault === true || opt.isDefault === 'true' || opt.isDefault === 1 || opt.isDefault === '1') {
                        return true;
                    }
                    // Fallback check if the name itself indicates a default option (e.g. name contains "default")
                    if (opt.name && typeof opt.name === 'string' && opt.name.toLowerCase().includes('default')) {
                        return true;
                    }
                    return false;
                };

                apiItem.options?.forEach(opt => {
                    if (isDefaultOption(opt)) {
                        initialSelected.add(opt.id);
                    }
                });

                apiItem.optionGroups?.forEach(group => {
                    let defaultSelected = false;
                    group.options?.forEach(opt => {
                        if (isDefaultOption(opt)) {
                            initialSelected.add(opt.id);
                            defaultSelected = true;
                        }
                    });

                    // Fallback: if the group is required (isRequired or minSelections > 0)
                    // and no default option was found/selected, select the first option by default
                    if (!defaultSelected && (group.isRequired || group.minSelections > 0) && group.options && group.options.length > 0) {
                        initialSelected.add(group.options[0].id);
                        defaultSelected = true;
                    }
                });
            } else {
                apiItem.options?.forEach(opt => {
                    if (opt.isDefault) {
                        initialSelected.add(opt.id);
                    }
                });
                apiItem.optionGroups?.forEach(group => {
                    group.options?.forEach(opt => {
                        if (opt.isDefault) {
                            initialSelected.add(opt.id);
                        }
                    });
                });
            }

            setSelectedOptions(initialSelected);
        }
    }, [apiItem]);

    const toggleOption = (id: string) => {
        const newSet = new Set(selectedOptions);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedOptions(newSet);
    };

    const toggleGroupOption = (_groupId: string, optionId: string, group: any) => {
        const newSet = new Set(selectedOptions);
        const groupOptionIds = group.options.map((o: any) => o.id);

        if (group.minSelections === 1 && group.maxSelections === 1) {
            // Radio button behavior
            groupOptionIds.forEach((id: string) => {
                if (id !== optionId) newSet.delete(id);
            });
            newSet.add(optionId);
        } else {
            // Checkbox behavior
            if (newSet.has(optionId)) {
                // Check if deselecting violates minSelections (usually only applies to single-choice, but let's be safe)
                const currentlySelectedInGroup = groupOptionIds.filter((id: string) => newSet.has(id));
                if (currentlySelectedInGroup.length > group.minSelections) {
                    newSet.delete(optionId);
                }
            } else {
                const currentlySelectedInGroup = groupOptionIds.filter((id: string) => newSet.has(id));
                if (currentlySelectedInGroup.length < group.maxSelections) {
                    newSet.add(optionId);
                }
            }
        }
        setSelectedOptions(newSet);
    };

    const basePrice = useMemo(() => {
        if (!originalItem) return 0;
        return typeof originalItem.price === 'string'
            ? parseInt(originalItem.price.replace(/[^0-9]/g, ''), 10)
            : originalItem.price;
    }, [originalItem]);

    const mainItemPrice = useMemo(() => {
        let total = basePrice;
        
        // Add selected options from API (flat options)
        if (apiItem && apiItem.options) {
            apiItem.options.forEach(opt => {
                const optPrice = typeof opt.additionalPrice === 'number' && !isNaN(opt.additionalPrice) ? opt.additionalPrice : 0;
                if (selectedOptions.has(opt.id)) total += optPrice;
            });
        }

        // Add selected option group options
        if (apiItem && apiItem.optionGroups) {
            apiItem.optionGroups.forEach(group => {
                group.options.forEach(opt => {
                    const optPrice = typeof opt.additionalPrice === 'number' && !isNaN(opt.additionalPrice) ? opt.additionalPrice : 0;
                    if (selectedOptions.has(opt.id)) total += optPrice;
                });
            });
        }
        return total;
    }, [basePrice, selectedOptions, apiItem]);

    const selectedOptionsText = useMemo(() => {
        if (!apiItem) return "";
        const parts: string[] = [];
        if (apiItem.options) {
            apiItem.options
                .filter(opt => selectedOptions.has(opt.id))
                .forEach(opt => parts.push(opt.name));
        }
        if (apiItem.optionGroups) {
            apiItem.optionGroups.forEach(group => {
                group.options
                    .filter(opt => selectedOptions.has(opt.id))
                    .forEach(opt => parts.push(`${group.groupName}: ${opt.name}`));
            });
        }
        return parts.join(", ");
    }, [apiItem, selectedOptions]);

    const finalInstructions = useMemo(() => {
        const parts = [];
        if (selectedOptionsText) parts.push(`Selected: ${selectedOptionsText}`);
        if (specialInstructions) parts.push(specialInstructions);
        return parts.join(" | ");
    }, [selectedOptionsText, specialInstructions]);

    const validationError = useMemo(() => {
        if (!apiItem || !apiItem.optionGroups) return null;
        for (const group of apiItem.optionGroups) {
            const groupOptionIds = group.options.map(o => o.id);
            const selectedCount = groupOptionIds.filter(id => selectedOptions.has(id)).length;
            if (selectedCount < group.minSelections) {
                return `Please select at least ${group.minSelections} option(s) for "${group.groupName}"`;
            }
        }
        return null;
    }, [apiItem, selectedOptions]);

    const totalPrice = useMemo(() => {
        return mainItemPrice;
    }, [mainItemPrice]);
    if (!originalItem) return null;

    return createPortal(
        <>
        <div 

            className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-[#F8FAFC] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5 duration-300">
                
                {/* Header */}
                <div className="bg-white px-5 sm:px-6 py-4 flex items-start justify-between border-b border-gray-100 shrink-0 sticky top-0 z-10 gap-3">
                    <div className="min-w-0 flex-1 pr-1">
                        <h2 className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2">
                             Add Ons
                        </h2>
                        <div className="flex items-center justify-between gap-3 mt-1.5 min-w-0">
                            <span className="text-sm font-bold text-gray-500 truncate min-w-0 flex-1">{apiItem ? apiItem.name : originalItem.name}</span>
                            <span className="text-sm font-extrabold text-gray-900 whitespace-nowrap shrink-0">₹{formatPrice(basePrice)}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0 mt-0.5"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    {/* Top indicator bar matching image */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-brand-primary rounded-b-full"></div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                            <span className="ml-3 text-gray-500 font-bold">Loading options...</span>
                        </div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 mb-6">
                                <button className="text-sm font-bold text-gray-900 pb-3 border-b-2 border-gray-900 px-1">
                                    Customise as per your Taste
                                </button>
                            </div>

                            {/* Options Section */}
                            {apiItem && apiItem.options && apiItem.options.length > 0 && (
                                <div className="mb-8 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 tracking-wide">Add Ingredients</h3>
                                    <div className="space-y-4">
                                        {apiItem.options.map((opt) => {
                                            const isSelected = selectedOptions.has(opt.id);
                                            const optPrice = typeof opt.additionalPrice === 'number' && !isNaN(opt.additionalPrice) ? opt.additionalPrice : 0;
                                            return (
                                                <div key={opt.id} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleOption(opt.id)}>
                                                    <div>
                                                        <p className={`text-sm font-bold transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{opt.name}</p>
                                                        {optPrice > 0 ? (
                                                            <p className="text-[11px] font-bold text-gray-400">₹ {formatPrice(optPrice)}</p>
                                                        ) : (
                                                            <p className="text-[11px] font-bold text-gray-400">Included</p>
                                                        )}
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-primary border-brand-primary shadow-sm scale-105' : 'bg-transparent border-gray-300 hover:border-brand-primary'}`}>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Option Groups Section */}
                            {apiItem && apiItem.optionGroups && apiItem.optionGroups.length > 0 && (
                                [...apiItem.optionGroups]
                                    .sort((a, b) => a.displayOrder - b.displayOrder)
                                    .map((group) => (
                                        <div key={group.id} className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900 tracking-wide">{group.groupName}</h3>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                        {group.minSelections === 1 && group.maxSelections === 1 
                                                            ? "Select 1 option" 
                                                            : `Select up to ${group.maxSelections} option(s)`}
                                                    </p>
                                                </div>
                                                {group.isRequired && (
                                                    <span className="bg-brand-light text-[#D12E27] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                                                        Required
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                {group.options.map((opt) => {
                                                    const isSelected = selectedOptions.has(opt.id);
                                                    const optPrice = typeof opt.additionalPrice === 'number' && !isNaN(opt.additionalPrice) ? opt.additionalPrice : 0;
                                                    const isRadio = group.minSelections === 1 && group.maxSelections === 1;
                                                    
                                                    return (
                                                        <div key={opt.id} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleGroupOption(group.id, opt.id, group)}>
                                                            <div>
                                                                <p className={`text-sm font-bold transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{opt.name}</p>
                                                                {optPrice > 0 ? (
                                                                    <p className="text-[11px] font-bold text-gray-400">₹ {formatPrice(optPrice)}</p>
                                                                ) : (
                                                                    <p className="text-[11px] font-bold text-gray-400">Included</p>
                                                                )}
                                                            </div>
                                                            <div className={`w-6 h-6 flex items-center justify-center transition-all ${
                                                                isRadio 
                                                                    ? `rounded-full border-2 ${isSelected ? 'border-brand-primary' : 'border-gray-300'}` 
                                                                    : `rounded-md border-2 ${isSelected ? 'bg-brand-primary border-brand-primary shadow-sm scale-105' : 'bg-transparent border-gray-300 hover:border-brand-primary'}`
                                                            }`}>
                                                                {isSelected && (
                                                                    isRadio 
                                                                        ? <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                                                                        : <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                            )}


                            {/* Special Instructions */}
                            <div className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Special Instructions</h3>
                                <p className="text-[10px] text-gray-500 font-medium mb-3">Let us know your allergies or preferences. We'll try our best to accommodate them, though not all requests may be possible.</p>
                                <div className="relative">
                                    <textarea 
                                        maxLength={350}
                                        className="w-full rounded-xl border border-gray-200 p-3 text-xs bg-gray-50 focus:bg-white transition-all focus:ring-1 focus:ring-brand-primary focus:border-brand-primary resize-none h-24 placeholder-gray-400"
                                        placeholder="e.g. Less spicy, no onions, nut allergy..."
                                        value={specialInstructions}
                                        onChange={(e) => setSpecialInstructions(e.target.value)}
                                    />
                                    <div className="absolute bottom-3 right-3 text-[9px] font-bold text-gray-400">
                                        {350 - specialInstructions.length} characters remaining
                                    </div>
                                </div>
                            </div>

                            {/* Unavailability Option */}
                            <div className="mb-6">
                                <h3 className="text-[13px] font-bold text-gray-800 mb-3 px-1">If this product is not available</h3>
                                <button 
                                    onClick={() => setIsUnavailabilityMenuOpen(true)}
                                    className="w-full bg-white rounded-2xl py-3.5 px-4 flex items-center justify-between border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
                                >
                                    <span className="text-[13px] font-medium text-gray-500">{unavailabilityAction}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </>
                    )}

                </div>

                {/* Bottom Action Bar */}
                <div className="bg-white p-4 sm:p-6 border-t border-gray-100 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20">
                     {validationError && (
                         <div className="text-red-600 text-xs font-bold mb-3 text-center bg-red-50 py-2 rounded-xl border border-red-100">
                             {validationError}
                         </div>
                     )}
                     <button
                         onClick={() => {
                             if (validationError) return;
                             const addons: { id: string; name: string; price: number; groupId?: string; groupName?: string; }[] = [];
                             
                             if (apiItem?.options) {
                                 apiItem.options
                                     .filter(opt => selectedOptions.has(opt.id))
                                     .forEach(opt => {
                                         addons.push({
                                             id: opt.id,
                                             name: opt.name,
                                             price: opt.additionalPrice || 0
                                         });
                                     });
                             }
                             
                             if (apiItem?.optionGroups) {
                                 apiItem.optionGroups.forEach(group => {
                                     group.options
                                         .filter(opt => selectedOptions.has(opt.id))
                                         .forEach(opt => {
                                             addons.push({
                                                 id: opt.id,
                                                 name: opt.name,
                                                 price: opt.additionalPrice || 0,
                                                 groupId: group.id,
                                                 groupName: group.groupName
                                             });
                                         });
                                 });
                             }
                             
                             onConfirmAdd({
                                 ...originalItem,
                             }, mainItemPrice, finalInstructions, addons);
                         }}
                         className={`w-full text-white rounded-2xl py-4 px-6 flex items-center justify-between shadow-lg active:scale-[0.98] transition-all group ${
                             validationError 
                                 ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                                 : 'bg-[#D12E27] hover:bg-[#B52721]'
                         }`}
                         disabled={isLoading || !!validationError}
                     >
                         <div className="flex items-center gap-3 shrink-0">
                              <span className="text-lg font-bold tracking-wide whitespace-nowrap shrink-0">₹{formatPrice(totalPrice)}</span>
                         </div>
                         <div className="flex items-center gap-2 bg-white text-[#D12E27] px-4 py-2 rounded-xl font-bold text-sm group-hover:bg-red-50 transition-colors">
                              <ShoppingBag className="w-4 h-4" />
                              <span>{isLoading ? 'Loading...' : 'Add item to cart'}</span>
                         </div>
                     </button>
                </div>

            </div>
        </div>

        {/* Unavailability Options Modal */}
        {isUnavailabilityMenuOpen && (
            <div 
                className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsUnavailabilityMenuOpen(false);
                }}
            >
                <div 
                    className="bg-white w-full max-w-[320px] rounded-[24px] p-6 shadow-2xl animate-in zoom-in-95 duration-200" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-[15px] font-bold text-gray-900 pr-5 leading-tight">If this product is not available</h3>
                        <button 
                            onClick={() => setIsUnavailabilityMenuOpen(false)} 
                            className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-2"
                        >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                    </div>
                    <div className="flex flex-col items-start gap-4">
                        {['Remove it from my order', 'Cancel the entire order.', 'Call Us'].map(option => (
                            <button
                                key={option}
                                onClick={() => {
                                    setUnavailabilityAction(option);
                                    setIsUnavailabilityMenuOpen(false);
                                }}
                                className={`text-left text-[14px] transition-colors ${unavailabilityAction === option ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
        </>,
        document.body
    );
};
