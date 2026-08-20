// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

// SUBSTITUA pelas chaves que estão no menu "Project Settings > API" do seu Supabase
const supabaseUrl = 'https://yytvtrlplehnvfakpzbo.supabase.co';
const supabaseKey = 'sb_publishable_fO9tSv3YyRZbfCKNIINAnw_UpuFocDF';

export const supabase = createClient(supabaseUrl, supabaseKey);