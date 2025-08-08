import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("Critical Error: SUPABASE_URL and SUPABASE_KEY must be defined in your .env file or Railway environment variables.");
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default supabase;