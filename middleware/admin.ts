export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();
  const supabase = useSupabaseClient();
  const toast = useToast();
  
  // If user is not logged in, redirect to login
  if (!user.value) {
    return navigateTo('/login');
  }
  
  try {
    // Check if user has admin role in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.value.id)
      .single();
    
    if (error) throw error;
    
    // If user is not an admin, redirect to home page
    if (!data || !data.is_admin) {
      toast.add({
        title: 'Access Denied',
        description: 'You do not have permission to access the admin area',
        color: 'error',
      });
      return navigateTo('/');
    }
  } catch (err) {
    console.error('Error checking admin status:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to verify admin privileges',
      color: 'error',
    });
    return navigateTo('/');
  }
});