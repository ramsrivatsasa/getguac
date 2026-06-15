// Peer-to-peer Marketplace listings (the "Sell" tab) — FB-Marketplace style.
// All access goes through the browser Supabase client; RLS (migration_073)
// enforces that anyone can read ACTIVE listings while only the owner can
// create/edit/delete their own. Photos reuse the public `receipts` bucket via
// uploadReceipt(), so no new storage bucket is needed.

import { createClient } from './supabase/client'
import { uploadReceipt } from './db'

export const LISTING_CATEGORIES = [
  'All', 'Electronics', 'Home & Garden', 'Furniture', 'Apparel', 'Vehicles',
  'Toys & Games', 'Sporting Goods', 'Tools', 'Baby & Kids', 'Free', 'Other',
]

export const LISTING_CONDITIONS = ['New', 'Like new', 'Good', 'Fair']

export async function getCurrentUserId() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  return user?.id || null
}

// Browse active listings (optionally filtered by category). Text filtering is
// done client-side so it can span title/description without a FTS index.
export async function listListings({ category } = {}) {
  const sb = createClient()
  let query = sb
    .from('marketplace_listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(120)
  if (category && category !== 'All') query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Create a listing. `images` is an array of File objects; we upload each to the
// receipts bucket and store the resulting public URLs on the row.
export async function createListing({ title, price, category, condition, location, description, contact_email, images }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Please sign in to list an item.')

  const urls = []
  for (const file of images || []) {
    try { urls.push(await uploadReceipt(file, user.id)) } catch { /* skip a failed image */ }
  }

  const { data, error } = await sb
    .from('marketplace_listings')
    .insert({
      seller_id: user.id,
      title: title.trim(),
      description: (description || '').trim() || null,
      price: Number(price) || 0,
      category: category || null,
      condition: condition || null,
      location: (location || '').trim() || null,
      contact_email: (contact_email || '').trim() || null,
      images: urls,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteListing(id) {
  const sb = createClient()
  const { error } = await sb.from('marketplace_listings').delete().eq('id', id)
  if (error) throw error
}

export async function markListingSold(id) {
  const sb = createClient()
  const { error } = await sb.from('marketplace_listings').update({ status: 'sold' }).eq('id', id)
  if (error) throw error
}
