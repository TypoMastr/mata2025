import { createClient } from '@supabase/supabase-js';

// Supabase credentials provided by the user
const supabaseUrl = 'https://bjuzljwcbtnzylyirkzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdXpsandjYnRuenlseWlya3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTEyNDIsImV4cCI6MjA3Nzk2NzI0Mn0.VGB0hLfDHAo1jXSXFTf_xm5PecwEq0h2rQmuD-fo0Zk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
