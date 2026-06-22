import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/lalithakash/Documents/Award X 2/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: prog, error } = await supabase
    .from('programs')
    .select('id, title, organization_id')
    .ilike('title', '%annual awards%');
    
  console.log('Program annual awards:', prog, error);
}
run();
