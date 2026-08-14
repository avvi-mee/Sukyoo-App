import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export function useProductCategories() {
  return useQuery({
    queryKey: ['productCategories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_categories').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useProducts(categoryId?: string) {
  return useQuery({
    queryKey: ['products', categoryId],
    queryFn: async () => {
      let query = supabase.from('products').select('*').eq('is_active', true);
      if (categoryId) query = query.eq('category_id', categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useServiceListings(category?: string) {
  return useQuery({
    queryKey: ['serviceListings', category],
    queryFn: async () => {
      let query = supabase.from('service_listings').select('*').eq('is_active', true);
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

type OrderItemInput = { product_id: string; quantity: number };
type CreateOrderInput = { belongsToUserId: string; items: OrderItemInput[]; payerUserId?: string };

// Places an order — self, family co-ordering, or (if the caller's profile
// role is ops_agent) assisted shopping. See create_order() in
// 0005_ecommerce.sql for how the actor role is inferred server-side.
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const { data, error } = await supabase.rpc('create_order', {
        p_belongs_to_user_id: input.belongsToUserId,
        p_items: input.items,
        p_payer_user_id: input.payerUserId ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['orders', input.belongsToUserId] }),
  });
}

export function useOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ['orders', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(name, image_url))')
        .or(`belongs_to_user_id.eq.${userId},ordered_by_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

type CheckoutResponse = { razorpayOrderId: string; amount: number; currency: string; razorpayKeyId: string };

// Step 1 of checkout — creates the Razorpay Order server-side. The caller
// then opens react-native-razorpay's native checkout with the returned
// razorpayOrderId; nothing is marked paid until razorpay-webhook fires.
export function useCreateRazorpayOrder() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('razorpay-order', { body: { orderId } });
      if (error) throw error;
      return data as CheckoutResponse;
    },
  });
}

export function useProductSubscriptions(userId: string | undefined) {
  return useQuery({
    queryKey: ['productSubscriptions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_subscriptions')
        .select('*, product:products(name, price)')
        .eq('user_id', userId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useSetProductSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; productId: string; enabled: boolean; frequencyDays?: number }) => {
      if (input.enabled) {
        const { error } = await supabase
          .from('product_subscriptions')
          .upsert(
            { user_id: input.userId, product_id: input.productId, frequency_days: input.frequencyDays ?? 30, is_active: true },
            { onConflict: 'user_id,product_id' }
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_subscriptions')
          .update({ is_active: false })
          .eq('user_id', input.userId)
          .eq('product_id', input.productId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: ['productSubscriptions', input.userId] }),
  });
}
