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
  const { data: programs, error } = await supabase
    .from('programs')
    .select('id, title, organization_id');
  
  if (error) {
    console.error('Error fetching programs:', error);
    return;
  }

  const linked = programs.filter(p => p.organization_id !== null);
  const unlinked = programs.filter(p => p.organization_id === null);

  console.log(`Total programs: ${programs.length}`);
  console.log(`Linked programs count: ${linked.length}`);
  console.log(`Unlinked programs count: ${unlinked.length}`);
  
  if (linked.length > 0) {
    console.log('Sample linked programs:', linked.slice(0, 5));
  } else {
    console.log('No programs are linked to any organization!');
  }
}
run();
