// Fonctions pour charger les données utilisateur depuis Supabase

import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/index';

export async function loadUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Select all columns including kyc_status if it exists
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading user profile:', error);
      return null;
    }

    return {
      ...data,
      is_admin: user.user_metadata?.is_admin === true,
      subscription_plan: (data as any).subscription_plan || 'basic',
      commission_rate: (data as any).commission_rate || 0,
      kyc_status: (data as any).kyc_status || 'not_submitted',
    } as unknown as UserProfile;
  } catch (error) {
    console.error('Error in loadUserProfile:', error);
    return null;
  }
}

export async function updateUserProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ updateUserProfile: Utilisateur non connecté');
      return null;
    }

    console.log('📝 Tentative de mise à jour du profil:', {
      userId: user.id,
      updates: updates
    });

    // Utiliser la fonction SECURITY DEFINER pour bypasser RLS
    const { error: rpcError } = await (supabase as any).rpc('update_user_profile', {
      new_full_name: updates.full_name || null,
      new_bio: updates.bio || null,
      new_phone_number: updates.phone_number || null,
      new_country: updates.country || null,
      new_skills: updates.skills || null,
      new_currency: updates.currency || null,
      new_avatar_url: updates.avatar_url || null,
    });

    if (rpcError) {
      console.error('❌ ERREUR lors de la mise à jour du profil:', rpcError);
      
      // Si la fonction RPC n'existe pas, essayer la méthode classique
      if (rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
        console.warn('⚠️ Fonction update_user_profile non trouvée, utilisation de la méthode classique');
        console.warn('👉 Exécuter FIX_PROFILE_UPDATE_SECURITY_DEFINER.sql dans Supabase');
        
        // Fallback: méthode classique
        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          console.error('❌ ERREUR FALLBACK:', error);
          return null;
        }

        console.log('✅ Profil mis à jour via fallback:', data);
        return {
          ...data,
          is_admin: user.user_metadata?.is_admin === true,
          subscription_plan: (data as any).subscription_plan || 'basic',
          commission_rate: (data as any).commission_rate || 0,
          kyc_status: (data as any).kyc_status || 'not_submitted',
        } as unknown as UserProfile;
      }
      
      return null;
    }

    console.log('✅ Profil mis à jour avec succès via RPC');

    // Recharger le profil pour obtenir les données à jour
    const { data: updatedProfile, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (selectError) {
      console.error('❌ Erreur lors du rechargement du profil:', selectError);
      return null;
    }

    return {
      ...updatedProfile,
      is_admin: user.user_metadata?.is_admin === true,
      subscription_plan: (updatedProfile as any).subscription_plan || 'basic',
      commission_rate: (updatedProfile as any).commission_rate || 0,
      kyc_status: (updatedProfile as any).kyc_status || 'not_submitted',
    } as unknown as UserProfile;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    return null;
  }
}

export async function uploadUserAvatar(file: File): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ uploadUserAvatar: Utilisateur non connecté');
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('📤 Upload avatar vers:', filePath);

    const { error: uploadError } = await supabase.storage
      .from('Avatar')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('❌ Erreur upload Storage:', {
        message: uploadError.message,
        statusCode: (uploadError as any).statusCode
      });
      
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
        console.error('🗂️ BUCKET MANQUANT: Créer le bucket "Avatar" dans Supabase Dashboard!');
        console.error('👉 Suivre les instructions dans SOLUTION_RAPIDE_AVATAR.md');
      }
      
      return null;
    }

    console.log('✅ Avatar uploadé avec succès');

    const { data } = supabase.storage
      .from('Avatar')
      .getPublicUrl(filePath);

    // Mettre à jour le profil
    await updateUserProfile({ avatar_url: data.publicUrl });

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadUserAvatar:', error);
    return null;
  }
}

export async function uploadKycDocument(file: File, documentType: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${documentType}-${Date.now()}.${fileExt}`;
    const filePath = `kyc-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading KYC document:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadKycDocument:', error);
    return null;
  }
}
