import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sfimbdeizwgzfaydkyhl.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmaW1iZGVpendnemZheWRreWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4OTEyNzEsImV4cCI6MjA3MjQ2NzI3MX0.-YZUaVWtUTuY6HFUknujReLTejKS69HfHBvzR0AfUPg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
