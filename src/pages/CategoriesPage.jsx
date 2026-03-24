import React, { useState, useEffect } from "react";
import { videoAPI } from "../lib/supabase";
import { C, SectionHeader, Skeleton } from "../components/ui/index";
// Reuse your existing CategoryCard component logic
import { CategoryCard } from "./HomePage"; 

export default function CategoriesPage({ setCatFilter, setTab ,setFilter}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // This calls the unique categories from your DB
        const data = await videoAPI.getCategories();
        setCategories(data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

const handleCategoryClick = (name) => {
    if (setFilter) setFilter("all"); // Reset content filter to 'All'
    setCatFilter(name);             // Set the chosen category
    setTab("home");                 // Redirect to home
  };

  return (
    <div style={{ padding: "20px 0" }}>
      <SectionHeader title="Explore Categories" />
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", 
        gap: 16,
        marginTop: 20 
      }}>
        {loading ? (
          // Show skeletons while loading
          Array(12).fill(0).map((_, i) => (
            <div key={i} style={{ height: 120, background: C.bg3, borderRadius: 16, animate: 'pulse 1.5s infinite' }} />
          ))
        ) : (
          categories.map((cat) => (
            <CategoryCard 
              key={cat} 
              name={cat} 
              onClick={() => handleCategoryClick(cat)} 
            />
          ))
        )}
      </div>
    </div>
  );
}
