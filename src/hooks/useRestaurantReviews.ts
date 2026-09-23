import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { RestaurantReviewsResponse } from "../types/api";

export function useRestaurantReviews(restaurantId?: string) {
  return useQuery<RestaurantReviewsResponse>({
    queryKey: ["restaurant-reviews", restaurantId],
    queryFn: async () => {
      const response = await api.get(`/catalog/restaurants/${restaurantId}/reviews`);
      return (response as unknown) as RestaurantReviewsResponse;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 60, // 1 hour, matches server 24h cache reality
  });
}
