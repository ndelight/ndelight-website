
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://adiwmdrbmswsswnctjwx.supabase.co'
const supabaseAnonKey = 'sb_publishable_iQ0HTtIJBafx6v_MFJ13TQ_98-tkU_f'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testFetch() {
    console.log("Fetching ALL influencers with Anon Key...");
    const { data, error } = await supabase
        .from('influencers')
        .select('id, name, full_name, profiles(full_name)')
        .eq('active', true);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Count:", data.length);
        data.forEach((inf, i) => {
            console.log(`--- Record ${i + 1} ---`);
            console.log("ID:", inf.id);
            console.log("Name (direct):", inf.name);
            console.log("Full_Name (direct):", inf.full_name);
            console.log("Profiles Join:", JSON.stringify(inf.profiles));
        });
    }
}

testFetch();
