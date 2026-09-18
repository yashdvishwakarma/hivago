import React, { useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, MessageSquareQuote, User } from 'lucide-react';
import type { RestaurantReviewsResponse, Review } from '../../types/api';

interface RestaurantReviewsSectionProps {
  data?: RestaurantReviewsResponse | null;
  isLoading?: boolean;
}

export const RestaurantReviewsSection: React.FC<RestaurantReviewsSectionProps> = ({ data, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-5 mt-12 mb-8">
        <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
          <div className="flex gap-4 overflow-hidden">
            <div className="w-80 h-40 bg-gray-100 rounded-2xl shrink-0" />
            <div className="w-80 h-40 bg-gray-100 rounded-2xl shrink-0" />
            <div className="w-80 h-40 bg-gray-100 rounded-2xl shrink-0" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.reviews || data.reviews.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-5 mt-12 mb-8">
      <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <MessageSquareQuote className="w-6 h-6 text-brand-primary" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                Customer Reviews
              </h2>
            </div>
            {data.rating !== null && (
              <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
                Real customer feedback from Google reviews
              </p>
            )}
          </div>

          {data.rating !== null && (
            <div className="flex items-center gap-3 bg-amber-50/80 border border-amber-200/60 px-4 py-2 rounded-2xl self-start sm:self-auto">
              <div className="flex items-center gap-1">
                <span className="text-xl font-extrabold text-amber-900">
                  {data.rating.toFixed(1)}
                </span>
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              {data.userRatingCount !== null && (
                <div className="border-l border-amber-200/80 pl-3">
                  <span className="text-xs font-bold text-amber-800">
                    {data.userRatingCount.toLocaleString()} {data.userRatingCount === 1 ? 'rating' : 'ratings'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons for Carousel (Desktop) */}
        {data.reviews.length > 1 && (
          <div className="hidden md:flex absolute top-8 right-8 items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-95 shadow-xs"
              aria-label="Previous review"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-95 shadow-xs"
              aria-label="Next review"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Review Cards Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth pb-2 pt-1"
        >
          {data.reviews.map((review: Review, idx: number) => (
            <ReviewCard key={`${review.authorName}-${idx}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="w-[280px] sm:w-[320px] md:w-[350px] shrink-0 bg-[#F8FAFC] border border-gray-100 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        {/* User Info & Rating Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {review.authorPhotoUrl && !imgError ? (
              <img
                src={review.authorPhotoUrl}
                alt={review.authorName}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center border border-brand-primary/20 shrink-0">
                {review.authorName ? review.authorName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-gray-900 truncate">
                {review.authorName}
              </h4>
              <p className="text-[11px] font-medium text-gray-400 truncate">
                {review.relativeTimeDescription}
              </p>
            </div>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-amber-800">
              {review.rating}
            </span>
          </div>
        </div>

        {/* Review Text */}
        <p className="text-xs md:text-sm text-gray-600 leading-relaxed line-clamp-4 italic">
          "{review.text}"
        </p>
      </div>
    </div>
  );
};
