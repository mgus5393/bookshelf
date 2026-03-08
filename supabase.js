const SUPABASE_URL = "https://ecfrcyeltvmcaymmedcc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZnJjeWVsdHZtY2F5bW1lZGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDM5NDcsImV4cCI6MjA4ODU3OTk0N30.GhUu1c-UAtc7DRxlCrYb3ra9-eTGHi8OCWylHjqaN7k";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);