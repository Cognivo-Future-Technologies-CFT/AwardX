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
  // Let's get the active program or any program
  const { data: programs } = await supabase.from('programs').select('id, title, organization_id').limit(10);
  console.log('Programs in database:', programs);

  if (programs && programs.length > 0) {
    const prog = programs[0];
    console.log(`\nInspecting organization members for organization ${prog.organization_id}:`);

    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select('status, user_id, organization_id, status, roles ( id, name, permissions )')
      .eq('organization_id', prog.organization_id);

    console.log('Memberships response:', JSON.stringify(memberships, null, 2));
    console.log('Error:', error);
  }
}
run();
