import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SearchComponent() {
  const [searchType, setSearchType] = useState(""); // name | email | mobile
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const tablesToSearch = ["users", "locations", "itinerary_items"]; 
  

  const handleSearch = async () => {
    if (!searchType || !searchValue) {
      setStatus(" Please select a type and enter a value.");
      return;
    }

    setLoading(true);
    setResults([]);
    setStatus("Searching...");

    try {
      let allResults = [];

      for (const table of tablesToSearch) {
        let query = supabase.from(table).select("*");

        // Apply condition based on search type
        if (searchType === "name") {
          query = query.ilike("name", `%${searchValue}%`);
        } else if (searchType === "email") {
          query = query.eq("email", searchValue);
        } else if (searchType === "mobile") {
          query = query.eq("mobile", searchValue);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Error in table ${table}:`, error.message);
        } else if (data.length > 0) {
          // Tag result with table name
          allResults.push({ table, rows: data });
        }
      }

      if (allResults.length > 0) {
        setResults(allResults);
        setStatus("Results found!");
      } else {
        setStatus("No results found.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "20px auto", fontFamily: "Arial" }}>
      <h2>Search</h2>

      {/* Dropdown for selecting search type */}
      <select
        value={searchType}
        onChange={(e) => {
          setSearchType(e.target.value);
          setSearchValue(""); // reset input
        }}
        style={{ marginBottom: "10px", padding: "5px" }}
      >
        <option value="">-- Select Search Type --</option>
        <option value="name">By Name</option>
        <option value="email">By Email</option>
        <option value="mobile">By Mobile Number</option>
      </select>

      {/* Input only shows after selecting search type */}
      {searchType && (
        <input
          type={searchType === "mobile" ? "tel" : "text"}
          placeholder={`Enter ${searchType}`}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
        />
      )}

      <button onClick={handleSearch} disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </button>

      {status && <p>{status}</p>}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Results:</h3>
          {results.map((result, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "15px",
              }}
            >
              <h4>Table: {result.table}</h4>
              <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(result.rows, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
