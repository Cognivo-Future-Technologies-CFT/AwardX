import { getSupabaseAdmin } from './server/dist/supabase.js';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function run() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        super_admin_granted_by (
          id,
          full_name,
          email
        )
      `)
      .limit(1);
  console.log("Error:", error);
}
run();
