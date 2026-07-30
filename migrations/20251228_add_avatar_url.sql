-- Migration: Ajouter la colonne avatar_url à la table users
-- Exécute ce script dans Supabase SQL Editor si la colonne n'existe pas

-- Ajouter la colonne avatar_url si elle n'existe pas
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Ajouter un commentaire à la colonne
COMMENT ON COLUMN public.users.avatar_url IS 'URL publique de la photo de profil stockée dans le bucket avatars';
