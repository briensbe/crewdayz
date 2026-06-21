const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "http://localhost:60000";
const supabaseKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: "public"
  }
});

async function run() {
  const tables = ['profiles', 'users'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table public.${table} failed: ${error.message}`);
      } else {
        console.log(`Table public.${table} exists! Data:`, data);
      }
    } catch (e) {
      console.log(`Table public.${table} threw error: ${e.message}`);
    }
  }
}

run();
