import { createClient } from "@supabase/supabase-js"

// Check if environment variables exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Only create client if environment variables are available
export const supabaseServer = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null
