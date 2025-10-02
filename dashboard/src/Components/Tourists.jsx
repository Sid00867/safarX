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

  const getTableHeaders = (table, row) => {
    if (table === "users") {
      return ["id", "phone", "created_at", "name", "email", "user_Id"];
    }
    return Object.keys(row);
  };

  const getTableRowValues = (table, row) => {
    if (table === "users") {
      return ["id", "phone", "created_at", "name", "email", "user_Id"].map((key) => row[key] ?? "");
    }
    return Object.values(row);
  };

  return (
    <div style={{ maxWidth: "700px", margin: "20px auto", fontFamily: "Arial" }}>
      <h2>Search</h2>

      <select
        value={searchType}
        onChange={(e) => {
          setSearchType(e.target.value);
          setSearchValue("");
        }}
        style={{ marginBottom: "10px", padding: "5px" }}
      >
        <option value="">-- Select Search Type --</option>
        <option value="name">By Name</option>
        <option value="email">By Email</option>
        <option value="mobile">By Mobile Number</option>
      </select>

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

      {results.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          {results.map((result, idx) => (
            <div key={idx} style={{ marginBottom: "30px" }}>
              <h3>Table: {result.table}</h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr>
                    {getTableHeaders(result.table, result.rows[0]).map((key) => (
                      <th
                        key={key}
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          backgroundColor: "#f2f2f2",
                        }}
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {getTableRowValues(result.table, row).map((val, cIdx) => (
                        <td key={cIdx} style={{ border: "1px solid #ccc", padding: "8px" }}>
                          {val !== null ? val.toString() : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
