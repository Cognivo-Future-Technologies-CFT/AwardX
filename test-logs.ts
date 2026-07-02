import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: superAdmins } = await supabase.from('profiles').select('id').eq('is_super_admin', true);
  if (!superAdmins) return console.log('No super admins');
  
  const userIds = superAdmins.map(u => u.id);
  console.log('Super Admin IDs:', userIds);
  
  const { data: logs, error } = await supabase.from('audit_logs')
    .select('resource_id, created_at')
    .eq('action_type', 'SUPER_ADMIN')
    .in('resource_id', userIds)
    .order('created_at', { ascending: false });
    
  console.log('Logs:', JSON.stringify(logs, null, 2));
  console.log('Error:', error);
}

run();
